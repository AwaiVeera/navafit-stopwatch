import type {
  HealthMetrics,
  PresetMode,
  SessionPreset,
  TelemetryState,
  WorkoutLog,
} from '../types'

const PRESET_MODE_STORAGE_KEY = 'navafit-preset-mode'

export const STANDARD_SESSION_PRESET: SessionPreset = {
  id: 'standard-45',
  title: 'Standard 45-minute session',
  summary: 'Balanced combat-flow block with the default NavaFit pacing.',
  targetMinutes: 45,
  recoveryBias: 'maintain',
  sourceLabel: 'NavaFit base profile',
  rationale: [
    'Uses the default 45-minute session window.',
    'Keeps the breathing guide on the steady 4-2-4 pattern.',
  ],
  breathPreset: {
    inhaleSeconds: 4,
    holdSeconds: 2,
    exhaleSeconds: 4,
    cycleSeconds: 10,
    label: '4-2-4 steady cadence',
  },
}

interface PresetEngineInput {
  health: HealthMetrics
  telemetry: TelemetryState
  logs: WorkoutLog[]
}

export function buildRecommendedSessionPreset({
  health,
  telemetry,
  logs,
}: PresetEngineInput): SessionPreset {
  const recentMinutes = logs.slice(0, 4).reduce((total, item) => total + item.durationMinutes, 0)
  const lowRecovery = health.readiness < 60 || health.stressLevel > 58 || health.breathPerMinute > 18
  const highReadiness =
    health.readiness >= 80 && health.endurance >= 72 && health.stamina >= 72 && health.stressLevel < 42

  if (lowRecovery) {
    return {
      id: 'recovery-reset',
      title: 'Recovery reset block',
      summary: 'Shorten the next session and bias the breath toward a longer exhale.',
      targetMinutes: 32,
      recoveryBias: 'recover',
      sourceLabel: telemetry.healthSourceLabel,
      rationale: [
        `Recovery markers are under pressure: readiness ${health.readiness}% and stress ${health.stressLevel}%.`,
        'The preset shortens the training window before your next full session.',
      ],
      breathPreset: {
        inhaleSeconds: 4,
        holdSeconds: 2,
        exhaleSeconds: 6,
        cycleSeconds: 12,
        label: '4-2-6 recovery cadence',
      },
    }
  }

  if (highReadiness && recentMinutes < 150) {
    return {
      id: 'build-window',
      title: 'Build window session',
      summary: 'Extend the next block slightly while holding a controlled exhale.',
      targetMinutes: 50,
      recoveryBias: 'build',
      sourceLabel: telemetry.healthSourceLabel,
      rationale: [
        `Readiness ${health.readiness}% with endurance ${health.endurance}% supports a longer build window.`,
        `Recent load is still moderate at ${recentMinutes} minutes across the last four logged sessions.`,
      ],
      breathPreset: {
        inhaleSeconds: 4,
        holdSeconds: 1,
        exhaleSeconds: 6,
        cycleSeconds: 11,
        label: '4-1-6 build cadence',
      },
    }
  }

  return {
    id: 'controlled-base',
    title: 'Controlled base session',
    summary: 'Keep the session productive, but stay just under the full default load.',
    targetMinutes: 40,
    recoveryBias: 'maintain',
    sourceLabel: telemetry.healthSourceLabel,
    rationale: [
      `Recovery and strain look balanced enough for steady work: readiness ${health.readiness}% and stress ${health.stressLevel}%.`,
      'The session stays below the full 45-minute default while data quality continues to improve.',
    ],
    breathPreset: {
      inhaleSeconds: 4,
      holdSeconds: 2,
      exhaleSeconds: 5,
      cycleSeconds: 11,
      label: '4-2-5 controlled cadence',
    },
  }
}

export function readPresetModePreference(): PresetMode {
  if (typeof window === 'undefined') {
    return 'suggest_only'
  }

  const storedValue = window.localStorage.getItem(PRESET_MODE_STORAGE_KEY)
  return storedValue === 'auto_apply' ? 'auto_apply' : 'suggest_only'
}

export function savePresetModePreference(mode: PresetMode) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(PRESET_MODE_STORAGE_KEY, mode)
}

export function getDraftPresetForMode(mode: PresetMode, recommendedPreset: SessionPreset) {
  return mode === 'auto_apply' ? recommendedPreset : STANDARD_SESSION_PRESET
}
