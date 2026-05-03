import { memo, useMemo, useRef, useState } from 'react'

import { tapFeedback } from '../utils/feedback'
import { getDailyQuote } from '../services/quotes'
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
  recommendedPreset: SessionPreset
  presetMode: PresetMode
  /** Weather-only refresh UX (does not replace telemetry sync label). */
  weatherUiPhase?: 'idle' | 'loading' | 'offline' | 'error'
}

function DashboardScreenComponent({
  health,
  insights,
  telemetry,
  isTelemetrySyncing,
  onSyncTelemetry,
  logs,
  totalMinutes,
  onOpenStopwatch,
  recommendedPreset,
  presetMode,
  weatherUiPhase = 'idle',
}: DashboardScreenProps) {
  const dailyQuote = getDailyQuote()
  const [reportRange, setReportRange] = useState<ReportRange>('month')
  const dashboardInsights = insights.items.filter((item) => item.domain !== 'recovery')
  const guidanceRef = useRef<HTMLElement | null>(null)
  const sessionsRef = useRef<HTMLElement | null>(null)
  const chartConfig = useMemo(() => buildChartFromLogs(logs, reportRange), [logs, reportRange])

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
        {/* Daily motivational quote — large feature tile */}
        <section className="glass-sheet dashboard-quote-tile cinema-surface">
          <p className="label-text mb-3">Daily Wisdom</p>
          <p className="dashboard-quote-text">"{dailyQuote.text}"</p>
          <p className="dashboard-quote-source mt-3">— {dailyQuote.source}</p>
        </section>

        {/* Primary CTA — Begin Session */}
        <button
          type="button"
          className="primary-btn primary-btn-strong w-full justify-center dashboard-begin-cta"
          onClick={() => { tapFeedback(); onOpenStopwatch() }}
        >
          Begin Session
        </button>

        <section className="hero-surface hero-surface-dashboard dashboard-hero-shell animate-hero-pulse cinema-surface cinema-surface--hero">
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

        <section className="glass-sheet dashboard-health-sheet cinema-surface">
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
            <div className="metric-chip">
              <p className="metric-chip-label">Weather</p>
              {weatherUiPhase === 'loading' ? (
                <p className="metric-chip-value mt-3">Updating…</p>
              ) : telemetry.weatherSnapshot.temperatureC === null ? (
                <p className="metric-chip-value mt-3">{telemetry.weatherSnapshot.condition}</p>
              ) : (
                <div className="metric-chip-value-row mt-3">
                  <p className="metric-chip-value">{`${telemetry.weatherSnapshot.temperatureC}`}</p>
                  <p className="metric-unit">C</p>
                </div>
              )}
              {(weatherUiPhase === 'offline' || weatherUiPhase === 'error') && (
                <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[var(--text-dim)]">
                  {weatherUiPhase === 'offline' ? 'Offline' : 'Live weather unavailable'}
                </p>
              )}
            </div>
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
            <MetricChip label="Mode" value={presetMode === 'auto_apply' ? 'Auto Apply' : 'Suggest\u00A0Only'} unit="" />
            <MetricChip label="Breath" value={recommendedPreset.breathPreset.label} unit="" compact />
            <MetricChip label="Source" value={recommendedPreset.sourceLabel} unit="" compact />
          </div>

          <button type="button" className="primary-btn primary-btn-strong mt-5 w-full justify-center" onClick={onOpenStopwatch}>
            Review adaptive preset
          </button>
        </section>

        <section className="glass-sheet space-y-4 dashboard-report-sheet cinema-surface">
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
            <div className="glass-card dashboard-feature-tile cinema-surface cinema-surface--tile">
              <div className="tile-media tile-media-readiness" aria-hidden />
              <p className="label-text">Readiness</p>
              <p className="metric-number-soft mt-3">{health.readiness}%</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Stable baseline for today</p>
            </div>
            <div className="glass-card dashboard-feature-tile cinema-surface cinema-surface--tile">
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
          </div>
        </section>

        <section ref={guidanceRef} className="glass-sheet cinema-surface">
          <div className="info-row">
            <div>
              <p className="title-font text-[1.45rem] font-medium text-[var(--text-primary)]">AI Guidance</p>
              <p className="support-copy mt-1">
                {insights.engineLabel} · {insights.generatedAtLabel}
              </p>
            </div>
            <div className="glass-card-compact ai-engine-badge px-3 py-2 text-xs text-[var(--text-secondary)]">
              AI
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {dashboardInsights.map((item) => (
              <InsightCard key={item.id} title={item.title} summary={item.summary} emphasis={item.emphasis} actionLabel={item.actionLabel} />
            ))}
          </div>
        </section>

        <section ref={sessionsRef} className="glass-sheet cinema-surface">
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
                <div key={log.id} className="glass-card session-log-card cinema-surface cinema-surface--sub">
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

export const DashboardScreen = memo(DashboardScreenComponent)

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
    <div className="glass-card dashboard-insight-card cinema-surface cinema-surface--sub">
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
  compact,
}: {
  label: string
  value: string
  unit: string
  compact?: boolean
}) {
  const valueClass = compact ? 'metric-chip-value-compact' : 'metric-chip-value'
  return (
    <div className="metric-chip">
      <p className="metric-chip-label">{label}</p>
      {unit ? (
        <div className="metric-chip-value-row mt-3">
          <p className={valueClass}>{value}</p>
          <p className="metric-unit">{unit}</p>
        </div>
      ) : (
        <p className={`${valueClass} mt-3`}>{value}</p>
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

const BAR_COUNT = 22

const RANGE_CONFIG: Record<ReportRange, { label: string; days: number }> = {
  week: { label: 'Current 7-day focus', days: 7 },
  month: { label: 'Current 30-day trend', days: 30 },
  year: { label: 'Long-range baseline', days: 365 },
}

function buildChartFromLogs(
  logs: WorkoutLog[],
  range: ReportRange,
): { summary: string; bars: number[] } {
  const config = RANGE_CONFIG[range]
  const now = Date.now()
  const msPerDay = 86_400_000
  const windowStart = now - config.days * msPerDay
  const bucketSize = config.days / BAR_COUNT

  const relevantLogs = logs.filter((log) => {
    const ts = new Date(log.startedAt ?? log.date).getTime()
    return ts >= windowStart && ts <= now
  })

  if (relevantLogs.length === 0) {
    return { summary: config.label, bars: Array.from({ length: BAR_COUNT }, () => 4) }
  }

  const buckets = Array.from({ length: BAR_COUNT }, () => 0)

  for (const log of relevantLogs) {
    const ts = new Date(log.startedAt ?? log.date).getTime()
    const dayOffset = (ts - windowStart) / msPerDay
    const bucketIndex = Math.min(BAR_COUNT - 1, Math.floor(dayOffset / bucketSize))
    buckets[bucketIndex] += log.durationMinutes
  }

  const maxMinutes = Math.max(...buckets, 1)

  return {
    summary: config.label,
    bars: buckets.map((minutes) => Math.max(4, Math.round((minutes / maxMinutes) * 100))),
  }
}
