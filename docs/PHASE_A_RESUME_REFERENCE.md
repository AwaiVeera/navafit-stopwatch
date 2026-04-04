# Phase A resume reference (rules, tooling, landscape, launch)

Canonical in-repo copy of the Phase A brief for onboarding and review. **Do not treat store metadata here as final**—use App Store Connect and your legal counsel for shipping text.

## 1. Rules to follow strictly

### From project owner (working agreement)

- Follow **all** user, tool, system, and skill instructions **completely**; do not skip constraints embedded in tool or skill descriptions.
- **Real environment:** run commands and investigate; do not only tell the owner what to run; do not give up after one failure.
- Use **authoritative dates** from context when time matters.
- **Communication:** Prefer markdown links for URLs; use proper **code citations** when pointing at repo code; clear prose proportional to task complexity.
- **Code changes:** Only what the task needs; match existing style; no drive-by refactors; prefer elegant unified paths.
- **Do not assume prior knowledge:** Explain UI steps in detail; mark **TBD** rather than guessing.

### From `.cursor/rules` (summary)

- **Evidence before claims:** Run verification (lint, tests, build, iOS steps where relevant) before saying something is done.
- **Baby-proof steps:** Exact paths, reversible changes, pause if unrelated diffs appear.
- **Capacitor/Xcode:** After web changes, `npm run cap:sync`; bundle ID changes are high-risk.
- **Release metadata:** No invented App Store/legal text; use checklists or TBD.
- **Timers/UI:** Deterministic logic; respect reduced motion where applicable.

Full rule files live under [.cursor/rules](../.cursor/rules).

## 2. Claude / Cursor — what to do

In **Cursor**, the assistant uses whichever **model** you select in Cursor settings. Surfaces: **Chat**, **Composer**, inline edit. There is no extra “trigger” beyond sending a message.

**Optimization**

- Pick model for task depth; switch if answers are shallow.
- Keep `.cursor/rules` accurate for NavaFit.
- Optional **MCP** (GitHub, Supabase, etc.): Cursor **Settings → MCP**.
- Stable instructions → **Rules**; one-off detail → **chat message**.

**Claude Code** (CLI) vs Cursor: different products; both can edit a repo. NavaFit is developed here with Cursor + Xcode; see [YOUTUBE_XFmYkJJxsr8_NAVAFIT_MAP.md](YOUTUBE_XFmYkJJxsr8_NAVAFIT_MAP.md) for the video that focuses on Claude Code.

## 3. Fitness app landscape and backend vocabulary

### Versatile apps (indicative examples)

Recent roundups and store listings emphasize **cross-device** use, **structured programs**, **tracking**, and **AI-assisted** coaching. Treat marketing claims on the official store page as source of truth.

- Overview-style list: [Digital Trends – best fitness apps (2026)](https://www.digitaltrends.com/best-of/best-fitness-apps-in-2026-top-apps-to-stay-fit-track-workouts-and-reach-your-goals/)
- Examples (App Store / web): [Saga](https://apps.apple.com/us/app/saga-ai-personal-trainer/id6446805715), [Physiq AI](https://apps.apple.com/us/app/physiq-ai-fitness-coach/id6759069199), [SmartGym](http://smartgymapp.com/)

### AI capabilities you may not build on day one

| Area | What it is | Why teams add it |
|------|------------|------------------|
| Adaptive programming | Adjusts load/rest from history | Progression without static plans |
| Natural-language coach | Chat/voice explaining “why today” | Habit and support |
| Computer-vision form | Pose estimation from camera | Differentiator; privacy cost |
| Recovery fusion | Sleep/HRV/readiness → intensity | Safety + “smart” feel |
| Nutrition | Photo meal logs, macros | Broader audience; sensitive data |

NavaFit can stay strong on **alignment, breath, intervals** and add AI later for **summaries, voice cues, presets** without medical claims.

### API, backend, admin, cloud (plain language)

- **API:** How the app talks to servers over HTTPS (save/load data). **Supabase** exposes an API from Postgres tables.
- **Backend:** Logic and secrets off the phone (auth checks, jobs). Supabase Auth + Edge Functions or a custom server.
- **Database:** Durable storage (`workout_sessions`, `profiles`, etc.). See `SUPABASE_PHASE1_FOUNDATION.sql`.
- **Admin:** Support tools (Supabase Dashboard, internal apps). Never use **service_role** in the mobile app.
- **Cloud:** Hosted Postgres and auth at Supabase (or AWS/GCP equivalents).

**Safe launch habits:** separate dev/prod projects or schemas; **RLS** on user tables; **anon** key in app only; test offline and permission-denied paths.

### Onboarding and cloud today

Decision documented in [ONBOARDING_CLOUD_DECISION.md](ONBOARDING_CLOUD_DECISION.md). Optional JSON column: `SUPABASE_ONBOARDING_PROFILE_OPTIONAL.sql`.

## 4. Outside Cursor — setup index

See [EXTERNAL_SETUP_OUTSIDE_CURSOR.md](EXTERNAL_SETUP_OUTSIDE_CURSOR.md) for checkboxes (Apple Developer, App Store Connect, TestFlight, Supabase, Play Console, legal URLs).

Supporting detail:

- [TESTFLIGHT_UPLOAD_HANDOFF.md](TESTFLIGHT_UPLOAD_HANDOFF.md)
- [APP_STORE_CONNECT_SUBMISSION_CHECKLIST.md](APP_STORE_CONNECT_SUBMISSION_CHECKLIST.md)

## 5. Xcode UI references (no jargon assumptions)

1. **USB** iPhone to Mac; unlock; tap **Trust** if prompted; enter passcode.
2. **Xcode** menu **Window → Devices and Simulators** — device should list without red errors.
3. **Signing:** Target **App** → **Signing & Capabilities** → **Automatically manage signing** → pick **Team**.
4. **Run destination:** Toolbar dropdown next to scheme — pick **your iPhone** (not “Any iOS Device” for local run).
5. **Run:** Triangle **▶** (top-left). **Stop:** square **■**.

**Maps “compass” / north icon:** Often recenters the map to north or your heading; exact icon varies by app—use a screenshot if unsure.

**App Store Connect:** [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps** → app → **TestFlight** / **App Store** tabs.

## 6. YouTube helper video

[Build Your First App with Claude Code](https://youtu.be/XFmYkJJxsr8) — mapped to this repo in [YOUTUBE_XFmYkJJxsr8_NAVAFIT_MAP.md](YOUTUBE_XFmYkJJxsr8_NAVAFIT_MAP.md). Add timestamps there as you watch.
