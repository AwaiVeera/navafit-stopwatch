---
name: navafit-mobile-architecture
description: Use when restructuring navigation, state, data-service boundaries, typed models, or integration seams (auth/health/weather/location/entitlement) in the NavaFit Capacitor app, or when planning a backwards-compatible migration with a rollback path.
---

# NavaFit Mobile Architecture & Safe Refactoring

## Entry criteria
- The change touches navigation, shared state, service boundaries, typed models, env handling, or an integration seam.
- You have read the affected files and can cite `path:line` for the current behaviour.

## Procedures
1. **Map before moving.** List the modules involved and their current interfaces. Confirm nothing else depends on a shape you're about to change (grep for imports/usages).
2. **Preserve behaviour.** For a live path (Supabase auth/data), the refactor must be behaviourally identical for existing users. Trace the import graph to prove Firebase stays lazy/dormant.
3. **Design the seam.** New capabilities (e.g., `hasProUnlock`) go behind one typed interface consumed by screens — no duplicated gating logic.
4. **Migrate backwards-compatibly.** Keep the old path working behind a flag until the new path is proven; document the rollback (flag flip / revert commit).
5. **Keep files focused.** Split by responsibility; prefer small modules with clear interfaces.

## Quality gates
- `tsc -b` exit 0, `npm run lint` clean, `npx vitest run` green.
- Bundle check: main chunk not inflated by a newly static-imported heavy dep (Firebase stays in its own lazy chunk).
- No production data/auth touched.

## Completion evidence
Cited diff, passing gate output, a DECISION_LOG entry for the architecture choice, and a named rollback path.
