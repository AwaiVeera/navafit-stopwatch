# Login/Onboarding Rebuild + Firebase Auth Cutover — Design

## Context

This is the first implementation slice of the NavaFit full-app revamp (see the approved audit/roadmap at `/Users/tineshawaiveera/.claude/plans/happy-skipping-brook.md`). The owner chose to tear down the current dark Kalari-themed login/onboarding entirely rather than refine it, and to fold the in-flight Supabase→Firebase migration into this slice rather than sequencing it separately, since native Apple/Google/Facebook sign-in requires Firebase Auth. This work happens in an isolated git worktree (`.claude/worktrees/login-onboarding-rebuild`, branch `worktree-login-onboarding-rebuild`) so the live App Store build on `main` is unaffected until this is reviewed and merged.

## Goals

- Replace `LoginScreen.tsx`, `OnboardingScreen.tsx`, and `ConsentScreen.tsx` with a new visual identity ("Dawn Quartz").
- Add Facebook Login and password reset (both currently missing from every auth path in the app).
- Cut the app over to Firebase Auth + Firestore for data, **feature-flagged** and defaulting to the current Supabase path in production until explicitly flipped.
- Close the zero-screen-test gap for these three screens as part of the same change, not after.

## Visual System — "Dawn Quartz"

Two token sets, following the existing `[data-theme]` pattern in `src/index.css`.

**Light** (default):
- Background: cream/parchment gradient, `#fbf5ee` → `#f4e9dc`
- Text: warm near-black, `#2e2620`
- Accent: terracotta, `#b5654a`
- Secondary/muted: `#a9765f` (tagline), `#e3cdb9` (borders/dividers)
- Display type: Georgia/serif for brand name, headings, tagline (italic)
- UI type: system sans (Arial/Helvetica stack) for buttons, inputs, body copy

**Dark** ("Dawn Quartz — Dusk"):
- Background: warm espresso-brown, ~`#1c140f`, not neutral gray — same hue family as light, inverted lightness
- Text: cream, ~`#f4e9dc`
- Accent: same terracotta `#b5654a` (slightly brightened for contrast if needed)
- Same type pairing as light

Both theme sets are additive CSS custom properties, not a replacement of the existing Land/Air/Sea token system used by the rest of the app (Dashboard, Stopwatch, etc. keep their current tokens for now — this slice only touches the three auth-flow screens).

## Screen Composition & Motion

**Login** (`LoginScreen.tsx`):
- Hero (top ~44% of viewport): radial cream-to-tan gradient with a soft ink-wash circle texture (4 overlapping low-opacity radial circles at varied positions/sizes — decorative, not literal brand marks). Centered: a double-ring logo mark (two concentric thin terracotta rings around the circular NavaFit logo) — the outer ring is the pulsing animation target (scale 1.0→1.06→1.0, ~2.4s ease-in-out, infinite, disabled under `prefers-reduced-motion`). Brand name in serif below the logo, italic tagline below that.
- Bottom sheet: rounded top corners (24px), rises visually over the hero (negative margin-top), cream-white (`#fffaf3`) background with a faint echo of the ink-wash texture at low opacity. Contains, top to bottom: "Continue with Apple" / "Continue with Google" / "Continue with Facebook" (three full-width buttons, equal visual weight, matching the existing screen's "most users use SSO" placement priority), a divider ("— or —"), email field, password field, "Forgot password?" link (right-aligned under the password field), primary CTA (Sign In / Create Account depending on mode), and the existing sign-in/create-account mode toggle.
- Smooth cross-fade + slight vertical slide (~200ms) on mode toggle and on transition into Onboarding.

**Onboarding** (`OnboardingScreen.tsx`) and **Consent** (`ConsentScreen.tsx`):
- Same cream sheet styling, terracotta accents, serif section headings — but no animated hero. A small static circular brand mark (no rings, no pulse) sits at the top of each step instead, keeping the multi-step flow visually consistent with login without repeating its signature moment.
- Existing step content (age/height/weight/training-days fields in Onboarding; privacy/terms checkboxes + optional health/analytics toggles in Consent) is restyled in place — no field/flow changes beyond what's needed for the new Firebase-backed consent/profile writes (see below).

Accessibility: maintain and extend the existing `aria-live`, `aria-pressed`, `role="switch"` patterns already used elsewhere in the app (`SettingsScreen.tsx`, `PreSessionScreen.tsx`); verify contrast ratios for terracotta-on-cream and cream-on-espresso meet WCAG AA; respect `prefers-reduced-motion` for the hero pulse and all transitions (already-established pattern in `src/index.css:259` and `src/services/haptics.ts:4-6`).

## Auth & Data Architecture

**Why this can't be auth-only:** Supabase's OAuth flow is browser-redirect-based, not a native sheet — native Apple/Google/Facebook sign-in requires Firebase Auth via `@capacitor-firebase/authentication` (already a dependency, already implemented in `src/services/firebase-auth.ts` for Apple/Google). Once a user authenticates with a Firebase UID, no Supabase call can succeed for that session — Supabase's row-level-security policies check `auth.uid()` against a Supabase JWT that a Firebase session never has. Auth and data backend must switch together, for the whole app, for any given user session.

**Approach:**
1. New `src/services/data-backend.ts`: a single selector, `isFirebaseBackendActive()` (extends the existing `getAuthBackend()` pattern in `src/services/firebase.ts:97-102`, reading the same `VITE_AUTH_BACKEND` env flag), plus a set of re-exported data functions that internally dispatch to either `data.ts` (Supabase) or `firestore-data.ts` (Firestore) based on the flag.
2. `src/App.tsx` and every screen that currently imports directly from `src/services/data.ts` or `src/services/auth.ts` switches to import from `src/services/data-backend.ts` / a new `src/services/auth-backend.ts` instead — a mechanical, low-risk change (same function signatures on both sides, per the existing "mirrors `data.ts`'s public API" header comments already in `firestore-data.ts`).
3. `VITE_AUTH_BACKEND` **stays defaulted to `supabase` in the production `.env`** for the duration of this slice. The Firebase path is built and tested (locally, and on real devices per the migration runbook's requirement — background/native auth behavior isn't observable in a browser) via a local `.env` override. Flipping the production default is an explicit, separate decision after this slice is reviewed — not part of this implementation.
4. **Facebook Login**: add to `firebase-auth.ts` following the same native/web-split pattern already used for Apple/Google (`FirebaseAuthentication.signInWithFacebook()` via the Capacitor bridge; the underlying `@capacitor-firebase/authentication` plugin supports this without a new native SDK dependency beyond Facebook app registration in the Firebase console — a manual provisioning step, tracked as a prerequisite, not a code task).
5. **Password reset**: add `sendPasswordResetEmail` to `firebase-auth.ts` (currently absent) and a corresponding "Forgot password?" flow in `LoginScreen.tsx` (email-entry step → confirmation message). Not backported to the Supabase path since that path is being phased out by this migration.

## New/Changed Files (representative, not exhaustive)

- `src/screens/LoginScreen.tsx`, `OnboardingScreen.tsx`, `ConsentScreen.tsx` — rebuilt
- `src/index.css` — new Dawn Quartz token blocks (light + dark)
- `src/services/firebase-auth.ts` — add Facebook sign-in, password reset
- `src/services/data-backend.ts`, `src/services/auth-backend.ts` — new selectors
- `src/App.tsx` — switch imports to the new selectors
- `.env.example` — no new keys needed (Firebase keys already present); update comments once the selector lands
- `ios/App/App/App.entitlements`, `android/app/build.gradle` — Facebook SDK provisioning (config only, tracked as a prerequisite check, done alongside implementation)
- New test files: `src/screens/LoginScreen.test.tsx`, `OnboardingScreen.test.tsx`, `ConsentScreen.test.tsx`, `src/services/data-backend.test.ts`, `src/services/auth-backend.test.ts`

## Testing

- Screen-level Vitest + React Testing Library tests for all three rebuilt screens (form validation, mode toggle, error states, password-reset flow) — closes the existing zero-screen-test gap identified in the audit.
- Unit tests for `data-backend.ts`/`auth-backend.ts` selector logic (flag on vs off routes to the correct backend).
- Manual device verification required before any production flag flip: native Apple/Google/Facebook sheets, password reset email delivery, Firestore consent/profile writes — none of this is reliably observable in a browser or simulator.

## Explicitly Out of Scope for This Slice

- Dashboard, Stopwatch, Breathwork, Biometrics, Settings, AY chat screens keep their current visual design and current Supabase-only data calls unless already covered by the backend-selector's mechanical import switch (item 2 above) — no new UI work on those screens here.
- Flipping `VITE_AUTH_BACKEND` to `firebase` in production.
- Android Google Sign-In SHA-1 registration (blocks Android launch generally, tracked separately per the original roadmap).
- Pro-unlock IAP, subscription screen, and the other roadmap phases.
