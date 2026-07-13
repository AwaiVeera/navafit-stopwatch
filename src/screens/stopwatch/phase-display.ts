import type { IntervalSpec, SessionPhase, SessionState } from '../../services/timer-engine'

export function phaseLabel(phase: SessionPhase): string {
  switch (phase) {
    case 'prep':
      return 'Prepare'
    case 'work':
      return 'Work'
    case 'rest':
      return 'Rest'
    case 'complete':
      return 'Complete'
  }
}

/** Tone suffix used for per-phase theming (see .chrono-tone-* / .digital-tone-*). */
export function phaseTone(phase: SessionPhase): 'prep' | 'work' | 'rest' | 'done' {
  return phase === 'complete' ? 'done' : phase
}

export function nextPhaseLabel(state: SessionState, spec: IntervalSpec): string {
  switch (state.phase) {
    case 'prep':
    case 'rest':
      return 'Work'
    case 'work': {
      const isLastRound = state.roundIndex >= state.totalRounds
      if (isLastRound) return 'Complete'
      return spec.restSeconds > 0 ? 'Rest' : 'Work'
    }
    case 'complete':
      return '—'
  }
}

/** Phase progress 0..1 for the dial (complete = full ring). */
export function phaseProgress(state: SessionState): number {
  if (state.isComplete) return 1
  if (state.phaseDurationMs <= 0) return 0
  return Math.min(1, Math.max(0, state.phaseElapsedMs / state.phaseDurationMs))
}
