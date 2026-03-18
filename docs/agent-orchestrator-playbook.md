# Agent Orchestrator Playbook

Use this playbook when coordinating multi-agent work.

## 1) When to Use Parallel Agents

Use parallel agents only when:
1. Work can be split by different files.
2. Tasks can run independently.
3. Output can be verified separately.

Use single-agent flow when:
1. Changes are tiny.
2. Work touches the same file heavily.
3. Task order is strictly sequential.

## 2) Recommended Agent Split

1. UI Agent
   - `src/screens/**`, `src/index.css`
2. Logic Agent
   - `src/**` timing/data models and helpers
3. iOS Agent
   - `ios/**`, `capacitor.config.ts`, build commands
4. Release Agent
   - `docs/**`, launch checklist, `TBD` tracking

## 3) Orchestrator Sequence

1. Define exact scope and do-not-touch files.
2. Dispatch agents with explicit file ownership.
3. Collect outputs and verify claims with commands.
4. Merge only after all checks pass.
5. Record unresolved business values as `TBD`.

## 4) Verification Gate (Required)

Before any "done" status:

```bash
npm run build
npm run cap:sync
xcodebuild -project ios/App/App.xcodeproj -scheme App -destination "generic/platform=iOS Simulator" build
```

## 5) Risk Controls

1. If requirement is unclear, pause and ask.
2. If an agent reports unknowns, preserve as `TBD`.
3. Avoid cross-agent edits in same file.
4. Prefer reversible changes over broad rewrites.
