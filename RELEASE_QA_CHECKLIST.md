# Release QA Checklist

This checklist tracks evidence for the current release candidate.

## Machine Verification (Completed)

- `npm run lint` passed.
- `npm test` passed (`4` files, `9` tests).
- `npm run build` passed.
- `npm run cap:sync` passed.
- iOS simulator build passed via `xcodebuild` (`BUILD SUCCEEDED`).

## Real iPhone Evidence (Latest User Run)

- Clean install/sign-out first-run path: **passed**.
- Auth providers validated: **Apple + Google + Email**.
- Consent/terms first-run flow: **passed** (no freeze on "Loading Production Data").
- HealthKit permission + sync behavior: **passed**.
- Session restore + persisted data after sign-out/sign-in: **passed** on re-test (70+ second stopwatch session).

## Device QA Note

- Stopwatch sessions only persist when duration is at least `1` minute (`durationMinutes > 0`).
- A re-test under `1` minute can look like a restore failure even when persistence is healthy.

## Archive And Upload Steps (When Approved)

1. Open `ios/App/App.xcodeproj` in Xcode.
2. Select your physical iPhone as the run destination.
3. Confirm signing team/profile and HealthKit capability.
4. Run one final device sanity pass.
5. Archive in Xcode (`Product` -> `Archive`).
6. Validate the archive.
7. Upload to TestFlight.
