import { describe, expect, it } from 'vitest'

import { computeLapSplits, formatStopwatch } from './stopwatch'

describe('formatStopwatch', () => {
  it('formats zero', () => {
    expect(formatStopwatch(0)).toBe('00:00.00')
  })

  it('formats typical elapsed time', () => {
    expect(formatStopwatch(125340)).toBe('02:05.34')
  })

  it('formats sub-second time', () => {
    expect(formatStopwatch(870)).toBe('00:00.87')
  })
})

describe('computeLapSplits', () => {
  it('returns empty for no laps', () => {
    expect(computeLapSplits([])).toEqual([])
  })

  it('computes single lap split from zero', () => {
    const splits = computeLapSplits([60000])
    expect(splits).toEqual([
      { lapNumber: 1, cumulativeMs: 60000, splitMs: 60000 },
    ])
  })

  it('computes multiple lap splits correctly', () => {
    const splits = computeLapSplits([180000, 120000, 45000])
    expect(splits).toEqual([
      { lapNumber: 3, cumulativeMs: 180000, splitMs: 60000 },
      { lapNumber: 2, cumulativeMs: 120000, splitMs: 75000 },
      { lapNumber: 1, cumulativeMs: 45000, splitMs: 45000 },
    ])
  })
})
