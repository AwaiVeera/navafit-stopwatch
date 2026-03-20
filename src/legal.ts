export const PRIVACY_POLICY_URL = 'https://navafit.sg/privacy-policy/'
export const TERMS_OF_SERVICE_URL = 'https://navafit.sg/terms-of-service/'

// Versions match the currently published legal content for consent records.
export const PRIVACY_POLICY_VERSION = '2026-03-19'
export const TERMS_OF_SERVICE_VERSION = '2026-03-19'

export function hasAcceptedCurrentLegalVersions(
  consent:
    | {
        privacyPolicyVersion: string
        termsVersion: string
      }
    | null
    | undefined,
) {
  return (
    consent?.privacyPolicyVersion === PRIVACY_POLICY_VERSION &&
    consent?.termsVersion === TERMS_OF_SERVICE_VERSION
  )
}
