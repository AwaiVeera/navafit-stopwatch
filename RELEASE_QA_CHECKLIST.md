# Release QA Checklist

This checklist is the final manual pass for the first TestFlight-ready candidate.

## What Has Already Been Verified In Code

- `npm test` passed
- `npm run lint` passed
- `npm run build` passed
- iOS simulator build passed
- iOS release build for a generic device passed
- The app launched successfully in the iPhone simulator

## Remaining Manual Device Pass

A physical iPhone was not connected during this session, so the items below still need one real-device run before uploading to TestFlight.

## Real iPhone Checklist

1. Install and open the native iOS build on a physical iPhone.
2. Confirm the login screen appears and the layout matches the simulator.
3. Sign in with:
   - Email/password
   - Apple Sign In
   - Google Sign In
4. Confirm the consent screen appears after first sign-in when current legal versions have not yet been accepted.
5. Open both legal links from inside the app and confirm they load:
   - `https://navafit.sg/privacy-policy/`
   - `https://navafit.sg/terms-of-service/`
6. Accept required consent and continue into the dashboard.
7. Turn on Apple Health sync consent.
8. Trigger telemetry sync and confirm the HealthKit permission sheet appears.
9. Grant Apple Health access and return to the app.
10. Confirm:
    - `Health Check` values update
    - `Recent Sessions` can populate from Apple Health / Apple Watch data
    - the `Next Session` recommendation updates
11. Open the adaptive pre-session screen and verify both modes:
    - `Suggest Only`
    - `Auto Apply`
12. Start a stopwatch session and exit after at least one minute.
13. Confirm the session appears in `Recent Sessions`.
14. Open the Breath tab and confirm cadence matches the current preset.
15. Sign out and sign back in to confirm:
    - session restore works
    - consent gate is skipped when already accepted
    - persisted workouts remain visible

## Before TestFlight Upload

- Open `ios/App/App.xcodeproj` in Xcode (this project uses `.xcodeproj`, not `.xcworkspace`).
- Rebuild the iOS release target with signing enabled in Xcode.
- Confirm the Apple Developer signing profile includes HealthKit capability.
- Archive in Xcode.
- Validate the archive.
- Upload to TestFlight.
