---
name: sacra-ui-build
description: Build or adapt application screens with SACRA UI / Technical Editorial. Use for dashboards, admin panels, forms, tables, navigation, cards, workspaces, landing screens, and other UI that should follow the SACRA graphite/yellow design system.
metadata:
  author: Sacraer-group
  version: "1.0.0"
  argument-hint: <screen-or-feature>
---

# SACRA UI Build

Use the existing SACRA UI system instead of inventing a parallel visual language.

## Start here

1. Inspect the target project and reuse its existing SACRA imports/components before adding anything.
2. If this repository is available, read `docs/AGENT-RULES.md` and `docs/DESIGN-SYSTEM.md`; otherwise use `references/design-system.md` bundled with this skill.
3. Reuse `s-*` classes. Treat `ds-*` as documentation-showcase classes only.
4. Add only the modules the screen needs:
   - base UI: `sacra-ui.css`
   - custom selects: `src/sacra-controls.js`
   - copy/toast helpers: `src/sacra-utils.js`
   - charts: `src/sacra-charts.js`
   - motion/WASM: `wasm/geometry-binary.js` + `src/sacra-motion.js`
   - workspace patterns: `src/sacra-workspace.js`
5. Start from `starter.html` or the closest file in `examples/` when that is smaller than writing from scratch.

## Visual contract

- Canvas `#15191F`; surfaces `#1B2027`; raised `#222831`; inset `#11151A` only for contained/inset areas.
- Accent `#F2CC4D`; success `#45BF92`; danger `#EF7B6D`; text `#F2F4F6`; muted `#9BA3AE`.
- SF Mono / Liga SFMono Nerd Font stack; SVG icons, never icon-font dependency.
- 4 px spacing scale, 12-column layout, small radii 2/4/6/8 px.
- Swiss structure + restrained brutalism + technical/cyber geometry. No rainbow gradients, glassmorphism, glow, or full black page background.
- Experimental grids/moire/wireframes belong in editorial or decorative regions, never behind dense forms/tables.

## Build pattern

- Use `s-panel`, `s-card`, `s-table`, `s-field`, `s-input`, `s-btn`, `s-badge`, `s-tabs`, `s-dialog`, `s-toast`, `s-empty`, `s-metric`, `s-chip`, `s-list` before creating new classes.
- Use `s-kicker`, `s-editorial-title`, `s-register`, `s-rail`, `s-tech-frame`, `s-readout`, `s-scale` for the expressive editorial shell.
- Keep tables horizontally separated and locally scrollable on narrow screens.
- Status must have text/symbol in addition to color.
- Keep real data calm; decorative geometry is secondary.

## Accessibility and behavior

- Keep visible `:focus-visible`; yellow focus is keyboard position, not success/error.
- Use semantic buttons/labels/dialogs and appropriate ARIA.
- Respect `prefers-reduced-motion`.
- Custom controls must keep native form data/event semantics.
- Mark demo/synthetic values as such; never invent telemetry.

## Verification

For small UI edits, check the touched screen at 320, 390, 768 and 1440 px and keyboard through the interactive path. For repository changes run the smallest relevant check from `docs/QA.md`.
