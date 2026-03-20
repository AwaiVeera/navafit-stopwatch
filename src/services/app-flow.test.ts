import { describe, expect, it } from 'vitest'

import { PRIVACY_POLICY_VERSION, TERMS_OF_SERVICE_VERSION } from '../legal'
import { resolveAuthenticatedView } from './app-flow'

describe('authenticated app flow', () => {
  it('routes signed-in users to the consent gate until current legal versions are accepted', () => {
    expect(resolveAuthenticatedView(null)).toBe('consent')

    expect(
      resolveAuthenticatedView({
        userId: 'user-1',
        privacyPolicyVersion: '2026-03-01',
        termsVersion: TERMS_OF_SERVICE_VERSION,
        acceptedPrivacyPolicyAt: '2026-03-01T00:00:00.000Z',
        acceptedTermsAt: '2026-03-19T00:00:00.000Z',
        acceptedHealthSyncAt: null,
        acceptedUsageAnalyticsAt: null,
      }),
    ).toBe('consent')
  })

  it('routes signed-in users to the dashboard once current legal versions are accepted', () => {
    expect(
      resolveAuthenticatedView({
        userId: 'user-1',
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        termsVersion: TERMS_OF_SERVICE_VERSION,
        acceptedPrivacyPolicyAt: '2026-03-19T00:00:00.000Z',
        acceptedTermsAt: '2026-03-19T00:00:00.000Z',
        acceptedHealthSyncAt: '2026-03-19T00:00:00.000Z',
        acceptedUsageAnalyticsAt: '2026-03-19T00:00:00.000Z',
      }),
    ).toBe('dashboard')
  })
})
