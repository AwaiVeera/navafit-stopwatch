# NavaFit - Supabase → Firebase + Cloudflare Migration Runbook

Status: DESIGN / AWAITING APPROVAL (GO-NO-GO gate). No infra or account changes have been made. This document is the decision artifact required before Phases 5-11 of the migration plan.

## 1. Goal

Move NavaFit's backend off Supabase to:
- Firebase Auth (email + Apple + Google) - keep the existing providers.
- Cloud Firestore for all user data.
- Firebase Cloud Functions (Node 22) for the AY assistant + account deletion + profile seeding.
- Cloudflare Pages for hosting the web build (matches VM23G / navafit-sg).

Existing live users and their workout history are migrated (no data loss).

## 2. Why (pros) and why-not (cons)

Pros:
- One backend convention across the company (project_bhairava already uses Firebase Auth + Firestore + Functions + Gemini).
- Web hosting consolidated on Cloudflare (same as your other sites).
- Firestore security rules + App Check + per-user rate limits match the Bhairava security posture.
- Server-side Gemini with grounding is the established pattern.

Cons / costs:
- High effort and risk: auth + data layer rewrite of a LIVE App Store app.
- User migration is delicate: passwords must import with matching hash settings or users get locked out.
- Two parallel backends during cutover (cost + complexity) until Supabase is decommissioned.
- Firestore data modeling differs from relational SQL; queries must be redesigned.
- New native config files required (`GoogleService-Info.plist`, `google-services.json`) and a new app build/submission to both stores.

Recommendation: proceed only with a staged cutover and a verified rollback (keep Supabase intact until parity is proven on real devices).

## 3. Risk analysis + rollback

Key risks:
- Password import: Supabase Auth (GoTrue) stores bcrypt hashes. Firebase Auth supports importing bcrypt via the Admin SDK `importUsers` with the correct hash config. If the hash parameters do not match, email/password users cannot sign in. Mitigation: test-import a single known account and verify sign-in before bulk import.
- OAuth identities (Apple/Google): provider user IDs differ between Supabase and Firebase. Returning OAuth users will create a new Firebase UID. Mitigation: key migrated data by email and link on first Firebase sign-in.
- Data integrity: 7 tables → Firestore documents must preserve `started_at`/`recorded_at` ordering and metadata.
- Downtime: avoid by running both backends; flip the client only after import + smoke test.

Rollback: until Phase 11 decommission, the app can be reverted to the Supabase client (kept in git history) and Supabase project stays live. No destructive Supabase deletion until parity is signed off.

## 4. Source inventory (audited)

Auth (`src/services/auth.ts`, `src/services/supabase.ts`, `src/App.tsx`): email/password, Apple, Google OAuth, deep link `com.navafit.alignment://auth-callback`, delete account, session bootstrap + listener.

Data (`src/services/data.ts`) - 7 datasets:
- `profiles` (id, email, timezone, onboarding_completed, training_progression jsonb)
- `user_consents` (policy/terms versions, health + analytics opt-in timestamps)
- `device_connections` (provider, status, scopes, last_synced_at)
- `workout_sessions` (source, title, note, started_at, ended_at, duration_minutes, metadata)
- `telemetry_snapshots` (vitals + weather, recorded_at)
- `sync_events` (provider, status, request_id, details) - insert only
- `app_usage_events` (screen, event_name, metadata) - insert only

Functions (`supabase/functions/`):
- `ay-chat` (in repo) - JWT-gated AI proxy (Gemini/OpenAI/Perplexity).
- `delete-account` (NOT in repo) - invoked by client; must be reimplemented.

Server trigger: `handle_new_user` seeds `profiles` on `auth.users` insert.

## 5. Target Firestore model (owner-scoped, Bhairava pattern)

- `users/{uid}` - profile (email, timezone, onboardingCompleted, trainingProgression)
- `users/{uid}/consents/{docId}` - consent record
- `users/{uid}/deviceConnections/{provider}` - device connection
- `users/{uid}/workoutSessions/{sessionId}` - workout sessions (orderable by startedAt)
- `users/{uid}/telemetrySnapshots/{snapshotId}` - telemetry
- `users/{uid}/syncEvents/{eventId}` - sync events (create-only via rules)
- `users/{uid}/usageEvents/{eventId}` - usage analytics (create-only via rules)
- `_rateLimits/{uid}` - server-only (functions) for AY rate limiting

Security rules: each `users/{uid}/**` readable/writable only by `request.auth.uid == uid`; `syncEvents` + `usageEvents` allow create but not update/delete; `_rateLimits` server-only. App Check enforced on functions.

## 6. Function mapping (Node 22, Firebase Functions v2)

- `ayChat` (callable) - port of `ay-chat/index.ts`; same system prompt + provider routing; add App Check + auth context + `_rateLimits` rate limit + grounding enforcement.
- `deleteMyAccount` (callable) - delete Firestore `users/{uid}` subtree + Firebase Auth user (replaces missing Supabase `delete-account`).
- `onUserCreate` (Auth trigger) - seed `users/{uid}` profile doc (replaces `handle_new_user`).

## 7. Client change map

- `src/services/supabase.ts` → `src/services/firebase.ts` (init `initializeApp`, `getAuth`, `getFirestore`, App Check).
- `src/services/auth.ts` → Firebase Auth (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `OAuthProvider('apple.com')`, `GoogleAuthProvider`); keep Capacitor deep link via `@capacitor/browser` + `signInWithCredential` on native.
- `src/services/data.ts` → Firestore reads/writes for the 7 datasets.
- `src/services/perplexity.ts` (AY client) → call `httpsCallable('ayChat')` with Firebase ID token instead of POSTing to the Supabase Edge Function.
- `src/App.tsx` → `onAuthStateChanged` instead of `onAuthStateChange`; keep deep-link handling.
- `.env.example` / `src/vite-env.d.ts` → Firebase web config vars (apiKey, authDomain, projectId, appId, etc.); remove `VITE_SUPABASE_*` after cutover.
- Remove `@supabase/supabase-js`; add `firebase`.

## 8. Execution phases (mirror the plan; gated)

1. [you, gated] Create Firebase project; enable Auth (email/Apple/Google), Firestore, App Check, FCM; download `GoogleService-Info.plist` + `google-services.json`. Connect Cloudflare Pages to the repo.
2. [agent] Auth migration (client).
3. [agent] Firestore data layer + security rules + `onUserCreate`.
4. [agent] `ayChat` + `deleteMyAccount` functions; update AY client.
5. [you+agent, gated] Export Supabase users (bcrypt) + rows; import to Firebase Auth + Firestore; verify a real account signs in and sees history.
6. [agent] Cloudflare Pages web deploy.
7. [agent] verify:production + cap run ios/android + full smoke test; decommission Supabase only after sign-off.

## 9. What I need from you to start Phase 5

- Confirm GO on this design.
- Firebase: do you already have a Firebase project for NavaFit, or should I guide you to create one? Which Google account/org?
- Apple Sign-In on Firebase requires Apple Developer service config (Services ID, key) - confirm you can provide these.
- Cloudflare: confirm the account/zone for Pages, and the production web domain (or a `*.pages.dev` default).
- Confirm acceptable maintenance window for the user/data import.

## 10. Open TBDs (no assumptions)

- `delete-account` current behavior is unknown (not in repo) - will reimplement from scratch as `deleteMyAccount`.
- Whether existing OAuth (Apple/Google) users should be auto-linked by email or asked to re-link - needs your call.
- Final Firestore composite indexes (derived once queries are ported).
