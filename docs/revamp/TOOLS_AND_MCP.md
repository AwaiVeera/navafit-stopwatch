# Tools, Agents, Skills & Hooks — Activation Record

Per mandate §5/§6. Records what was activated, why, permissions, and removal.

## Decision: use existing tooling, add no unvetted MCP servers

The stack is detected (React 19 / Vite / Capacitor 8 / Supabase). No new MCP package was installed merely for name-relevance. The environment already exposes vetted integrations used as needed:

| Category | Integration | Use |
|---|---|---|
| Docs research | WebFetch / WebSearch | Verify Apple/Google/provider requirements at implementation time (compliance-lead) |
| GitHub | `github` MCP + `gh` CLI | PR #1, branches, CI/release tracking. Secrets never exposed. |
| Browser / E2E | `chrome-devtools` MCP, Playwright-class if added later | Responsive web-surface repro, viewport regression, screenshots |
| Backend | Supabase (dev/staging only) | Never destructive production ops; `VITE_AUTH_BACKEND=supabase` |
| Build | Xcode 26.6 (iOS SPM archive), Gradle + JDK 17–21 (Android AAB) | Release verification (Phase 8) |

## Subagent team (`.claude/agents/*.md`)

Five role-scoped agents with restricted tools, mapping to the mandate's leads:
`navafit-architecture-lead` (opus), `navafit-experience-lead`, `navafit-performance-lead`, `navafit-compliance-lead` (+WebFetch), `navafit-release-lead`. The main session is Scrum Master: delegates by domain, serializes edits to high-contention files, requires evidence before "done".

## Project skills (`.claude/skills/navafit-*/SKILL.md`)

`navafit-mobile-architecture`, `navafit-premium-ui`, `navafit-training-engine`, `navafit-release-compliance`, `navafit-production-qa`. Each defines entry criteria, procedures, quality gates, and completion evidence.

## Enforcement hooks (`.claude/hooks/` + `.claude/settings.json`)

Deterministic, fail-open on internal error, block only on positive violation:

| Hook | Event | Behaviour |
|---|---|---|
| `pre-edit.sh` | PreToolUse Edit/Write/MultiEdit | Blocks writes outside project root and to secret files (`.env`, `*.p8/p12/pem/keystore/jks/mobileprovision`, `keystore.properties`); `.env.example` allowed |
| `pre-commit-guard.sh` | PreToolUse Bash | On `git commit` only: blocks staged secret files, private-key/secret material in the diff, and leftover `.only(` test focus |
| `post-edit.sh` | PostToolUse Edit/Write/MultiEdit | Advisory (never blocks): lints the changed `src/**` file |

Tested 2026-07-13: in-project edit ✅ pass; `/etc/hosts` ✅ blocked; `.env` ✅ blocked; `.env.example` ✅ pass; clean commit ✅ pass; planted `.pem` ✅ blocked.

**Note:** hooks load at session start, so they enforce from the *next* session onward; this session self-enforced via the same scripts run manually.

## Permissions granted / data accessed

Repo files, git, npm/npx, Supabase dev/staging, GitHub repo. No production data, no credentials handled by the agent (owner-only per hooks). Local per-machine permissions live in the git-ignored `.claude/settings.local.json`.

## Removal instructions

- Disable hooks: delete `.claude/settings.json` (or its `hooks` block) and `.claude/hooks/`.
- Remove team/skills: delete `.claude/agents/` and `.claude/skills/`.
- None of these touch application code; removing them reverts to stock Claude Code behaviour.
