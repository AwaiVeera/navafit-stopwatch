# Test Build Prep — iOS (TestFlight) + Android (Play Internal Testing)

**Scope:** Ship the `login-onboarding-rebuild` branch (Dawn Quartz login/onboarding
redesign, staged Firebase cutover, Facebook gated off) as a testable build on both
platforms.

**Backend for this test build:** **Supabase** (`VITE_AUTH_BACKEND=supabase`, the
current default). Firebase code is present but dormant and must stay off for these
builds. Do **not** flip the flag as part of test-build prep.

**Current versions in the branch:**
- iOS: `MARKETING_VERSION 1.0.3`, `CURRENT_PROJECT_VERSION 29` (28 is already on
  TestFlight — Complete, uploaded Jul 5 2026 — so this branch ships as **1.0.3 (29)**)
- Android: `versionName "1.0.3"`, `versionCode 4`

**What is already done in code (no action needed):**
- Login/onboarding redesign, password reset flow, Facebook button gated behind
  `VITE_ENABLE_FACEBOOK` (defaults off — Apple/Google/email only ship).
- iOS builds to a real binary; Android compiles to a real APK (`app-debug.apk`, 9.1MB).
- `android/variables.gradle` `minSdkVersion` is 26 (required by `@capgo/capacitor-health`).
- Full test suite green (36/36); web bundle builds without regression.

---

## ⚠️ Things only you can do (I cannot touch credentials, certs, keystores, OAuth secrets, or store consoles)

Everything below is **manual**, ordered highest-priority first. Anything involving a
signing identity, a keystore, an OAuth client secret, or a store-console form is yours
alone — I am prohibited from handling those.

### Priority 1 — Unblock iOS TestFlight

1. **Build number is set to 29.** Build 28 was confirmed already on TestFlight
   (Complete), so `CURRENT_PROJECT_VERSION` has been bumped to **29** in this branch —
   no action needed. (App Store Connect rejects duplicate build numbers.)
2. **Apple Distribution certificate + provisioning.** In Xcode → Signing & Capabilities,
   confirm the App's automatic signing has a valid **Apple Distribution** cert for team
   ID on `com.navafit.alignment`. If missing, create it via Xcode's "Manage Certificates"
   or the Developer portal.
3. **Archive & upload.** `App.xcodeproj` is an **SPM project — there is NO `.xcworkspace`.**
   Open `ios/App/App.xcodeproj` in Xcode, select "Any iOS Device (arm64)",
   Product → Archive, then distribute to App Store Connect / TestFlight.
4. **Assign internal testers** in App Store Connect → TestFlight once processing finishes.

### Priority 2 — Unblock Android signing + Firebase SHA registration

> Even though this build targets **Supabase**, Android Google Sign-In still relies on the
> Firebase/Google `google-services.json` SHA registration. Debug builds work today (debug
> keystore SHA-1 is registered); a **release/upload-signed** build will break Google
> Sign-In until the upload key's SHA is registered.

1. **Generate an upload keystore** (once, keep it safe forever — losing it blocks all
   future updates):
   ```bash
   keytool -genkey -v -keystore navafit-upload.keystore \
     -alias navafit-upload -keyalg RSA -keysize 2048 -validity 10000
   ```
2. **Create `android/keystore.properties`** (git-ignored) pointing at it. The release
   `signingConfig` in `android/app/build.gradle` is **already wired** to read this file
   — just copy the template and fill it in:
   ```bash
   cp android/keystore.properties.example android/keystore.properties
   # then edit storePassword / keyPassword (and storeFile path if not alongside)
   ```
   Keys: `storeFile` (absolute, or relative to `android/`), `storePassword`, `keyAlias`,
   `keyPassword`. When the file is absent, release builds fall back to debug signing, so
   `bundleRelease` only produces an upload-signable AAB once this exists. The properties
   file and any `*.jks`/`*.keystore` are git-ignored — never commit signing material.
3. **Register the upload key's SHA-1 and SHA-256** in Firebase Console → Project
   Settings → Your apps → Android app → "Add fingerprint". Get them with:
   ```bash
   keytool -list -v -keystore navafit-upload.keystore -alias navafit-upload
   ```
   Also register **Play App Signing**'s SHA once the app is uploaded (Play Console →
   Setup → App signing shows the Google-managed cert's SHA — add that too).
4. **Re-download `google-services.json`** after adding fingerprints and drop it in
   `android/app/`. Tell me and I'll confirm the `oauth_client` block is populated.

### Priority 3 — Play Console listing + internal testing track

1. **Create the app** in Play Console (if not already): app name, default language,
   app/game = app, free/paid.
2. **Internal testing track:** create it, add tester emails (or a Google Group).
3. **Build a signed AAB** once signing is wired:
   ```bash
   cd android && ./gradlew bundleRelease
   # output: android/app/build/outputs/bundle/release/app-release.aab
   ```
   (Local Android build prerequisites are in the last section.)
4. **Required store-console forms before the track can go live:**
   - Data Safety form (declare health data, auth data, what's collected/shared).
   - Content rating questionnaire.
   - App access (provide test credentials if sign-in is required to review).
   - Target audience & content, ads declaration, government-app declaration.
   - Store listing: screenshots (phone + required form factors), short/full description,
     app icon, feature graphic.
   - Pricing (paid app, ~SGD 6.98) — set in Play Console → Monetization.

### Priority 4 — Auth provider re-verification (both platforms)

1. **Supabase redirect allow-list:** confirm `com.navafit.alignment://auth-callback`
   is in Supabase → Authentication → URL Configuration → Redirect URLs. Without it,
   native Apple/Google OAuth round-trips fail silently.
2. **Apple provider:** confirm Sign in with Apple is enabled in Supabase and the
   Services ID / key are current (Apple keys expire).
3. **Google provider:** confirm the Google OAuth client (iOS + Android + web) is
   configured in Supabase and matches the SHA registration from Priority 2.
4. **Facebook:** deferred. The button is hidden (`VITE_ENABLE_FACEBOOK` off), so no
   Facebook App / provider provisioning is needed for this test build. Do not enable
   the flag until the full chain (Facebook App + Supabase provider + native iOS/Android
   SDK entries + ATT handling) is provisioned.

---

## Local build prerequisites (for whoever builds the Android artifact)

The Android Gradle build needs a **JDK in the 17–21 range** — not 8, not 26. Java 21 works:

```bash
export JAVA_HOME="$(brew --prefix)/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$PATH"
```

Then, from repo root:
```bash
npm install
npm run build:web          # produces dist/ that Capacitor copies in
npx cap sync android
cd android && ./gradlew assembleDebug   # or bundleRelease once signing is wired
```

iOS local build (for verifying before Xcode archive):
```bash
npm run build:web
npx cap sync ios
# then open ios/App/App.xcodeproj in Xcode (SPM project — no .xcworkspace)
```

---

## Quick checklist

**iOS**
- [x] Build number bumped to 29 (28 confirmed already on TestFlight)
- [ ] Valid Apple Distribution cert on `com.navafit.alignment`
- [ ] Archive `App.xcodeproj` (no `.xcworkspace`) → upload → TestFlight
- [ ] Assign internal testers

**Android**
- [ ] Generate upload keystore + `android/keystore.properties`
- [ ] Register upload-key SHA-1/SHA-256 (and Play App Signing SHA) in Firebase
- [ ] Re-download `google-services.json` into `android/app/`
- [ ] Build signed AAB (`./gradlew bundleRelease`)
- [ ] Create Play Console app + internal testing track + testers
- [ ] Data Safety, Content Rating, App Access, store listing, screenshots, pricing

**Auth**
- [ ] `com.navafit.alignment://auth-callback` in Supabase redirect allow-list
- [ ] Apple provider verified (keys current)
- [ ] Google provider verified (matches SHA registration)
- [ ] Facebook stays disabled (flag off) — no action

**Guardrails**
- [ ] `VITE_AUTH_BACKEND=supabase` in the build env (do not flip to firebase)
- [ ] `VITE_ENABLE_FACEBOOK` unset/false
