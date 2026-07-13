# Decision Log

Append-only. Each entry: date · decision · rationale · evidence/owner.

## 2026-07-13 — Phase 0

- **Work in existing worktree `worktree-login-onboarding-rebuild`.** It already holds the approved Dawn Quartz login and the AY fix, both in scope. Checkpoint tag `revamp-baseline-2026-07-13`.
- **Preserve login visual identity (§7).** Only fix responsiveness defects; no restyle. The `.dq-*` design is owner-approved.
- **Keep the lazy-Firebase code split.** Static-importing Firebase doubled the main bundle previously; selectors dynamic-import. Non-negotiable.
- **Facebook stays gated off** (`VITE_ENABLE_FACEBOOK`) until provisioned end-to-end.
- **iOS build 29** (28 confirmed on TestFlight/Complete).

## Pending (awaiting owner) — shape Phase 1

1. **Purchases.** *Proposed:* build the entitlement seam (one `hasProUnlock` gate reused by Stopwatch + Breathwork), keep Intermediate/Advanced accessible, defer real StoreKit/Play Billing (needs paid-service auth + store config = §17 stop). *Awaiting confirm.*
2. **Backend.** *Proposed:* Supabase for the whole revamp; Firebase dormant. Matches prior test-build decision. *Awaiting confirm.*
3. **Infra depth.** *Proposed:* pragmatic — dispatch role-scoped subagents per task, add hooks only where they catch real regressions; skip ceremonial skill/agent files. *Awaiting confirm.*
4. **Cadence.** *Proposed:* autonomous through phases, surface blockers as they arise. *Awaiting confirm.*
