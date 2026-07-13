/**
 * Training streak: the run of consecutive days, ending today or yesterday, that
 * each have at least one logged session. Derived purely from real workout logs —
 * never manufactured.
 */
import type { WorkoutLog } from '../types'

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function computeStreak(logs: WorkoutLog[], now: Date = new Date()): number {
  if (logs.length === 0) return 0

  const days = new Set<string>()
  for (const log of logs) {
    const d = new Date(log.date)
    if (!Number.isNaN(d.getTime())) days.add(dayKey(d))
  }
  if (days.size === 0) return 0

  const cursor = new Date(now)
  // A streak is still "live" if today has no session yet but yesterday did.
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!days.has(dayKey(cursor))) return 0
  }

  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
