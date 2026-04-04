# Production verification

## Definition of done

A change is production-ready when **all** of these pass:

1. **`npm run verify:production`** exits 0 (runs lint, tests, and production build in sequence).
2. **`npm run cap:sync`** completes after any web source change (syncs `dist/` into `ios/App/App/public/`).
3. **Xcode archive** (or simulator `xcodebuild`) succeeds when claiming iOS readiness.
4. No **service_role** keys, `.env` secrets, or absolute local paths committed.

## How to run

```bash
cd navafit-stopwatch
npm run verify:production
```

If the command exits with a non-zero code, fix the reported errors before proceeding.

## CI

GitHub Actions runs the same gate on every push and pull request to `main`. See [`.github/workflows/verify.yml`](../.github/workflows/verify.yml).

## What the gate covers

| Step | What it checks |
|------|---------------|
| `npm run lint` | ESLint + React Compiler rules; no unused imports, hook violations, or type errors surfaced by eslint-typescript. |
| `npm test` | Vitest unit tests for presets, telemetry, app-flow, data helpers, and stopwatch math. |
| `npm run build` | TypeScript type-check (`tsc -b`) and Vite production bundle. Catches any remaining type or import errors. |

## Invariants enforced by rules

See [`.cursor/rules/production-invariants.mdc`](../.cursor/rules/production-invariants.mdc) for the list of features and visual behaviors that must never be removed or weakened without an equivalent or better replacement.
