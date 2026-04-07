import type { StopwatchModeConfig, TrainingLevel } from '../types'

export const STOPWATCH_MODES: readonly StopwatchModeConfig[] = [
  {
    id: 'novice',
    label: 'Novice',
    lapCount: 0,
    lapDurationSeconds: null,
    intervalSeconds: null,
    isAutoLap: false,
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    lapCount: 5,
    lapDurationSeconds: 180,
    intervalSeconds: 60,
    isAutoLap: true,
  },
  {
    id: 'advanced',
    label: 'Advanced',
    lapCount: 5,
    lapDurationSeconds: 300,
    intervalSeconds: 60,
    isAutoLap: true,
  },
  {
    id: 'expert',
    label: 'Expert',
    lapCount: 5,
    lapDurationSeconds: 480,
    intervalSeconds: 60,
    isAutoLap: true,
  },
] as const

export function getStopwatchMode(id: TrainingLevel): StopwatchModeConfig {
  return STOPWATCH_MODES.find((mode) => mode.id === id) ?? STOPWATCH_MODES[0]
}

export function getTotalSessionSeconds(mode: StopwatchModeConfig): number {
  if (!mode.isAutoLap || mode.lapDurationSeconds === null) {
    return 0
  }

  const lapTotal = mode.lapCount * mode.lapDurationSeconds
  const intervalTotal = (mode.lapCount - 1) * (mode.intervalSeconds ?? 0)
  return lapTotal + intervalTotal
}
