# NavaFit Production Finalization Guide

## Honest Status Right Now
- Phase 1 production foundation is now coded into the app.
- Real Supabase auth wiring is now in place for:
  - email/password
  - Apple OAuth bridge
  - Google OAuth bridge
- Step 7 auth testing has been completed against the configured providers.
- The app still does **not** have live HealthKit, Apple Watch, Garmin, or real AI/ML data pipelines yet.
- Verification completed on this phase:
  - `npm run lint` passed
  - `npm run build` passed
  - `npx cap sync ios` passed

## What I Completed In Code
- [x] Installed `@supabase/supabase-js`
- [x] Installed `@capacitor/app`
- [x] Installed `@capacitor/browser`
- [x] Added `.env.example`
- [x] Replaced the fake timeout login with real Supabase email auth wiring
- [x] Bridged Apple and Google buttons into Supabase OAuth handlers
- [x] Added the iOS callback scheme `com.navafit.alignment://auth-callback`
- [x] Added `SUPABASE_PHASE1_FOUNDATION.sql`
- [x] Removed dev-only localhost ingest calls from the auth path and verification path
- [x] Synced Capacitor iOS plugins
- [x] Verified lint and build after the auth changes

## Files Added Or Updated In This Phase
- `.env.example`
- `SUPABASE_PHASE1_FOUNDATION.sql`
- `src/services/supabase.ts`
- `src/services/auth.ts`
- `src/App.tsx`
- `src/screens/LoginScreen.tsx`
- `src/screens/DashboardScreen.tsx`
- `src/screens/StopwatchScreen.tsx`
- `ios/App/App/Info.plist`

## What You Do Not Need To Install Right Now
- You do **not** need another auth package manually. I already installed the required project packages.
- You do **not** need `GoogleService-Info.plist` yet for the current Google implementation, because this phase uses Supabase OAuth in a secure browser flow, not the native Google iOS SDK.
- You do **not** need Supabase CLI for this exact phase if you are happy to run the SQL file in the Supabase Dashboard SQL Editor.

## What You Still Need Besides GitHub, Supabase, And Xcode
- Apple Developer Program membership
- Google Cloud project access
- a privacy policy URL
- a terms of service URL
- at least one real iPhone for device testing
- Apple Watch hardware if Apple Watch sync is required in v1
- Garmin developer approval if Garmin must be live in v1
- a production domain later if you want a more trusted auth domain and universal links

## Important Truth About Apple Login
- The current Apple implementation uses the Supabase Apple OAuth path plus Capacitor deep linking.
- That fits the app structure you approved for this phase.
- Apple OAuth configuration requires you to keep the `.p8` signing key safe and rotate the generated Apple secret every 6 months.
- Native Sign in with Apple is still the cleaner long-term iOS path, but I did **not** switch to a native Apple SDK in this phase because this phase was limited to the Supabase auth foundation.

## Exact Step-By-Step Guide

### Step 1. Create `.env.local`
1. In the project root, copy `.env.example` to `.env.local`.
2. Open your Supabase project dashboard.
3. Copy your Project URL.
4. Copy your Publishable key or legacy anon key from the API Keys page.
5. Paste them into `.env.local`.

Use this exact shape:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
VITE_NATIVE_AUTH_REDIRECT_URL=com.navafit.alignment://auth-callback
```

When done, send me this prompt:
`Step 1 done. Continue.`

### Step 2. Configure Supabase URL Settings
1. Open Supabase Dashboard -> Authentication -> URL Configuration.
2. Set the Site URL to your current web app URL.
3. For local development, if you use the default Vite server, use `http://localhost:5173`.
4. Add these Additional Redirect URLs:
   - `http://localhost:5173`
   - `com.navafit.alignment://auth-callback`
5. Later, when you have a production domain, add that production URL too.

Why this matters:
- web sign-in returns to your web app URL
- iOS sign-in returns to `com.navafit.alignment://auth-callback`

When done, send me this prompt:
`Step 2 done. Continue.`

### Step 3. Run The Database Foundation SQL
1. Open Supabase Dashboard -> SQL Editor.
2. Open the local file `SUPABASE_PHASE1_FOUNDATION.sql`.
3. Paste the full contents into the SQL Editor.
4. Click Run.
5. Confirm these tables now exist:
   - `profiles`
   - `user_consents`
   - `device_connections`
   - `workout_sessions`
   - `telemetry_snapshots`
   - `sync_events`
   - `app_usage_events`

When done, send me this prompt:
`Step 3 done. Continue.`

### Step 4. Turn On Email Auth
1. Open Supabase Dashboard -> Authentication -> Providers.
2. Open the Email provider.
3. Confirm Email auth is enabled.
4. Decide whether new users must confirm by email before the first sign-in.
5. If email confirmation is enabled, make sure your email templates look correct.

What the app now does:
- `Sign In` uses Supabase email/password
- `Create Account` uses Supabase sign up
- if confirmation is enabled, the app tells the user to check email

When done, send me this prompt:
`Step 4 done. Continue.`

### Step 5. Configure Apple Login For The Current Implementation
This app currently uses the Supabase Apple OAuth path, not the native Apple SDK path.

Based on the current Supabase Apple provider docs, you need:
1. An App ID for `com.navafit.alignment` with `Sign in with Apple` enabled.
2. A Services ID, for example `com.navafit.alignment.web`.
3. A Sign in with Apple signing key from the Apple Developer `Keys` section.
4. The downloaded `.p8` file stored safely.
5. Your Apple Developer Team ID.
6. Services ID website configuration:
   - website domain: your Supabase project domain, usually `your-project-ref.supabase.co`
   - redirect URL: `https://your-project-ref.supabase.co/auth/v1/callback`
7. Email source registration in Apple if you want Hide My Email relay communication to behave correctly.

Then in Supabase Dashboard -> Authentication -> Providers -> Apple:
1. Enable Apple.
2. Use the Services ID as the client ID.
3. Use the generated Apple secret in the secret field.
4. Save.

Important:
- keep the `.p8` file private
- if the file is lost or leaked, revoke it and create a new one
- because this is OAuth-based Apple auth, the generated Apple secret must be rotated every 6 months

When done, send me this prompt:
`Step 5 done. Continue.`

### Step 6. Configure Google Login For The Current Implementation
This app currently uses Supabase Google OAuth in a secure browser flow.

1. Open Google Cloud Console and create a project if you do not already have one.
2. Open Google Auth Platform.
3. Configure Branding / OAuth consent screen.
4. Add links to your Privacy Policy and Terms of Service.
5. In Data Access / Scopes, confirm these are available:
   - `.../auth/userinfo.profile`
   - `.../auth/userinfo.email`
   - `openid`
6. Create a Web application OAuth client.
7. Under Authorized JavaScript origins, add your app URL.
   - for local development, use `http://localhost:5173`
8. Under Authorized redirect URIs, add your Supabase callback URL:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
9. Copy the Google Client ID and Client Secret.

Then in Supabase Dashboard -> Authentication -> Providers -> Google:
1. Enable Google.
2. Paste the Google Client ID.
3. Paste the Google Client Secret.
4. Save.

Important:
- Google recommends proper branding and a trusted domain for better user trust
- for the current implementation, you do **not** need the native Google iOS SDK setup yet

When done, send me this prompt:
`Step 6 done. Continue.`

### Step 7. Run The App With Your Real Keys
1. In the project root, run `npm install` if needed.
2. Run `npm run dev`.
3. Test:
   - email sign up
   - email sign in
   - Apple sign in
   - Google sign in
4. For iOS, run `npx cap sync ios` again after any plugin or native config change.
5. Open Xcode and run the app on simulator or device.

When done, send me this prompt:
`Step 7 done. Continue.`

## Singapore-First Guidance
- Start with `SG` as the first live market.
- Keep privacy, consent, and retention wording aligned with Singapore PDPA.
- Do not expand to wider Asia until the consent wording, support flow, and auth/legal copy are stable.
- Official Singapore PDPC site: [pdpc.gov.sg](https://www.pdpc.gov.sg/)

## Garmin Reality Check
- Garmin is not wired yet.
- Garmin officially says developer access is free for approved business developers.
- Garmin says approval is usually confirmed within 2 business days.
- Garmin says a typical integration takes 1 to 4 weeks.
- Garmin uses OAuth 2.0.
- Official Garmin FAQ: [developer.garmin.com/gc-developer-program/program-faq](https://developer.garmin.com/gc-developer-program/program-faq/)

## What Is Still Not Finished
- live HealthKit integration
- Apple Watch connectivity
- Garmin OAuth and Garmin API sync
- Supabase writes for workout sessions, telemetry snapshots, sync events, and usage events
- consent screens inside the app
- linking the live privacy policy and terms pages inside the app
- custom auth domain and universal links
- production analytics writes
- real AI / ML logic on live data
- TestFlight and App Store release setup

## Next Coding Phase After Your Next Approval
1. Persist workout sessions and user profile data into Supabase.
2. Add consent capture UI and save it to `user_consents`.
3. Replace simulated telemetry with real Apple Health / Apple Watch data paths.
4. Add Garmin connection flow once your Garmin developer access is approved.
5. Add usage analytics writes and sync event logging.
6. Prepare TestFlight build and release checklist.

## Task Manager

### Completed By Me In This Phase
- [x] Supabase client and auth services added
- [x] Real email auth wiring added
- [x] Apple/Google OAuth bridge added
- [x] iOS deep-link callback scheme added
- [x] Initial Supabase SQL foundation file added
- [x] Privacy policy and terms draft source files prepared
- [x] Live legal pages verified at `https://navafit.sg/privacy-policy/` and `https://navafit.sg/terms-of-service/`
- [x] Capacitor iOS sync passed
- [x] Lint passed
- [x] Build passed

### Waiting On You
- [x] Create `.env.local` with your real Supabase values
- [x] Configure Supabase URL settings
- [x] Run `SUPABASE_PHASE1_FOUNDATION.sql`
- [x] Enable Supabase Email provider
- [x] Configure Apple provider in Apple Developer and Supabase
- [x] Configure Google provider in Google Cloud and Supabase
- [x] Publish privacy policy and terms at `https://navafit.sg/privacy-policy/` and `https://navafit.sg/terms-of-service/`
- [ ] Request Garmin developer access if Garmin is required in v1

### Not Approved Yet
- [ ] Replace simulated telemetry with live HealthKit
- [ ] Add Apple Watch sync
- [ ] Add Garmin sync
- [ ] Add app consent screens
- [ ] Add production analytics writes
- [ ] Prepare TestFlight release

## Helpful Links
- Supabase Auth Apple: [supabase.com/docs/guides/auth/social-login/auth-apple](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- Supabase Auth Google: [supabase.com/docs/guides/auth/social-login/auth-google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- Supabase Native Mobile Deep Linking: [supabase.com/docs/guides/auth/native-mobile-deep-linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- Capacitor Browser API: [capacitorjs.com/docs/apis/browser](https://capacitorjs.com/docs/apis/browser)
- Capacitor App API: [capacitorjs.com/docs/apis/app](https://capacitorjs.com/docs/apis/app)
- Apple Developer account: [developer.apple.com/account](https://developer.apple.com/account/)
- Apple HealthKit docs: [developer.apple.com/documentation/healthkit](https://developer.apple.com/documentation/healthkit)
- Google Auth Platform: [console.cloud.google.com/auth/overview](https://console.cloud.google.com/auth/overview)
- Garmin FAQ: [developer.garmin.com/gc-developer-program/program-faq](https://developer.garmin.com/gc-developer-program/program-faq/)
- Singapore PDPC: [pdpc.gov.sg](https://www.pdpc.gov.sg/)
