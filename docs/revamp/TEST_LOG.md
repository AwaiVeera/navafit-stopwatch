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
