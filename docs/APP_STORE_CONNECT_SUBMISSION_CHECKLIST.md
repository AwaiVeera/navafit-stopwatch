# App Store Connect Submission Checklist

Use this checklist after TestFlight stability is confirmed.

**Prerequisites outside Cursor:** [EXTERNAL_SETUP_OUTSIDE_CURSOR.md](EXTERNAL_SETUP_OUTSIDE_CURSOR.md)  
**Product / rules context:** [PHASE_A_RESUME_REFERENCE.md](PHASE_A_RESUME_REFERENCE.md)

## App Record Baseline

- App name: `NavaFitAlignment` (update display naming if you choose a marketing variant)
- Bundle ID: `com.navafit.alignment`
- Platform: iOS
- Versioning source:
  - `MARKETING_VERSION` in `ios/App/App.xcodeproj/project.pbxproj`
  - `CURRENT_PROJECT_VERSION` in `ios/App/App.xcodeproj/project.pbxproj`

## Metadata To Finalize

- App name
- Subtitle
- Primary category / secondary category
- Description
- Keywords
- Promotional text (optional)
- What's New text (for each release)
- Support URL
- Marketing URL (optional)
- Privacy policy URL

## Compliance And Policy Fields

Complete these directly in App Store Connect with final product-accurate answers:

- App Privacy (data collection and data use disclosure)
- Encryption export compliance
- Content rights declaration
- Age rating questionnaire
- Health/fitness-related disclosures

## Assets

- App icon (already present in Xcode assets)
- Screenshots for all required device classes shown in App Store Connect
- Optional preview videos

## Review Information

- Contact first name / last name / email / phone
- Demo account credentials if review requires sign-in setup help
- Review notes covering:
  - test account flow,
  - consent flow expectation,
  - HealthKit permission behavior,
  - known constraints (if any)

## Release Control

- Decide release method:
  - manual release,
  - automatic release after approval,
  - phased release

## Final Submission Gate

Before pressing `Submit for Review`, verify:

1. Latest TestFlight build is stable on physical devices.
2. No debug instrumentation remains in runtime or native delegates.
3. `RELEASE_QA_CHECKLIST.md` evidence is complete.
4. App Store metadata and compliance sections have no warnings/errors in App Store Connect.

