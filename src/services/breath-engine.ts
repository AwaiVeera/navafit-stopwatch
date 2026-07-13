/**
 * Pure cyclic-breathing timeline math. A breath protocol is one cycle of phases
 * (e.g. Inhale → Hold → Exhale → Hold) repeated for a chosen session duration.
 * Given the phases and an elapsed-millisecond value, `breathStateAt` returns the
 * exact current phase, countdown, cycle, and an `expansion` value (0 contracted
 * → 1 expanded) that drives the breathing animation accurately — the visual
 * follows the real phase rather than looping decoratively.
 *
 * No clocks or state here; pair with MonotonicElapsedTimer via BreathController.
 */

export interface BreathPhaseSpec {
  name: string
  durationSeconds: number
  instruction: string
}

export interface BreathSpec {
  phases: BreathPhaseSpec[]
  /** Chosen session length in seconds (protocols are open-ended cycles). */
  targetSeconds: number
}

export type BreathPhaseKind = 'inhale' | 'hold' | 'exhale'
export type BreathDisplayPhase = BreathPhaseKind | 'complete'

export interface BreathState {
  phaseName: string
  instruction: string
  kind: BreathDisplayPhase
  phaseIndex: number
  phaseElapsedMs: number
  phaseRemainingMs: number
  phaseDurationMs: number
  /** 0 = fully contracted, 1 = fully expanded. Drives the breathing orb. */
  expansion: number
  cycleIndex: number
  totalCycles: number
  totalElapsedMs: number
  totalRemainingMs: number
  targetMs: number
  isComplete: boolean
}

export function classifyBreathPhase(name: string): BreathPhaseKind {
  const n = name.toLowerCase()
  if (n.includes('inhale') || n.includes('breathe in') || n.includes('breath in')) return 'inhale'
  if (n.includes('exhale') || n.includes('breathe out') || n.includes('breath out')) return 'exhale'
  return 'hold'
}

export function cycleDurationMs(phases: BreathPhaseSpec[]): number {
  return phases.reduce((sum, p) => sum + Math.max(0, Math.round(p.durationSeconds * 1000)), 0)
}

/** Expansion (0..1) for a phase at a given progress, so holds settle at the
 *  level of the phase that preceded them (top after inhale, bottom after exhale). */
function expansionFor(phases: BreathPhaseSpec[], phaseIndex: number, progress: number): number {
  const kind = classifyBreathPhase(phases[phaseIndex].name)
  if (kind === 'inhale') return progress
  if (kind === 'exhale') return 1 - progress
  // hold: settle at the level set by the most recent inhale/exhale.
  for (let i = phaseIndex - 1; i >= 0; i -= 1) {
    const k = classifyBreathPhase(phases[i].name)
    if (k === 'inhale') return 1
    if (k === 'exhale') return 0
  }
  return phaseIndex === 0 ? 0 : 1
}

const COMPLETE = (targetMs: number, totalCycles: number): BreathState => ({
  phaseName: 'Complete',
  instruction: 'Session complete',
  kind: 'complete',
  phaseIndex: -1,
  phaseElapsedMs: 0,
  phaseRemainingMs: 0,
  phaseDurationMs: 0,
  expansion: 0,
  cycleIndex: totalCycles,
  totalCycles,
  totalElapsedMs: targetMs,
  totalRemainingMs: 0,
  targetMs,
  isComplete: true,
})

export function breathStateAt(spec: BreathSpec, rawElapsedMs: number): BreathState {
  const cycleMs = cycleDurationMs(spec.phases)
  const targetMs = Math.max(0, Math.round(spec.targetSeconds * 1000))
  const totalCycles = cycleMs > 0 ? Math.max(1, Math.floor(targetMs / cycleMs)) : 1
  const elapsed = Math.min(Math.max(0, rawElapsedMs), targetMs)

  if (cycleMs <= 0 || elapsed >= targetMs) {
    return COMPLETE(targetMs, totalCycles)
  }

  const posInCycle = elapsed % cycleMs
  const cycleIndex = Math.floor(elapsed / cycleMs) + 1

  let phaseStart = 0
  let phaseIndex = 0
  for (let i = 0; i < spec.phases.length; i += 1) {
    const durMs = Math.max(0, Math.round(spec.phases[i].durationSeconds * 1000))
    if (posInCycle < phaseStart + durMs || i === spec.phases.length - 1) {
      phaseIndex = i
      break
    }
    phaseStart += durMs
  }

  const phase = spec.phases[phaseIndex]
  const phaseDurationMs = Math.max(1, Math.round(phase.durationSeconds * 1000))
  const phaseElapsedMs = posInCycle - phaseStart
  const progress = Math.min(1, Math.max(0, phaseElapsedMs / phaseDurationMs))

  return {
    phaseName: phase.name,
    instruction: phase.instruction,
    kind: classifyBreathPhase(phase.name),
    phaseIndex,
    phaseElapsedMs,
    phaseRemainingMs: phaseDurationMs - phaseElapsedMs,
    phaseDurationMs,
    expansion: expansionFor(spec.phases, phaseIndex, progress),
    cycleIndex,
    totalCycles,
    totalElapsedMs: elapsed,
    totalRemainingMs: targetMs - elapsed,
    targetMs,
    isComplete: false,
  }
}
