# Agent Prompt Templates

Use these templates to keep agent tasks precise.

## Template A - UI Agent

```text
Goal: [one UI outcome]
Files: [explicit file paths only]
Constraints: Keep tactical style. No assumptions.
Acceptance:
- [criterion 1]
- [criterion 2]
Verify:
- npm run build
Return:
- files changed
- unresolved TBDs
```

## Template B - Timer Logic Agent

```text
Goal: Improve stopwatch behavior [specific]
Files: [logic files only]
Constraints: Keep deterministic timing. Clean interval cleanup.
Acceptance:
- start/pause/reset/lap behavior correct
- no regression in existing flows
Verify:
- npm run build
Return:
- edge cases checked
- unresolved TBDs
```

## Template C - iOS Build Agent

```text
Goal: Validate iOS readiness after web/native changes
Files: ios/**, capacitor.config.ts (only)
Constraints: No bundle ID assumption changes unless requested.
Acceptance:
- cap sync succeeds
- simulator build succeeds
Verify:
- npm run cap:sync
- xcodebuild -project ios/App/App.xcodeproj -scheme App -destination "generic/platform=iOS Simulator" build
Return:
- exact command outputs summary
- unresolved TBDs
```

## Template D - Release Readiness Agent

```text
Goal: Prepare launch metadata checklist for App Store + Play Store
Files: docs/** only
Constraints: No invented product/legal values.
Acceptance:
- all unknown values marked TBD
- actionable checklist in priority order
Verify:
- checklist is complete and non-duplicated
Return:
- confirmed values
- missing values (TBD)
```
