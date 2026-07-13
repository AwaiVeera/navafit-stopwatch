import { describe, expect, it } from 'vitest'

import { breathStateAt, classifyBreathPhase, cycleDurationMs, type BreathSpec } from './breath-engine'

// Box breathing: Inhale 4, Hold 4, Exhale 4, Hold 4 → 16s cycle.
const BOX: BreathSpec = {
  phases: [
    { name: 'Inhale', durationSeconds: 4, instruction: 'in' },
    { name: 'Hold', durationSeconds: 4, instruction: 'hold' },
    { name: 'Exhale', durationSeconds: 4, instruction: 'out' },
    { name: 'Hold', durationSeconds: 4, instruction: 'hold' },
  ],
  targetSeconds: 48, // 3 cycles
}

describe('classifyBreathPhase', () => {
  it('maps names to inhale/hold/exhale', () => {
    expect(classifyBreathPhase('Inhale')).toBe('inhale')
    expect(classifyBreathPhase('Inhale 2')).toBe('inhale')
    expect(classifyBreathPhase('Exhale slowly')).toBe('exhale')
    expect(classifyBreathPhase('Hold')).toBe('hold')
    expect(classifyBreathPhase('Pause')).toBe('hold')
  })
})

describe('cycleDurationMs', () => {
  it('sums phase durations', () => {
    expect(cycleDurationMs(BOX.phases)).toBe(16_000)
  })
})

describe('breathStateAt', () => {
  it('starts inhaling, cycle 1', () => {
    const s = breathStateAt(BOX, 0)
    expect(s.kind).toBe('inhale')
    expect(s.cycleIndex).toBe(1)
    expect(s.totalCycles).toBe(3)
    expect(s.phaseRemainingMs).toBe(4_000)
    expect(s.expansion).toBe(0) // just began inhaling
  })

  it('expands over the inhale', () => {
    expect(breathStateAt(BOX, 2_000).expansion).toBeCloseTo(0.5, 5)
    expect(breathStateAt(BOX, 3_999).expansion).toBeGreaterThan(0.99)
  })

  it('holds at the top after inhaling', () => {
    const s = breathStateAt(BOX, 6_000) // 2s into the first hold
    expect(s.kind).toBe('hold')
    expect(s.expansion).toBe(1)
  })

  it('contracts over the exhale', () => {
    const s = breathStateAt(BOX, 10_000) // 2s into exhale (8_000–12_000)
    expect(s.kind).toBe('exhale')
    expect(s.expansion).toBeCloseTo(0.5, 5)
  })

  it('holds at the bottom after exhaling', () => {
    const s = breathStateAt(BOX, 14_000) // 2s into the second hold (12_000–16_000)
    expect(s.kind).toBe('hold')
    expect(s.expansion).toBe(0)
  })

  it('advances the cycle counter', () => {
    expect(breathStateAt(BOX, 16_000).cycleIndex).toBe(2)
    expect(breathStateAt(BOX, 32_000).cycleIndex).toBe(3)
  })

  it('completes at and beyond the target', () => {
    const s = breathStateAt(BOX, 48_000)
    expect(s.kind).toBe('complete')
    expect(s.isComplete).toBe(true)
    expect(s.totalRemainingMs).toBe(0)
    expect(breathStateAt(BOX, 999_999).totalElapsedMs).toBe(48_000)
  })

  it('clamps negative elapsed', () => {
    expect(breathStateAt(BOX, -1_000).totalElapsedMs).toBe(0)
  })
})
