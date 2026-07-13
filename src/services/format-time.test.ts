import { describe, expect, it } from 'vitest'

import { formatDuration, formatElapsed, formatRemaining } from './format-time'

describe('format-time', () => {
  it('formats remaining time rounding up', () => {
    expect(formatRemaining(0)).toBe('0:00')
    expect(formatRemaining(1)).toBe('0:01') // any remainder shows the next second
    expect(formatRemaining(59_400)).toBe('1:00')
    expect(formatRemaining(180_000)).toBe('3:00')
  })

  it('formats elapsed time rounding down', () => {
    expect(formatElapsed(0)).toBe('0:00')
    expect(formatElapsed(999)).toBe('0:00')
    expect(formatElapsed(61_000)).toBe('1:01')
  })

  it('formats a duration label', () => {
    expect(formatDuration(180)).toBe('3:00')
    expect(formatDuration(60)).toBe('1:00')
  })

  it('never renders negative time', () => {
    expect(formatRemaining(-5_000)).toBe('0:00')
    expect(formatElapsed(-5_000)).toBe('0:00')
  })
})
