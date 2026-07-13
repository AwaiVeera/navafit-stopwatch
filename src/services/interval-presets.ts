/**
 * Canonical round-based training presets for the rebuilt Stopwatch, expressed
 * as timer-engine IntervalSpecs. Beginner is free; the rest sit behind the
 * entitlement seam (accessible now, gated once IAP lands).
 *
 * Values mirror the app's existing shipped stopwatch modes so behaviour is
 * preserved, plus a Beginner round preset per the revamp mandate (8×3min).
 * Labels are neutral — no unproven "scientifically superior" claims.
 */
import type { StopwatchModeConfig, TrainingLevel } from '../types'
import { isProLevel } from './entitlements'
import type { IntervalSpec } from './timer-engine'

/** Shared preparation countdown before round 1. */
export const DEFAULT_PREP_SECONDS = 10

export interface TrainingIntervalPreset {
  level: TrainingLevel
  label: string
  spec: IntervalSpec
  /** Requires the Pro unlock once gating is enabled. */
  isPro: boolean
  /** One-line, non-diagnostic intensity note. */
  intensity: string
}

export const INTERVAL_PRESETS: readonly TrainingIntervalPreset[] = [
  {
    level: 'novice',
    label: 'Beginner',
    spec: { prepSeconds: DEFAULT_PREP_SECONDS, rounds: 8, workSeconds: 180, restSeconds: 60 },
    isPro: false,
    intensity: 'Foundational · 8 rounds of 3 min with 1 min rest',
  },
  {
    level: 'intermediate',
    label: 'Intermediate',
    spec: { prepSeconds: DEFAULT_PREP_SECONDS, rounds: 5, workSeconds: 180, restSeconds: 60 },
    isPro: true,
    intensity: 'Sustained · 5 rounds of 3 min with 1 min rest',
  },
  {
    level: 'advanced',
    label: 'Advanced',
    spec: { prepSeconds: DEFAULT_PREP_SECONDS, rounds: 5, workSeconds: 300, restSeconds: 60 },
    isPro: true,
    intensity: 'Demanding · 5 rounds of 5 min with 1 min rest',
  },
  {
    level: 'expert',
    label: 'Expert',
    spec: { prepSeconds: DEFAULT_PREP_SECONDS, rounds: 5, workSeconds: 480, restSeconds: 60 },
    isPro: true,
    intensity: 'Elite · 5 rounds of 8 min with 1 min rest',
  },
]

export function getIntervalPreset(level: TrainingLevel): TrainingIntervalPreset {
  return INTERVAL_PRESETS.find((p) => p.level === level) ?? INTERVAL_PRESETS[0]
}

/**
 * Derive an IntervalSpec from an existing StopwatchModeConfig. Auto-lap modes
 * map lapCount→rounds, lapDuration→work, interval→rest. A non-auto-lap (manual)
 * mode has no fixed structure, so it falls back to the Beginner preset spec.
 */
export function intervalSpecFromMode(
  mode: StopwatchModeConfig,
  prepSeconds: number = DEFAULT_PREP_SECONDS,
): IntervalSpec {
  if (!mode.isAutoLap || mode.lapDurationSeconds === null || mode.lapCount <= 0) {
    return getIntervalPreset('novice').spec
  }
  return {
    prepSeconds,
    rounds: mode.lapCount,
    workSeconds: mode.lapDurationSeconds,
    restSeconds: mode.intervalSeconds ?? 0,
  }
}

export { isProLevel }
