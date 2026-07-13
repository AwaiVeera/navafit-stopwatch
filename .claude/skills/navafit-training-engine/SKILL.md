---
name: navafit-training-engine
description: Use when building or changing NavaFit timer/stopwatch logic, round sequencing, app-lifecycle recovery, audio-session/cue handling, haptics, background limitations, breath pacing, workout-session recording, or breathwork safety wording.
---

# NavaFit Fitness Timer, Audio & Breathwork Systems

## Entry criteria
- The task touches timing, round/phase sequencing, lifecycle recovery, audio cues, haptics, breath pacing, or workout logging.

## Procedures
1. **Monotonic time only.** Compute elapsed/remaining from timestamps (`carriedElapsed + (now - startedAt)`); never accumulate UI-interval counts. Recompute on foreground.
2. **Lifecycle recovery.** On background→foreground and navigation away/return, restore the exact phase and remaining time. Prevent duplicate timers. Preserve workout state across interruptions.
3. **Test-first for timing.** Write failing tests for drift, pause/resume, round transition, and background recovery before implementing.
4. **Audio compliance.** Distinct cues per phase (prep, final-prep countdown, round start, final seconds, round end, rest start, next round, completion). Respect OS volume/silent/focus/audio-session/consent; never bypass. Provide fallback when audio is unavailable. Offer master toggle + preview.
5. **Breathwork safety.** Beginner foundation first (posture, nasal inhale, diaphragmatic expansion, controlled exhale, dizziness warning, stop-when-uncomfortable, no unsafe holds, non-medical disclaimer). No aggressive hyperventilation/prolonged retention without explicit safety review. Animation follows the actual phase, not a decorative loop.

## Quality gates
- Timer/audio logic has passing unit + integration tests (drift/pause/resume/background covered).
- Lint + `tsc -b` clean.
- Safety copy is non-diagnostic; reduced-motion breath alternative exists.

## Completion evidence
Passing timer tests with output, cue list verified, and safety wording reviewed by the compliance role.
