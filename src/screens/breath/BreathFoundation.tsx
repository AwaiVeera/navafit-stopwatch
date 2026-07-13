import { BREATH_DISCLAIMER, BREATH_FOUNDATION } from '../../services/breath-foundation'

interface BreathFoundationProps {
  onAcknowledge: () => void
}

/** First-session safety + mechanics guidance. Must be acknowledged before a
 *  beginner starts breathing. */
export function BreathFoundation({ onAcknowledge }: BreathFoundationProps) {
  return (
    <div className="breath-foundation content-stack">
      <div className="breath-foundation-head">
        <p className="section-kicker">Before you begin</p>
        <h2 className="section-title mt-1">Breathe with care</h2>
      </div>

      <ul className="breath-foundation-list">
        {BREATH_FOUNDATION.map((point) => (
          <li key={point.title} className="breath-foundation-item">
            <p className="breath-foundation-title">{point.title}</p>
            <p className="breath-foundation-body">{point.body}</p>
          </li>
        ))}
      </ul>

      <p className="breath-disclaimer">{BREATH_DISCLAIMER}</p>

      <button type="button" className="sw-btn sw-btn-primary" onClick={onAcknowledge}>
        I understand — continue
      </button>
    </div>
  )
}
