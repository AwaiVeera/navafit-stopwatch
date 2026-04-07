import { useEffect, useMemo, useState } from 'react'

import type { HealthMetrics, SessionPreset } from '../types'

interface BreathScreenProps {
  health: HealthMetrics
  sessionPreset: SessionPreset
  onBack: () => void
}

export function BreathScreen({ health, sessionPreset, onBack }: BreathScreenProps) {
  const [breathSecond, setBreathSecond] = useState(0)
  const [breathMode, setBreathMode] = useState<'guided' | 'manual'>('guided')
  const [manualPhase, setManualPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale')
  const breathCycleSeconds = sessionPreset.breathPreset.cycleSeconds

  useEffect(() => {
    if (breathMode !== 'guided') {
      return undefined
    }

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
            setBreathSecond(0)
            setManualPhase('Inhale')
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
              onClick={() => setBreathMode('guided')}
            >
              Guided
            </button>
            <button
              type="button"
              className={`secondary-btn ${breathMode === 'manual' ? 'primary-btn-strong' : ''}`}
              onClick={() => setBreathMode('manual')}
            >
              Manual
            </button>
          </div>

          <div className="card-media-strip card-media-strip-breath mt-4" aria-hidden />

          <div className="mt-8 grid place-items-center breath-orb-wrap">
            <div className={`breath-orb breath-orb-reference ${phaseRingClass}`}>
              <span className="hud-font text-sm text-[var(--text-secondary)]">{phaseLabel}</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="glass-card-compact breath-phase-tile">
              <p className="label-text">Inhale</p>
              <p className="mt-2 text-[1.05rem] text-[var(--text-primary)]">{sessionPreset.breathPreset.inhaleSeconds}s</p>
            </div>
            <div className="glass-card-compact breath-phase-tile">
              <p className="label-text">Hold</p>
              <p className="mt-2 text-[1.05rem] text-[var(--text-primary)]">{sessionPreset.breathPreset.holdSeconds}s</p>
            </div>
            <div className="glass-card-compact breath-phase-tile">
              <p className="label-text">Exhale</p>
              <p className="mt-2 text-[1.05rem] text-[var(--text-primary)]">{sessionPreset.breathPreset.exhaleSeconds}s</p>
            </div>
          </div>

          {breathMode === 'manual' ? (
            <div className="button-row mt-5">
              <button
                type="button"
                className={`secondary-btn ${phaseLabel === 'Inhale' ? 'primary-btn-strong' : ''}`}
                onClick={() => setManualPhase('Inhale')}
              >
                Inhale
              </button>
              <button
                type="button"
                className={`secondary-btn ${phaseLabel === 'Hold' ? 'primary-btn-strong' : ''}`}
                onClick={() => setManualPhase('Hold')}
              >
                Hold
              </button>
              <button
                type="button"
                className={`secondary-btn ${phaseLabel === 'Exhale' ? 'primary-btn-strong' : ''}`}
                onClick={() => setManualPhase('Exhale')}
              >
                Exhale
              </button>
            </div>
          ) : null}
        </article>

        <article className="glass-sheet breath-marker-sheet">
          <div className="info-row">
            <div>
              <p className="title-font text-[1.35rem] font-medium text-[var(--text-primary)]">Breath Markers</p>
              <p className="support-copy mt-1">{breathCue}</p>
            </div>
            <div className="dashboard-status-chip">{sessionPreset.breathPreset.label}</div>
          </div>

          <div className="card-media-strip card-media-strip-breath-metrics mt-4" aria-hidden />

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

function BreathIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
      <path d="M3 10.5c1.4-2.6 3.2-3.9 5.3-3.9 2.4 0 3.4 1.7 5.1 1.7 1.2 0 2.2-.6 3.6-2" />
      <path d="M3 13.5c1.4-2.6 3.2-3.9 5.3-3.9 2.4 0 3.4 1.7 5.1 1.7 1.2 0 2.2-.6 3.6-2" />
    </svg>
  )
}
