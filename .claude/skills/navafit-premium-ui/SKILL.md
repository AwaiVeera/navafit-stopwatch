---
name: navafit-premium-ui
description: Use when building or changing NavaFit UI — responsive layouts, safe-area/viewport handling, design tokens, reusable primitives, typography/spacing, component states, motion with reduced-motion fallbacks, or fixing scale/scroll/keyboard layout defects across device sizes.
---

# NavaFit Responsive Premium UI & Motion

## Entry criteria
- The task adds or changes a screen, component, token, or motion, or fixes a layout defect.
- For a defect, you have a reproduction (device screenshot or in-browser viewport repro) — not an assumption.

## Procedures
1. **Token-first.** Use the CSS custom-property tokens in `src/index.css`; add a token rather than a one-off value when a value will recur. Extend `src/components/` primitives instead of duplicating markup.
2. **Viewport discipline.** Respect `env(safe-area-inset-*)`; primary screens are static (no accidental scroll); enable scroll only as an accessibility fallback when content genuinely cannot fit — never shrink text/controls just to avoid scroll.
3. **Device matrix.** Verify small / standard / large widths. Watch the floating tab bar and dynamic-island regions for overlap/clipping.
4. **Motion.** Each animation communicates state, responds immediately, respects `prefers-reduced-motion` (gate in the consolidated reduced-motion block), stops when inactive, and never blocks touch.
5. **Preserve Login identity.** Do not restyle the approved `.dq-*` login; correct only verified responsiveness defects.

## Quality gates
- Lint + `tsc -b` clean; existing tests pass.
- New screen/component has a screen or viewport-regression test where practical.
- Reduced-motion path checked; no horizontal body scroll.

## Completion evidence
Before/after screenshots or repro notes, passing gates, and the token/primitive added (not a duplicated style).
