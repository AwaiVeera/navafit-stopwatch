/**
 * Authoritative interval-training timer engine.
 *
 * Two independent, framework-agnostic pieces:
 *  1. Pure timeline math (`buildTimeline` / `sessionStateAt`) — given a spec and
 *     an elapsed-millisecond value, returns the exact phase/round/remaining. No
 *     clocks, no state, trivially testable.
 *  2. `MonotonicElapsedTimer` — converts wall-clock timestamps into elapsed
 *     active milliseconds with pause/resume. It is timestamp-delta based, so it
 *     is drift-free and self-correcting after backgrounding (a large gap between
 *     ticks yields the correct elapsed, never accumulated interval error).
 *
 * The React layer owns rendering and feeds `performance.now()` in; it must not
 * re-implement timing. This keeps one source of truth for correctness.
 */

export interface IntervalSpec {
  /** Countdown before the first work round. <= 0 omits the prep phase. */
  prepSeconds: number
  /** Number of work rounds (>= 1). */
  rounds: number
  /** Work duration per round, in seconds. */
  workSeconds: number
  /** Rest between rounds, in seconds. <= 0 omits rest; never added after the final round. */
  restSeconds: number
}

export type SessionPhase = 'prep' | 'work' | 'rest' | 'complete'

export interface TimelineSegment {
  phase: 'prep' | 'work' | 'rest'
  /** 0 for prep; 1-based round number for work; the just-finished round for rest. */
  roundIndex: number
  startMs: number
  endMs: number
  durationMs: number
}

export interface SessionTimeline {
  segments: TimelineSegment[]
  totalMs: number
  totalRounds: number
}

export interface SessionState {
  phase: SessionPhase
  /** 0 during prep; current 1-based round for work/rest; totalRounds once complete. */
  roundIndex: number
  totalRounds: number
  phaseElapsedMs: number
  phaseRemainingMs: number
  phaseDurationMs: number
  totalElapsedMs: number
  totalRemainingMs: number
  totalMs: number
  isComplete: boolean
}

function seg(
  phase: TimelineSegment['phase'],
  roundIndex: number,
  startMs: number,
  durationMs: number,
): TimelineSegment {
  return { phase, roundIndex, startMs, endMs: startMs + durationMs, durationMs }
}

export function buildTimeline(spec: IntervalSpec): SessionTimeline {
  const rounds = Math.max(1, Math.floor(spec.rounds))
  const prepMs = Math.max(0, Math.round(spec.prepSeconds * 1000))
  const workMs = Math.max(0, Math.round(spec.workSeconds * 1000))
  const restMs = Math.max(0, Math.round(spec.restSeconds * 1000))

  const segments: TimelineSegment[] = []
  let cursor = 0

  if (prepMs > 0) {
    segments.push(seg('prep', 0, cursor, prepMs))
    cursor += prepMs
  }

  for (let round = 1; round <= rounds; round += 1) {
    segments.push(seg('work', round, cursor, workMs))
    cursor += workMs
    // Rest only between rounds, never after the last.
    if (restMs > 0 && round < rounds) {
      segments.push(seg('rest', round, cursor, restMs))
      cursor += restMs
    }
  }

  return { segments, totalMs: cursor, totalRounds: rounds }
}

export function sessionStateAt(timeline: SessionTimeline, rawElapsedMs: number): SessionState {
  const { segments, totalMs, totalRounds } = timeline
  const elapsed = Math.min(Math.max(0, rawElapsedMs), totalMs)

  if (elapsed >= totalMs) {
    return {
      phase: 'complete',
      roundIndex: totalRounds,
      totalRounds,
      phaseElapsedMs: 0,
      phaseRemainingMs: 0,
      phaseDurationMs: 0,
      totalElapsedMs: totalMs,
      totalRemainingMs: 0,
      totalMs,
      isComplete: true,
    }
  }

  // A boundary belongs to the segment it opens: [startMs, endMs).
  const active =
    segments.find((s) => elapsed >= s.startMs && elapsed < s.endMs) ?? segments[0]

  return {
    phase: active.phase,
    roundIndex: active.roundIndex,
    totalRounds,
    phaseElapsedMs: elapsed - active.startMs,
    phaseRemainingMs: active.endMs - elapsed,
    phaseDurationMs: active.durationMs,
    totalElapsedMs: elapsed,
    totalRemainingMs: totalMs - elapsed,
    totalMs,
    isComplete: false,
  }
}

/**
 * Elapsed-active-time clock driven by injected timestamps (e.g. performance.now()).
 * `carriedMs` holds time banked before the current run; while running, elapsed is
 * `carriedMs + (now - runningSince)`. Drift-free because it never sums intervals.
 */
export class MonotonicElapsedTimer {
  private carriedMs = 0
  private runningSince: number | null = null

  get isRunning(): boolean {
    return this.runningSince !== null
  }

  /** Begin (or continue) running from `nowMs`. Redundant while already running. */
  start(nowMs: number): void {
    if (this.runningSince !== null) return
    this.runningSince = nowMs
  }

  /** Alias of `start` — resume after a pause. */
  resume(nowMs: number): void {
    this.start(nowMs)
  }

  /** Bank elapsed up to `nowMs` and stop accruing. */
  pause(nowMs: number): void {
    if (this.runningSince === null) return
    this.carriedMs += nowMs - this.runningSince
    this.runningSince = null
  }

  /** Clear all elapsed time and stop. */
  reset(): void {
    this.carriedMs = 0
    this.runningSince = null
  }

  /**
   * Jump elapsed to an exact value (for skip / end / seek), preserving the
   * running state so accrual continues from `nowMs` if the timer was running.
   */
  setElapsed(ms: number, nowMs: number): void {
    this.carriedMs = Math.max(0, ms)
    this.runningSince = this.runningSince === null ? null : nowMs
  }

  /** Elapsed active milliseconds as of `nowMs`. Never negative. */
  elapsed(nowMs: number): number {
    const running = this.runningSince === null ? 0 : Math.max(0, nowMs - this.runningSince)
    return this.carriedMs + running
  }
}
