# Baseline Audit — Full Production Revamp

**Date:** 2026-07-13 · **Branch:** `worktree-login-onboarding-rebuild` · **Checkpoint tag:** `revamp-baseline-2026-07-13` (`640d784`)

Phase 0 of the revamp mandate. Every figure below is measured from this branch, not assumed.

## Detected stack (from project files)

| Concern | Detected | Evidence |
|---|---|---|
| UI framework | React 19 + TypeScript | `package.json` deps `react@19`, `tsc -b` |
| Bundler | Vite 7 | `package.json`, `vite.config.ts` |
| Styling | Tailwind v4 + hand-rolled CSS token system | `src/index.css` (2,952 lines), `@tailwindcss/vite` |
| Native wrapper | Capacitor 8 (SPM iOS, Gradle Android) | `capacitor.config.ts`, `ios/App/App.xcodeproj` (no `.xcworkspace`), `android/` |
| Navigation | Single `useState<ViewId>`, no router | `src/App.tsx:132`, `src/types.ts` |
| State management | Local `useState`/`useRef` prop-drilled from `App.tsx` | `src/App.tsx` (~19 useState) |
| Auth (live) | Supabase; Firebase staged behind `VITE_AUTH_BACKEND` (default `supabase`) | `src/services/auth-backend.ts`, `firebase-config.ts` |
| Health | `@capgo/capacitor-health` (HealthKit + Health Connect) | `src/services/health.ts`, `package.json` |
| Weather | Open-Meteo (keyless) | `src/services/telemetry.ts` |
| Tests | Vitest + RTL (jsdom), no jest-dom | `src/**/*.test.ts(x)` |
| IAP / subscriptions | **None in codebase** | grep: no StoreKit / Play Billing / RevenueCat |

## Baseline quality gates (all green)

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | ✅ clean (0 warnings) |
| Typecheck | `npx tsc -b` | ✅ exit 0 |
| Unit tests | `npx vitest run` | ✅ 36 passed / 10 files |
| Web build | `npm run build:web` | ✅ built in ~1.0s |

## Bundle baseline (`npm run build:web`, gzip)

| Asset | Raw | Gzip | Note |
|---|---|---|---|
| `index-*.js` (main app) | 530.5 kB | 152.4 kB | main chunk |
| `firebase-*.js` | 455.6 kB | 135.2 kB | **lazy** — dormant under supabase flag |
| `firestore-data-*.js` | 10.2 kB | 3.2 kB | lazy |
| `firebase-auth-*.js` | 3.3 kB | 1.5 kB | lazy |
| `index-*.css` | 69.9 kB | 14.0 kB | full token system |
| **Total `dist/`** | **1.9 MB** | — | includes fonts/assets |

Preserve the lazy-Firebase split through the revamp — it is the single biggest bundle lever.

## Native build baseline (prior-session evidence, to be re-verified in Phase 8)

- **iOS:** archives from `ios/App/App.xcodeproj` (SPM); version **1.0.3 (29)** (28 already on TestFlight/Complete). Toolchain Xcode 26.6 / macOS 26.5.2.
- **Android:** `./gradlew assembleDebug` → BUILD SUCCESSFUL, 9.1 MB `app-debug.apk`; requires JDK 17–21 + `ANDROID_HOME`; `minSdk 26` (floor for `@capgo/capacitor-health`). Release signing wired (`android/app/build.gradle` reads `keystore.properties`); keystore is owner-supplied.

## Known layout defects (to fix in phases)

- **Login responsiveness (§7):** hero/sheet redesign (`.dq-*` classes) is the approved design — preserve visuals, fix any scale/scroll/keyboard defect. *Not yet reproduced on-device.*
- **AY chat composer (fixed 640d784):** was sliding under the tab bar; now clipped + pinned.
- **Paged screens (§13, reported on iPhone 17 Pro Max):** Dashboard / Stopwatch / Pre-session / Settings / Biometrics use `screen-shell--paged` with invisible internal scrollbars → "content cut off" perception + element overlap. All pages already carry `screen-page--scroll`; overlap is empirical and needs a device screenshot or in-browser repro to pinpoint. Tracked in RISK_LOG.

## Screens to rebuild (LOC, current)

`StopwatchScreen` 532 · `BreathScreen` 945 · `DashboardScreen` 432 · `SettingsScreen` 438 · `AYScreen` 157.

## Not measured this session (honest gaps)

Cold/warm startup, on-device frame rates, timer drift under real backgrounding, memory — none have committed traces. `docs/revamp/PERFORMANCE_REPORT.md` will record these with tool + device + methodology when Phase 7 profiling runs. No numbers are invented here.
