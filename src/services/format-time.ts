/** Time formatting for the interval interfaces. Kept separate so both the
 *  Chronometer and Digital faces share one source of truth. */

const mmss = (totalSeconds: number): string => {
  const s = Math.max(0, totalSeconds)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

/** Remaining time rounds UP so the display shows "0:01" until it truly hits 0. */
export function formatRemaining(ms: number): string {
  return mmss(Math.ceil(Math.max(0, ms) / 1000))
}

/** Elapsed time rounds DOWN (a just-started second reads as 0). */
export function formatElapsed(ms: number): string {
  return mmss(Math.floor(Math.max(0, ms) / 1000))
}

/** Whole-minute:seconds for a duration label, e.g. "3:00" work. */
export function formatDuration(seconds: number): string {
  return mmss(Math.max(0, Math.round(seconds)))
}
