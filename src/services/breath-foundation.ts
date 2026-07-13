/**
 * Beginner breathing-foundation content shown before a first session, plus the
 * non-diagnostic disclaimer. Wellness guidance only — no medical claims.
 */

export interface FoundationPoint {
  title: string
  body: string
}

export const BREATH_FOUNDATION: readonly FoundationPoint[] = [
  { title: 'Comfortable posture', body: 'Sit or lie with a tall, relaxed spine. Soften your shoulders and unclench your jaw.' },
  { title: 'Breathe through the nose', body: 'Inhale gently through your nose where comfortable — it warms and filters the air.' },
  { title: 'Breathe into the belly', body: 'Let your diaphragm expand: your belly should rise more than your chest.' },
  { title: 'Control the exhale', body: 'Release the breath slowly and evenly. Never force or strain the air out.' },
  { title: 'Ease, not effort', body: 'Breathwork should feel calm. Do not push to the point of discomfort.' },
  { title: 'If you feel dizzy, stop', body: 'Light-headedness means pause and return to normal breathing. Resume only when steady.' },
  { title: 'Skip unsafe holds', body: 'Never hold your breath longer than feels comfortable, and never near water or while driving.' },
]

export const BREATH_DISCLAIMER =
  'Breathwork here supports general wellness and relaxation. It is not medical advice, diagnosis, or treatment. If you are pregnant, have a heart or respiratory condition, or any medical concern, consult a clinician first.'

const FOUNDATION_ACK_KEY = 'navafit:breath-foundation-ack'

export function hasAcknowledgedFoundation(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(FOUNDATION_ACK_KEY) === 'true'
  } catch {
    return false
  }
}

export function acknowledgeFoundation(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(FOUNDATION_ACK_KEY, 'true')
  } catch {
    /* ignore */
  }
}
