# NavaFit Alignment - Stopwatch Prototype

React + TypeScript + Tailwind + Capacitor iOS prototype.

## What This Prototype Includes

1. `App` view router with 4 main screens.
2. `LoginScreen` with tactical style, Rise button, and SSO placeholders.
3. `DashboardScreen` with health cards, progress tracker, and logs.
4. `StopwatchScreen` with:
   - precision centisecond timer
   - lap memory list
   - 4-2-4 breath sync tile
5. `BiometricsScreen` with:
   - Bluetooth handshake simulation
   - recovery metrics panel
   - hydration alert placeholder
6. Capacitor iOS project scaffold at `ios/`.

## Run Web Prototype

```bash
export PATH="$HOME/.local/bin:$PATH"
cd ~/Desktop/navafit-stopwatch
npm install
npm run dev
```

## Build Web Assets

```bash
npm run build
```

## Sync and Open iOS Project

```bash
npm run cap:sync
npx cap open ios
```

## Important Blocker

You must accept Xcode license before Xcode builds:

```bash
sudo xcodebuild -license
sudo xcodebuild -runFirstLaunch
```

## Asset Note

`Font.png` is requested in design notes.
Login hero now uses fallback order:

1. `public/Font.png`
2. `public/font.png`
3. `public/Assets/Font.png`
4. `public/assets/Font.png`
5. built-in `public/font-fallback.svg`

To auto-copy from the desktop `Assets` folder if available:

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
