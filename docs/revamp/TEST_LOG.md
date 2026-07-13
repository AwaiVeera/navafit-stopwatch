# Test Log

Append-only record of test/build runs with results. Each entry: date · scope · command · result.

## 2026-07-13 — Phase 0 baseline

| Scope | Command | Result |
|---|---|---|
| Lint | `npm run lint` | ✅ 0 warnings |
| Typecheck | `npx tsc -b` | ✅ exit 0 |
| Unit | `npx vitest run` | ✅ 36 passed / 10 files (~1.0s) |
| Web build | `npm run build:web` | ✅ built ~1.0s; main 530 kB / 152 kB gz |

Native builds: not run this session — see RISK_LOG R2. Screen/E2E coverage: none yet — see RISK_LOG R6.

## 2026-07-13 — Phase 1 timer engine

| Scope | Command | Result |
|---|---|---|
| Timer engine unit | `npx vitest run src/services/timer-engine.test.ts` | ✅ 15 passed |
| Full suite | `npx vitest run` | ✅ 51 passed / 11 files |

## 2026-07-13 — Phase 2 login stability (§7)

Browser reproduction via chrome-devtools MCP against `vite dev` (login is the unauthenticated entry screen, no auth bypass needed):

| Viewport | Before | After |
|---|---|---|
| 430×932 (Pro Max, full) | form fits, Sign In at bottom edge | unchanged (media queries gate ≤680px) |
| 430×440 (keyboard-open sim) | hero held 44% (~193px); form pushed below fold | hero collapses to compact strip; form brought into reach ✅ |

Gates after fix: `npm run build:web` ✅ · `npx vitest run` ✅ 51/51 · `npm run lint` ✅.
On-device keyboard verification still pending (no `@capacitor/keyboard`) — RISK_LOG R2/R9.

## 2026-07-13 — Phase 3 Stopwatch rebuild

| Scope | Command / method | Result |
|---|---|---|
| Timer logic | vitest (engine 17, controller 10, entitlements 3, presets 4, format 4) | ✅ |
| Stopwatch screen | `vitest run src/screens/StopwatchScreen.test.tsx` | ✅ 3 passed (opens Prepare/Round 1-of-5; start→pause/resume transport; both faces render) |
| Full suite | `npx vitest run` | ✅ 76 passed / 16 files |
| Build + lint | `npm run build:web`, `npm run lint` | ✅ |
| Visual (chrome-devtools, `?preview=stopwatch`, 430×932) | Chronometer + Digital | ✅ prep→work transition fired; progress arc + total bar render; time math exact (WORK 2:37, ELAPSED 0:33 + REMAINING 18:37 = 19:10 total) |

Verified end-to-end engine→controller→hook→UI in a real browser via the new DEV
preview harness (`?preview=stopwatch`). Audio/haptic cue code paths ran without
error; on-device sound/haptic confirmation still pending (RISK_LOG R2).

## 2026-07-13 — Phase 4 Breathwork rebuild

| Scope | Command / method | Result |
|---|---|---|
| Breath logic | vitest (breath-engine 10, breath-controller 8) | ✅ expansion top/bottom holds, transitions, skip/end/restart, auto-complete |
| Breath screen | `vitest run src/screens/BreathScreen.test.tsx` | ✅ 3 passed (foundation gate for first-time beginner; skip once acknowledged; setup→running session) |
| Full suite | `npx vitest run` | ✅ 97 passed / 19 files |
| Build + lint | `npm run build:web`, `npm run lint` | ✅ |
| Visual (chrome-devtools, `?preview=breath`, 430×932) | Setup + guided session | ✅ level/protocol/duration chips; orb phase-accurate (EXHALE teal tone, contracting halo, "4" countdown), instruction, Cycle 1/11 (3min÷16s), Skip/Pause/End |

Breathing orb follows the real phase via engine `expansion` (0..1); reduced-motion
holds the orb still and relies on the phase label + countdown. Foundation safety
content is non-diagnostic. On-device audio/haptic still pending (RISK_LOG R2).

## 2026-07-13 — Phase 5 Dashboard IA overhaul

| Scope | Command / method | Result |
|---|---|---|
| Streak | `vitest run src/services/streak.test.ts` | ✅ 6 passed (consecutive days, live-if-yesterday, gaps, multi-session/day) |
| Dashboard screen | `vitest run src/screens/DashboardScreen.test.tsx` | ✅ 4 passed (greeting/clock/readiness/actions; synced-vs-profile tags; steps-not-connected; empty previous-session) |
| Full suite | `npx vitest run` | ✅ 107 passed / 21 files |
| Build + lint | `npm run build:web`, `npm run lint` | ✅ |
| Visual (chrome-devtools, `?preview=dashboard`, 430×932) | 2 pages | ✅ live clock/date, weather, readiness ring (78), 2-day streak, session quick-access (Stopwatch+Breathwork); page 2: SYNCED vs PROFILE tags, health-sync, previous session, quote |

New: live clock/date + streak (previously absent). Honest data states (steps null →
"Not connected"; HR 0 → "—"); synced vs manual visually distinguished; no
manufactured values.
