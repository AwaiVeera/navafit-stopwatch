import type { BreathTimerControls } from '../../hooks/useBreathTimer'
import type { BreathStatus } from '../../services/breath-controller'

interface BreathControlsProps {
  status: BreathStatus
  controls: BreathTimerControls
  onExit: () => void
}

/** Status-adaptive transport for a breathing session. */
export function BreathControls({ status, controls, onExit }: BreathControlsProps) {
  if (status === 'idle') {
    return (
      <div className="sw-controls">
        <button type="button" className="sw-btn sw-btn-primary" onClick={controls.start}>
          Begin
        </button>
      </div>
    )
  }

  if (status === 'complete') {
    return (
      <div className="sw-controls sw-controls--active">
        <button type="button" className="sw-btn sw-btn-ghost" onClick={onExit}>
          Done
        </button>
        <button type="button" className="sw-btn sw-btn-primary" onClick={controls.restart}>
          Again
        </button>
      </div>
    )
  }

  const running = status === 'running'
  return (
    <div className="sw-controls sw-controls--active">
      <button type="button" className="sw-btn sw-btn-ghost" onClick={controls.skip} aria-label="Skip phase">
        Skip
      </button>
      <button
        type="button"
        className="sw-btn sw-btn-primary"
        onClick={controls.toggle}
        aria-label={running ? 'Pause' : 'Resume'}
      >
        {running ? 'Pause' : 'Resume'}
      </button>
      <button type="button" className="sw-btn sw-btn-danger" onClick={controls.end} aria-label="End session">
        End
      </button>
    </div>
  )
}
