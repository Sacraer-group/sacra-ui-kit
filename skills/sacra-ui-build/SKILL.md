---
name: sacra-ui-build
description: Build or adapt application screens with SACRA UI / Technical Editorial. Use for dashboards, admin panels, forms, tables, navigation, cards, workspaces, landing screens, and other UI that should follow the SACRA Technical Editorial design system.
metadata:
  author: Sacraer-group
  version: "1.6.0"
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

Default SACRA Graphite values:

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

## Terminal/TUI routing

If the target is a terminal/TUI/CLI dashboard, do not use the web component/layout rules above as the primary reference. Resolve `tui/` in the current kit or `$HOME/.codex/sacra-ui-kit/tui/` and follow `sacra-ui-tui`. Use character-cell geometry, keyboard-first states and theme-role remapping rather than web radii/shadows. For terminal charts use `sacra-ui-tui-charts`.

## Postavki frontend refresh

For a task list + detail view or image upload, start with `site/examples/postavki.html`, `site/src/sacra-operations.css` and `site/src/sacra-upload.js`. Keep the selected task edge, local scroll containers and calm result cards.

Read `site/docs/UPSTREAM-POSTAVKI.md` under the resolved kit root (current checkout or `$HOME/.codex/sacra-ui-kit`). Import the visuals/interactions, not the source application API contract. Base palette, custom select, checkbox, WASM and `SacraUtils.copy` remain unchanged.


## Web semantic themes

For themeable web UI, load `site/src/sacra-themes.js` after `site/sacra-ui.css`. SACRA Graphite remains the default; Nord, Gruvbox Dark, Dracula, Tokyo Night, Solarized Dark/Light and Mono Graphite are optional role palettes. Theme switching may change only `--s-color-*` roles. Never change layout, spacing, radii, typography, component DOM, navigation, or keyboard behavior as part of a theme.

Use `SacraThemes.restore()` for saved preference and `SacraThemes.apply(id,{persist:true})` for explicit selection. Read `site/docs/THEMES.md` and `site/themes.json` when a full reference is available.
