import { describe, expect, it } from 'vitest'

import { computeStreak } from './streak'
import type { WorkoutLog } from '../types'

const NOW = new Date('2026-07-13T12:00:00')

function log(dateISO: string): WorkoutLog {
  return { id: dateISO, date: dateISO, title: 'Session', durationMinutes: 20, note: '' }
}

describe('computeStreak', () => {
  it('is 0 with no logs', () => {
    expect(computeStreak([], NOW)).toBe(0)
  })

  it('counts consecutive days ending today', () => {
    const logs = [log('2026-07-13T08:00:00'), log('2026-07-12T08:00:00'), log('2026-07-11T08:00:00')]
    expect(computeStreak(logs, NOW)).toBe(3)
  })

  it('stays live when today is missing but yesterday is present', () => {
    const logs = [log('2026-07-12T08:00:00'), log('2026-07-11T08:00:00')]
    expect(computeStreak(logs, NOW)).toBe(2)
  })

  it('breaks on a gap', () => {
    const logs = [log('2026-07-13T08:00:00'), log('2026-07-11T08:00:00')] // 12th missing
    expect(computeStreak(logs, NOW)).toBe(1)
  })

  it('is 0 when the most recent session is older than yesterday', () => {
    const logs = [log('2026-07-10T08:00:00')]
    expect(computeStreak(logs, NOW)).toBe(0)
  })

  it('counts multiple sessions on one day as a single streak day', () => {
    const logs = [log('2026-07-13T08:00:00'), log('2026-07-13T18:00:00'), log('2026-07-12T08:00:00')]
    expect(computeStreak(logs, NOW)).toBe(2)
  })
})
