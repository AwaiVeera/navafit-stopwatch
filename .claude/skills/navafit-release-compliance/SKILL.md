---
name: navafit-release-compliance
description: Use for NavaFit security/privacy/store-compliance work — secure token storage, account deletion, session revocation, consent, least-privilege permissions, HealthKit/Health Connect, location, privacy disclosures, App Store/Play compliance, subscription rules, and data retention.
---

# NavaFit Mobile Security, Privacy & Store Compliance

## Entry criteria
- The task touches auth/session storage, permissions, health/location data, privacy disclosures, deletion, IAP compliance, or store metadata.

## Procedures
1. **Verify against current docs.** Fetch the relevant Apple/Google/provider documentation at implementation time; do not rely on remembered guideline versions.
2. **Least privilege.** Request sensitive permissions only at point of need with a clear reason. No broad health/location/notification/tracking permission without a verified feature.
3. **Account deletion.** Genuine server-side deletion + session revocation, with clear consequences, reauth where appropriate, explicit confirmation, progress/success/failure states. Verify **only in dev/staging** — never production data.
4. **Data honesty.** Never manufacture health/profile values; show unavailable/denied/stale/loading states; distinguish synced vs. manual. Keep health data out of logs/analytics.
5. **Non-diagnostic wording.** No treatment/diagnosis/cure claims.
6. **Owner-only items.** Legal text, store-console declarations, credentials, signing, paid-service auth → log in `docs/release/*` + `RISK_LOG.md`; do not mark complete yourself.

## Quality gates
- No secret/credential/production-data exposure in the diff.
- Permissions and disclosures match an actual feature and current docs (URL cited).
- Deletion path exercised in dev/staging with captured result.

## Completion evidence
Cited files + doc URLs, dev/staging deletion evidence, and an owner-action list for anything requiring human/legal/console steps.
