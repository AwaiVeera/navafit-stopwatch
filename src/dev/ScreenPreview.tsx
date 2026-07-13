/**
 * DEV-only preview harness. Lets in-app screens be opened in a browser without
 * a live auth session, e.g. `?preview=stopwatch`, so UI can be verified visually
 * during the revamp. Never imported in production builds (guarded in main.tsx).
 */
import type { ReactNode } from 'react'

import { BreathScreen } from '../screens/BreathScreen'
import { DashboardScreen } from '../screens/DashboardScreen'
import { StopwatchScreen } from '../screens/StopwatchScreen'
import type {
  BreathworkMode,
  HealthMetrics,
  InsightSnapshot,
  OnboardingProfile,
  SessionPreset,
  StopwatchModeConfig,
  TelemetryState,
  WorkoutLog,
} from '../types'
import type { WeatherSnapshot } from '../types'

const MOCK_MODE: StopwatchModeConfig = {
  id: 'intermediate',
  label: 'Intermediate',
  lapCount: 5,
  lapDurationSeconds: 180,
  intervalSeconds: 60,
  isAutoLap: true,
}

const MOCK_PRESET = {
  id: 'preview',
  title: 'Kalari Interval',
  summary: 'Preview session',
  targetMinutes: 24,
  recoveryBias: 'balanced',
  sourceLabel: 'Preview',
  rationale: [],
  breathPreset: { inhaleSeconds: 4, holdSeconds: 4, exhaleSeconds: 4, cycleSeconds: 12, label: 'Box Breath' },
} as unknown as SessionPreset

const MOCK_BREATH_MODE: BreathworkMode = { id: 'intermediate', label: 'Intermediate', protocols: [] }

function PreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app-root relative overflow-hidden text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 app-backdrop" />
      <main className="app-frame">
        <div className="app-screen">{children}</div>
      </main>
    </div>
  )
}

export function StopwatchPreview() {
  return (
    <PreviewFrame>
      <StopwatchScreen
        onBack={() => undefined}
        weatherSnapshot={{} as WeatherSnapshot}
        heartRate={0}
        sessionPreset={MOCK_PRESET}
        stopwatchMode={MOCK_MODE}
        onSaveSession={() => undefined}
      />
    </PreviewFrame>
  )
}

const MOCK_HEALTH: HealthMetrics = {
  heartRate: 62,
  readiness: 78,
  stamina: 70,
  breathPerMinute: 13,
  endurance: 66,
  stressLevel: 32,
  stepsToday: 8432,
}

const MOCK_TELEMETRY = {
  healthApp: 'ready',
  weather: 'ready',
  weatherSnapshot: { condition: 'Clear skies', temperatureC: 29, source: 'device' },
  lastSyncLabel: 'Synced 2 min ago',
  healthSourceLabel: 'Apple Health',
} as unknown as TelemetryState

const MOCK_INSIGHTS = {
  engineLabel: 'NavaFit AI',
  generatedAtLabel: 'just now',
  items: [{ title: 'Well recovered — a strong day to train' }],
} as unknown as InsightSnapshot

const MOCK_PROFILE: OnboardingProfile = { ageYears: 32, heightCm: 178, weightKg: 74, trainingDaysPerWeek: 4 }

const MOCK_LOGS: WorkoutLog[] = [
  { id: '1', date: new Date().toISOString(), title: 'Kalari Interval', durationMinutes: 24, note: '' },
  { id: '2', date: new Date(Date.now() - 86_400_000).toISOString(), title: 'Box Breathing', durationMinutes: 8, note: '' },
]

export function DashboardPreview() {
  return (
    <PreviewFrame>
      <DashboardScreen
        health={MOCK_HEALTH}
        insights={MOCK_INSIGHTS}
        telemetry={MOCK_TELEMETRY}
        isTelemetrySyncing={false}
        onSyncTelemetry={() => undefined}
        onEnableHealthWeather={() => undefined}
        logs={MOCK_LOGS}
        totalMinutes={320}
        onOpenStopwatch={() => undefined}
        onOpenBreath={() => undefined}
        recommendedPreset={MOCK_PRESET}
        presetMode={'ai' as never}
        onboardingProfile={MOCK_PROFILE}
        accountEmail="awai@navafit.sg"
      />
    </PreviewFrame>
  )
}

export function BreathPreview() {
  return (
    <PreviewFrame>
      <BreathScreen
        health={{} as HealthMetrics}
        sessionPreset={MOCK_PRESET}
        breathworkMode={MOCK_BREATH_MODE}
        onBack={() => undefined}
        onSaveSession={() => undefined}
      />
    </PreviewFrame>
  )
}

