import { prefersReducedMotion } from '../../utils/motion'
import type { BreathState } from '../../services/breath-engine'

interface BreathOrbProps {
  state: BreathState
}

/**
 * Breathing guide. The orb scales with `state.expansion` (0..1), which the
 * engine derives from the real phase, so the visual tracks the breath instead of
 * looping decoratively. Under Reduce Motion the orb holds still and the phase
 * label + countdown carry the guidance instead.
 */
export function BreathOrb({ state }: BreathOrbProps) {
  const reduced = prefersReducedMotion()
  const scale = 0.55 + 0.45 * state.expansion
  const seconds = state.isComplete ? 0 : Math.ceil(state.phaseRemainingMs / 1000)

  return (
    <div className={`breath-orb breath-orb--${state.kind}`} data-reduced={reduced ? 'true' : 'false'}>
      <div
        className="breath-orb-halo"
        style={reduced ? undefined : { transform: `scale(${scale.toFixed(3)})` }}
        aria-hidden
      />
      <div className="breath-orb-core">
        <p className="breath-orb-phase">{state.isComplete ? 'Complete' : state.phaseName}</p>
        {!state.isComplete && <p className="breath-orb-count">{seconds}</p>}
      </div>
    </div>
  )
}
