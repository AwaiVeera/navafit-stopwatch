import { describe, expect, it } from 'vitest'

import type { HealthMetrics, TelemetryState, WorkoutLog } from '../types'
import {
  buildRecommendedSessionPreset,
  getDraftPresetForMode,
  STANDARD_SESSION_PRESET,
} from './presets'

const baseHealth: HealthMetrics = {
  heartRate: 128,
  readiness: 74,
  stamina: 70,
  breathPerMinute: 15,
  endurance: 68,
  stressLevel: 34,
  stepsToday: null,
}

const baseTelemetry: TelemetryState = {
  healthApp: 'ready',
  fitnessWatch: 'ready',
  weather: 'ready',
  weatherSnapshot: {
    condition: 'Clear',
    temperatureC: 29,
    source: 'device',
  },
  lastSyncLabel: 'Synced 09:00',
  healthSourceLabel: 'Apple Health',
  watchSourceLabel: 'Apple Watch',
}

const baseLogs: WorkoutLog[] = [
  {
    id: '1',
    date: '2026-03-18',
    title: 'Combat Flow',
    durationMinutes: 38,
    note: 'Steady work.',
  },
  {
    id: '2',
    date: '2026-03-17',
    title: 'Breathwork',
    durationMinutes: 32,
    note: 'Recovery block.',
  },
]

describe('preset engine', () => {
  it('returns a recovery-biased preset when stress is elevated', () => {
    const preset = buildRecommendedSessionPreset({
      health: {
        ...baseHealth,
        readiness: 52,
        breathPerMinute: 20,
        stressLevel: 61,
      },
      telemetry: baseTelemetry,
      logs: baseLogs,
    })

    expect(preset.id).toBe('recovery-reset')
    expect(preset.targetMinutes).toBe(32)
    expect(preset.breathPreset.label).toBe('4-2-6 recovery cadence')
  })

  it('returns a build preset when readiness is strong and recent load is moderate', () => {
    const preset = buildRecommendedSessionPreset({
      health: {
        ...baseHealth,
        readiness: 84,
        stamina: 77,
        endurance: 76,
        stressLevel: 28,
      },
      telemetry: baseTelemetry,
      logs: baseLogs,
    })

    expect(preset.id).toBe('build-window')
    expect(preset.targetMinutes).toBe(50)
    expect(preset.recoveryBias).toBe('build')
  })

  it('uses the standard preset when suggest-only mode is active', () => {
    const preset = buildRecommendedSessionPreset({
      health: baseHealth,
      telemetry: baseTelemetry,
      logs: baseLogs,
    })

    expect(getDraftPresetForMode('suggest_only', preset)).toEqual(STANDARD_SESSION_PRESET)
    expect(getDraftPresetForMode('auto_apply', preset)).toEqual(preset)
  })
})
