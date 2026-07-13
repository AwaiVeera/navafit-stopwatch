# Decision Log

Append-only. Each entry: date · decision · rationale · evidence/owner.

## 2026-07-13 — Phase 0

- **Work in existing worktree `worktree-login-onboarding-rebuild`.** It already holds the approved Dawn Quartz login and the AY fix, both in scope. Checkpoint tag `revamp-baseline-2026-07-13`.
- **Preserve login visual identity (§7).** Only fix responsiveness defects; no restyle. The `.dq-*` design is owner-approved.
- **Keep the lazy-Firebase code split.** Static-importing Firebase doubled the main bundle previously; selectors dynamic-import. Non-negotiable.
- **Facebook stays gated off** (`VITE_ENABLE_FACEBOOK`) until provisioned end-to-end.
- **iOS build 29** (28 confirmed on TestFlight/Complete).

## 2026-07-13 — Forks confirmed by owner

1. **Purchases → entitlement seam, defer IAP.** Build one reusable `hasProUnlock` gate wired into Stopwatch + Breathwork; keep Intermediate/Advanced accessible. Real StoreKit/Play Billing deferred (needs paid-service auth + store config = §17 stop).
2. **Backend → Supabase, Firebase dormant.** Continue on live Supabase for the whole revamp; keep Firebase lazy/off.
3. **Infra → build the full files.** Create the 5 subagent definitions (`.claude/agents/`), 5 project skills (`.claude/skills/`), and enforcement hooks (`.claude/hooks/` + `settings.json`) as real repo files.
4. **Cadence → autonomous.** Run Phase 1→8 continuously, commit per phase, stop only for §17 blockers.
