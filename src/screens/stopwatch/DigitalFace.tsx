import { formatDuration, formatElapsed, formatRemaining } from '../../services/format-time'
import type { IntervalSpec, SessionState } from '../../services/timer-engine'
import type { TimerStatus } from '../../services/interval-controller'
import { nextPhaseLabel, phaseLabel, phaseTone } from './phase-display'

interface DigitalFaceProps {
  state: SessionState
  status: TimerStatus
  spec: IntervalSpec
}

/** Data-dense digital interface: large numerals + round/phase context. */
export function DigitalFace({ state, status, spec }: DigitalFaceProps) {
  const tone = phaseTone(state.phase)
  const totalProgress = state.totalMs > 0 ? state.totalElapsedMs / state.totalMs : 0

  return (
    <div className={`digital digital-tone-${tone}`} data-status={status}>
      <div className="digital-head">
        <span className="digital-phase">{phaseLabel(state.phase)}</span>
        <span className="digital-round">
          {state.phase === 'complete'
            ? 'Done'
            : `Round ${Math.max(1, state.roundIndex)} / ${state.totalRounds}`}
        </span>
      </div>

      <p className="digital-time">{formatRemaining(state.phaseRemainingMs)}</p>

      <div className="digital-next">
        Next: <strong>{nextPhaseLabel(state, spec)}</strong>
      </div>

      <div className="digital-bar" aria-hidden>
        <span className="digital-bar-fill" style={{ width: `${Math.round(totalProgress * 100)}%` }} />
      </div>

      <dl className="digital-meta">
        <div>
          <dt>Work</dt>
          <dd>{formatDuration(spec.workSeconds)}</dd>
        </div>
        <div>
          <dt>Rest</dt>
          <dd>{spec.restSeconds > 0 ? formatDuration(spec.restSeconds) : '—'}</dd>
        </div>
        <div>
          <dt>Elapsed</dt>
          <dd>{formatElapsed(state.totalElapsedMs)}</dd>
        </div>
        <div>
          <dt>Remaining</dt>
          <dd>{formatRemaining(state.totalRemainingMs)}</dd>
        </div>
      </dl>
    </div>
  )
}
