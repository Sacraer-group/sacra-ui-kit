---
name: sacra-ui-build
description: Build or adapt application screens with SACRA UI / Technical Editorial. Use for dashboards, admin panels, forms, tables, navigation, cards, workspaces, landing screens, and other UI that should follow the SACRA graphite/yellow design system.
metadata:
  author: Sacraer-group
  version: "1.3.0"
  argument-hint: <screen-or-feature>
---

# SACRA UI Build

Reuse the existing SACRA UI system instead of inventing a parallel visual language.

## Reference priority

Resolve the reference root before building:

1. If the current checkout is `sacra-ui-kit` and contains `site/`, use that checkout.
2. Otherwise, if `$HOME/.codex/sacra-ui-kit/site/` exists, use `$HOME/.codex/sacra-ui-kit` as the global Codex reference root.
3. Otherwise use `references/design-system.md` bundled with this skill as the compact fallback.
4. In the target project, reuse any SACRA components already present before copying more kit code.

From the resolved full reference root inspect:
- `site/starter.html`
- `site/examples/`
- `site/src/`
- `site/docs/DESIGN-SYSTEM.md`
- `site/docs/API.md`
- `site/docs/DOCUMENTATION.md` when building developer/API documentation

## Modules

Use only what the screen needs:
- base UI: `site/sacra-ui.css`
- custom selects: `site/src/sacra-controls.js`
- copy/toast helpers: `site/src/sacra-utils.js`
- charts: `site/src/sacra-charts.js`
- motion/WASM: `site/wasm/geometry-binary.js` + `site/src/sacra-motion.js`
- workspace patterns: `site/src/sacra-workspace.js`
- documentation: `site/src/sacra-docs.css` + `site/src/sacra-docs.js`; start from `site/examples/documentation.html` or `site/examples/documentation-guide.html`

For another repository, copy the necessary reusable files from `site/` rather than linking back to this private checkout at runtime.

## Visual contract

- Canvas `#15191F`; surfaces `#1B2027`; raised `#222831`; inset `#11151A` only for contained regions.
- Accent `#F2CC4D`; success `#45BF92`; danger `#EF7B6D`; text `#F2F4F6`; muted `#9BA3AE`.
- SF Mono / Liga SFMono Nerd Font stack and SVG icons.
- 4 px spacing scale, 12-column structure, radii 2/4/6/8 px.
- Swiss structure + restrained brutalism + technical/cyber geometry.
- No rainbow gradients, glassmorphism, glow, or full black page background.
- Decorative wireframes/dots/scanlines belong outside dense forms and data tables.

## Build pattern

Prefer existing `s-*` components. Treat `ds-*` as showcase-only.

Keep tables locally scrollable on narrow screens. Status must have text/symbol in addition to color. Keep real data calm; experimental geometry is secondary.

## Accessibility

Keep visible `:focus-visible`. Yellow focus means keyboard position, not success/error. Use semantic labels/buttons/dialogs, preserve native form semantics behind custom visuals, respect `prefers-reduced-motion`, and identify demo values.

## Verification

Check touched screens at 320, 390, 768 and 1440 px plus the keyboard path. In this repo use the smallest relevant check under `site/tests/`.
