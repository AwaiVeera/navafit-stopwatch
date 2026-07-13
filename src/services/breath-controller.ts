/**
 * Framework-agnostic controller for one breathing session over the breath
 * engine. Mirrors IntervalTimerController: owns run/pause/skip/restart state and
 * detects phase transitions, but no React/audio coupling — `sample()` reports a
 * transition and the caller fires the cue. Fully unit-testable with an injected
 * clock.
 */
import { breathStateAt, type BreathDisplayPhase, type BreathSpec, type BreathState } from './breath-engine'
import { MonotonicElapsedTimer } from './timer-engine'

export type BreathStatus = 'idle' | 'running' | 'paused' | 'complete'

export interface BreathTransition {
  kind: BreathDisplayPhase
  phaseIndex: number
  cycleIndex: number
}

export interface BreathSample {
  state: BreathState
  status: BreathStatus
  transition?: BreathTransition
}

const keyOf = (s: BreathState): string => `${s.cycleIndex}:${s.phaseIndex}:${s.kind}`

export class BreathController {
  private readonly timer = new MonotonicElapsedTimer()
  private readonly spec: BreathSpec
  private readonly targetMs: number
  private _status: BreathStatus = 'idle'
  private lastKey: string

  constructor(spec: BreathSpec) {
    this.spec = spec
    this.targetMs = Math.max(0, Math.round(spec.targetSeconds * 1000))
    this.lastKey = keyOf(breathStateAt(spec, 0))
  }

  get status(): BreathStatus {
    return this._status
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

  /** Jump to the next breath phase (or complete if it would pass the target). */
  skip(nowMs: number): void {
    if (this._status === 'complete') return
    const elapsed = this.timer.elapsed(nowMs)
    const state = breathStateAt(this.spec, elapsed)
    const target = Math.min(elapsed + state.phaseRemainingMs, this.targetMs)
    this.timer.setElapsed(target, nowMs)
    if (target >= this.targetMs) {
      this.timer.pause(nowMs)
      this._status = 'complete'
    }
  }

  end(nowMs: number): void {
    this.timer.setElapsed(this.targetMs, nowMs)
    this.timer.pause(nowMs)
    this._status = 'complete'
  }

  reset(): void {
    this.timer.reset()
    this._status = 'idle'
    this.lastKey = keyOf(breathStateAt(this.spec, 0))
  }

  /** Reset to the start and immediately begin again. */
  restart(nowMs: number): void {
    this.reset()
    this.start(nowMs)
  }

  sample(nowMs: number): BreathSample {
    const elapsed = this.timer.elapsed(nowMs)
    const state = breathStateAt(this.spec, elapsed)

    if (state.isComplete && this._status === 'running') {
      this.timer.pause(nowMs)
      this._status = 'complete'
    }

    let transition: BreathTransition | undefined
    const key = keyOf(state)
    if (key !== this.lastKey) {
      transition = { kind: state.kind, phaseIndex: state.phaseIndex, cycleIndex: state.cycleIndex }
      this.lastKey = key
    }

    return { state, status: this._status, transition }
  }
}
