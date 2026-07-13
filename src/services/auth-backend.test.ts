import { describe, expect, it } from 'vitest'

import { normalizeSupabaseSession } from './auth-backend'

describe('normalizeSupabaseSession', () => {
  it('returns null for a null session', () => {
    expect(normalizeSupabaseSession(null)).toBeNull()
  })

  it('maps a Supabase session to the normalized shape, defaulting a missing email to null', () => {
    const fakeSession = {
      user: { id: 'user-123', email: undefined },
    } as unknown as Parameters<typeof normalizeSupabaseSession>[0]

    expect(normalizeSupabaseSession(fakeSession)).toEqual({
      user: { id: 'user-123', email: null },
    })
  })

  it('preserves a present email', () => {
    const fakeSession = {
      user: { id: 'user-456', email: 'person@example.com' },
    } as unknown as Parameters<typeof normalizeSupabaseSession>[0]

    expect(normalizeSupabaseSession(fakeSession)).toEqual({
      user: { id: 'user-456', email: 'person@example.com' },
    })
  })
})
