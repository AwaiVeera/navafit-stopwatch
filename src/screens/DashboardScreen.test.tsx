import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DashboardScreen } from './DashboardScreen'
import type {
  HealthMetrics,
  InsightSnapshot,
  OnboardingProfile,
  SessionPreset,
  TelemetryState,
  WorkoutLog,
} from '../types'

const HEALTH: HealthMetrics = {
  heartRate: 62,
  readiness: 78,
  stamina: 70,
  breathPerMinute: 13,
  endurance: 66,
  stressLevel: 32,
  stepsToday: 8432,
}

const TELEMETRY = {
  healthApp: 'ready',
  weather: 'ready',
  weatherSnapshot: { condition: 'Clear', temperatureC: 29, source: 'device' },
  lastSyncLabel: 'Synced 2 min ago',
  healthSourceLabel: 'Apple Health',
} as unknown as TelemetryState

const INSIGHTS = {
  engineLabel: 'AI',
  generatedAtLabel: 'now',
  items: [{ title: 'Well recovered' }],
} as unknown as InsightSnapshot

const PROFILE: OnboardingProfile = { ageYears: 32, heightCm: 178, weightKg: 74, trainingDaysPerWeek: 4 }
const PRESET = { id: 'p', title: 'Kalari Interval', summary: 'today' } as unknown as SessionPreset

function renderDash(overrides: { health?: HealthMetrics; logs?: WorkoutLog[] } = {}) {
  const onOpenStopwatch = vi.fn()
  const onOpenBreath = vi.fn()
  render(
    <DashboardScreen
      health={overrides.health ?? HEALTH}
      insights={INSIGHTS}
      telemetry={TELEMETRY}
      isTelemetrySyncing={false}
      onSyncTelemetry={vi.fn()}
      onEnableHealthWeather={vi.fn()}
      logs={overrides.logs ?? []}
      totalMinutes={100}
      onOpenStopwatch={onOpenStopwatch}
      onOpenBreath={onOpenBreath}
      recommendedPreset={PRESET}
      presetMode={'ai' as never}
      onboardingProfile={PROFILE}
      accountEmail="awai@navafit.sg"
    />,
  )
  return { onOpenStopwatch, onOpenBreath }
}

describe('DashboardScreen', () => {
  it('shows greeting, clock, readiness, and quick-access actions', () => {
    renderDash()
    expect(screen.getByText(/good (morning|afternoon|evening), awai/i)).toBeTruthy()
    expect(screen.getByLabelText(/current time/i)).toBeTruthy()
    expect(screen.getByLabelText(/readiness 78 percent/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /stopwatch/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /breathwork/i })).toBeTruthy()
  })

  it('distinguishes synced metrics from manual profile values', () => {
    renderDash()
    expect(screen.getByText('8,432')).toBeTruthy()
    expect(screen.getAllByText(/^synced$/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/^profile$/i).length).toBe(3) // height, weight, age
  })

  it('shows an honest state when steps are not connected', () => {
    renderDash({ health: { ...HEALTH, stepsToday: null } })
    expect(screen.getByText(/not connected/i)).toBeTruthy()
  })

  it('renders the empty previous-session state with no logs', () => {
    renderDash({ logs: [] })
    expect(screen.getByText(/no sessions yet/i)).toBeTruthy()
  })
})
