import { describe, expect, it } from 'vitest'

import { IntervalTimerController } from './interval-controller'
import type { IntervalSpec } from './timer-engine'

// prep 10s, 2 rounds work 20s, rest 5s → prep(0–10) work1(10–30) rest1(30–35) work2(35–55); total 55s
const SPEC: IntervalSpec = { prepSeconds: 10, rounds: 2, workSeconds: 20, restSeconds: 5 }

describe('IntervalTimerController', () => {
  it('starts idle and reports prep', () => {
    const c = new IntervalTimerController(SPEC)
    expect(c.status).toBe('idle')
    const { state } = c.sample(0)
    expect(state.phase).toBe('prep')
  })

  it('runs, pauses, and resumes on the injected clock', () => {
    const c = new IntervalTimerController(SPEC)
    c.start(1_000)
    expect(c.sample(6_000).state.totalElapsedMs).toBe(5_000)
    c.pause(6_000)
    expect(c.status).toBe('paused')
    expect(c.sample(9_000).state.totalElapsedMs).toBe(5_000) // frozen
    c.resume(9_000)
    expect(c.sample(10_000).state.totalElapsedMs).toBe(6_000)
  })

  it('emits a phase transition exactly once at a boundary', () => {
    const c = new IntervalTimerController(SPEC)
    c.start(0)
    expect(c.sample(5_000).transition).toBeUndefined() // still prep
    const crossing = c.sample(10_000) // prep → work1
    expect(crossing.transition).toEqual({ from: 'prep', to: 'work', roundIndex: 1 })
    expect(c.sample(11_000).transition).toBeUndefined() // no repeat
  })

  it('skips to the start of the next segment', () => {
    const c = new IntervalTimerController(SPEC)
    c.start(0)
    c.sample(3_000) // in prep
    c.skip(3_000) // → start of work1 at 10_000
    const s = c.sample(3_000)
    expect(s.state.phase).toBe('work')
    expect(s.state.roundIndex).toBe(1)
    expect(s.state.totalElapsedMs).toBe(10_000)
  })

  it('skip from the final segment completes the session', () => {
    const c = new IntervalTimerController(SPEC)
    c.start(0)
    c.skip(0) // prep→work1(10k)
    c.skip(0) // work1→rest1(30k)
    c.skip(0) // rest1→work2(35k)
    c.skip(0) // work2→complete
    expect(c.status).toBe('complete')
    expect(c.sample(0).state.isComplete).toBe(true)
  })

  it('end() finishes immediately', () => {
    const c = new IntervalTimerController(SPEC)
    c.start(1_000)
    c.end(2_000)
    expect(c.status).toBe('complete')
    const s = c.sample(9_999)
    expect(s.state.isComplete).toBe(true)
    expect(s.state.totalElapsedMs).toBe(55_000)
  })

  it('auto-completes when elapsed reaches the total while running', () => {
    const c = new IntervalTimerController(SPEC)
    c.start(0)
    c.sample(40_000) // advance through to work round 2 first
    const s = c.sample(55_000)
    expect(s.status).toBe('complete')
    expect(s.state.isComplete).toBe(true)
    expect(s.transition).toEqual({ from: 'work', to: 'complete', roundIndex: 2 })
  })

  it('reset returns to idle prep', () => {
    const c = new IntervalTimerController(SPEC)
    c.start(0)
    c.sample(20_000)
    c.reset()
    expect(c.status).toBe('idle')
    expect(c.sample(0).state.phase).toBe('prep')
  })

  it('does not start again once complete', () => {
    const c = new IntervalTimerController(SPEC)
    c.start(0)
    c.end(0)
    c.start(100) // ignored
    expect(c.status).toBe('complete')
  })
})
