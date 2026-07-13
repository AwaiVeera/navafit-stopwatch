import { describe, expect, it } from 'vitest'

import { BreathController } from './breath-controller'
import type { BreathSpec } from './breath-engine'

// Inhale 4, Hold 4, Exhale 4, Hold 4 → 16s cycle; 2 cycles = 32s.
const SPEC: BreathSpec = {
  phases: [
    { name: 'Inhale', durationSeconds: 4, instruction: 'in' },
    { name: 'Hold', durationSeconds: 4, instruction: 'hold' },
    { name: 'Exhale', durationSeconds: 4, instruction: 'out' },
    { name: 'Hold', durationSeconds: 4, instruction: 'hold' },
  ],
  targetSeconds: 32,
}

describe('BreathController', () => {
  it('starts idle in the inhale phase', () => {
    const c = new BreathController(SPEC)
    expect(c.status).toBe('idle')
    expect(c.sample(0).state.kind).toBe('inhale')
  })

  it('runs, pauses, resumes on the injected clock', () => {
    const c = new BreathController(SPEC)
    c.start(1_000)
    expect(c.sample(5_000).state.totalElapsedMs).toBe(4_000)
    c.pause(5_000)
    expect(c.sample(9_000).state.totalElapsedMs).toBe(4_000)
    c.resume(9_000)
    expect(c.sample(10_000).state.totalElapsedMs).toBe(5_000)
  })

  it('emits a transition when the phase changes, once', () => {
    const c = new BreathController(SPEC)
    c.start(0)
    expect(c.sample(2_000).transition).toBeUndefined() // still inhale
    const crossing = c.sample(4_000) // inhale → hold
    expect(crossing.transition).toMatchObject({ kind: 'hold', phaseIndex: 1, cycleIndex: 1 })
    expect(c.sample(5_000).transition).toBeUndefined()
  })

  it('skips to the next phase boundary', () => {
    const c = new BreathController(SPEC)
    c.start(0)
    c.sample(1_000) // inhale
    c.skip(1_000) // → hold at 4_000
    const s = c.sample(1_000)
    expect(s.state.kind).toBe('hold')
    expect(s.state.totalElapsedMs).toBe(4_000)
  })

  it('end() completes immediately', () => {
    const c = new BreathController(SPEC)
    c.start(1_000)
    c.end(2_000)
    expect(c.status).toBe('complete')
    expect(c.sample(9_999).state.isComplete).toBe(true)
  })

  it('auto-completes at the target while running', () => {
    const c = new BreathController(SPEC)
    c.start(0)
    c.sample(20_000)
    const s = c.sample(32_000)
    expect(s.status).toBe('complete')
    expect(s.state.isComplete).toBe(true)
  })

  it('restart resets to the beginning and runs', () => {
    const c = new BreathController(SPEC)
    c.start(0)
    c.sample(10_000)
    c.restart(20_000)
    expect(c.status).toBe('running')
    expect(c.sample(20_000).state.totalElapsedMs).toBe(0)
  })

  it('does not start again once complete', () => {
    const c = new BreathController(SPEC)
    c.start(0)
    c.end(0)
    c.start(100)
    expect(c.status).toBe('complete')
  })
})
