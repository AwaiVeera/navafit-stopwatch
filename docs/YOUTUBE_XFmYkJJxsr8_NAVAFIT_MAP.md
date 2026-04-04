# Video map: “Build Your First App with Claude Code” → NavaFit

**Link:** [https://youtu.be/XFmYkJJxsr8](https://youtu.be/XFmYkJJxsr8)  
**Title (from YouTube metadata):** *Build Your First App with Claude Code (No Experience Needed)*  
**Channel:** Code with Beto ([@codewithbeto](https://www.youtube.com/@codewithbeto))

This doc maps **typical steps in a “first app with AI coding assistant” tutorial** to **this repository**, so you can follow the video and know where NavaFit already differs or matches.

> If a chapter in the video does not match below, add a timestamp in this file and we align the next task to it.

## Likely video beats → NavaFit equivalent

| Tutorial idea | In NavaFit |
|---------------|------------|
| Install a coding assistant / CLI | You use **Cursor** on Mac; optional **Claude Code** CLI is separate from this repo. Same *idea*: AI edits files in a project folder. |
| Create or open a project folder | Your app root: `navafit-stopwatch/` (web + Capacitor + `ios/App`). |
| Run the app locally | `npm install` then `npm run dev` (web). For iOS shell: `npm run build`, `npm run cap:sync`, open `ios/App/App.xcodeproj` in Xcode, Run ▶. |
| Connect a database / backend | **Supabase**: SQL in `SUPABASE_PHASE1_FOUNDATION.sql`; env keys for anon client (see project env docs—do not commit secrets). |
| Auth | Implemented against Supabase Auth in app code; enable providers in Supabase Dashboard. |
| Ship to phone | **TestFlight** path: [TESTFLIGHT_UPLOAD_HANDOFF.md](TESTFLIGHT_UPLOAD_HANDOFF.md). |
| Store listing | [APP_STORE_CONNECT_SUBMISSION_CHECKLIST.md](APP_STORE_CONNECT_SUBMISSION_CHECKLIST.md). |

## Cursor vs “Claude Code” in the video

- **Claude Code** (if shown): terminal-oriented agent tied to Anthropic’s CLI workflow.
- **Cursor**: IDE with Chat / Composer; pick **model** in Cursor settings; use **Rules** under `.cursor/rules/` for NavaFit conventions.

You do **not** need both for NavaFit; use whichever you prefer. The video is still useful for **mindset** (iterate, test on device, fix errors the tool prints).

## Concrete files to name when prompting AI

- Onboarding UI: `src/screens/OnboardingScreen.tsx`
- App shell / tabs: `src/App.tsx`
- Flow gating: `src/services/app-flow.ts`
- Persistence: `src/services/data.ts`
- Breath tab: `src/screens/BreathScreen.tsx`
- iOS project: `ios/App/App.xcodeproj`

## Next step if you want timestamp-level mapping

Paste bullet lines like: `12:34 — creates Supabase project` and we will append a **Timestamp** column to the table above.
