# Native Device Login Recovery — Task Manager & Guide

This document is for **NavaFit Alignment** when the app is installed on a **real iPhone** (or simulator) and the **login screen seems stuck**. It follows project rules: **no guessing**, **simple steps**, **unknown items marked `TBD`**.

---

## Status (living checklist)

- [x] Code: session bootstrap timeout (20s) so “Checking session…” cannot hang forever
- [x] Code: visible alert on login when Supabase env vars are missing from the build
- [ ] You: confirm which symptom matches your device (Section 2)
- [ ] You: complete the matching runbook (Section 3)
- [ ] You: record outcome in Evidence log (Section 6)

---

## 1. What the app needs (facts from the codebase)

| Need | Where it lives | Notes |
|------|----------------|--------|
| Supabase URL | `VITE_SUPABASE_URL` in `.env.local` at project root | Baked in at **`npm run build`** time, not read from the phone |
| Supabase anon key | `VITE_SUPABASE_ANON_KEY` in `.env.local` | Same as above |
| OAuth deep link (optional) | `VITE_NATIVE_AUTH_REDIRECT_URL` | Default in code: `com.navafit.alignment://auth-callback` |
| Network | Phone must reach `*.supabase.co` | Email sign-in calls Supabase over HTTPS |
| Supabase Dashboard | Auth settings, redirect URLs | Must include native callback for Apple/Google |

If `.env.local` was missing or wrong **when you last ran `npm run build`**, the installed app has **no** working Supabase client. The login UI will show an alert: **“Login is turned off in this build”** (after you install the latest build from this repo).

---

## 2. Pick your symptom (no assumptions)

Use **one** row that matches what you see.

| Symptom | Likely cause | Go to |
|---------|----------------|--------|
| A. Button says **“Checking session…”** and fields never unlock | Slow or blocked network to Supabase during startup; or rare hang | §3.1, then §3.2 |
| B. Red-style alert: **“Login is turned off in this build”** | Build was made without valid `VITE_*` env vars | §3.2 |
| C. Fields work; after **Sign In**, red error text appears | Wrong password, unconfirmed email, or Supabase error | §3.3 |
| D. **Apple** / **Google** opens browser then returns without signing in | Redirect URL or OAuth provider not configured in Supabase | §3.4 |
| E. Something else | `TBD` until you capture exact text | §3.5 |

---

## 3. Runbooks (do in order)

### 3.1 If stuck on “Checking session…” (Symptom A)

**Already in code:** After **20 seconds**, the app should show an error and unlock the form if Supabase never answers.

1. **Force quit** the app (swipe up from app switcher), open again.
2. Wait **at least 20 seconds** on the login screen.
3. If a message appears about **could not reach Supabase**, check **Wi‑Fi or cellular** on the iPhone.
4. On your Mac, open a browser and visit your Supabase project URL (from `.env.local`). If the browser cannot load it, the phone will not either.

**If still stuck after 20s with no message:** Note the exact time and whether the button label changes — log under §6.

---

### 3.2 Rebuild with correct Supabase keys (Symptoms A & B)

Do this on your **Mac** in Terminal, from the project folder (`navafit-stopwatch`).

1. Confirm `.env.local` exists (copy from `.env.example` if needed).
2. Fill in real values (from Supabase Dashboard → **Project Settings** → **API**):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Run, in order:

```bash
npm install
npm run build
npm run cap:sync
```

4. Open `ios/App/App.xcodeproj` in Xcode.
5. Select your **iPhone** as the run destination.
6. Press **Run** (▶) to install the **new** build.

**Evidence:** After install, you should **not** see “Login is turned off in this build” if the keys are valid.

---

### 3.3 Email sign-in errors (Symptom C)

1. Use **Create Account** if you have never signed up.
2. If Supabase requires email confirmation, open the email and confirm before **Sign In**.
3. Read the **exact** red message on screen (the app maps common Supabase errors to plain language).
4. If it says **invalid login credentials**, try **Create Account** or reset password via Supabase/your flow (`TBD` if you use password reset).

---

### 3.4 Apple / Google (Symptom D)

In **Supabase Dashboard** → **Authentication** → **URL Configuration**:

- **Additional Redirect URLs** must include:  
  `com.navafit.alignment://auth-callback`
- Apple and Google providers must be **enabled** and configured per Supabase docs (`TBD`: your exact provider setup).

If the in-app browser **closes** and you see **“sign-in window closed before completion”**, complete OAuth in the browser before closing.

---

### 3.5 Capture evidence (Symptom E or anything unclear)

1. Screenshot the **full** login screen including any message under the button.
2. Note: iOS version, Wi‑Fi vs cellular, and whether `.env.local` existed before **last** `npm run build`.
3. Add a row to §6.

---

## 4. Xcode “Perform Changes” prompt (related safety)

If Xcode offers **recommended project updates** (warnings, **User Script Sandboxing**, etc.):

- **Cancel** is the safe default for this Capacitor project until each change is reviewed.
- **User Script Sandboxing** has been reported to break some Cordova/Capacitor builds — do not enable blindly.

---

## 5. Verification commands (for you or an agent)

Run on Mac from project root:

```bash
npm run test
npm run lint
npm run build
npm run cap:sync
xcodebuild -project ios/App/App.xcodeproj -scheme App -destination "generic/platform=iOS Simulator" build
```

**Note:** Passing `xcodebuild` does not prove `.env.local` was present at `npm run build`; it only proves the iOS project compiles.

---

## 6. Evidence log (append only)

| Date | Symptom code (§2) | What you did | Result |
|------|-------------------|--------------|--------|
| _TBD_ | _TBD_ | _TBD_ | _TBD_ |

---

## 7. Files touched for this recovery pass

| File | Change |
|------|--------|
| `src/App.tsx` | 20s timeout on initial `getSession()`; still registers `onAuthStateChange` after timeout |
| `src/screens/LoginScreen.tsx` | Alert when `!isSupabaseConfigured` with steps to fix build |
| `NATIVE_DEVICE_LOGIN_RECOVERY_TASK_MANAGER.md` | This guide |

---

## 8. Related docs

- `docs/XCODE_SIGNING_FIRST_TIME.md` — development team / signing
- `docs/HEALTHKIT_SETTINGS_CHECKLIST.md` — HealthKit (after login works)
- `PRODUCTION_FINALIZATION_GUIDE.md` — Supabase steps (web-focused; still relevant for keys)
- `.env.example` — required variable names
