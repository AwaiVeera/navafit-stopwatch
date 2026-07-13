import type { IntervalTimerControls } from '../../hooks/useIntervalTimer'
import type { TimerStatus } from '../../services/interval-controller'

interface StopwatchControlsProps {
  status: TimerStatus
  controls: IntervalTimerControls
}

/** One-hand-reachable transport controls; the layout adapts to run status. */
export function StopwatchControls({ status, controls }: StopwatchControlsProps) {
  if (status === 'idle') {
    return (
      <div className="sw-controls">
        <button type="button" className="sw-btn sw-btn-primary" onClick={controls.start}>
          Start
        </button>
      </div>
    )
  }

  if (status === 'complete') {
    return (
      <div className="sw-controls">
        <button type="button" className="sw-btn sw-btn-primary" onClick={controls.reset}>
          Reset
        </button>
      </div>
    )
  }

  const running = status === 'running'
  return (
    <div className="sw-controls sw-controls--active">
      <button type="button" className="sw-btn sw-btn-ghost" onClick={controls.reset} aria-label="Reset">
        Reset
      </button>
      <button
        type="button"
        className="sw-btn sw-btn-primary"
        onClick={controls.toggle}
        aria-label={running ? 'Pause' : 'Resume'}
      >
        {running ? 'Pause' : 'Resume'}
      </button>
      <button type="button" className="sw-btn sw-btn-ghost" onClick={controls.skip} aria-label="Skip phase">
        Skip
      </button>
      <button type="button" className="sw-btn sw-btn-danger" onClick={controls.end} aria-label="End session">
        End
      </button>
    </div>
  )
}
