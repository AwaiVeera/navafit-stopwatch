# AGENTS.md - NavaFit Orchestrator Setup

This file defines how multi-agent work should run for this project.

## 1) Team Topology

1. **Lead Orchestrator**
   - Owns planning, scope, sequencing, and final merge decisions.
2. **UI Agent**
   - Owns `src/screens/**`, visual tokens, and interaction polish.
3. **Timer Logic Agent**
   - Owns stopwatch timing correctness and lap/session behavior.
4. **iOS Build Agent**
   - Owns `ios/**`, `capacitor.config.ts`, and simulator build checks.
5. **Release Readiness Agent**
   - Owns docs/checklists for App Store + Play Store data (`TBD` where unknown).

## 2) Assignment Rule

- Never assign the same file to two agents in parallel.
- Split work into independent slices with clear file ownership.
- If file overlap is unavoidable, sequence work instead of parallelizing.

## 3) Standard Workflow

1. Lead defines tasks and acceptance criteria.
2. Agents run in parallel on non-overlapping files.
3. Each agent returns:
   - files changed
   - verification commands run
   - unresolved `TBD` values
4. Lead runs final verification:
   - `npm run verify:production`
   - `npm run cap:sync`
   - Capacitor CLI run: `npm run ios:run` and `npm run android:run` (Xcode/`xcodebuild` only for archive + signing)

## 4) Communication Contract

- No assumptions.
- Use simple, direct language.
- Unknown values must be labeled `TBD`.
- Include evidence before claiming completion.

## 5) Prompt Skeleton For Agent Tasks

Use this structure:

1. Goal
2. File ownership
3. Constraints
4. Acceptance criteria
5. Verification commands

Example:

```text
Goal: Improve StopwatchScreen lap UX.
Files: src/screens/StopwatchScreen.tsx only.
Constraints: No assumptions. Keep fallback-safe behavior.
Acceptance: Lap add/reset behavior stays correct and readable.
Verify: npm run build
```
