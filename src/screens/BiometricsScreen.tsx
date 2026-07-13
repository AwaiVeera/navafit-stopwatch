import { useEffect, useMemo, useState } from 'react'

import { ScreenPager, ScreenPage } from '../components/ScreenPager'
import type { HealthMetrics, InsightSnapshot } from '../types'

interface BiometricsScreenProps {
  health: HealthMetrics
  insights: InsightSnapshot
  onBack: () => void
}

const HANDSHAKE_STEPS = ['Idle', 'Scanning', 'Pairing', 'Syncing', 'Ready'] as const

export function BiometricsScreen({ health, insights, onBack }: BiometricsScreenProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [isHandshakeRunning, setIsHandshakeRunning] = useState(false)

  useEffect(() => {
    if (!isHandshakeRunning) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setStepIndex((previous) => {
        if (previous >= HANDSHAKE_STEPS.length - 1) {
          window.clearInterval(timerId)
          setIsHandshakeRunning(false)
          return previous
        }

        if (previous + 1 >= HANDSHAKE_STEPS.length - 1) {
          window.clearInterval(timerId)
          setIsHandshakeRunning(false)
        }

        return previous + 1
      })
    }, 900)

    return () => window.clearInterval(timerId)
  }, [isHandshakeRunning])

  const recovery = useMemo(() => {
    const base = Math.round((health.readiness + health.endurance + (100 - health.stressLevel)) / 3)
    const hydrationAlert = health.stressLevel > 70 || health.breathPerMinute > 22
    return {
      hrv: Math.round(health.readiness * 0.9),
      score: Math.max(0, Math.min(100, base)),
      hydrationAlert,
      sleepHours: health.stressLevel > 65 ? 8 : 7,
      macroHint:
        health.endurance < 60
          ? 'Increase complex carbs + protein recovery meal.'
          : 'Balanced proteins, healthy fats, and hydration.',
    }
  }, [health])
  const recoveryInsight = insights.items.find((item) => item.domain === 'recovery')
  const handshakeButtonLabel = isHandshakeRunning
    ? 'Syncing'
    : stepIndex >= HANDSHAKE_STEPS.length - 1
      ? 'Restart'
      : 'Start'

  return (
    <section className="screen-shell biometrics-screen screen-shell--paged">
      <div className="top-chrome">
        <button type="button" className="round-icon-btn" onClick={onBack} aria-label="Back">
          <BackIcon />
        </button>
        <p className="title-font text-[1.2rem] font-semibold text-[var(--text-primary)]">Biometrics</p>
      </div>

      <ScreenPager ariaLabel="Biometrics">
        <ScreenPage className="screen-page--scroll">
        <section className="hero-surface hero-surface-recovery cinema-surface cinema-surface--hero">
          <div className="recovery-hero-head">
            <div className="recovery-hero-copy">
              <p className="section-kicker">Recovery Protocol</p>
              <p className="support-copy mt-2">Restore balance after endurance, macebell, and breathwork blocks.</p>
            </div>
            <div className="dashboard-status-chip recovery-focus-chip">Recovery Focus</div>
          </div>

          <div className="recovery-hero-stage">
            <div className="recovery-hero-figure" aria-hidden>
              <div className="body-figure" />
            </div>

            <article className="glass-sheet recovery-body-report cinema-surface">
              <div className="info-row items-start">
                <div>
                  <p className="title-font text-[1.4rem] font-medium text-[var(--text-primary)]">Body Report</p>
                  <p className="support-copy mt-1">Daily readiness and recovery summary</p>
                </div>
                <div className="text-right">
                  <p className="metric-number-soft">{recovery.score}%</p>
                  <p className="metric-unit">Recovery</p>
                </div>
              </div>

              <div className="mt-4 metric-chip-grid biometrics-chip-grid">
                <MetricChip label="HRV" value={`${recovery.hrv}`} />
                <MetricChip label="Sleep" value={`${recovery.sleepHours}h`} />
                <MetricChip label="Stress" value={`${health.stressLevel}%`} />
              </div>
            </article>
          </div>
        </section>
        </ScreenPage>

        <ScreenPage className="screen-page--scroll">
        <article className="glass-sheet biometrics-card">
          <div className="handshake-head">
            <div className="handshake-head-copy">
              <p className="title-font text-[1.2rem] font-medium text-[var(--text-primary)]">Hardware Handshake</p>
              <p className="support-copy mt-1">Connect a compatible fitness device to pair.</p>
            </div>
            <button
              type="button"
              className="primary-btn primary-btn-strong handshake-start-btn"
              disabled={isHandshakeRunning}
              onClick={() => {
                setStepIndex(1)
                setIsHandshakeRunning(true)
              }}
            >
              {handshakeButtonLabel}
            </button>
          </div>

          <div className="mt-4">
            <div className="info-row text-sm">
              <span className="text-[var(--text-muted)]">Status</span>
              <span className="hud-font text-[var(--text-primary)]">{HANDSHAKE_STEPS[stepIndex]}</span>
            </div>

            <div className="mt-4 handshake-steps-grid">
              {HANDSHAKE_STEPS.map((step, index) => (
                <div key={step} className="glass-card-compact handshake-step-card text-center">
                  <div
                    className={`mx-auto h-2 w-2 rounded-full ${
                      index <= stepIndex ? 'bg-[var(--accent-primary)]' : 'bg-white/10'
                    }`}
                  />
                  <p className="mt-2 handshake-step-label text-[var(--text-dim)]">{step}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 soft-progress">
              <div
                className="soft-progress-fill transition-all duration-500"
                style={{ width: `${((stepIndex + 1) / HANDSHAKE_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </article>
        </ScreenPage>

        <ScreenPage className="screen-page--scroll">
        <article className="glass-sheet biometrics-card cinema-surface">
          <div className="info-row items-start">
            <div>
              <p className="title-font text-[1.2rem] font-medium text-[var(--text-primary)]">Recovery Guidance</p>
              <p className="support-copy mt-1">{insights.engineLabel} · {insights.generatedAtLabel}</p>
            </div>
            <div className="glass-card-compact ai-engine-badge px-3 py-2 text-xs text-[var(--text-secondary)]">
              AI
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="glass-card cinema-surface cinema-surface--sub">
              <div className="info-row">
                <p className="title-font text-[1.05rem] font-medium text-[var(--text-primary)]">
                  {recoveryInsight?.title ?? 'Recovery bias recommended'}
                </p>
                <span className="text-xs text-[var(--accent-primary)]">
                  {recoveryInsight?.actionLabel ?? 'Favor breath and hydration'}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {recoveryInsight?.summary ??
                  'Use this recovery screen to bias hydration, breathwork, and sleep before increasing load again.'}
              </p>
              <p className="mt-3 text-xs text-[var(--text-dim)]">
                {recoveryInsight?.emphasis ?? `Stress ${health.stressLevel}% · Breath ${health.breathPerMinute}/min`}
              </p>
            </div>

            <div className="metric-grid">
              <div className="glass-card cinema-surface cinema-surface--sub">
                <p className="label-text">Macros</p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{recovery.macroHint}</p>
              </div>
              <div className="glass-card cinema-surface cinema-surface--sub">
                <p className="label-text">Meditation</p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">12-18 min evening protocol.</p>
              </div>
            </div>
          </div>

          {recovery.hydrationAlert && (
            <div className="glass-card cinema-surface cinema-surface--sub mt-4">
              <p className="label-text">Hydration Alert</p>
              <p className="mt-2 text-sm text-[var(--text-primary)]">Drink water with electrolytes before the next recovery round.</p>
            </div>
          )}
        </article>
        </ScreenPage>
      </ScreenPager>
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

