import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { AudioCue } from '../services/audio-cues'
import { playAudioCue, primeAudioCues } from '../services/audio-cues'
import { breathPhaseFeedback, successFeedback, tapFeedback } from '../utils/feedback'
import {
  GUIDED_BREATH_LEVELS,
  findGuidedLevelByPresetLabel,
  type GuidedBreathLevel,
} from '../services/guided-breath-levels'
import type {
  BreathPreset,
  BreathProtocol,
  BreathworkMode,
  HealthMetrics,
  SessionPreset,
  SessionSavePayload,
} from '../types'

const MIN_BREATH_SAVE_DURATION_MS = 5_000

type ManualPhase = 'Inhale' | 'Hold' | 'Exhale'

interface ManualPhaseLogEntry {
  index: number
  phase: ManualPhase
  durationMs: number
  startedAt: string
}

function formatPhaseDuration(ms: number): string {
  const totalSeconds = ms / 1000
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`
  }
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds - minutes * 60)
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

function phaseCueForName(name: string): AudioCue {
  const normalised = name.toLowerCase()
  if (normalised.includes('inhale') || normalised.includes('deep breath')) return 'inhale'
  if (normalised.includes('hold') || normalised.includes('pause')) return 'hold'
  return 'exhale'
}

function phaseClassForName(name: string): 'breath-inhale' | 'breath-hold' | 'breath-exhale' {
  const normalised = name.toLowerCase()
  if (normalised.includes('inhale') || normalised.includes('deep breath')) return 'breath-inhale'
  if (normalised.includes('hold') || normalised.includes('pause')) return 'breath-hold'
  return 'breath-exhale'
}

interface BreathScreenProps {
  health: HealthMetrics
  sessionPreset: SessionPreset
  breathworkMode: BreathworkMode
  onBack: () => void
  onSaveSession?: (session: SessionSavePayload) => Promise<void> | void
}

function BreathScreenInner({ health, sessionPreset, breathworkMode, onBack, onSaveSession }: BreathScreenProps) {
  const isNovice = breathworkMode.id === 'novice' || breathworkMode.protocols.length === 0

  if (isNovice) {
    return (
      <NoviceBreathScreen
        health={health}
        sessionPreset={sessionPreset}
        onBack={onBack}
        onSaveSession={onSaveSession}
      />
    )
  }

  return (
    <ProtocolBreathScreen
      health={health}
      breathworkMode={breathworkMode}
      onBack={onBack}
      onSaveSession={onSaveSession}
    />
  )
}

export const BreathScreen = memo(BreathScreenInner)

// --- Novice: original behavior preserved exactly ---

function NoviceBreathScreen({
  health,
  sessionPreset,
  onBack,
  onSaveSession,
}: {
  health: HealthMetrics
  sessionPreset: SessionPreset
  onBack: () => void
  onSaveSession?: (session: SessionSavePayload) => Promise<void> | void
}) {
  const [breathMode, setBreathMode] = useState<'guided' | 'manual'>('guided')

  const initialGuidedLevel = useMemo<GuidedBreathLevel>(() => {
    const matched = findGuidedLevelByPresetLabel(sessionPreset.breathPreset.label)
    return matched ?? GUIDED_BREATH_LEVELS[0]
  }, [sessionPreset.breathPreset.label])

  const [selectedGuidedLevelId, setSelectedGuidedLevelId] = useState<string>(initialGuidedLevel.id)
  const selectedGuidedLevel = useMemo<GuidedBreathLevel>(
    () =>
      GUIDED_BREATH_LEVELS.find((entry) => entry.id === selectedGuidedLevelId)
      ?? initialGuidedLevel,
    [selectedGuidedLevelId, initialGuidedLevel],
  )
  const guidedPreset: BreathPreset = selectedGuidedLevel.preset

  const [breathSecond, setBreathSecond] = useState(0)
  const breathCycleSeconds = guidedPreset.cycleSeconds

  useEffect(() => {
    if (breathMode !== 'guided') return undefined

    const breathId = window.setInterval(() => {
      setBreathSecond((previous) => (previous + 1) % breathCycleSeconds)
    }, 1000)

    return () => window.clearInterval(breathId)
  }, [breathCycleSeconds, breathMode])

  const inhaleBoundary = guidedPreset.inhaleSeconds
  const holdBoundary = inhaleBoundary + guidedPreset.holdSeconds

  const guidedPhaseLabel: ManualPhase =
    breathSecond < inhaleBoundary ? 'Inhale' : breathSecond < holdBoundary ? 'Hold' : 'Exhale'

  // ── Manual mode: open-ended count-up timers (user controls duration) ──
  const [manualPhase, setManualPhase] = useState<ManualPhase | null>(null)
  const [manualPhaseElapsedMs, setManualPhaseElapsedMs] = useState(0)
  const manualPhaseStartRef = useRef<number | null>(null)
  const manualPhaseStartedAtRef = useRef<string | null>(null)
  const manualSessionStartRef = useRef<string | null>(null)
  const manualSessionStartMsRef = useRef<number | null>(null)
  const [manualPhaseLog, setManualPhaseLog] = useState<ManualPhaseLogEntry[]>([])
  const manualPhaseLogRef = useRef<ManualPhaseLogEntry[]>([])
  useEffect(() => {
    manualPhaseLogRef.current = manualPhaseLog
  }, [manualPhaseLog])

  // Drives the live count-up label while a manual phase is active.
  useEffect(() => {
    if (breathMode !== 'manual' || manualPhase === null) return undefined

    let frameId: number | null = null
    const step = (timestamp: number) => {
      const startMs = manualPhaseStartRef.current ?? timestamp
      setManualPhaseElapsedMs(timestamp - startMs)
      frameId = window.requestAnimationFrame(step)
    }
    frameId = window.requestAnimationFrame(step)

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [breathMode, manualPhase])

  const closeActiveManualPhase = useCallback(() => {
    if (manualPhase === null || manualPhaseStartRef.current === null) return null

    const elapsed = performance.now() - manualPhaseStartRef.current
    if (elapsed < 250) {
      manualPhaseStartRef.current = null
      manualPhaseStartedAtRef.current = null
      setManualPhase(null)
      setManualPhaseElapsedMs(0)
      return null
    }

    const entry: ManualPhaseLogEntry = {
      index: manualPhaseLogRef.current.length + 1,
      phase: manualPhase,
      durationMs: Math.max(0, Math.round(elapsed)),
      startedAt: manualPhaseStartedAtRef.current ?? new Date().toISOString(),
    }

    manualPhaseLogRef.current = [entry, ...manualPhaseLogRef.current]
    setManualPhaseLog(manualPhaseLogRef.current)

    manualPhaseStartRef.current = null
    manualPhaseStartedAtRef.current = null
    setManualPhase(null)
    setManualPhaseElapsedMs(0)
    return entry
  }, [manualPhase])

  const startManualPhase = useCallback(
    (phase: ManualPhase) => {
      primeAudioCues()
      setBreathMode('manual')

      // Tapping the same phase that's already running just closes it.
      if (manualPhase === phase) {
        closeActiveManualPhase()
        return
      }

      // Switching to a different phase: close the previous one first.
      if (manualPhase !== null) {
        closeActiveManualPhase()
      }

      const now = performance.now()
      const nowIso = new Date().toISOString()
      manualPhaseStartRef.current = now
      manualPhaseStartedAtRef.current = nowIso
      setManualPhase(phase)
      setManualPhaseElapsedMs(0)

      if (manualSessionStartRef.current === null) {
        manualSessionStartRef.current = nowIso
        manualSessionStartMsRef.current = now
      }

      playAudioCue(phaseCueForName(phase))
      breathPhaseFeedback(phase)
    },
    [manualPhase, closeActiveManualPhase],
  )

  const stopManualPhase = useCallback(() => {
    closeActiveManualPhase()
  }, [closeActiveManualPhase])

  const resetManualSessionTracking = useCallback(() => {
    setManualPhase(null)
    setManualPhaseElapsedMs(0)
    setManualPhaseLog([])
    manualPhaseLogRef.current = []
    manualPhaseStartRef.current = null
    manualPhaseStartedAtRef.current = null
    manualSessionStartRef.current = null
    manualSessionStartMsRef.current = null
  }, [])

  const persistManualSession = useCallback(() => {
    closeActiveManualPhase()
    if (!onSaveSession) return
    if (manualSessionStartRef.current === null || manualSessionStartMsRef.current === null) return

    const elapsed = performance.now() - manualSessionStartMsRef.current
    if (elapsed < MIN_BREATH_SAVE_DURATION_MS) return

    const minutes = Math.max(1, Math.round(elapsed / 60000))
    const log = manualPhaseLogRef.current.slice().reverse()
    const startedAt = manualSessionStartRef.current
    const endedAt = new Date().toISOString()
    const inhaleCount = log.filter((entry) => entry.phase === 'Inhale').length
    const holdCount = log.filter((entry) => entry.phase === 'Hold').length
    const exhaleCount = log.filter((entry) => entry.phase === 'Exhale').length

    void onSaveSession({
      title: 'Manual breathwork session',
      note: `${log.length} phases recorded (Inhale ${inhaleCount} / Hold ${holdCount} / Exhale ${exhaleCount}).`,
      durationMinutes: minutes,
      startedAt,
      endedAt,
      source: 'app',
      metadata: {
        kind: 'breathwork-manual',
        breathPreset: 'manual-open-timer',
        phaseLog: log.map((entry) => ({
          index: entry.index,
          phase: entry.phase,
          durationMs: entry.durationMs,
          startedAt: entry.startedAt,
        })),
        inhaleCount,
        holdCount,
        exhaleCount,
      },
    })

    manualSessionStartRef.current = null
    manualSessionStartMsRef.current = null
  }, [onSaveSession, closeActiveManualPhase])

  useEffect(() => {
    return () => {
      persistManualSession()
    }
  }, [persistManualSession])

  const handleBackPress = useCallback(() => {
    persistManualSession()
    onBack()
  }, [onBack, persistManualSession])

  // ── Ring + label state ──
  const phaseLabel: ManualPhase = breathMode === 'manual' ? manualPhase ?? 'Inhale' : guidedPhaseLabel
  const phaseRingClass =
    phaseLabel === 'Inhale'
      ? 'breath-inhale'
      : phaseLabel === 'Hold'
        ? 'breath-hold'
        : 'breath-exhale'

  const guidedPhaseDurationSeconds =
    guidedPhaseLabel === 'Inhale'
      ? guidedPreset.inhaleSeconds
      : guidedPhaseLabel === 'Hold'
        ? guidedPreset.holdSeconds
        : guidedPreset.exhaleSeconds
  const guidedElapsedSeconds =
    guidedPhaseLabel === 'Inhale'
      ? breathSecond
      : guidedPhaseLabel === 'Hold'
        ? breathSecond - inhaleBoundary
        : breathSecond - holdBoundary
  const guidedRemainingSeconds = Math.max(guidedPhaseDurationSeconds - guidedElapsedSeconds, 0)

  const phaseProgress = breathMode === 'guided'
    ? guidedPhaseDurationSeconds > 0
      ? Math.min(Math.max(guidedElapsedSeconds / guidedPhaseDurationSeconds, 0), 1)
      : 0
    : manualPhase === null
      ? 0
      : 1

  const previousGuidedPhaseRef = useRef<string>(guidedPhaseLabel)
  useEffect(() => {
    if (breathMode !== 'guided') return
    if (previousGuidedPhaseRef.current === guidedPhaseLabel) return
    previousGuidedPhaseRef.current = guidedPhaseLabel
    playAudioCue(phaseCueForName(guidedPhaseLabel))
    breathPhaseFeedback(guidedPhaseLabel)
  }, [guidedPhaseLabel, breathMode])

  const detailLabel =
    breathMode === 'guided'
      ? `${Math.ceil(guidedRemainingSeconds)}s`
      : manualPhase === null
        ? 'Tap to start'
        : formatPhaseDuration(manualPhaseElapsedMs)

  const breathCue = useMemo(() => {
    if (health.stressLevel > 55 || health.breathPerMinute > 18) {
      return 'Use a slower exhale and stay here until your breath rate settles.'
    }
    return 'Markers are steady. Use this tab before or after your next block to stay controlled.'
  }, [health.breathPerMinute, health.stressLevel])

  const totalManualPhases = manualPhaseLog.length
  const totalManualDurationMs = manualPhaseLog.reduce((sum, entry) => sum + entry.durationMs, 0)

  return (
    <section className="screen-shell">
      <div className="top-chrome">
        <button type="button" className="round-icon-btn" onClick={handleBackPress} aria-label="Back">
          <BackIcon />
        </button>
        <button
          type="button"
          className="round-icon-btn"
          aria-label="Reset breath session"
          onClick={() => {
            tapFeedback()
            primeAudioCues()
            setBreathSecond(0)
            resetManualSessionTracking()
          }}
        >
          <BreathIcon />
        </button>
      </div>

      <div className="content-stack space-y-4">
        <article className="glass-sheet breath-primary-sheet">
          <p className="section-kicker">Breath Cadence</p>
          <h2 className="section-title mt-2">BreathWork</h2>
          <p className="support-copy mt-2">
            Guided mode walks you through a research-backed cadence at your chosen level. Manual mode runs open-ended timers for each phase you tap.
          </p>

          <div className="button-row button-row--2 mt-4">
            <button
              type="button"
              className={`secondary-btn ${breathMode === 'guided' ? 'primary-btn-strong' : ''}`}
              onClick={() => {
                primeAudioCues()
                stopManualPhase()
                setBreathMode('guided')
                setBreathSecond(0)
                playAudioCue(phaseCueForName(guidedPhaseLabel))
                breathPhaseFeedback(guidedPhaseLabel)
              }}
            >
              Guided
            </button>
            <button
              type="button"
              className={`secondary-btn ${breathMode === 'manual' ? 'primary-btn-strong' : ''}`}
              onClick={() => {
                primeAudioCues()
                setBreathMode('manual')
              }}
            >
              Manual
            </button>
          </div>

          <div className="mt-6 grid place-items-center breath-orb-wrap">
            <BreathCadenceRing
              phaseLabel={breathMode === 'manual' && manualPhase === null ? 'Manual' : phaseLabel}
              progress={phaseProgress}
              phaseClassName={phaseRingClass}
              detailLabel={detailLabel}
            />
          </div>

          {breathMode === 'guided' ? (
            <>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="glass-card-compact breath-phase-tile cinema-surface cinema-surface--sub">
                  <p className="label-text">Inhale</p>
                  <p className="mt-2 text-[1.05rem] text-[var(--text-primary)]">{guidedPreset.inhaleSeconds}s</p>
                </div>
                <div className="glass-card-compact breath-phase-tile cinema-surface cinema-surface--sub">
                  <p className="label-text">Hold</p>
                  <p className="mt-2 text-[1.05rem] text-[var(--text-primary)]">{guidedPreset.holdSeconds}s</p>
                </div>
                <div className="glass-card-compact breath-phase-tile cinema-surface cinema-surface--sub">
                  <p className="label-text">Exhale</p>
                  <p className="mt-2 text-[1.05rem] text-[var(--text-primary)]">{guidedPreset.exhaleSeconds}s</p>
                </div>
              </div>

              <div className="mt-5">
                <p className="label-text">Guided level</p>
                <p className="support-copy mt-1">{selectedGuidedLevel.description}</p>
                <p className="mt-1 text-xs text-[var(--text-dim)]">Source: {selectedGuidedLevel.source}</p>
                <select
                  className="login-input mt-3"
                  value={selectedGuidedLevelId}
                  onChange={(event) => {
                    primeAudioCues()
                    setSelectedGuidedLevelId(event.target.value)
                    setBreathSecond(0)
                  }}
                  aria-label="Guided breath level"
                >
                  {GUIDED_BREATH_LEVELS.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label} ({entry.preset.inhaleSeconds}-{entry.preset.holdSeconds}-{entry.preset.exhaleSeconds})
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="button-row mt-5">
                <button
                  type="button"
                  className={`secondary-btn ${manualPhase === 'Inhale' ? 'primary-btn-strong' : ''}`}
                  onClick={() => startManualPhase('Inhale')}
                >
                  Inhale
                </button>
                <button
                  type="button"
                  className={`secondary-btn ${manualPhase === 'Hold' ? 'primary-btn-strong' : ''}`}
                  onClick={() => startManualPhase('Hold')}
                >
                  Hold
                </button>
                <button
                  type="button"
                  className={`secondary-btn ${manualPhase === 'Exhale' ? 'primary-btn-strong' : ''}`}
                  onClick={() => startManualPhase('Exhale')}
                >
                  Exhale
                </button>
              </div>
              <div className="button-row button-row--2 mt-3">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={stopManualPhase}
                  disabled={manualPhase === null}
                >
                  Stop phase
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    tapFeedback()
                    persistManualSession()
                    resetManualSessionTracking()
                  }}
                  disabled={manualPhaseLog.length === 0 && manualPhase === null}
                >
                  Save &amp; reset
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-[var(--text-muted)]">
                <span>
                  Phases: <span className="hud-font text-[var(--text-secondary)]">{totalManualPhases}</span>
                </span>
                <span>
                  Total: <span className="hud-font text-[var(--text-secondary)]">{formatPhaseDuration(totalManualDurationMs)}</span>
                </span>
              </div>
            </>
          )}
        </article>

        {breathMode === 'manual' && (
          <article className="glass-sheet">
            <div className="info-row">
              <div>
                <p className="title-font text-[1.2rem] font-medium text-[var(--text-primary)]">Phase log</p>
                <p className="support-copy mt-1">
                  {manualPhaseLog.length === 0
                    ? 'Tap Inhale, Hold, or Exhale to start a phase. Tap again or pick another phase to record.'
                    : 'Most recent phase is at the top. Saved automatically when you go back.'}
                </p>
              </div>
              <p className="metric-number-soft text-[1.45rem]">{totalManualPhases}</p>
            </div>

            {manualPhaseLog.length > 0 && (
              <div className="mt-4 max-h-44 space-y-2 overflow-y-auto pr-1">
                {manualPhaseLog.map((entry) => (
                  <div
                    key={`${entry.index}-${entry.startedAt}`}
                    className="glass-card-compact lap-memory-tile flex items-center justify-between text-sm"
                  >
                    <span className="text-[var(--text-secondary)]">#{entry.index} {entry.phase}</span>
                    <span className="hud-font text-[var(--accent-deep)]">{formatPhaseDuration(entry.durationMs)}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        )}

        <article className="glass-sheet breath-marker-sheet cinema-surface">
          <div className="info-row">
            <div>
              <p className="title-font text-[1.35rem] font-medium text-[var(--text-primary)]">Breath Markers</p>
              <p className="support-copy mt-1">{breathCue}</p>
            </div>
            <div className="dashboard-status-chip">
              {breathMode === 'guided' ? selectedGuidedLevel.label : 'Manual'}
            </div>
          </div>

          <div className="metric-chip-grid mt-4">
            <MetricChip label="Heart Rate" value={`${health.heartRate} BPM`} />
            <MetricChip label="Breath Rate" value={`${health.breathPerMinute}/min`} />
            <MetricChip label="Stress" value={`${health.stressLevel}%`} />
          </div>
        </article>
      </div>
    </section>
  )
}

// --- Intermediate / Advanced / Expert: protocol-driven ---

function ProtocolBreathScreen({
  health,
  breathworkMode,
  onBack,
  onSaveSession,
}: {
  health: HealthMetrics
  breathworkMode: BreathworkMode
  onBack: () => void
  onSaveSession?: (session: SessionSavePayload) => Promise<void> | void
}) {
  const [selectedProtocol, setSelectedProtocol] = useState<BreathProtocol | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [phaseElapsedMs, setPhaseElapsedMs] = useState(0)
  const [currentRound, setCurrentRound] = useState(1)
  const [isComplete, setIsComplete] = useState(false)
  const protocolStartedAtRef = useRef<string | null>(null)
  const protocolStartedMsRef = useRef<number | null>(null)

  const protocol = selectedProtocol
  const phase = protocol ? protocol.phases[currentPhaseIndex] : null
  const phaseDurationMs = phase ? phase.durationSeconds * 1000 : 0
  const phaseRemainingMs = Math.max(0, phaseDurationMs - phaseElapsedMs)
  const totalRounds = protocol?.rounds ?? null

  useEffect(() => {
    if (!isActive || !protocol || !phase) return undefined

    const startTime = performance.now()

    const tickInterval = window.setInterval(() => {
      const elapsed = performance.now() - startTime
      setPhaseElapsedMs(elapsed)

      if (elapsed >= phaseDurationMs) {
        window.clearInterval(tickInterval)

        const nextPhaseIndex = currentPhaseIndex + 1
        if (nextPhaseIndex < protocol.phases.length) {
          setCurrentPhaseIndex(nextPhaseIndex)
          setPhaseElapsedMs(0)
        } else {
          if (totalRounds !== null) {
            if (currentRound >= totalRounds) {
              setIsActive(false)
              setIsComplete(true)
              return
            }
            setCurrentRound((prev) => prev + 1)
          }
          setCurrentPhaseIndex(0)
          setPhaseElapsedMs(0)
        }
      }
    }, 50)

    return () => window.clearInterval(tickInterval)
  }, [isActive, protocol, phase, phaseDurationMs, currentPhaseIndex, totalRounds, currentRound])

  const phaseRingClass = phase ? phaseClassForName(phase.name) : 'breath-exhale'
  const phaseProgress = isComplete
    ? 1
    : isActive && phaseDurationMs > 0
      ? Math.min(phaseElapsedMs / phaseDurationMs, 1)
      : 0
  const phaseDetailLabel = isComplete
    ? 'Done'
    : phase
      ? `${Math.max(1, Math.ceil(phaseRemainingMs / 1000))}s`
      : '--'

  const previousPhaseKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!isActive || !phase) {
      previousPhaseKeyRef.current = null
      return
    }
    const key = `${currentRound}-${currentPhaseIndex}`
    if (previousPhaseKeyRef.current === key) return
    previousPhaseKeyRef.current = key
    playAudioCue(phaseCueForName(phase.name))
    breathPhaseFeedback(phase.name)
  }, [isActive, phase, currentPhaseIndex, currentRound])

  useEffect(() => {
    if (!isComplete) return
    playAudioCue('breath-complete')
    successFeedback()

    if (!onSaveSession || !selectedProtocol) return
    if (protocolStartedAtRef.current === null || protocolStartedMsRef.current === null) return

    const elapsed = performance.now() - protocolStartedMsRef.current
    if (elapsed < MIN_BREATH_SAVE_DURATION_MS) {
      protocolStartedAtRef.current = null
      protocolStartedMsRef.current = null
      return
    }

    const minutes = Math.max(1, Math.round(elapsed / 60000))
    const startedAt = protocolStartedAtRef.current
    const endedAt = new Date().toISOString()

    void onSaveSession({
      title: `${selectedProtocol.label} breathwork`,
      note: `${breathworkMode.label} protocol completed.`,
      durationMinutes: minutes,
      startedAt,
      endedAt,
      source: 'app',
      metadata: {
        kind: 'breathwork-protocol',
        modeId: breathworkMode.id,
        protocolId: selectedProtocol.id,
        rounds: selectedProtocol.rounds,
        phases: selectedProtocol.phases.map((p) => ({ name: p.name, durationSeconds: p.durationSeconds })),
      },
    })

    protocolStartedAtRef.current = null
    protocolStartedMsRef.current = null
  }, [isComplete, onSaveSession, selectedProtocol, breathworkMode])

  const handleStart = () => {
    tapFeedback()
    primeAudioCues()
    playAudioCue('breath-start')
    setCurrentPhaseIndex(0)
    setPhaseElapsedMs(0)
    setCurrentRound(1)
    setIsComplete(false)
    setIsActive(true)
    protocolStartedAtRef.current = new Date().toISOString()
    protocolStartedMsRef.current = performance.now()
  }

  const handleStop = () => {
    tapFeedback()
    setIsActive(false)
    setCurrentPhaseIndex(0)
    setPhaseElapsedMs(0)
    setCurrentRound(1)
    setIsComplete(false)
  }

  if (!selectedProtocol) {
    return (
      <section className="screen-shell">
        <div className="top-chrome">
          <button type="button" className="round-icon-btn" onClick={onBack} aria-label="Back">
            <BackIcon />
          </button>
          <div className="dashboard-status-chip">{breathworkMode.label}</div>
        </div>

        <div className="content-stack space-y-4">
          <article className="glass-sheet cinema-surface">
            <p className="section-kicker">Breath Cadence</p>
            <h2 className="section-title mt-2">{breathworkMode.label} Breathwork</h2>
            <p className="support-copy mt-2">Choose a protocol to begin your guided breathing session.</p>
          </article>

          {breathworkMode.protocols.map((proto) => (
            <button
              key={proto.id}
              type="button"
              className="glass-sheet protocol-card w-full text-left"
              onClick={() => setSelectedProtocol(proto)}
            >
              <p className="title-font text-[1.15rem] font-medium text-[var(--text-primary)]">{proto.label}</p>
              <p className="support-copy mt-1">{proto.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="protocol-tag">{proto.pathway}</span>
                {proto.rounds !== null && <span className="protocol-tag">{proto.rounds} rounds</span>}
                {proto.phases.map((p) => (
                  <span key={p.name} className="protocol-tag">{p.name} {p.durationSeconds}s</span>
                ))}
              </div>
              {proto.safetyWarning && (
                <div className="safety-banner mt-3">
                  {proto.safetyWarning}
                </div>
              )}
            </button>
          ))}

          <article className="glass-sheet breath-marker-sheet cinema-surface">
            <div className="metric-chip-grid mt-2">
              <MetricChip label="Heart Rate" value={`${health.heartRate} BPM`} />
              <MetricChip label="Breath Rate" value={`${health.breathPerMinute}/min`} />
              <MetricChip label="Stress" value={`${health.stressLevel}%`} />
            </div>
          </article>
        </div>
      </section>
    )
  }

  return (
    <section className="screen-shell">
      <div className="top-chrome">
        <button
          type="button"
          className="round-icon-btn"
          onClick={() => {
            handleStop()
            setSelectedProtocol(null)
          }}
          aria-label="Back to protocols"
        >
          <BackIcon />
        </button>
        <div className="dashboard-status-chip">{selectedProtocol.label}</div>
      </div>

      <div className="content-stack space-y-4">
        <article className="glass-sheet breath-primary-sheet">
          <p className="section-kicker">{breathworkMode.label} Breathwork</p>
          <h2 className="section-title mt-2">{selectedProtocol.label}</h2>
          <p className="support-copy mt-2">{selectedProtocol.pathway}</p>

          {selectedProtocol.safetyWarning && (
            <div className="safety-banner mt-3">{selectedProtocol.safetyWarning}</div>
          )}

          <div className="mt-6 grid place-items-center breath-orb-wrap">
            <BreathCadenceRing
              phaseLabel={isComplete ? 'Done' : phase?.name ?? 'Ready'}
              progress={phaseProgress}
              phaseClassName={isComplete ? 'breath-hold' : phaseRingClass}
              detailLabel={phaseDetailLabel}
            />
          </div>

          {isActive && phase && (
            <div className="mt-4 text-center space-y-1">
              <p className="hud-font text-[2rem] font-semibold text-[var(--text-primary)]">
                {formatCountdown(phaseRemainingMs)}
              </p>
              <p className="support-copy">{phase.instruction}</p>
              {totalRounds !== null && (
                <p className="hud-font text-xs text-[var(--text-muted)]">
                  Round {currentRound} of {totalRounds}
                </p>
              )}
            </div>
          )}

          {isComplete && (
            <div className="mt-4 text-center">
              <p className="hud-font text-[1.2rem] text-[var(--accent-deep)]">Protocol complete</p>
            </div>
          )}

          {!isActive && !isComplete && (
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {selectedProtocol.phases.map((p) => (
                <div key={p.name} className="glass-card-compact breath-phase-tile">
                  <p className="label-text">{p.name}</p>
                  <p className="mt-2 text-[1.05rem] text-[var(--text-primary)]">{p.durationSeconds}s</p>
                </div>
              ))}
            </div>
          )}

          <div className="button-row button-row--2 mt-5">
            <button
              type="button"
              className="primary-btn primary-btn-strong"
              onClick={isActive ? handleStop : handleStart}
            >
              {isActive ? 'Stop' : isComplete ? 'Restart' : 'Begin'}
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                handleStop()
                setSelectedProtocol(null)
              }}
            >
              Change Protocol
            </button>
          </div>
        </article>

        <article className="glass-sheet breath-marker-sheet cinema-surface">
          <div className="metric-chip-grid mt-2">
            <MetricChip label="Heart Rate" value={`${health.heartRate} BPM`} />
            <MetricChip label="Breath Rate" value={`${health.breathPerMinute}/min`} />
            <MetricChip label="Stress" value={`${health.stressLevel}%`} />
          </div>
        </article>
      </div>
    </section>
  )
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) return `${minutes}:${seconds.toString().padStart(2, '0')}`
  return `${seconds}s`
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-chip">
      <p className="metric-chip-label">{label}</p>
      <p className="metric-chip-value mt-3">{value}</p>
    </div>
  )
}

function BreathCadenceRing({
  phaseLabel,
  progress,
  phaseClassName,
  detailLabel,
}: {
  phaseLabel: string
  progress: number
  phaseClassName: 'breath-inhale' | 'breath-hold' | 'breath-exhale'
  detailLabel: string
}) {
  const radius = 56
  const circumference = 2 * Math.PI * radius
  const normalizedProgress = Math.min(Math.max(progress, 0), 1)
  const strokeOffset = circumference * (1 - normalizedProgress)

  return (
    <div className={`breath-progress-shell ${phaseClassName}`}>
      <svg className="breath-progress-svg" viewBox="0 0 140 140" role="img" aria-label={`${phaseLabel} ${detailLabel}`}>
        <circle className="breath-progress-track" cx="70" cy="70" r={radius} />
        <circle
          className="breath-progress-ring"
          cx="70"
          cy="70"
          r={radius}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset: strokeOffset }}
        />
      </svg>
      <div className="breath-progress-center">
        <span className="hud-font text-sm text-[var(--text-secondary)]">{phaseLabel}</span>
        <span className="hud-font text-xs text-[var(--text-muted)]">{detailLabel}</span>
      </div>
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

function BreathIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
      <path d="M3 10.5c1.4-2.6 3.2-3.9 5.3-3.9 2.4 0 3.4 1.7 5.1 1.7 1.2 0 2.2-.6 3.6-2" />
      <path d="M3 13.5c1.4-2.6 3.2-3.9 5.3-3.9 2.4 0 3.4 1.7 5.1 1.7 1.2 0 2.2-.6 3.6-2" />
    </svg>
  )
}
