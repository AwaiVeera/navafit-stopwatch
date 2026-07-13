/**
 * DEV-only preview harness. Lets in-app screens be opened in a browser without
 * a live auth session, e.g. `?preview=stopwatch`, so UI can be verified visually
 * during the revamp. Never imported in production builds (guarded in main.tsx).
 */
import type { ReactNode } from 'react'

import { BreathScreen } from '../screens/BreathScreen'
import { StopwatchScreen } from '../screens/StopwatchScreen'
import type {
  BreathworkMode,
  HealthMetrics,
  SessionPreset,
  StopwatchModeConfig,
  WeatherSnapshot,
} from '../types'

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

