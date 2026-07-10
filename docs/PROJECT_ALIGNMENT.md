# NavaFit Alignment - Cross-Project Conventions

Single source of truth for keeping `navafit-stopwatch` in line with the other Veera Mishra apps. Derived from a read-only audit (2026-06-30) of the two reference projects. Update this file when the references change.

## Reference projects (on this Mac)

- `project_bhairava` - `~/Desktop/apps/aav-bhairu/project_bhairava`
  - Stack: Flutter + Firebase (Auth, Firestore, Cloud Functions v2 on Node 22, App Check, FCM), Stripe.
  - AI: server-side Google Gemini 2.5 via Cloud Functions, with grounding enforcement; the client never holds AI keys.
  - Animations: Lottie for hero moments + custom `AnimationController` for ambient motion.
- `vm23g` (Astro Alignment / Veera Mishra) - `~/Desktop/apps/vm23g`
  - Stack: Expo / React Native (web-first marketing), hosted on Cloudflare.
  - Motion: `react-native-reanimated` v4 + worklets, three.js web hero, scroll parallax, reveal-on-scroll, hover glow, motion timing tokens, `useMotionGuardrails` (reduced-motion + device tier).
  - No backend, no real ML (only marketing copy mentions AI/ML).

## This project

- `navafit-stopwatch` - Capacitor 8 + Vite + React 19 web, packaged to iOS + Android.
- Backend: migrating off Supabase to Firebase (Auth + Firestore + Cloud Functions); web hosted on Cloudflare Pages. See the migration plan.

## Shared conventions to follow

### Platform / workflow
- NavaFit stays on Capacitor (no Expo/Flutter rewrite).
- Capacitor CLI is the canonical run path: `npx cap run ios` / `npx cap run android`. Use Xcode only for archive/signing.
- After web changes: `npm run cap:sync`. Pre-merge gate: `npm run verify:production` (lint + test + build).

### Backend (target, matches project_bhairava)
- Firebase Auth for identity (NavaFit keeps email + Apple + Google, unlike Bhairava's anonymous-only).
- Firestore owner-scoped documents under `users/{uid}/...`; server-only writes for sensitive collections.
- Cloud Functions v2, Node 22, with: authenticated context, App Check enforcement, and rate limiting.
- All AI calls are server-side. AI provider keys live only in function secrets, never in the client bundle.
- Web hosting on Cloudflare Pages (same as vm23g and navafit-sg).

### AI
- Server-side Gemini behind a callable function, with grounding/guardrails on the response.
- Be honest about ML: the references use deterministic logic + Gemini, not trained ML models. Do not market unbuilt ML.

### Motion (matches vm23g intent)
- Centralized motion tokens: durations (micro/short/medium/long) and easing (cinematic/settle).
- Always honor reduced-motion / reduced-transparency and scale density on low-power devices.
- Animations stay default-on (per production-invariants rule), gated only by media queries.

### Quality bars
- No assumptions, no hallucinations - verify with evidence before claiming done.
- No secrets committed; keys via env / function secrets only.
- Small, reversible changes; keep the build green at every step.

## Reconciliation status (live)

### Motion tokens (done)
NavaFit's `:root` in [src/index.css](../src/index.css) now carries both its own tokens (`--dur-fast/base/slow`, `--ease-smooth/spring`) and the vm23g-aligned vocabulary (`--dur-micro` 140, `--dur-short` 260, `--dur-medium` 440, `--dur-long` 680; `--ease-cinematic`, `--ease-settle`) so motion naming/behavior matches the reference. Reduced-motion and reduced-transparency media-query gates already cover the signature animations.

### AY AI hardening spec (to implement in the Firebase function, Phase 8)
Port the `ay-chat` logic into a Firebase callable `ayChat` that mirrors project_bhairava's `geminiChat`:
- Require an authenticated Firebase user (callable context) before any model call.
- Enforce Firebase App Check (reject missing tokens in production).
- Per-user rate limiting (e.g., a `_rateLimits/{uid}` doc) to cap abuse.
- Server-side Gemini call with the existing NavaFit system prompt; enforce grounding/guardrails on the response before returning.
- AI keys live only in function secrets; never in the client bundle.

## Capacitor CLI workflow (done)
- iOS Xcode product renamed to `App` (Capacitor default) so `npx cap run ios` deploys `App.app`; verified deploying to the iPhone 17 Pro Max simulator. User-facing name preserved via `CFBundleDisplayName`.
- Scripts: `npm run ios:run`, `npm run android:run`, `npm run android:open`.

## iOS/Android parity (done)
- App name, bundle id (`com.navafit.alignment`), OAuth deep link scheme, location, and health permissions match across platforms.
- Versions aligned: iOS `MARKETING_VERSION 1.0.3` (build 28) and Android `versionName "1.0.3"` (versionCode 4).
- Deferred: Android 13+ `POST_NOTIFICATIONS` (only needed once FCM/push is added during the Firebase migration).
