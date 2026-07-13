import { afterEach, describe, expect, it } from 'vitest'

import {
  hasProUnlock,
  isLevelUnlocked,
  isProLevel,
  PRO_GATING_ENABLED,
  setProUnlockForTesting,
} from './entitlements'

afterEach(() => setProUnlockForTesting(false))

describe('entitlements', () => {
  it('classifies free vs pro levels', () => {
    expect(isProLevel('novice')).toBe(false)
    expect(isProLevel('intermediate')).toBe(true)
    expect(isProLevel('advanced')).toBe(true)
    expect(isProLevel('expert')).toBe(true)
  })

  it('keeps every level accessible while gating is disabled', () => {
    // Decision: Intermediate/Advanced accessible until IAP lands.
    expect(PRO_GATING_ENABLED).toBe(false)
    expect(isLevelUnlocked('novice')).toBe(true)
    expect(isLevelUnlocked('advanced')).toBe(true)
  })

  it('reads and clears the local unlock flag', () => {
    expect(hasProUnlock()).toBe(false)
    setProUnlockForTesting(true)
    expect(hasProUnlock()).toBe(true)
    setProUnlockForTesting(false)
    expect(hasProUnlock()).toBe(false)
  })
})
