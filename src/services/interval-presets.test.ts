import { describe, expect, it } from 'vitest'

import { getIntervalPreset, INTERVAL_PRESETS, intervalSpecFromMode } from './interval-presets'
import { buildTimeline } from './timer-engine'
import type { StopwatchModeConfig } from '../types'

describe('interval presets', () => {
  it('exposes a free Beginner (8×3min) and gated harder tiers', () => {
    const beginner = getIntervalPreset('novice')
    expect(beginner.label).toBe('Beginner')
    expect(beginner.isPro).toBe(false)
    expect(beginner.spec).toMatchObject({ rounds: 8, workSeconds: 180, restSeconds: 60 })

    expect(INTERVAL_PRESETS.filter((p) => p.isPro).map((p) => p.level)).toEqual([
      'intermediate',
      'advanced',
      'expert',
    ])
  })

  it('every preset builds a valid, non-empty timeline', () => {
    for (const preset of INTERVAL_PRESETS) {
      const t = buildTimeline(preset.spec)
      expect(t.totalMs).toBeGreaterThan(0)
      expect(t.totalRounds).toBe(preset.spec.rounds)
    }
  })

  it('maps an auto-lap mode to rounds/work/rest', () => {
    const mode: StopwatchModeConfig = {
      id: 'intermediate',
      label: 'Intermediate',
      lapCount: 5,
      lapDurationSeconds: 180,
      intervalSeconds: 60,
      isAutoLap: true,
    }
    expect(intervalSpecFromMode(mode, 10)).toEqual({
      prepSeconds: 10,
      rounds: 5,
      workSeconds: 180,
      restSeconds: 60,
    })
  })

  it('falls back to the Beginner spec for a manual (non-auto-lap) mode', () => {
    const manual: StopwatchModeConfig = {
      id: 'novice',
      label: 'Novice',
      lapCount: 0,
      lapDurationSeconds: null,
      intervalSeconds: null,
      isAutoLap: false,
    }
    expect(intervalSpecFromMode(manual)).toEqual(getIntervalPreset('novice').spec)
  })
})
