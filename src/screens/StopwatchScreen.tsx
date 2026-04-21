import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { playAudioCue, primeAudioCues } from '../services/audio-cues'
import { hapticLap, hapticStartPause } from '../services/haptics'
import { computeLapSplits, formatStopwatch } from '../services/stopwatch'
import type { SessionPreset, SessionSavePayload, StopwatchModeConfig, WeatherSnapshot } from '../types'

type AutoLapPhase = 'idle' | 'lap' | 'rest' | 'complete'

interface StopwatchScreenProps {
  onBack: () => void
  weatherSnapshot: WeatherSnapshot
  heartRate: number
  sessionPreset: SessionPreset
  stopwatchMode: StopwatchModeConfig
  onSaveSession: (session: SessionSavePayload) => Promise<void> | void
}

export function StopwatchScreen({
  onBack,
  weatherSnapshot,
  heartRate,
  sessionPreset,
  stopwatchMode,
  onSaveSession,
}: StopwatchScreenProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [laps, setLaps] = useState<number[]>([])
  const lapsRef = useRef<HTMLElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const runningStartRef = useRef<number | null>(null)
  const carriedElapsedRef = useRef(0)
  const latestElapsedRef = useRef(0)
  const hasSavedSessionRef = useRef(false)
  const sessionStartedAtRef = useRef<string | null>(null)

  const [autoLapPhase, setAutoLapPhase] = useState<AutoLapPhase>('idle')
  const [currentLapIndex, setCurrentLapIndex] = useState(0)
  const [lapElapsedMs, setLapElapsedMs] = useState(0)
  const [restRemainingMs, setRestRemainingMs] = useState(0)
  const restTimerRef = useRef<number | null>(null)
  const lapTimerStartRef = useRef<number | null>(null)

  const isAutoLap = stopwatchMode.isAutoLap
  const lapDurationMs = (stopwatchMode.lapDurationSeconds ?? 0) * 1000
  const intervalMs = (stopwatchMode.intervalSeconds ?? 0) * 1000

  // --- Novice: original rAF-based stopwatch ---
  useEffect(() => {
    if (isAutoLap) return undefined
    if (!isRunning) return undefined

    const step = (timestamp: number) => {
      if (runningStartRef.current === null) {
        runningStartRef.current = timestamp
      }

      const nextElapsed = carriedElapsedRef.current + (timestamp - runningStartRef.current)
      setElapsedMs(nextElapsed)
      animationFrameRef.current = window.requestAnimationFrame(step)
    }

    animationFrameRef.current = window.requestAnimationFrame(step)

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isRunning, isAutoLap])

  // --- Auto-lap: per-lap countdown timer ---
  useEffect(() => {
    if (!isAutoLap) return undefined
    if (autoLapPhase !== 'lap') return undefined

    lapTimerStartRef.current = performance.now()
    let frameId: number | null = null

    const step = (timestamp: number) => {
      const startMs = lapTimerStartRef.current ?? timestamp
      const elapsed = timestamp - startMs
      setLapElapsedMs(elapsed)

      const totalElapsed = carriedElapsedRef.current + elapsed
      setElapsedMs(totalElapsed)

      if (elapsed >= lapDurationMs) {
        hapticLap()
        playAudioCue('lap')
        carriedElapsedRef.current += lapDurationMs
        setLapElapsedMs(0)
        setLaps((prev) => [carriedElapsedRef.current, ...prev])

        const nextLapIndex = currentLapIndex + 1
        if (nextLapIndex >= stopwatchMode.lapCount) {
          setAutoLapPhase('complete')
          setIsRunning(false)
          playAudioCue('complete')
          return
        }

        setCurrentLapIndex(nextLapIndex)
        setAutoLapPhase('rest')
        playAudioCue('interval-start')
        return
      }

      frameId = window.requestAnimationFrame(step)
    }

    frameId = window.requestAnimationFrame(step)

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [autoLapPhase, isAutoLap, lapDurationMs, currentLapIndex, stopwatchMode.lapCount])

  // --- Auto-lap: rest interval countdown ---
  useEffect(() => {
    if (!isAutoLap) return undefined
    if (autoLapPhase !== 'rest') return undefined

    const startTime = performance.now()

    const tickInterval = window.setInterval(() => {
      const elapsed = performance.now() - startTime
      const remaining = Math.max(0, intervalMs - elapsed)
      setRestRemainingMs(remaining)

      if (remaining <= 0) {
        window.clearInterval(tickInterval)
        restTimerRef.current = null
        setAutoLapPhase('lap')
        playAudioCue('interval-end')
      }
    }, 100)

    restTimerRef.current = tickInterval

    return () => {
      if (restTimerRef.current !== null) {
        window.clearInterval(restTimerRef.current)
        restTimerRef.current = null
      }
    }
  }, [autoLapPhase, isAutoLap, intervalMs])

  useEffect(() => {
    latestElapsedRef.current = elapsedMs
  }, [elapsedMs])

  const persistSession = useCallback(() => {
    const liveElapsed = isAutoLap
      ? carriedElapsedRef.current
      : runningStartRef.current === null
        ? latestElapsedRef.current
        : carriedElapsedRef.current + (performance.now() - runningStartRef.current)
    const minutes = Math.floor(liveElapsed / 60000)

    if (hasSavedSessionRef.current || minutes <= 0) return

    hasSavedSessionRef.current = true
    const endedAt = new Date().toISOString()
    const startedAt = sessionStartedAtRef.current ?? new Date(Date.now() - liveElapsed).toISOString()

    void onSaveSession({
      title: sessionPreset.title,
      note: `${stopwatchMode.label} mode using the ${sessionPreset.breathPreset.label}.`,
      durationMinutes: minutes,
      startedAt,
      endedAt,
      source: 'app',
      metadata: {
        presetId: sessionPreset.id,
        presetTitle: sessionPreset.title,
        presetTargetMinutes: sessionPreset.targetMinutes,
        breathPreset: sessionPreset.breathPreset.label,
        stopwatchMode: stopwatchMode.id,
        lapCount: laps.length,
        lapSplitsMs: computeLapSplits(laps).map((s) => s.splitMs),
      },
    })
  }, [isAutoLap, laps, onSaveSession, sessionPreset, stopwatchMode])

  // Auto-save when auto-lap completes
  useEffect(() => {
    if (autoLapPhase === 'complete') persistSession()
  }, [autoLapPhase, persistSession])

  useEffect(() => {
    return () => { persistSession() }
  }, [persistSession])

  const displayTime = useMemo(() => formatStopwatch(elapsedMs), [elapsedMs])
  const lapSplits = useMemo(() => computeLapSplits(laps), [laps])

  const sessionProgress = isAutoLap
    ? (() => {
        const totalLapMs = stopwatchMode.lapCount * lapDurationMs
        return totalLapMs > 0 ? Math.min(elapsedMs / totalLapMs, 1) : 0
      })()
    : Math.min(elapsedMs / (sessionPreset.targetMinutes * 60 * 1000), 1)

  const weatherLabel =
    weatherSnapshot.temperatureC === null
      ? weatherSnapshot.condition
      : `${weatherSnapshot.condition} ${weatherSnapshot.temperatureC}C`

  const handleReset = () => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (restTimerRef.current !== null) {
      window.clearInterval(restTimerRef.current)
      restTimerRef.current = null
    }

    setIsRunning(false)
    carriedElapsedRef.current = 0
    runningStartRef.current = null
    latestElapsedRef.current = 0
    hasSavedSessionRef.current = false
    sessionStartedAtRef.current = null
    setElapsedMs(0)
    setLaps([])
    setAutoLapPhase('idle')
    setCurrentLapIndex(0)
    setLapElapsedMs(0)
    setRestRemainingMs(0)
  }

  const handleStartPause = () => {
    primeAudioCues()
    hapticStartPause()

    if (isAutoLap) {
      if (autoLapPhase === 'idle' || autoLapPhase === 'complete') {
        if (autoLapPhase === 'complete') handleReset()
        if (!sessionStartedAtRef.current) sessionStartedAtRef.current = new Date().toISOString()
        setIsRunning(true)
        setAutoLapPhase('lap')
        playAudioCue('start')
      }
      return
    }

    if (isRunning) {
      if (runningStartRef.current !== null) {
        carriedElapsedRef.current += performance.now() - runningStartRef.current
        runningStartRef.current = null
      }
      setElapsedMs(carriedElapsedRef.current)
      setIsRunning(false)
      playAudioCue('pause')
      return
    }

    if (!sessionStartedAtRef.current) sessionStartedAtRef.current = new Date().toISOString()
    runningStartRef.current = performance.now()
    setIsRunning(true)
    playAudioCue('start')
  }

  const handleBack = () => {
    persistSession()
    onBack()
  }

  const lapRemainingMs = isAutoLap ? Math.max(0, lapDurationMs - lapElapsedMs) : 0

  return (
    <section className="screen-shell">
      <div className="top-chrome">
        <button type="button" className="round-icon-btn" onClick={handleBack} aria-label="Back">
          <BackIcon />
        </button>
        <div className="dashboard-status-chip">{stopwatchMode.label}</div>
      </div>

      <div className="content-stack space-y-4">
        <article className="glass-sheet stopwatch-primary-sheet">
          <p className="section-kicker">Precision Chronometer</p>
          <h2 className="section-title mt-2">{sessionPreset.title}</h2>
          <p className="support-copy mt-2">{sessionPreset.summary}</p>

          <div className="stopwatch-timer-well mt-6 px-5 py-6">
            <div className="card-media-strip card-media-strip-stopwatch" aria-hidden />

            {autoLapPhase === 'rest' ? (
              <div className="stopwatch-rest-overlay">
                <p className="hud-font text-[1.4rem] text-[var(--text-secondary)]">Rest</p>
                <p className="hud-font text-[2.6rem] font-semibold tracking-[-0.06em] text-[var(--text-primary)]">
                  {formatStopwatch(restRemainingMs)}
                </p>
                <p className="support-copy mt-2">Next lap starts automatically</p>
              </div>
            ) : autoLapPhase === 'complete' ? (
              <div className="stopwatch-rest-overlay">
                <p className="hud-font text-[1.4rem] text-[var(--accent-deep)]">Session Complete</p>
                <p className="hud-font text-[3rem] font-semibold tracking-[-0.06em] text-[var(--text-primary)] sm:text-[3.4rem]">
                  {displayTime}
                </p>
                <p className="support-copy mt-2">{stopwatchMode.lapCount} laps finished</p>
              </div>
            ) : (
              <>
                <p className="hud-font text-[3rem] font-semibold tracking-[-0.06em] text-[var(--text-primary)] sm:text-[3.4rem]">
                  {displayTime}
                </p>
                <div className={`timer-ring mt-5 ${isRunning ? 'timer-ring-spin' : ''}`} />
              </>
            )}

            {isAutoLap && autoLapPhase === 'lap' && (
              <div className="mt-3 text-center">
                <p className="hud-font text-sm text-[var(--text-secondary)]">
                  Lap {currentLapIndex + 1} of {stopwatchMode.lapCount} &mdash; {formatStopwatch(lapRemainingMs)} remaining
                </p>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <div className="soft-progress">
                <div
                  className="soft-progress-fill transition-all duration-300"
                  style={{ width: `${Math.max(sessionProgress * 100, 2)}%` }}
                />
              </div>
              <div className="info-row text-sm text-[var(--text-muted)]">
                {isAutoLap ? (
                  <>
                    <span>{stopwatchMode.lapCount} laps &times; {(stopwatchMode.lapDurationSeconds ?? 0) / 60} min</span>
                    <span className="hud-font text-[var(--text-secondary)]">{Math.round(sessionProgress * 100)}%</span>
                  </>
                ) : (
                  <>
                    <span>{sessionPreset.targetMinutes} min target</span>
                    <span className="hud-font text-[var(--text-secondary)]">{Math.round(sessionProgress * 100)}%</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="card-media-strip card-media-strip-stopwatch-metrics mt-4" aria-hidden />

          <div className="metric-chip-grid mt-4">
            <MetricChip label="Weather" value={weatherLabel} />
            <MetricChip label="Heart Rate" value={`${heartRate} BPM`} />
            <MetricChip label="Breath" value={sessionPreset.breathPreset.label} />
          </div>

          {isAutoLap ? (
            <div className="button-row button-row--2 mt-5">
              <button
                type="button"
                className="primary-btn primary-btn-strong"
                onClick={handleStartPause}
                disabled={autoLapPhase === 'lap' || autoLapPhase === 'rest'}
              >
                {autoLapPhase === 'complete' ? 'Restart' : 'Start'}
              </button>
              <button type="button" className="secondary-btn" onClick={handleReset}>
                Reset
              </button>
            </div>
          ) : (
            <div className="button-row mt-5">
              <button
                type="button"
                className={`primary-btn ${isRunning ? '' : 'primary-btn-strong'}`}
                onClick={handleStartPause}
              >
                {isRunning ? 'Pause' : 'Start'}
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  hapticLap()
                  playAudioCue('lap')
                  setLaps((previous) => [elapsedMs, ...previous])
                }}
                disabled={!isRunning}
              >
                Lap
              </button>
              <button type="button" className="secondary-btn" onClick={handleReset}>
                Reset
              </button>
            </div>
          )}
        </article>

        <article ref={lapsRef} className="glass-sheet stopwatch-lap-sheet min-h-28 cinema-surface">
          <div className="info-row">
            <div>
              <p className="title-font text-[1.35rem] font-medium text-[var(--text-primary)]">Lap Memory</p>
              <p className="support-copy mt-1">Each lap is saved without interrupting the master clock.</p>
            </div>
            <p className="metric-number-soft text-[1.6rem]">{laps.length}</p>
          </div>

          <div className="mt-4 max-h-36 space-y-2 overflow-y-auto pr-1">
            {lapSplits.length === 0 ? (
              <div className="glass-card-compact lap-memory-tile text-sm text-[var(--text-muted)]">No laps captured yet.</div>
            ) : (
              lapSplits.map((split) => (
                <div
                  key={`${split.cumulativeMs}-${split.lapNumber}`}
                  className="glass-card-compact lap-memory-tile flex items-center justify-between text-sm"
                >
                  <span className="text-[var(--text-secondary)]">Lap {split.lapNumber}</span>
                  <span className="hud-font text-[var(--accent-deep)]">{formatStopwatch(split.splitMs)}</span>
                  <span className="hud-font text-[var(--text-muted)] text-xs">{formatStopwatch(split.cumulativeMs)}</span>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  )
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-chip">
      <p className="metric-chip-label">{label}</p>
      <p className="metric-chip-value mt-3">{value}</p>
    </div>
  )
}

function BackIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
      <path d="M11.8 4.5 6.2 10l5.6 5.5" />
    </svg>
  )
}

