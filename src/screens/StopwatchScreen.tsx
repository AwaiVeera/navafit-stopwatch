import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { SessionPreset, SessionSavePayload, WeatherSnapshot } from '../types'

interface StopwatchScreenProps {
  onBack: () => void
  weatherSnapshot: WeatherSnapshot
  heartRate: number
  sessionPreset: SessionPreset
  onSaveSession: (session: SessionSavePayload) => Promise<void> | void
}

export function StopwatchScreen({
  onBack,
  weatherSnapshot,
  heartRate,
  sessionPreset,
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

  useEffect(() => {
    if (!isRunning) {
      return undefined
    }

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
  }, [isRunning])

  useEffect(() => {
    latestElapsedRef.current = elapsedMs
  }, [elapsedMs])

  const persistSession = useCallback(() => {
    const liveElapsed =
      runningStartRef.current === null
        ? latestElapsedRef.current
        : carriedElapsedRef.current + (performance.now() - runningStartRef.current)
    const minutes = Math.floor(liveElapsed / 60000)

    if (hasSavedSessionRef.current) {
      return
    }

    if (minutes <= 0) {
      return
    }

    hasSavedSessionRef.current = true
    const endedAt = new Date().toISOString()
    const startedAt = sessionStartedAtRef.current ?? new Date(Date.now() - liveElapsed).toISOString()

    void onSaveSession({
      title: sessionPreset.title,
      note: `Captured from the adaptive stopwatch using the ${sessionPreset.breathPreset.label}.`,
      durationMinutes: minutes,
      startedAt,
      endedAt,
      source: 'app',
      metadata: {
        presetId: sessionPreset.id,
        presetTitle: sessionPreset.title,
        presetTargetMinutes: sessionPreset.targetMinutes,
        breathPreset: sessionPreset.breathPreset.label,
        lapCount: laps.length,
      },
    })
  }, [laps.length, onSaveSession, sessionPreset])

  useEffect(() => {
    return () => {
      persistSession()
    }
  }, [persistSession])

  const displayTime = useMemo(() => formatStopwatch(elapsedMs), [elapsedMs])
  const sessionProgress = Math.min(elapsedMs / (sessionPreset.targetMinutes * 60 * 1000), 1)
  const weatherLabel =
    weatherSnapshot.temperatureC === null
      ? weatherSnapshot.condition
      : `${weatherSnapshot.condition} ${weatherSnapshot.temperatureC}C`

  const handleReset = () => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    setIsRunning(false)
    carriedElapsedRef.current = 0
    runningStartRef.current = null
    latestElapsedRef.current = 0
    hasSavedSessionRef.current = false
    sessionStartedAtRef.current = null
    setElapsedMs(0)
    setLaps([])
  }

  const handleStartPause = () => {
    if (isRunning) {
      if (runningStartRef.current !== null) {
        carriedElapsedRef.current += performance.now() - runningStartRef.current
        runningStartRef.current = null
      }
      setElapsedMs(carriedElapsedRef.current)
      setIsRunning(false)
      return
    }

    if (!sessionStartedAtRef.current) {
      sessionStartedAtRef.current = new Date().toISOString()
    }

    runningStartRef.current = performance.now()
    setIsRunning(true)
  }

  const handleBack = () => {
    persistSession()
    onBack()
  }

  return (
    <section className="screen-shell">
      <div className="top-chrome">
        <button type="button" className="round-icon-btn" onClick={handleBack} aria-label="Back">
          <BackIcon />
        </button>
        <button
          type="button"
          className="round-icon-btn"
          aria-label="Jump to lap memory"
          onClick={() => lapsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          <GridIcon />
        </button>
      </div>

      <div className="content-stack space-y-4">
        <article className="glass-sheet">
          <p className="section-kicker">Precision Chronometer</p>
          <h2 className="section-title mt-2">{sessionPreset.title}</h2>
          <p className="support-copy mt-2">{sessionPreset.summary}</p>

          <div className="mt-6 rounded-[2rem] border border-white/8 bg-black/10 px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <p className="hud-font text-[3rem] font-semibold tracking-[-0.06em] text-[var(--text-primary)] sm:text-[3.4rem]">
              {displayTime}
            </p>
            <div className={`timer-ring mt-5 ${isRunning ? 'timer-ring-spin' : ''}`} />

            <div className="mt-4 space-y-2">
              <div className="soft-progress">
                <div
                  className="soft-progress-fill transition-all duration-300"
                  style={{ width: `${Math.max(sessionProgress * 100, 2)}%` }}
                />
              </div>
              <div className="info-row text-sm text-[var(--text-muted)]">
                <span>{sessionPreset.targetMinutes} min target</span>
                <span className="hud-font text-[var(--text-secondary)]">{Math.round(sessionProgress * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="metric-chip-grid mt-4">
            <MetricChip label="Weather" value={weatherLabel} />
            <MetricChip label="Heart Rate" value={`${heartRate} BPM`} />
            <MetricChip label="Breath" value={sessionPreset.breathPreset.label} />
          </div>

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
              onClick={() => setLaps((previous) => [elapsedMs, ...previous])}
              disabled={!isRunning}
            >
              Lap
            </button>
            <button type="button" className="secondary-btn" onClick={handleReset}>
              Reset
            </button>
          </div>
        </article>

        <article ref={lapsRef} className="glass-sheet min-h-28">
          <div className="info-row">
            <div>
              <p className="title-font text-[1.35rem] font-medium text-[var(--text-primary)]">Lap Memory</p>
              <p className="support-copy mt-1">Each lap is saved without interrupting the master clock.</p>
            </div>
            <p className="metric-number-soft text-[1.6rem]">{laps.length}</p>
          </div>

          <div className="mt-4 max-h-36 space-y-2 overflow-y-auto pr-1">
            {laps.length === 0 ? (
              <div className="glass-card-compact text-sm text-[var(--text-muted)]">No laps captured yet.</div>
            ) : (
              laps.map((lap, index) => (
                <div
                  key={`${lap}-${index}`}
                  className="glass-card-compact flex items-center justify-between text-sm"
                >
                  <span className="text-[var(--text-secondary)]">Lap {laps.length - index}</span>
                  <span className="hud-font text-[var(--text-primary)]">{formatStopwatch(lap)}</span>
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

function GridIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-current">
      {[
        [5, 5],
        [10, 5],
        [15, 5],
        [5, 10],
        [10, 10],
        [15, 10],
        [5, 15],
        [10, 15],
        [15, 15],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1" />
      ))}
    </svg>
  )
}

function formatStopwatch(milliseconds: number) {
  const totalCentiseconds = Math.floor(milliseconds / 10)
  const minutes = Math.floor(totalCentiseconds / 6000)
  const seconds = Math.floor((totalCentiseconds % 6000) / 100)
  const centiseconds = totalCentiseconds % 100

  return `${pad2(minutes)}:${pad2(seconds)}.${pad2(centiseconds)}`
}

function pad2(value: number) {
  return value.toString().padStart(2, '0')
}
