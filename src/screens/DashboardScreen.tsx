import { useEffect, useMemo, useState } from 'react'

import { ScreenPager, ScreenPage } from '../components/ScreenPager'
import { getDailyQuote } from '../services/quotes'
import { computeStreak } from '../services/streak'
import type {
  HealthMetrics,
  InsightSnapshot,
  OnboardingProfile,
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
  onEnableHealthWeather: () => void
  logs: WorkoutLog[]
  totalMinutes: number
  onOpenStopwatch: () => void
  onOpenBreath?: () => void
  recommendedPreset: SessionPreset
  presetMode: PresetMode
  onboardingProfile?: OnboardingProfile | null
  accountEmail?: string
  weatherUiPhase?: 'idle' | 'loading' | 'offline' | 'error'
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function handleFromEmail(email?: string): string | null {
  if (!email || !email.includes('@')) return null
  const local = email.split('@')[0]
  return local.charAt(0).toUpperCase() + local.slice(1)
}

const DATE_FMT: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }
const TIME_FMT: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }

type MetricTone = 'synced' | 'profile' | 'unavailable'

function MetricCard({
  label,
  value,
  unit,
  tag,
  tone,
}: {
  label: string
  value: string
  unit?: string
  tag: string
  tone: MetricTone
}) {
  return (
    <div className="dash-metric">
      <p className="dash-metric-label">{label}</p>
      <p className="dash-metric-value">
        {value}
        {unit && value !== '—' && <span className="dash-metric-unit"> {unit}</span>}
      </p>
      <span className={`dash-tag dash-tag--${tone}`}>{tag}</span>
    </div>
  )
}

export function DashboardScreen({
  health,
  insights,
  telemetry,
  isTelemetrySyncing,
  onSyncTelemetry,
  onEnableHealthWeather,
  logs,
  onOpenStopwatch,
  onOpenBreath,
  recommendedPreset,
  onboardingProfile,
  accountEmail,
}: DashboardScreenProps) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const quote = useMemo(() => getDailyQuote(), [])
  const streak = useMemo(() => computeStreak(logs, now), [logs, now])
  const lastSession = logs[0] ?? null
  const handle = handleFromEmail(accountEmail)

  const weather = telemetry.weatherSnapshot
  const weatherOff = weather.source === 'disabled'
  const readiness = Math.round(health.readiness)
  const topInsight = insights.items[0]

  return (
    <section className="screen-shell screen-shell--paged dash-screen">
      <ScreenPager ariaLabel="Dashboard">
        <ScreenPage className="screen-page--scroll">
          <div className="dash-head">
            <div>
              <p className="dash-greeting">
                {greetingFor(now.getHours())}
                {handle ? `, ${handle}` : ''}
              </p>
              <p className="dash-date">{now.toLocaleDateString(undefined, DATE_FMT)}</p>
            </div>
            <p className="dash-clock" aria-label="Current time">
              {now.toLocaleTimeString(undefined, TIME_FMT)}
            </p>
          </div>

          <button
            type="button"
            className="dash-weather"
            onClick={weatherOff ? onEnableHealthWeather : undefined}
            aria-label="Weather"
          >
            {weatherOff ? (
              <span className="dash-weather-off">Weather off · tap to enable</span>
            ) : (
              <>
                <span className="dash-weather-temp">
                  {weather.temperatureC === null ? '—' : `${Math.round(weather.temperatureC)}°`}
                </span>
                <span className="dash-weather-cond">
                  {weather.condition}
                  {weather.source === 'simulated' && <em className="dash-est"> · estimated</em>}
                </span>
              </>
            )}
          </button>

          <div className="dash-readiness">
            <ReadinessRing value={readiness} />
            <div className="dash-readiness-copy">
              <p className="dash-readiness-label">Readiness</p>
              <p className="dash-readiness-hint">{topInsight ? topInsight.title : 'Sync to personalise'}</p>
              <span className={`dash-streak${streak > 0 ? ' dash-streak--live' : ''}`}>
                {streak > 0 ? `🔥 ${streak}-day streak` : 'Start your streak today'}
              </span>
            </div>
          </div>

          <div className="dash-session-card">
            <p className="section-kicker">Today’s session</p>
            <h3 className="dash-session-title">{recommendedPreset.title}</h3>
            <p className="dash-session-summary">{recommendedPreset.summary}</p>
            <div className="dash-session-actions">
              <button type="button" className="sw-btn sw-btn-primary" onClick={onOpenStopwatch}>
                Stopwatch
              </button>
              <button
                type="button"
                className="sw-btn"
                onClick={onOpenBreath}
                disabled={!onOpenBreath}
              >
                Breathwork
              </button>
            </div>
          </div>
        </ScreenPage>

        <ScreenPage className="screen-page--scroll">
          <p className="section-kicker">Vitals &amp; profile</p>
          <div className="dash-metric-grid">
            <MetricCard
              label="Steps today"
              value={health.stepsToday === null ? 'Not connected' : health.stepsToday.toLocaleString()}
              tag={health.stepsToday === null ? 'Health sync' : 'Synced'}
              tone={health.stepsToday === null ? 'unavailable' : 'synced'}
            />
            <MetricCard
              label="Heart rate"
              value={health.heartRate > 0 ? String(Math.round(health.heartRate)) : '—'}
              unit="bpm"
              tag={health.heartRate > 0 ? 'Synced' : 'Unavailable'}
              tone={health.heartRate > 0 ? 'synced' : 'unavailable'}
            />
            <MetricCard
              label="Height"
              value={onboardingProfile ? String(onboardingProfile.heightCm) : '—'}
              unit="cm"
              tag="Profile"
              tone="profile"
            />
            <MetricCard
              label="Weight"
              value={onboardingProfile ? String(onboardingProfile.weightKg) : '—'}
              unit="kg"
              tag="Profile"
              tone="profile"
            />
            <MetricCard
              label="Age"
              value={onboardingProfile ? String(onboardingProfile.ageYears) : '—'}
              unit="yrs"
              tag="Profile"
              tone="profile"
            />
          </div>

          <div className="dash-sync-card">
            <div>
              <p className="dash-sync-title">Health sync</p>
              <p className="dash-sync-status">{telemetry.lastSyncLabel || 'Not synced yet'}</p>
            </div>
            <button
              type="button"
              className="sw-btn"
              onClick={telemetry.healthApp === 'unavailable' ? onEnableHealthWeather : onSyncTelemetry}
              disabled={isTelemetrySyncing}
            >
              {isTelemetrySyncing ? 'Syncing…' : telemetry.healthApp === 'unavailable' ? 'Enable' : 'Sync'}
            </button>
          </div>

          <div className="dash-last-card">
            <p className="section-kicker">Previous session</p>
            {lastSession ? (
              <>
                <p className="dash-last-title">{lastSession.title}</p>
                <p className="dash-last-meta">
                  {lastSession.durationMinutes} min ·{' '}
                  {new Date(lastSession.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </p>
              </>
            ) : (
              <p className="dash-empty">No sessions yet — your first one will show here.</p>
            )}
          </div>

          <figure className="dash-quote">
            <blockquote>{quote.text}</blockquote>
            <figcaption>{quote.source}</figcaption>
          </figure>
        </ScreenPage>
      </ScreenPager>
    </section>
  )
}

const RING_R = 34
const RING_C = 2 * Math.PI * RING_R

function ReadinessRing({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value))
  const offset = RING_C * (1 - clamped / 100)
  return (
    <svg className="dash-ring" viewBox="0 0 80 80" role="img" aria-label={`Readiness ${clamped} percent`}>
      <circle className="dash-ring-track" cx="40" cy="40" r={RING_R} />
      <circle
        className="dash-ring-fill"
        cx="40"
        cy="40"
        r={RING_R}
        strokeDasharray={RING_C}
        strokeDashoffset={offset}
        transform="rotate(-90 40 40)"
      />
      <text className="dash-ring-text" x="40" y="46" textAnchor="middle">
        {clamped}
      </text>
    </svg>
  )
}
