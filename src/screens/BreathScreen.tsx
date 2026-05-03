import { memo, useEffect, useMemo, useRef, useState } from 'react'

import type { AudioCue } from '../services/audio-cues'
import { playAudioCue, primeAudioCues } from '../services/audio-cues'
import { breathPhaseFeedback, successFeedback, tapFeedback } from '../utils/feedback'
import type { BreathProtocol, BreathworkMode, HealthMetrics, SessionPreset } from '../types'

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
}

function BreathScreenInner({ health, sessionPreset, breathworkMode, onBack }: BreathScreenProps) {
  const isNovice = breathworkMode.id === 'novice' || breathworkMode.protocols.length === 0

  if (isNovice) {
    return <NoviceBreathScreen health={health} sessionPreset={sessionPreset} onBack={onBack} />
  }

  return (
    <ProtocolBreathScreen
      health={health}
      breathworkMode={breathworkMode}
      onBack={onBack}
    />
  )
}

export const BreathScreen = memo(BreathScreenInner)

// --- Novice: original behavior preserved exactly ---

function NoviceBreathScreen({
  health,
  sessionPreset,
  onBack,
}: {
  health: HealthMetrics
  sessionPreset: SessionPreset
  onBack: () => void
}) {
  const [breathSecond, setBreathSecond] = useState(0)
  const [breathMode, setBreathMode] = useState<'guided' | 'manual'>('guided')
  const [manualPhase, setManualPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale')
  const breathCycleSeconds = sessionPreset.breathPreset.cycleSeconds

  useEffect(() => {
    if (breathMode !== 'guided') return undefined

    const breathId = window.setInterval(() => {
      setBreathSecond((previous) => (previous + 1) % breathCycleSeconds)
    }, 1000)

    return () => window.clearInterval(breathId)
  }, [breathCycleSeconds, breathMode])

  const inhaleBoundary = sessionPreset.breathPreset.inhaleSeconds
  const holdBoundary = inhaleBoundary + sessionPreset.breathPreset.holdSeconds

  const guidedPhaseLabel =
    breathSecond < inhaleBoundary ? 'Inhale' : breathSecond < holdBoundary ? 'Hold' : 'Exhale'
  const phaseLabel = breathMode === 'manual' ? manualPhase : guidedPhaseLabel

  const phaseRingClass =
    phaseLabel === 'Inhale'
      ? 'breath-inhale'
      : phaseLabel === 'Hold'
        ? 'breath-hold'
        : 'breath-exhale'
  const phaseDurationSeconds =
    phaseLabel === 'Inhale'
      ? sessionPreset.breathPreset.inhaleSeconds
      : phaseLabel === 'Hold'
        ? sessionPreset.breathPreset.holdSeconds
        : sessionPreset.breathPreset.exhaleSeconds
  const phaseElapsedSeconds = breathMode === 'guided'
    ? phaseLabel === 'Inhale'
      ? breathSecond
      : phaseLabel === 'Hold'
        ? breathSecond - inhaleBoundary
        : breathSecond - holdBoundary
    : 0
  const phaseProgress =
    breathMode === 'guided' && phaseDurationSeconds > 0
      ? Math.min(phaseElapsedSeconds / phaseDurationSeconds, 1)
      : 1
  const phaseRemainingSeconds = Math.max(phaseDurationSeconds - phaseElapsedSeconds, 0)

  const previousPhaseRef = useRef<string>(phaseLabel)
  useEffect(() => {
    if (previousPhaseRef.current === phaseLabel) return
    previousPhaseRef.current = phaseLabel
    playAudioCue(phaseCueForName(phaseLabel))
    breathPhaseFeedback(phaseLabel)
  }, [phaseLabel])

  const breathCue = useMemo(() => {
    if (health.stressLevel > 55 || health.breathPerMinute > 18) {
      return 'Use a slower exhale and stay here until your breath rate settles.'
    }

    return 'Markers are steady. Use this tab before or after your next block to stay controlled.'
  }, [health.breathPerMinute, health.stressLevel])

  return (
    <section className="screen-shell">
      <div className="top-chrome">
        <button type="button" className="round-icon-btn" onClick={onBack} aria-label="Back">
          <BackIcon />
        </button>
        <button
          type="button"
          className="round-icon-btn"
          aria-label="Restart breath cycle"
          onClick={() => {
            tapFeedback()
            primeAudioCues()
            setBreathSecond(0)
            setManualPhase('Inhale')
            playAudioCue('inhale')
            breathPhaseFeedback('Inhale')
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
            Guided mode follows your active session preset, while manual mode gives direct inhale/exhale control.
          </p>

          <div className="button-row button-row--2 mt-4">
            <button
              type="button"
              className={`secondary-btn ${breathMode === 'guided' ? 'primary-btn-strong' : ''}`}
              onClick={() => {
                primeAudioCues()
                setBreathMode('guided')
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
                playAudioCue(phaseCueForName(manualPhase))
                breathPhaseFeedback(manualPhase)
              }}
            >
              Manual
            </button>
          </div>

          <div className="mt-8 grid place-items-center breath-orb-wrap">
            <BreathCadenceRing
              phaseLabel={phaseLabel}
              progress={phaseProgress}
              phaseClassName={phaseRingClass}
              detailLabel={breathMode === 'guided' ? `${Math.ceil(phaseRemainingSeconds)}s` : `${phaseDurationSeconds}s`}
            />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="glass-card-compact breath-phase-tile cinema-surface cinema-surface--sub">
              <p className="label-text">Inhale</p>
              <p className="mt-2 text-[1.05rem] text-[var(--text-primary)]">{sessionPreset.breathPreset.inhaleSeconds}s</p>
            </div>
            <div className="glass-card-compact breath-phase-tile cinema-surface cinema-surface--sub">
              <p className="label-text">Hold</p>
              <p className="mt-2 text-[1.05rem] text-[var(--text-primary)]">{sessionPreset.breathPreset.holdSeconds}s</p>
            </div>
            <div className="glass-card-compact breath-phase-tile cinema-surface cinema-surface--sub">
              <p className="label-text">Exhale</p>
              <p className="mt-2 text-[1.05rem] text-[var(--text-primary)]">{sessionPreset.breathPreset.exhaleSeconds}s</p>
            </div>
          </div>

          {breathMode === 'manual' ? (
            <div className="button-row mt-5">
              <button
                type="button"
                className={`secondary-btn ${phaseLabel === 'Inhale' ? 'primary-btn-strong' : ''}`}
                onClick={() => {
                  primeAudioCues()
                  setManualPhase('Inhale')
                  playAudioCue('inhale')
                  breathPhaseFeedback('Inhale')
                }}
              >
                Inhale
              </button>
              <button
                type="button"
                className={`secondary-btn ${phaseLabel === 'Hold' ? 'primary-btn-strong' : ''}`}
                onClick={() => {
                  primeAudioCues()
                  setManualPhase('Hold')
                  playAudioCue('hold')
                  breathPhaseFeedback('Hold')
                }}
              >
                Hold
              </button>
              <button
                type="button"
                className={`secondary-btn ${phaseLabel === 'Exhale' ? 'primary-btn-strong' : ''}`}
                onClick={() => {
                  primeAudioCues()
                  setManualPhase('Exhale')
                  playAudioCue('exhale')
                  breathPhaseFeedback('Exhale')
                }}
              >
                Exhale
              </button>
            </div>
          ) : null}
        </article>

        <article className="glass-sheet breath-marker-sheet cinema-surface">
          <div className="info-row">
            <div>
              <p className="title-font text-[1.35rem] font-medium text-[var(--text-primary)]">Breath Markers</p>
              <p className="support-copy mt-1">{breathCue}</p>
            </div>
            <div className="dashboard-status-chip">{sessionPreset.breathPreset.label}</div>
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
}: {
  health: HealthMetrics
  breathworkMode: BreathworkMode
  onBack: () => void
}) {
  const [selectedProtocol, setSelectedProtocol] = useState<BreathProtocol | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [phaseElapsedMs, setPhaseElapsedMs] = useState(0)
  const [currentRound, setCurrentRound] = useState(1)
  const [isComplete, setIsComplete] = useState(false)

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
    if (isComplete) {
      playAudioCue('breath-complete')
      successFeedback()
    }
  }, [isComplete])

  const handleStart = () => {
    tapFeedback()
    primeAudioCues()
    playAudioCue('breath-start')
    setCurrentPhaseIndex(0)
    setPhaseElapsedMs(0)
    setCurrentRound(1)
    setIsComplete(false)
    setIsActive(true)
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

          <div className="mt-8 grid place-items-center breath-orb-wrap">
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
