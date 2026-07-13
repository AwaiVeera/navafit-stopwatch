---
name: navafit-production-qa
description: Use for NavaFit testing, performance profiling, and release engineering — writing unit/integration/screen/viewport/accessibility tests, running lint/typecheck/builds as gates, capturing performance measurements, and preparing release builds/checklists/rollback.
---

# NavaFit Testing, Performance & Release Engineering

## Entry criteria
- The task adds/changes behaviour that needs test coverage, or is a phase gate / release step.

## Procedures
1. **Test stack.** Vitest + React Testing Library on jsdom. **No jest-dom** — assert with plain DOM (`.disabled`, `.toBeTruthy()`, `.toBeNull()`, `queryBy…`). jsdom lacks `matchMedia`; the stub in `src/test-setup.ts` returns `matches:false` — override locally when a test needs reduced-motion.
2. **Coverage targets.** Follow the mandate matrix: Login (sizes/keyboard/scaling/no-scroll/errors), Stopwatch (duration/pause/resume/transitions/background/interruption/completion/entitlement), Breathwork (phase timing/animation sync/reduced-motion/gating/safety), Dashboard (granted/denied/partial/stale/none/offline states), Settings (every toggle/persistence/platform visibility/logout/deletion/links/restore).
3. **Gates (deterministic).** `npm run lint`, `npx tsc -b`, `npx vitest run`, `npm run build:web` — all green before a phase commit. Record each run in `docs/revamp/TEST_LOG.md`.
4. **Performance.** Measure with a named tool + device/simulator + build type + methodology; write to `docs/revamp/PERFORMANCE_REPORT.md`. Never invent numbers.
5. **Release builds.** iOS archive from `App.xcodeproj` (SPM, no `.xcworkspace`); Android AAB via Gradle (JDK 17–21, `ANDROID_HOME`, `minSdk 26`). Re-verify both in Phase 8.

## Quality gates
- Gate suite green with captured output; new behaviour has tests; no `.only` left; no undocumented skipped test.

## Completion evidence
The exact command(s) run and their output, a TEST_LOG entry, and — for external blockers (device matrix, signing, store console) — an owner + next action, not a silent pass.
