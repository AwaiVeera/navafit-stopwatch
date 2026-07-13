import { formatRemaining } from '../../services/format-time'
import type { SessionState } from '../../services/timer-engine'
import type { TimerStatus } from '../../services/interval-controller'
import { phaseLabel, phaseProgress, phaseTone } from './phase-display'

interface ChronometerFaceProps {
  state: SessionState
  status: TimerStatus
}

const R = 92
const CIRCUMFERENCE = 2 * Math.PI * R
const TICKS = Array.from({ length: 60 }, (_, i) => i)

/** Analog-inspired training chronometer: dial, ticks, phase progress arc. */
export function ChronometerFace({ state, status }: ChronometerFaceProps) {
  const progress = phaseProgress(state)
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const tone = phaseTone(state.phase)

  return (
    <div className={`chrono chrono-tone-${tone}`} data-status={status}>
      <svg className="chrono-dial" viewBox="0 0 220 220" role="img" aria-label="Chronometer">
        {TICKS.map((i) => {
          const major = i % 5 === 0
          return (
            <line
              key={i}
              className={major ? 'chrono-tick chrono-tick--major' : 'chrono-tick'}
              x1="110"
              y1={major ? 16 : 19}
              x2="110"
              y2={major ? 26 : 24}
              transform={`rotate(${i * 6} 110 110)`}
            />
          )
        })}
        <circle className="chrono-track" cx="110" cy="110" r={R} />
        <circle
          className="chrono-progress"
          cx="110"
          cy="110"
          r={R}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 110 110)"
        />
      </svg>

      <div className="chrono-center">
        <p className="chrono-phase">{phaseLabel(state.phase)}</p>
        <p className="chrono-time">{formatRemaining(state.phaseRemainingMs)}</p>
        <p className="chrono-round">
          {state.phase === 'complete'
            ? 'Session complete'
            : `Round ${Math.max(1, state.roundIndex)} / ${state.totalRounds}`}
        </p>
      </div>
    </div>
  )
}
