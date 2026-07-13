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
