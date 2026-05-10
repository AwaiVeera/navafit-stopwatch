# Google Play Prep Checklist (Phase After iOS Build 25)

This checklist is intentionally documentation-only for now (no Android code changes yet).

## 1) Account and legal setup

- Create or confirm Google Play Console developer account (one-time fee).
- Confirm legal entity details, payout profile, and tax profile are complete.
- Reuse privacy policy URL: `https://navafit.sg/privacy-policy/`.
- Confirm support email and contact details for the store listing.

## 2) Product and policy prep

- Draft Play Store short description (80 chars) and full description.
- Prepare Data safety answers (collection, processing, sharing, retention).
- Prepare Health/Fitness disclosure language aligned with iOS consent behavior.
- Review sensitive permission declarations before first Android upload.

## 3) Android technical prep (next implementation phase)

- Add Capacitor Android platform (`@capacitor/android` and `npx cap add android`).
- Configure package ID and app signing strategy (keystore + backup plan).
- Add/verify Android permissions (location and health-related scope only if used).
- Implement Android health pathway (Health Connect equivalent to current HealthKit path).
- Validate runtime permission prompts and fallback states on physical Android devices.

## 4) Listing assets

- App icon: 512x512 PNG.
- Feature graphic: 1024x500.
- Phone screenshots: minimum 2.
- Tablet screenshots: recommended if tablet support is claimed.
- Optional promo video URL.

## 5) Release and testing

- Internal testing track upload first.
- Closed testing with real users for sync/audio/UI regressions.
- Promote to production after crash-free and policy pass checks.
- Prepare release notes matching App Store change log language.

## 6) Risks to avoid

- Do not claim unsupported health integrations before Android health path is implemented.
- Do not request extra permissions unless a feature needs them.
- Do not ship with placeholder policy text or missing data safety disclosures.
