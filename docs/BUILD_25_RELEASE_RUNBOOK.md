# Build 25 Release Runbook

Use this checklist to complete the remaining manual release tasks after the code changes in this branch.

## A) Real iPhone smoke test (required)

- [ ] Open the latest iOS build on a real iPhone (not simulator).
- [ ] Stopwatch auto-lap:
  - [ ] Tap **Start** and confirm boxing bell start cue plays.
  - [ ] Confirm final 10 seconds of lap play one tick per second.
  - [ ] Confirm lap-end cue is distinct from interval-start cue.
  - [ ] Confirm interval final 10 seconds tick each second.
  - [ ] Confirm interval-end cue is distinct from lap-end cue.
  - [ ] Auto-lap progress and "X min total" line match actual elapsed time.
- [ ] Stopwatch (manual / novice):
  - [ ] Run for at least 5 seconds, then tap **Reset**.
  - [ ] Confirm a new entry appears in Recent Sessions on the dashboard.
- [ ] AY screen:
  - [ ] Input box is larger and readable while typing.
- [ ] Breathwork (guided):
  - [ ] Screen scrolls without switching to manual mode.
  - [ ] Breath Markers card is fully visible (not clipped).
  - [ ] Guided level dropdown lists 10 levels and changes the cadence when picked.
- [ ] Breathwork (manual, open-ended):
  - [ ] Tap Inhale, watch the timer count up freely (no cap).
  - [ ] Tap Hold, then Exhale, then Inhale again. Each tap closes the previous phase and adds an entry to the Phase log card.
  - [ ] Tap **Stop phase** to end the active phase without starting a new one.
  - [ ] Tap **Save & reset** (or back) and confirm a manual breathwork entry appears in Recent Sessions.
- [ ] Settings > Apple Health Sync:
  - [ ] Turning it on triggers sync immediately.
  - [ ] iOS Health permission prompt appears when needed.
- [ ] Dashboard:
  - [ ] Daily Wisdom card has no neon green left bar (clean, like the other glass cards).
  - [ ] "Enable health & weather" CTA appears on first unsynced state.
  - [ ] Location/weather and health sync values populate after permissions.
- [ ] Login screen:
  - [ ] NavaFit logo is clearly visible with a green halo glow on the dark background, no rectangular panel behind it.

## B) Xcode release steps (do these in order)

1. Open the project: `npm run ios:open` (run from the project root, or open `ios/App/App.xcworkspace` directly in Xcode).
2. In Xcode left sidebar, click the blue `App` project icon, then under **TARGETS** click `App`. Open the **General** tab.
3. In **Identity**, confirm:
   - Version = `1.0.1`
   - Build = `25`
   If they are not exactly these values, edit them and press `Cmd + S`.
4. At the top device selector (next to the Run button), choose **Any iOS Device (arm64)**.
5. Menu: **Product > Clean Build Folder** (`Shift + Cmd + K`). Wait for it to finish.
6. Menu: **Product > Archive**. Wait for the Archive to build (this can take a few minutes).
7. When the Organizer window opens, select the new archive.
8. Click **Distribute App > App Store Connect > Upload**. Keep all default options. Continue until the upload completes.
9. Wait 5-20 minutes for Apple to finish processing the build.

## C) App Store Connect submission

1. Open https://appstoreconnect.apple.com and go to **My Apps > NavaFit Alignment**.
2. Open the **App Store** tab.
3. Click **+** to add **iOS App Version `1.0.1`** if it does not already exist (or open the existing 1.0.1 draft).
4. Scroll to the **Build** section and click **+** to attach the uploaded **build `25`**.
5. Paste the following into **What's New in This Version**:

```
- Distinct boxing-ring start bell, lap-end bell, and interval chimes you can tell apart.
- Final-10-second countdown ticker on every lap and rest interval.
- Stopwatch now saves manual sessions on Reset (no more lost runs).
- Auto-lap progress now matches the real total time of laps + rest intervals.
- Bigger, easier-to-read AY chat input.
- Fixed BreathWork guided mode scroll and Breath Markers visibility.
- New: 10 research-backed guided breathwork levels you can pick from.
- New: open-ended manual breathwork timers with a per-phase log that saves automatically.
- Apple Health, Location, and Weather permissions now prompt clearly on first use.
- Cleaner Daily Wisdom card and a more visible NavaFit logo on the login screen.
```

6. Verify the rest of the version page is filled in (screenshots, description, support URL, privacy policy URL, age rating, app privacy questionnaire).
7. Click **Save**, then **Add for Review**, then **Submit for Review**.

## D) Google Play prep (deferred implementation)

Reference: `docs/GOOGLE_PLAY_PREP_CHECKLIST.md`
