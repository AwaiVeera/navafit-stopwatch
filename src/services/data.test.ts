import { describe, expect, it } from 'vitest'

import { PRIVACY_POLICY_VERSION, TERMS_OF_SERVICE_VERSION } from '../legal'
import {
  buildConsentUpsertPayload,
  buildSyncEventPayload,
  buildWorkoutInsertPayload,
} from './data'

describe('data payload builders', () => {
  it('builds a workout insert payload with Supabase-ready keys', () => {
    const payload = buildWorkoutInsertPayload('user-1', {
      title: 'Build window session',
      note: 'Saved from stopwatch.',
      durationMinutes: 42,
      startedAt: '2026-03-19T10:00:00.000Z',
      endedAt: '2026-03-19T10:42:00.000Z',
      source: 'app',
      metadata: {
        presetId: 'build-window',
      },
    })

    expect(payload).toEqual({
      user_id: 'user-1',
      source: 'app',
      title: 'Build window session',
      note: 'Saved from stopwatch.',
      started_at: '2026-03-19T10:00:00.000Z',
      ended_at: '2026-03-19T10:42:00.000Z',
      duration_minutes: 42,
      metadata: {
        presetId: 'build-window',
      },
    })
  })

  it('builds the consent upsert payload against the current legal versions', () => {
    const payload = buildConsentUpsertPayload(
      'user-1',
      {
        acceptsHealthSync: true,
        acceptsUsageAnalytics: false,
      },
      '2026-03-19T11:00:00.000Z',
    )

    expect(payload).toEqual({
      user_id: 'user-1',
      privacy_policy_version: PRIVACY_POLICY_VERSION,
      terms_version: TERMS_OF_SERVICE_VERSION,
      accepted_privacy_policy_at: '2026-03-19T11:00:00.000Z',
      accepted_terms_at: '2026-03-19T11:00:00.000Z',
      accepted_health_sync_at: '2026-03-19T11:00:00.000Z',
      accepted_usage_analytics_at: null,
    })
  })

  it('builds a completed sync event payload for Supabase logging', () => {
    const payload = buildSyncEventPayload({
      userId: 'user-1',
      provider: 'apple_health',
      status: 'success',
      startedAt: '2026-03-19T11:00:00.000Z',
      completedAt: '2026-03-19T11:01:00.000Z',
      details: {
        workoutsImported: 3,
      },
    })

    expect(payload).toEqual({
      user_id: 'user-1',
      provider: 'apple_health',
      sync_status: 'success',
      started_at: '2026-03-19T11:00:00.000Z',
      completed_at: '2026-03-19T11:01:00.000Z',
      details: {
        workoutsImported: 3,
      },
    })
  })
})
