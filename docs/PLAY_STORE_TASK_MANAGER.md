# NavaFit Alignment - Google Play Store Task Manager

This file tracks implementation and release tasks for Android launch.

Status legend:
- `PENDING` = not started.
- `IN_PROGRESS` = currently being worked.
- `BLOCKED` = needs manual user action outside code.
- `DONE` = completed and verified.

## Phase 1 - Preflight confirmations

| Item | Status | Owner | Notes |
|---|---|---|---|
| Google Play Console developer account (one-time fee) | `TBD` | User | `TBD` confirm account is active and verified |
| Google payments merchant account (paid app support) | `TBD` | User | `TBD` confirm SGD payouts configured |
| Support email for store listing | `TBD` | User | `TBD` provide final email |
| Support phone (optional) | `TBD` | User | `TBD` optional |
| App category | `TBD` | User | Proposed: Health & Fitness |
| Target audience | `TBD` | User | Proposed: 13+ |
| Pricing | `TBD` | User | Proposed mirror: SGD 6.98 |
| Privacy policy URL | `CONFIRMED` | User | `https://navafit.sg/privacy-policy/` |
| Terms URL | `CONFIRMED` | User | `https://navafit.sg/terms-of-service/` |
| Content rating questionnaire answers | `TBD` | User | Expected mostly "No", must confirm |
| Screenshot inventory plan | `TBD` | User | Phone required, tablet optional |

### Phase 1 resolution steps (run top-to-bottom)

1. Open Play Console and verify the developer account banner does not show pending verification.
2. Open Monetization setup and confirm the payments profile is active for paid app sales.
3. Choose listing support email (recommended format: `support@navafit.sg`) and confirm inbox access.
4. Set category to `Health & Fitness`.
5. Set target audience to `13+`.
6. Set pricing to `Paid` and confirm base price in SGD mirrors iOS (`SGD 6.98`).
7. Keep privacy policy URL set to `https://navafit.sg/privacy-policy/`.
8. Keep terms URL set to `https://navafit.sg/terms-of-service/`.
9. For content rating questions, answer truthfully; expected values for this app are generally:
   - Violence: No
   - Sexual content: No
   - Gambling: No
   - Drugs/alcohol references: No
   - User-generated public sharing: No
10. Prepare screenshot shot list before upload:
   - Dashboard
   - Stopwatch mid-session
   - Breathwork guided level picker
   - AY chat screen
   - Settings/health sync screen

## Phase 2 - Android platform scaffold

| Task | Status | Owner | Verification |
|---|---|---|---|
| Add `@capacitor/android` dependency | `DONE` | Agent | `npm install` succeeds |
| Run `npx cap add android` | `DONE` | Agent | `android/` folder exists |
| Add Android release-safe settings in `capacitor.config.ts` | `DONE` | Agent | Config compiles |
| Add Android artifacts/keystore ignores to `.gitignore` | `DONE` | Agent | No keystore/build files tracked |
| Run `npx cap sync android` | `DONE` | Agent | Capacitor sync passes |

## Phase 3 - Android manifest and resources

| Task | Status | Owner | Verification |
|---|---|---|---|
| Add location + Health Connect permissions | `DONE` | Agent | Manifest contains required permissions |
| Add Supabase deep link intent filter | `DONE` | Agent | `com.navafit.alignment` scheme present |
| Add Health Connect privacy policy activity intent filter | `DONE` | Agent | Manifest includes policy activity |
| Set Android app name to `NavaFit Alignment` | `DONE` | Agent | `strings.xml` `app_name` updated |

## Phase 4 - Signing and release bundle

| Task | Status | Owner | Verification |
|---|---|---|---|
| Generate upload keystore locally | `BLOCKED` | User + Agent guide | Keystore file created on user machine |
| Create `android/keystore.properties` locally (not committed) | `BLOCKED` | User + Agent guide | File exists locally only |
| Add release signing config to `android/app/build.gradle` | `DONE` | Agent | Gradle reads properties safely |
| Build signed release bundle | `PENDING` | Agent | `app-release.aab` generated |

### Phase 4 keystore walkthrough (manual, required)

Run these steps exactly once on your machine:

1. Create a keystore folder:
   - `mkdir -p "$HOME/keystores"`
2. Generate the upload keystore:
   - `keytool -genkey -v -keystore "$HOME/keystores/navafit-upload-key.jks" -keyalg RSA -keysize 2048 -validity 10000 -alias navafit`
3. When prompted, enter and save these in your password manager:
   - Keystore password (`storePassword`)
   - Key password (`keyPassword`)
   - Key alias (`navafit`)
4. Create `android/keystore.properties` (local only, never commit):
   - `storeFile=/Users/<YOUR_USERNAME>/keystores/navafit-upload-key.jks`
   - `storePassword=<YOUR_STORE_PASSWORD>`
   - `keyAlias=navafit`
   - `keyPassword=<YOUR_KEY_PASSWORD>`
5. Confirm `.gitignore` includes:
   - `android/keystore.properties`
   - `android/app/*.jks`

## Phase 5 - Android feature parity checks

| Task | Status | Owner | Verification |
|---|---|---|---|
| Allow native health sync on iOS and Android | `DONE` | Agent | `supportsNativeHealthSync` supports both |
| Add Android-only "Install Health Connect" CTA in Settings | `DONE` | Agent | CTA shown when Health Connect unavailable |
| Confirm Supabase native callback URL whitelist | `PENDING` | User + Agent guide | Dashboard includes `com.navafit.alignment://auth-callback` |
| Verify telemetry geolocation behavior on Android | `PENDING` | Agent | Smoke test passes |

### Phase 5 Supabase redirect whitelist check (manual, 2 minutes)

1. Open Supabase Dashboard for your production project.
2. Go to `Authentication` -> `URL Configuration`.
3. In **Redirect URLs**, add:
   - `com.navafit.alignment://auth-callback`
4. Save.
5. Keep any existing web redirect URLs (do not remove web values).

## Phase 6 - Build and smoke testing

| Task | Status | Owner | Verification |
|---|---|---|---|
| Run `npm run verify:production` | `PENDING` | Agent | Lint/test/build pass |
| Run `npm run cap:sync` | `PENDING` | Agent | Sync pass |
| Run Android debug/release Gradle builds | `PENDING` | Agent | APK + AAB build |
| Emulator smoke test | `PENDING` | User + Agent guide | Sign in, stopwatch, breath, weather, health pass |
| Real device smoke test | `PENDING` | User + Agent guide | Health Connect path validated |

### Phase 6 smoke test checklist (exact order)

1. Sign in with email/password.
2. Sign in with Google and confirm return to app from browser.
3. Run Stopwatch manual + auto-lap; stop and save.
4. Run Breathwork guided and manual mode; confirm saved session appears.
5. Accept location permission and confirm weather populates.
6. Trigger health sync and confirm no permission crash.
7. Open AY chat and confirm response received.

### Phase 6 local Android build prerequisites (if Gradle errors)

If you see `Unable to locate a Java Runtime`:
- `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`
- `export PATH="$JAVA_HOME/bin:$PATH"`

If you see `SDK location not found`:
- Install Android SDK from Android Studio:
  - `Settings` -> `Languages & Frameworks` -> `Android SDK`
  - Install latest `Android SDK Platform`, `Platform-Tools`, and `Build-Tools`.
- Then set:
  - `export ANDROID_HOME="$HOME/Library/Android/sdk"`
  - `export ANDROID_SDK_ROOT="$ANDROID_HOME"`

## Phase 7 - Play Console listing and compliance

| Task | Status | Owner | Verification |
|---|---|---|---|
| Capture Android phone screenshots (4-5) | `PENDING` | User + Agent guide | Screens uploaded |
| Capture tablet screenshots (optional) | `PENDING` | User + Agent guide | Uploaded or explicitly skipped |
| Finalize short + full descriptions | `PENDING` | Agent + User approve | Text approved |
| Complete Data Safety form | `PENDING` | User + Agent guide | Form submitted |
| Complete Content Rating form | `PENDING` | User + Agent guide | Form submitted |

### Phase 7 listing text draft

- Short description (<= 80 chars):
  - `NavaFit Alignment: stopwatch, breathwork, health sync, AI coaching`
- Full description:
  - `NavaFit Alignment is your daily performance companion for focused training, mindful recovery, and consistent progress.

Track precision sessions with a pro-grade stopwatch, capture lap data, and review your session history. Use guided and manual breathwork modes to improve calm, rhythm, and recovery. Sync with native health data to monitor readiness signals and keep your dashboard aligned with your real activity.

Use AY chat coaching for practical training support, motivation, and routine guidance. NavaFit is built to stay clear, fast, and focused so you can train with confidence every day.

Key features:
- Precision stopwatch with lap and interval workflows
- Guided and manual breathwork sessions
- Health data sync for heart and activity insights
- Weather and context-aware daily dashboard
- AI assistant support with AY chat

NavaFit Alignment supports focused workouts, breath-led recovery, and better daily fitness decisions in one place.`

### Phase 7 screenshot capture workflow

1. Launch Android emulator (phone profile first, tablet optional).
2. Open app screen and hide debug overlays.
3. Capture screenshot in Android Studio emulator controls (`...` -> `Screen Capture`) or use:
   - `adb exec-out screencap -p > screenshot-dashboard.png`
4. Capture at least these 5 phone shots:
   - Dashboard
   - Stopwatch active session
   - Breath guided level picker
   - AY chat
   - Settings (health sync section)
5. Verify images are crisp and do not show loading spinners or private email data.

### Phase 7 Data Safety quick template

- Data collected: Email (account), app activity/workout logs, coarse/fine location (weather), health data (with consent), optional analytics.
- Data shared with third parties: No.
- Data encrypted in transit: Yes.
- Data deletion request supported: Yes (in-app delete account flow).
- Health Connect usage purpose: App functionality only.

### Phase 7 Content Rating baseline answers

- Violence: No
- Sexual content: No
- Gambling: No
- Illegal drugs/tobacco/alcohol abuse encouragement: No
- User-to-user live public sharing: No
- Location sharing to other users: No
- Purchases: Paid app (no gambling mechanics)

## Phase 8 - Internal testing rollout

| Task | Status | Owner | Verification |
|---|---|---|---|
| Upload signed AAB to Internal Testing | `PENDING` | User + Agent guide | Release created |
| Add testers and distribute test link | `PENDING` | User | Testers receive link |
| Validate install + in-app smoke flow | `PENDING` | User + Agent guide | Internal test pass |

### Phase 8 step-by-step

1. Play Console -> `Testing` -> `Internal testing` -> `Create new release`.
2. Upload `android/app/build/outputs/bundle/release/app-release.aab`.
3. Add release notes:
   - `Initial Android internal test for NavaFit Alignment parity release.`
4. Save, then `Review release`.
5. Resolve warnings, then `Start rollout to internal testing`.
6. Add tester emails/group in `Testers` tab.
7. Open opt-in link on real Android device and install.
8. Re-run the smoke checklist from Phase 6.

## Phase 9 - Production release

| Task | Status | Owner | Verification |
|---|---|---|---|
| Promote tested release to Production | `PENDING` | User + Agent guide | Production release created |
| Submit for Google review | `PENDING` | User + Agent guide | Review in progress |
| Track approval and go-live | `PENDING` | User + Agent guide | Release published |

### Phase 9 step-by-step

1. Play Console -> `Testing` -> `Internal testing` -> `Promote release` -> `Production`.
2. Confirm pricing and countries match iOS strategy.
3. Confirm Data Safety, Content Rating, and App Content sections are all green.
4. Submit production release for review.
5. Monitor `Publishing overview` until approved.
6. After go-live, install from Play Store and run a quick sanity check.
