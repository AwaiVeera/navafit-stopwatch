# Unresolved-Risk Log

Each risk: id · description · severity · owner · next action. Severity: 🔴 high · 🟠 med · 🟡 low.

| ID | Risk | Sev | Owner | Next action |
|---|---|---|---|---|
| R1 | Paged-screen overlap/cut-off on iPhone 17 Pro Max not yet reproduced precisely | 🟠 | UX | Get device screenshot or in-browser Pro Max repro before editing shared pager CSS (Phase 2/5) |
| R2 | Native iOS/Android builds not re-run this session (using prior-session evidence) | 🟠 | QA | Re-verify both production builds in Phase 8 |
| R3 | No StoreKit/Play Billing — Intermediate/Advanced gating has no purchase backend | 🔴 | SEC | Blocked on owner fork #1 + paid-service auth; build entitlement seam meanwhile |
| R4 | No performance baseline (startup, fps, drift, memory) captured with traces | 🟠 | PERF | Measure in Phase 7 → PERFORMANCE_REPORT.md |
| R5 | Account deletion must be verified end-to-end in dev/staging (not production) | 🔴 | SEC | Exercise deletion path against dev backend in Phase 6; never touch production data |
| R6 | Zero screen/E2E tests today — regression risk during large rebuilds | 🟠 | QA | Stand up screen-test + viewport-regression harness in Phase 1 before rebuilds |
| R7 | Biometrics screen shows synthetic HRV/sleep as if measured | 🟠 | SEC | Relabel as estimates or remove in Phase 5; never manufacture health values |
| R8 | `@capacitor/core@8.3.4` vs `@capacitor/ios@8.2.0` minor drift | 🟡 | ARCH | Align versions during Phase 7 dependency audit |
| R9 | Login keyboard behaviour not verified on-device; no `@capacitor/keyboard` plugin | 🟠 | UX | CSS now collapses hero + sheet scroll fallback (verified in-browser). If device shows a hidden field, add `@capacitor/keyboard` with `resize:'body'` and re-test |
| R10 | Auth-config message renders broken grammar ("Add VITE_SUPABASE_URL is missing. … to .env.local") | 🟡 | ARCH | Dev-only (only when unconfigured; test build has env). Fix message composition in a polish pass |
