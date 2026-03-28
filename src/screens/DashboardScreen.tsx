import { useRef, useState } from 'react'

import type {
  HealthMetrics,
  InsightSnapshot,
  PresetMode,
  SessionPreset,
  TelemetryState,
  WorkoutLog,
} from '../types'

interface DashboardScreenProps {
  health: HealthMetrics
  insights: InsightSnapshot
  telemetry: TelemetryState
  isTelemetrySyncing: boolean
  onSyncTelemetry: () => void
  logs: WorkoutLog[]
  totalMinutes: number
  onOpenStopwatch: () => void
  onOpenBiometrics: () => void
  accountEmail: string
  onSignOut: () => void
  isSigningOut: boolean
  recommendedPreset: SessionPreset
  presetMode: PresetMode
}

export function DashboardScreen({
  health,
  insights,
  telemetry,
  isTelemetrySyncing,
  onSyncTelemetry,
  logs,
  totalMinutes,
  onOpenStopwatch,
  onOpenBiometrics,
  accountEmail,
  onSignOut,
  isSigningOut,
  recommendedPreset,
  presetMode,
}: DashboardScreenProps) {
  const [reportRange, setReportRange] = useState<ReportRange>('month')
  const dashboardInsights = insights.items.filter((item) => item.domain !== 'recovery')
  const guidanceRef = useRef<HTMLElement | null>(null)
  const sessionsRef = useRef<HTMLElement | null>(null)
  const chartConfig = BODY_REPORT_CHARTS[reportRange]

  const jumpToSection = (element: HTMLElement | null) => {
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="screen-shell">
      <div className="top-chrome">
        <button
          type="button"
          className="round-icon-btn"
          aria-label="Jump to AI Guidance"
          onClick={() => jumpToSection(guidanceRef.current)}
        >
          <DotsClusterIcon />
        </button>
        <button
          type="button"
          className="round-icon-btn"
          aria-label="Jump to Recent Sessions"
          onClick={() => jumpToSection(sessionsRef.current)}
        >
          <GridIcon />
        </button>
      </div>

      <div className="content-stack space-y-4">
        <section className="hero-surface hero-surface-dashboard dashboard-hero-shell animate-hero-pulse">
          <div className="hero-dashboard-head">
            <div>
              <p className="section-kicker">Connected Core</p>
              <p className="support-copy mt-1">Ready to track your progress</p>
            </div>
            <div className="dashboard-status-chip">{telemetry.watchSourceLabel}</div>
          </div>

          <div className="hero-dashboard-stage">
            <div className="hero-dashboard-metric">
              <p className="label-text">Readiness</p>
              <div className="mt-2 flex items-end gap-1">
                <span className="metric-number-soft">{health.readiness}</span>
                <span className="metric-unit">%</span>
              </div>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Green-light window for the next block</p>
            </div>

            <div className="device-hero device-hero-inline dashboard-hero-art" />

            <div className="hero-float-dot left-10 top-[4.5rem]" />
            <div className="hero-float-dot right-12 top-[6.4rem]" />
          </div>
        </section>

        <section className="glass-sheet dashboard-health-sheet">
          <div className="info-row">
            <div>
              <p className="title-font text-[1.55rem] font-medium text-[var(--text-primary)]">Health Check</p>
              <p className="support-copy mt-1">Time to track your progress</p>
            </div>
            <button
              type="button"
              onClick={onSyncTelemetry}
              disabled={isTelemetrySyncing}
              className="round-icon-btn-soft"
              aria-label="Sync telemetry"
            >
              <ArrowUpRightIcon />
            </button>
          </div>

          <div className="card-media-strip card-media-strip-health mt-4" aria-hidden />

          <div className="metric-chip-grid mt-4">
            <MetricChip label="Heart Rate" value={`${health.heartRate}`} unit="BPM" />
            <MetricChip label="Stamina" value={`${health.stamina}`} unit="%" />
            <MetricChip
              label="Weather"
              value={
                telemetry.weatherSnapshot.temperatureC === null
                  ? telemetry.weatherSnapshot.condition
                  : `${telemetry.weatherSnapshot.temperatureC}`
              }
              unit={telemetry.weatherSnapshot.temperatureC === null ? '' : 'C'}
            />
          </div>
        </section>

        <section className="glass-sheet dashboard-next-session">
          <div className="info-row">
            <div>
              <p className="label-text">Account</p>
              <p className="title-font mt-2 text-[1.15rem] font-medium text-[var(--text-primary)]">{accountEmail}</p>
              <p className="support-copy mt-1">Supabase session is active on this device.</p>
            </div>
            <button type="button" className="secondary-btn" onClick={onSignOut} disabled={isSigningOut}>
              {isSigningOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </section>

        <section className="glass-sheet">
          <div className="info-row">
            <div>
              <p className="label-text">Next Session</p>
              <p className="title-font mt-2 text-[1.2rem] font-medium text-[var(--text-primary)]">
                {recommendedPreset.title}
              </p>
              <p className="support-copy mt-1">{recommendedPreset.summary}</p>
            </div>
            <div className="text-right">
              <p className="metric-number-soft text-[1.6rem]">{recommendedPreset.targetMinutes}</p>
              <p className="metric-unit">min</p>
            </div>
          </div>

          <div className="card-media-strip card-media-strip-session mt-4" aria-hidden />

          <div className="metric-chip-grid mt-4">
            <MetricChip label="Mode" value={presetMode === 'auto_apply' ? 'Auto Apply' : 'Suggest Only'} unit="" />
            <MetricChip label="Breath" value={recommendedPreset.breathPreset.label} unit="" />
            <MetricChip label="Source" value={recommendedPreset.sourceLabel} unit="" />
          </div>

          <button type="button" className="primary-btn primary-btn-strong mt-5 w-full justify-center" onClick={onOpenStopwatch}>
            Review adaptive preset
          </button>
        </section>

        <section className="glass-sheet space-y-4 dashboard-report-sheet">
          <div className="info-row">
            <div>
              <p className="title-font text-[1.45rem] font-medium text-[var(--text-primary)]">Body Report</p>
              <p className="support-copy mt-1">Live readiness and session command center</p>
            </div>
            <div className="soft-toggle">
              <button type="button" className={reportRange === 'week' ? 'is-active' : ''} onClick={() => setReportRange('week')}>
                Week
              </button>
              <button type="button" className={reportRange === 'month' ? 'is-active' : ''} onClick={() => setReportRange('month')}>
                Month
              </button>
              <button type="button" className={reportRange === 'year' ? 'is-active' : ''} onClick={() => setReportRange('year')}>
                Year
              </button>
            </div>
          </div>

          <div>
            <div className="info-row">
              <div>
                <p className="label-text">Endurance</p>
                <p className="metric-number-soft">{health.endurance}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[var(--accent-primary)]">{chartConfig.summary}</p>
                <p className="mt-1 text-xs text-[var(--text-dim)]">{totalMinutes} min logged</p>
              </div>
            </div>

            <div className="soft-chart mt-4">
              <div className="soft-chart-bars">
                {chartConfig.bars.map((height, index) => (
                  <span key={`${reportRange}-${index}`} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="soft-chart-wave" />
            </div>
          </div>

          <div className="metric-grid">
            <div className="glass-card dashboard-feature-tile">
              <div className="tile-media tile-media-readiness" aria-hidden />
              <p className="label-text">Readiness</p>
              <p className="metric-number-soft mt-3">{health.readiness}%</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Stable baseline for today</p>
            </div>
            <div className="glass-card dashboard-feature-tile">
              <div className="tile-media tile-media-breath" aria-hidden />
              <p className="label-text">Breath</p>
              <p className="metric-number-soft mt-3">{health.breathPerMinute}</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Breaths per minute</p>
            </div>
            <button type="button" className="glass-card dashboard-feature-tile text-left" onClick={onOpenStopwatch}>
              <div className="tile-media tile-media-stopwatch" aria-hidden />
              <p className="label-text">Primary Tool</p>
              <p className="title-font mt-3 text-[1.1rem] font-medium text-[var(--text-primary)]">Combat Stopwatch</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Interval tracking and sets</p>
            </button>
            <button type="button" className="glass-card dashboard-feature-tile text-left" onClick={onOpenBiometrics}>
              <div className="tile-media tile-media-recovery" aria-hidden />
              <p className="label-text">Recovery Tool</p>
              <p className="title-font mt-3 text-[1.1rem] font-medium text-[var(--text-primary)]">Biometrics</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Body report and recovery score</p>
            </button>
          </div>
        </section>

        <section ref={guidanceRef} className="glass-sheet">
          <div className="info-row">
            <div>
              <p className="title-font text-[1.45rem] font-medium text-[var(--text-primary)]">AI Guidance</p>
              <p className="support-copy mt-1">
                {insights.engineLabel} · {insights.generatedAtLabel}
              </p>
            </div>
            <div className="glass-card-compact px-3 py-2 text-xs text-[var(--text-secondary)]">
              Scaffold
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {dashboardInsights.map((item) => (
              <InsightCard key={item.id} title={item.title} summary={item.summary} emphasis={item.emphasis} actionLabel={item.actionLabel} />
            ))}
          </div>
        </section>

        <section ref={sessionsRef} className="glass-sheet">
          <div className="info-row">
            <div>
              <p className="title-font text-[1.45rem] font-medium text-[var(--text-primary)]">Recent Sessions</p>
              <p className="support-copy mt-1">{telemetry.lastSyncLabel}</p>
            </div>
            <div className="flex gap-2">
              <SyncChip label="Health" status={telemetry.healthApp} />
              <SyncChip label="Watch" status={telemetry.fitnessWatch} />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {logs.length === 0 ? (
              <div className="glass-card text-sm text-[var(--text-secondary)]">
                No synced sessions yet. Start a stopwatch session or sync Apple Health to populate this history.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="glass-card session-log-card">
                  <div className="info-row">
                    <div>
                      <p className="title-font text-[1.05rem] font-medium text-[var(--text-primary)]">{log.title}</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">{log.date}</p>
                    </div>
                    <p className="metric-number-soft text-[1.45rem]">{log.durationMinutes}m</p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{log.note}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  )
}

function InsightCard({
  title,
  summary,
  emphasis,
  actionLabel,
}: {
  title: string
  summary: string
  emphasis: string
  actionLabel: string
}) {
  return (
    <div className="glass-card dashboard-insight-card">
      <div className="info-row">
        <p className="title-font text-[1.05rem] font-medium text-[var(--text-primary)]">{title}</p>
        <span className="text-xs text-[var(--accent-primary)]">{actionLabel}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{summary}</p>
      <p className="mt-3 text-xs text-[var(--text-dim)]">{emphasis}</p>
    </div>
  )
}

function MetricChip({
  label,
  value,
  unit,
}: {
  label: string
  value: string
  unit: string
}) {
  return (
    <div className="metric-chip">
      <p className="metric-chip-label">{label}</p>
      {unit ? (
        <div className="metric-chip-value-row mt-3">
          <p className="metric-chip-value">{value}</p>
          <p className="metric-unit">{unit}</p>
        </div>
      ) : (
        <p className="metric-chip-value mt-3">{value}</p>
      )}
    </div>
  )
}

function SyncChip({ label, status }: { label: string; status: TelemetryState['healthApp'] }) {
  return (
    <div className="glass-card-compact min-w-20 text-center">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-dim)]">{label}</p>
      <p className="mt-2 text-sm capitalize text-[var(--text-secondary)]">{status}</p>
    </div>
  )
}

function DotsClusterIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-current">
      <circle cx="6" cy="5" r="1.3" />
      <circle cx="12" cy="5" r="1.3" />
      <circle cx="9" cy="10" r="1.3" />
      <circle cx="6" cy="15" r="1.3" />
      <circle cx="12" cy="15" r="1.3" />
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

function ArrowUpRightIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
      <path d="M6 14 14 6M7 6h7v7" />
    </svg>
  )
}

type ReportRange = 'week' | 'month' | 'year'

const BODY_REPORT_CHARTS: Record<ReportRange, { summary: string; bars: number[] }> = {
  week: {
    summary: 'Current 7-day focus',
    bars: [32, 38, 41, 48, 52, 58, 61, 66, 62, 57, 60, 64, 69, 65, 59, 56, 54, 58, 63, 60, 57, 55],
  },
  month: {
    summary: 'Current 30-day trend',
    bars: [22, 28, 35, 41, 53, 63, 58, 72, 68, 75, 62, 57, 64, 70, 61, 66, 58, 49, 55, 63, 59, 60],
  },
  year: {
    summary: 'Long-range baseline',
    bars: [42, 45, 47, 50, 52, 56, 59, 61, 63, 66, 68, 71, 69, 67, 65, 64, 62, 60, 59, 58, 57, 56],
  },
}
