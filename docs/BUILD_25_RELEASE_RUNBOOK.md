# NavaFit Release Runbook (current target: 1.0.3 / build 28)

Living document. Update the version / build numbers here as each release lands.

Filename kept as-is (`BUILD_25_RELEASE_RUNBOOK.md`) to preserve git history; the content always tracks the current release target.

## History

- 1.0.0 / build 24 — initial App Store submission (approved, live).
- 1.0.1 / build 25 — closed pre-release train.
- 1.0.2 / build 26 — resubmission with sound cues, breathwork revamp, manual stopwatch fixes, dashboard cleanup.
- 1.0.3 / build 27 — Land+Air+Sea palette makeover, new NavaFit logo, login screen revamp, UI scalability fixes. **Crashed on launch on device** because `GoogleService-Info.plist` was on disk but not registered in `App.xcodeproj`, so it never landed in the `.ipa`; the Capacitor Firebase Auth plugin then failed `FirebaseApp.configure()` at boot.
- 1.0.3 / build 28 — same feature set as 27; adds `GoogleService-Info.plist` to Xcode's Copy Bundle Resources phase so Firebase can initialize, plus cleaned two stale files out of `AppIcon.appiconset` to silence Xcode warnings.

## A) Real iPhone smoke test (required)

- [ ] Open the latest iOS build on a real iPhone (not simulator).
- [ ] Login screen:
  - [ ] New NavaFit logo shows crisply on the dark login sheet (no rectangular panel behind it).
  - [ ] "Continue with Apple" and "Continue with Google" sit **above** the email form.
  - [ ] "or" divider is centered between SSO row and email form.
  - [ ] No leftover Discipline / Method stat cards below the form.
- [ ] Home screen icon shows the new NavaFit logo (not the old one).
- [ ] Overall palette:
  - [ ] Backgrounds read as warm earth / temple paper (not cosmic blue, not army green).
  - [ ] Primary CTAs use brass gold; secondary accents use monsoon slate / Arabian teal.
  - [ ] Light-mode toggle in Settings inverts to a bright temple-paper theme cleanly.
- [ ] Scalability:
  - [ ] Top status bar and bottom nav bar don't clash with content.
  - [ ] Bottom tab bar is comfortably wide (not squished, not stretching edge-to-edge).
- [ ] Screen-by-screen paged UX:
  - [ ] Dashboard, Stopwatch, Breath, Biometrics, Settings all swipe screen-by-screen with scroll-snap; page dots appear at the bottom.
- [ ] Stopwatch auto-lap:
  - [ ] Tap **Start** and confirm boxing bell start cue plays.
  - [ ] Confirm final 10 seconds of lap play one tick per second.
  - [ ] Confirm lap-end cue is distinct from interval-start cue.
  - [ ] Confirm interval final 10 seconds tick each second.
  - [ ] Confirm interval-end cue is distinct from lap-end cue.
- [ ] Stopwatch (manual / novice):
  - [ ] Run for at least 5 seconds, then tap **Reset**.
  - [ ] Confirm a new entry appears in Recent Sessions on the dashboard.
- [ ] AY screen:
  - [ ] Input box is comfortably large; typing is readable.
- [ ] Breathwork (guided):
  - [ ] Screen scrolls without switching to manual mode.
  - [ ] Breath Markers card is fully visible (not clipped).
  - [ ] Guided level dropdown lists 10 levels and changes the cadence when picked.
- [ ] Breathwork (manual, open-ended):
  - [ ] Tap Inhale, watch the timer count up freely (no cap).
  - [ ] Tap Hold, then Exhale, then Inhale again. Each tap closes the previous phase and adds a Phase log entry.
  - [ ] Tap **Save & reset** and confirm a manual breathwork entry appears in Recent Sessions.
- [ ] Settings > Apple Health Sync:
  - [ ] Turning it on triggers sync immediately.
  - [ ] iOS Health permission prompt appears when needed.

## B) Xcode release steps (do these in order)

1. Open the project: `npm run ios:open` (or open `ios/App/App.xcodeproj` directly in Xcode — this is an SPM-based Capacitor project, so there is no `.xcworkspace`; command-line builds use `xcodebuild -project ios/App/App.xcodeproj -scheme App`).
2. In Xcode left sidebar, click the blue `App` project icon, then under **TARGETS** click `App`. Open the **General** tab.
3. In **Identity**, confirm:
   - Version = `1.0.3`
   - Build = `28`
   If they are not exactly these values, edit them and press `Cmd + S`.
   Note: build 27 was uploaded but crashed on launch — build 28 is the fix.
4. At the top device selector (next to the Run button), choose **Any iOS Device (arm64)**.
5. Menu: **Product > Clean Build Folder** (`Shift + Cmd + K`). Wait for it to finish.
6. Menu: **Product > Archive**. Wait for the Archive to build (this can take a few minutes).
7. When the Organizer window opens, select the new archive.
8. Click **Distribute App > App Store Connect > Upload**. Keep all default options. Continue until the upload completes.
9. Wait 5-20 minutes for Apple to finish processing the build.

Alternative (headless): the agent can run `xcodebuild archive` + `xcodebuild -exportArchive` from the terminal to produce `build/export/App.ipa`, which you then upload via **Transporter.app** (drag the `.ipa` into Transporter → **Deliver**).

## C) App Store Connect submission

1. Open https://appstoreconnect.apple.com and go to **My Apps > NavaFit Alignment**.
2. Open the **App Store** tab.
3. If a **1.0.3** version already exists in App Store Connect (from build 27), open it. Otherwise click **+** to add **iOS App Version `1.0.3`** (create a new version — 1.0.2 is closed).
4. Scroll to the **Build** section and click **+** to attach the uploaded **build `28`** (replace build 27 if it's still attached — it crashes on launch).
5. Paste the following into **What's New in This Version**:

```
- New NavaFit logo across the app icon, login screen, and browser tab.
- Fresh Land + Air + Sea palette: warm temple-paper backgrounds, brass gold CTAs, monsoon and Arabian-sea accents.
- Login screen revamp: Continue with Apple / Google now sit above the email form for a faster sign-in.
- Screen-by-screen swipe navigation with scroll-snap page dots on Dashboard, Stopwatch, Breath, Biometrics, and Settings.
- Scalability polish: fixed top/bottom alignment, wider and taller bottom nav bar, snappier page transitions.
- Behind the scenes: cleaner glass surfaces, tighter animations, no more residual old-palette bleed.
```

6. Verify the rest of the version page is filled in (screenshots, description, support URL, privacy policy URL, age rating, app privacy questionnaire).
7. Click **Save**, then **Add for Review**, then **Submit for Review**.

## D) Google Play prep (deferred implementation)

Reference: `docs/PLAY_STORE_TASK_MANAGER.md`
