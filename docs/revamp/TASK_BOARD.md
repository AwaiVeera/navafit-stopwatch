# Revamp Task Board (shared)

Single source of truth for phase status. The main session is Scrum Master; role columns map to the mandate's five leads. Status: ⬜ todo · 🟨 in progress · ✅ done · ⛔ blocked.

**Roles:** ARCH = architecture-lead · UX = experience-lead · PERF = performance-lead · SEC = compliance-lead · QA = release-lead

## Phases

| Phase | Scope | Lead(s) | Status |
|---|---|---|---|
| 0 · Safety & Baseline | checkpoint, audit, gates, board | QA/ARCH | ✅ |
| 1 · Foundations | design system, timer engine, shared state, service boundaries, test infra | ARCH/UX/PERF | 🟨 |
| 1a · Team infra (agents/skills/hooks) | 5 agents, 5 skills, 3 enforcement hooks, tools record | Scrum Master | ✅ |
| 2 · Login stability | preserve design, fix scale/scroll defect, device regression tests | UX/QA | 🟨 |
| 3 · Stopwatch | chronometer + digital swipe, one timer engine, audio/haptics, presets, logging | UX/PERF | ⬜ |
| 4 · Breathwork | foundation tutorial, guided sessions, levels, animation, safety | UX/SEC | ⬜ |
| 5 · Dashboard | profile/health/weather/location/history/recommendation, empty+denied states | UX/ARCH | ⬜ |
| 6 · Settings | account/deletion/logout, sync, experience, contact cards, privacy, subscription controls | SEC/UX | ⬜ |
| 7 · Production hardening | security, performance, accessibility, offline, error boundaries, dep audit | SEC/PERF | ⬜ |
| 8 · Release verification | iOS + Android production builds, checklists, store assets/review notes | QA/SEC | ⬜ |

## Open decision forks (block Phase 1 shape — see DECISION_LOG)

1. Purchases: build IAP now vs. entitlement seam + defer. *(proposed: seam + defer)*
2. Backend: Supabase for revamp vs. Firebase cutover. *(proposed: Supabase)*
3. Infra: create agent/skill/hook files vs. pragmatic role-scoped agents. *(proposed: pragmatic)*
4. Cadence: autonomous vs. per-phase checkpoint. *(proposed: autonomous)*

## File-ownership guard (prevent simultaneous edits)

One phase active at a time this session; within a phase, dispatched agents get disjoint file sets. `src/index.css` and `src/App.tsx` are high-contention — serialize edits to them.
