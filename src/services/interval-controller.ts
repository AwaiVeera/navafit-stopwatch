/**
 * Framework-agnostic controller that drives one interval session on top of the
 * timer engine. It owns run/pause/skip/end state and detects phase transitions,
 * but knows nothing about React, audio, or haptics — `sample()` reports a
 * transition and the caller decides what cue to fire. This keeps it fully
 * unit-testable with an injected clock.
 */
import {
  buildTimeline,
  sessionStateAt,
  MonotonicElapsedTimer,
  type IntervalSpec,
  type SessionPhase,
  type SessionState,
  type SessionTimeline,
} from './timer-engine'

export type TimerStatus = 'idle' | 'running' | 'paused' | 'complete'

export interface PhaseTransition {
  from: SessionPhase
  to: SessionPhase
  /** The round the timer moved INTO (0 for prep, totalRounds for complete). */
  roundIndex: number
}

export interface TimerSample {
  state: SessionState
  status: TimerStatus
  /** Present only on the sample where the phase changed since the previous one. */
  transition?: PhaseTransition
}

export class IntervalTimerController {
  private readonly timer = new MonotonicElapsedTimer()
  private readonly timeline: SessionTimeline
  private _status: TimerStatus = 'idle'
  private lastPhase: SessionPhase = 'prep'
  private lastRound = 0

  constructor(spec: IntervalSpec) {
    this.timeline = buildTimeline(spec)
    const first = sessionStateAt(this.timeline, 0)
    this.lastPhase = first.phase
    this.lastRound = first.roundIndex
  }

  get status(): TimerStatus {
    return this._status
  }

  get totalMs(): number {
    return this.timeline.totalMs
  }

  start(nowMs: number): void {
    if (this._status === 'running' || this._status === 'complete') return
    this.timer.start(nowMs)
    this._status = 'running'
  }

  pause(nowMs: number): void {
    if (this._status !== 'running') return
    this.timer.pause(nowMs)
    this._status = 'paused'
  }

  resume(nowMs: number): void {
    if (this._status !== 'paused') return
    this.timer.resume(nowMs)
    this._status = 'running'
  }

  toggle(nowMs: number): void {
    if (this._status === 'running') this.pause(nowMs)
    else if (this._status === 'paused') this.resume(nowMs)
    else if (this._status === 'idle') this.start(nowMs)
  }

  /** Jump to the start of the next segment (or complete if in the last one). */
  skip(nowMs: number): void {
    if (this._status === 'complete') return
    const elapsed = this.timer.elapsed(nowMs)
    const nextBoundary =
      this.timeline.segments.find((s) => s.startMs > elapsed)?.startMs ?? this.timeline.totalMs
    this.timer.setElapsed(nextBoundary, nowMs)
    if (nextBoundary >= this.timeline.totalMs) {
      this.timer.pause(nowMs)
      this._status = 'complete'
    }
  }

  /** Finish the session immediately. */
  end(nowMs: number): void {
    this.timer.setElapsed(this.timeline.totalMs, nowMs)
    this.timer.pause(nowMs)
    this._status = 'complete'
  }

  reset(): void {
    this.timer.reset()
    this._status = 'idle'
    const first = sessionStateAt(this.timeline, 0)
    this.lastPhase = first.phase
    this.lastRound = first.roundIndex
  }

  /** Read the current state; auto-completes when elapsed reaches the total. */
  sample(nowMs: number): TimerSample {
    const elapsed = this.timer.elapsed(nowMs)
    const state = sessionStateAt(this.timeline, elapsed)

    if (state.isComplete && this._status === 'running') {
      this.timer.pause(nowMs)
      this._status = 'complete'
    }

    let transition: PhaseTransition | undefined
    if (state.phase !== this.lastPhase || state.roundIndex !== this.lastRound) {
      transition = { from: this.lastPhase, to: state.phase, roundIndex: state.roundIndex }
      this.lastPhase = state.phase
      this.lastRound = state.roundIndex
    }

    return { state, status: this._status, transition }
  }
}
