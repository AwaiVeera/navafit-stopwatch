# NavaFit Logo Hardening Task Manager

## Status
- [x] Create task manager and capture evidence notes
- [x] Replace canonical logo asset with attached image
- [x] Polish login logo sizing, scaling, and rendering
- [x] Fix layering and overlaps across screens
- [x] Ensure CTAs work and add placeholders where needed
- [x] Perform conservative cleanup of high-confidence clutter
- [x] Verify build, Capacitor sync, and Xcode readiness

## Evidence Log
- Task manager created at `navafit-stopwatch/NAVAFIT_LOGO_HARDENING_TASK_MANAGER.md`.
- Canonical logo source replaced at `public/Font.png` using the attached logo, then normalized into a true PNG after inspection showed the attachment carried JPEG data under a `.png` filename.
- Login hero refactored in `src/screens/LoginScreen.tsx` and `src/index.css` to use a dedicated black logo panel with contain-based sizing, explicit fallback handling, and no blur or low-opacity rendering.
- Layering hardening applied in `src/index.css` by adding explicit z-index rules for hero overlays, chips, dots, and the tab bar; login hero absolute overlap was removed by shifting the layout into normal flow.
- CTA hardening completed:
  - Login Apple/Google buttons now show prototype placeholder feedback.
  - Dashboard top chrome buttons now jump to AI Guidance and Recent Sessions.
  - Dashboard week/month/year range buttons are now interactive.
  - Stopwatch top chrome button now jumps to Lap Memory.
  - Breath top chrome button now restarts the breath cycle.
  - Biometrics top chrome button now jumps to Recovery Guidance.
  - Biometrics handshake button state now resets correctly after reaching `Ready`.
- Conservative cleanup completed:
  - `index.html` favicon switched from the default `vite.svg` to `Font.png`.
  - Default Vite favicon asset `public/vite.svg` was removed.
  - Rebuild confirmed `dist/` and `ios/App/App/public/` no longer include `vite.svg`.
- Verification completed:
  - `npm run build` succeeded.
  - `npm run cap:sync` succeeded.
  - `xcodebuild -project ios/App/App.xcodeproj -scheme App -destination "generic/platform=iOS Simulator" build` succeeded twice after the UI and cleanup passes.
  - Simulator runtime smoke check succeeded:
    - Booted `iPhone 17 Pro`
    - Installed the built app bundle
    - Launched `com.navafit.alignment`
  - Logo propagation verified at:
    - `public/Font.png`
    - `dist/Font.png`
    - `ios/App/App/public/Font.png`
