# Setup outside Cursor (launch stack)

Complete these in a **web browser** and **Apple’s desktop apps** (Xcode). Cursor cannot enroll you in Apple programs or create Apple’s records for you.

## Checkboxes (work in order)

### Apple (required for iPhone TestFlight / App Store)

- [ ] **Apple ID** you control (email + password + two-factor if enabled).
- [ ] **Apple Developer Program** enrollment (paid, annual) at [developer.apple.com](https://developer.apple.com/programs/enroll/). After approval, your account can create signing certificates and App Store listings.
- [ ] **Xcode** installed from the Mac App Store (or Apple Developer downloads). Open it once to accept license and install extra components if prompted.
- [ ] **Xcode → Settings (or Preferences) → Accounts**: add the same Apple ID; wait until your **Team** name appears (not “Personal Team” only if you need TestFlight—paid program team required).
- [ ] **App Store Connect** at [appstoreconnect.apple.com](https://appstoreconnect.apple.com): sign in with that Apple ID → **Apps** → confirm an app exists for bundle ID `com.navafit.alignment` (or create it following [docs/APP_STORE_CONNECT_SUBMISSION_CHECKLIST.md](APP_STORE_CONNECT_SUBMISSION_CHECKLIST.md)).
- [ ] **Signing:** In Xcode, open `ios/App/App.xcodeproj` → select target **App** → **Signing & Capabilities** → Team = your paid team → **Automatically manage signing** on → fix any red errors using Xcode’s “Try Again” or certificate prompts.
- [ ] **TestFlight:** After a successful **Archive** and **Upload** (see [docs/TESTFLIGHT_UPLOAD_HANDOFF.md](TESTFLIGHT_UPLOAD_HANDOFF.md)), open App Store Connect → your app → **TestFlight** → wait for processing → add **Internal Testing** and install on a physical iPhone via the **TestFlight** app from the App Store.

### Supabase (already integrated in repo)

- [ ] **Project** at [supabase.com](https://supabase.com): create or open the project that matches your app’s anon URL/key.
- [ ] **SQL:** Run `SUPABASE_PHASE1_FOUNDATION.sql` (and optional `SUPABASE_ONBOARDING_PROFILE_OPTIONAL.sql` only if you adopt cloud onboarding JSON—see [docs/ONBOARDING_CLOUD_DECISION.md](ONBOARDING_CLOUD_DECISION.md)).
- [ ] **Auth:** Enable the same providers you use in the app (e.g. Apple, Google, email).
- [ ] **Secrets:** In the app build, use **anon** public key only. Never commit **service_role** keys into the repo or ship them in the client.

### Google Play (only if you ship Android)

- [ ] **Google Play Console** account and one-time registration fee.
- [ ] Create app listing, upload AAB, internal testing track, then production when ready.

### Legal and store-facing (both stores)

- [ ] **Privacy policy** hosted at a **public HTTPS URL**; text must match what the app actually collects (HealthKit, auth, analytics, etc.).
- [ ] **Support URL or email** visible to users and entered in store consoles.
- [ ] **App Privacy** questionnaire (Apple) and **Data safety** (Google) filled with accurate answers.

### Optional but common

- [ ] **Crash reporting** (e.g. Sentry): create project, add DSN via env—not hardcoded secrets in git.
- [ ] **Domain / website** for marketing and policy links.

## Where NavaFit docs continue the detail

| Topic | File |
|--------|------|
| Upload blockers and Xcode clicks | [TESTFLIGHT_UPLOAD_HANDOFF.md](TESTFLIGHT_UPLOAD_HANDOFF.md) |
| Metadata and review gates | [APP_STORE_CONNECT_SUBMISSION_CHECKLIST.md](APP_STORE_CONNECT_SUBMISSION_CHECKLIST.md) |
| Rules + product context | [PHASE_A_RESUME_REFERENCE.md](PHASE_A_RESUME_REFERENCE.md) |
