import { hasAcceptedCurrentLegalVersions } from '../legal'
import type { UserConsentRecord, ViewId } from '../types'

export function resolveAuthenticatedView(
  consent: UserConsentRecord | null,
  onboardingCompleted: boolean,
): Extract<ViewId, 'onboarding' | 'dashboard' | 'consent'> {
  if (!onboardingCompleted) {
    return 'onboarding'
  }

  return hasAcceptedCurrentLegalVersions(consent) ? 'dashboard' : 'consent'
}
