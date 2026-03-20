import { hasAcceptedCurrentLegalVersions } from '../legal'
import type { UserConsentRecord, ViewId } from '../types'

export function resolveAuthenticatedView(consent: UserConsentRecord | null): Extract<ViewId, 'dashboard' | 'consent'> {
  return hasAcceptedCurrentLegalVersions(consent) ? 'dashboard' : 'consent'
}
