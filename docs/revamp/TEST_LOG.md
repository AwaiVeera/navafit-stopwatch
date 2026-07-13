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
