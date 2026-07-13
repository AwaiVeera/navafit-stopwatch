import { describe, expect, it } from 'vitest'

import {
  buildTimeline,
  sessionStateAt,
  MonotonicElapsedTimer,
  type IntervalSpec,
} from './timer-engine'

const SPEC: IntervalSpec = { prepSeconds: 10, rounds: 3, workSeconds: 180, restSeconds: 60 }

describe('buildTimeline', () => {
  it('expands prep, work, and rest into ordered segments with no rest after the final round', () => {
    const t = buildTimeline(SPEC)
    expect(t.totalRounds).toBe(3)
    expect(t.segments.map((s) => `${s.phase}${s.roundIndex}`)).toEqual([
      'prep0',
      'work1',
      'rest1',
      'work2',
      'rest2',
      'work3',
    ])
    // prep 10s + 3×180s work + 2×60s rest = 10 + 540 + 120 = 670s
    expect(t.totalMs).toBe(670_000)
    expect(t.segments[0]).toMatchObject({ startMs: 0, endMs: 10_000, durationMs: 10_000 })
    expect(t.segments[1]).toMatchObject({ phase: 'work', startMs: 10_000, endMs: 190_000 })
    expect(t.segments[5]).toMatchObject({ phase: 'work', roundIndex: 3, endMs: 670_000 })
  })

  it('omits the prep segment when prepSeconds <= 0', () => {
    const t = buildTimeline({ ...SPEC, prepSeconds: 0 })
    expect(t.segments[0]).toMatchObject({ phase: 'work', roundIndex: 1, startMs: 0 })
  })

  it('omits rest segments when restSeconds <= 0', () => {
    const t = buildTimeline({ ...SPEC, restSeconds: 0 })
    expect(t.segments.every((s) => s.phase !== 'rest')).toBe(true)
    expect(t.totalMs).toBe(10_000 + 3 * 180_000)
  })

  it('handles a single round with no trailing rest', () => {
    const t = buildTimeline({ prepSeconds: 0, rounds: 1, workSeconds: 60, restSeconds: 30 })
    expect(t.segments.map((s) => s.phase)).toEqual(['work'])
    expect(t.totalMs).toBe(60_000)
  })
})

describe('sessionStateAt', () => {
  const timeline = buildTimeline(SPEC)

  it('reports prep at the start', () => {
    const s = sessionStateAt(timeline, 0)
    expect(s.phase).toBe('prep')
    expect(s.roundIndex).toBe(0)
    expect(s.phaseRemainingMs).toBe(10_000)
    expect(s.totalRemainingMs).toBe(670_000)
    expect(s.isComplete).toBe(false)
  })

  it('treats a segment boundary as the start of the next segment', () => {
    const s = sessionStateAt(timeline, 10_000)
    expect(s.phase).toBe('work')
    expect(s.roundIndex).toBe(1)
    expect(s.phaseElapsedMs).toBe(0)
    expect(s.phaseRemainingMs).toBe(180_000)
  })

  it('reports rest between rounds', () => {
    const s = sessionStateAt(timeline, 200_000) // 10s into rest1 (190_000–250_000)
    expect(s.phase).toBe('rest')
    expect(s.roundIndex).toBe(1)
    expect(s.phaseElapsedMs).toBe(10_000)
    expect(s.phaseRemainingMs).toBe(50_000)
  })

  it('clamps negative elapsed to the start', () => {
    const s = sessionStateAt(timeline, -5_000)
    expect(s.phase).toBe('prep')
    expect(s.totalElapsedMs).toBe(0)
  })

  it('reports completion at and beyond the total', () => {
    const atEnd = sessionStateAt(timeline, 670_000)
    expect(atEnd.phase).toBe('complete')
    expect(atEnd.isComplete).toBe(true)
    expect(atEnd.roundIndex).toBe(3)
    expect(atEnd.totalRemainingMs).toBe(0)

    const beyond = sessionStateAt(timeline, 999_999_999)
    expect(beyond.phase).toBe('complete')
    expect(beyond.totalElapsedMs).toBe(670_000)
  })
})

describe('MonotonicElapsedTimer', () => {
  it('starts at zero elapsed', () => {
    const timer = new MonotonicElapsedTimer()
    expect(timer.elapsed(1_000)).toBe(0)
    expect(timer.isRunning).toBe(false)
  })

  it('accrues elapsed from timestamps while running', () => {
    const timer = new MonotonicElapsedTimer()
    timer.start(1_000)
    expect(timer.isRunning).toBe(true)
    expect(timer.elapsed(1_500)).toBe(500)
  })

  it('freezes elapsed while paused and continues on resume', () => {
    const timer = new MonotonicElapsedTimer()
    timer.start(1_000)
    timer.pause(1_500) // carried 500
    expect(timer.elapsed(3_000)).toBe(500) // paused → frozen
    timer.resume(3_000)
    expect(timer.elapsed(3_200)).toBe(700)
  })

  it('is drift-free across a long background gap (timestamp-based)', () => {
    const timer = new MonotonicElapsedTimer()
    timer.start(0)
    // App backgrounded for 10 minutes; next frame jumps far ahead.
    expect(timer.elapsed(600_000)).toBe(600_000)
  })

  it('ignores a redundant start (no duplicate accrual)', () => {
    const timer = new MonotonicElapsedTimer()
    timer.start(1_000)
    timer.start(1_400) // redundant; must not reset or double-count
    expect(timer.elapsed(1_600)).toBe(600)
  })

  it('resets to zero and stops running', () => {
    const timer = new MonotonicElapsedTimer()
    timer.start(1_000)
    timer.reset()
    expect(timer.isRunning).toBe(false)
    expect(timer.elapsed(5_000)).toBe(0)
  })
})
