/**
 * Entitlement seam for the one-time "Pro unlock".
 *
 * The purchase system (StoreKit 2 / Play Billing) is deferred — see
 * docs/revamp/DECISION_LOG.md. This module is the single place every premium
 * gate consults, so when IAP lands only `hasProUnlock()` and
 * `PRO_GATING_ENABLED` change; no screen logic moves.
 *
 * Today `PRO_GATING_ENABLED` is false, so `isLevelUnlocked()` returns true for
 * every level — Intermediate/Advanced stay accessible as decided — while the
 * gate is already wired through Stopwatch and Breathwork.
 */
import type { TrainingLevel } from '../types'

const PRO_UNLOCK_KEY = 'navafit:pro-unlock'

/** Levels that require the Pro unlock once gating is enabled. */
export const PRO_LEVELS: readonly TrainingLevel[] = ['intermediate', 'advanced', 'expert']

/**
 * Master switch for premium gating. Stays false until the purchase system is
 * implemented and verified, so premium content is accessible in the meantime.
 */
export const PRO_GATING_ENABLED = false

export function isProLevel(level: TrainingLevel): boolean {
  return PRO_LEVELS.includes(level)
}

/** Whether the user owns the Pro unlock (local flag until IAP restores it). */
export function hasProUnlock(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(PRO_UNLOCK_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Whether a training level is currently usable. Free levels are always unlocked;
 * pro levels are unlocked when gating is off (now) or the user owns the unlock.
 */
export function isLevelUnlocked(level: TrainingLevel): boolean {
  if (!isProLevel(level)) return true
  if (!PRO_GATING_ENABLED) return true
  return hasProUnlock()
}

/** Test/dev helper to set the local unlock flag. Real unlock arrives via IAP restore. */
export function setProUnlockForTesting(unlocked: boolean): void {
  if (typeof localStorage === 'undefined') return
  try {
    if (unlocked) localStorage.setItem(PRO_UNLOCK_KEY, 'true')
    else localStorage.removeItem(PRO_UNLOCK_KEY)
  } catch {
    /* ignore */
  }
}
