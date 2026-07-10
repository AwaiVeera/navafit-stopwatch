# NavaFit Alignment

React 19 + TypeScript + Tailwind v4 + Capacitor 8 app for iOS and Android (live on the App Store; Android launch in progress).

## What This App Includes

Screens (`src/screens/`): `LoginScreen`, `OnboardingScreen`, `ConsentScreen`, `DashboardScreen`, `PreSessionScreen`, `StopwatchScreen`, `BreathScreen`, `BiometricsScreen`, `AYScreen` (AI chat assistant), `SettingsScreen`. Navigation is a single `useState<ViewId>` switch in `src/App.tsx` with a 5-tab bottom nav.

- Email/Apple/Google auth, onboarding, and legal consent flow.
- Stopwatch: manual timer plus an auto-lap/interval training mode with level unlocks.
- Breathwork: guided/manual novice sessions plus round-based intermediate/advanced protocols.
- Apple Health / Android Health Connect sync (steps, heart rate, sleep, workouts) via `@capgo/capacitor-health`.
- Weather via Open-Meteo, AI-derived recovery/session recommendations via a local deterministic engine.
- Backend: **Supabase is currently live** (`src/services/auth.ts`, `data.ts`). A parallel Firebase implementation (`src/services/firebase-auth.ts`, `firestore-data.ts`, `functions/`) is built and staged behind the `VITE_AUTH_BACKEND` flag but not yet cut over — see `docs/FIREBASE_MIGRATION_RUNBOOK.md`.

## Run Web Dev Server

```bash
npm install
npm run dev
```

## Build Web Assets

```bash
npm run build
```

## Run on Device/Simulator (Capacitor CLI first)

```bash
# iOS (build web, sync, launch on simulator/device)
npm run ios:run

# Android
npm run android:run
```

Open the native IDE only when you need to (signing, archive):

```bash
npm run cap:sync
npm run ios:open      # or: npm run android:open
```

## Important Blocker

You must accept Xcode license before Xcode builds:

```bash
sudo xcodebuild -license
sudo xcodebuild -runFirstLaunch
```

## Asset Note

Browser + iOS Home Screen icons live in `public/`:

1. `public/favicon.png` (1024×1024 source, referenced by `index.html`)
2. `public/favicon-32.png` (32×32 for browser tab)
3. `public/apple-touch-icon.png` (180×180 for iOS Home Screen)

To auto-copy the 1024×1024 source from the desktop `Assets` folder if available:

```bash
npm run asset:font:sync
```

## Optional Homebrew Pathway

Homebrew is optional for this current prototype.
If you still want a guided optional setup:

```bash
npm run setup:optional:brew
```

More details:

`docs/optional-homebrew-pathway.md`

## Agent Orchestration Setup

Project-level optimization is now configured with:

1. `AGENTS.md` (team topology + orchestrator workflow)
2. `.cursor/rules/*.mdc` (persistent project rules)
3. `docs/agent-orchestrator-playbook.md` (execution playbook)
4. `docs/agent-prompt-templates.md` (reusable task prompts)
