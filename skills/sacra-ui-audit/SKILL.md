---
name: sacra-ui-audit
description: Audit, maintain, or refactor SACRA UI implementations for design-system consistency, accessibility, responsive behavior, build integrity, and regression risk. Use for code review, visual QA, cleanup, upgrades, and release checks.
metadata:
  author: Sacraer-group
  version: "1.5.0"
  argument-hint: <files-or-change>
---

# SACRA UI Audit

Review the real implementation and fix shared sources rather than one demo symptom.

Resolve the canonical 1.4.3 reference in this order: current `sacra-ui-kit` checkout, then `$HOME/.codex/sacra-ui-kit/site/`, then bundled `references/audit-checklist.md`. When a full reference is available, use its `site/docs/QA.md` and real source/tests rather than the compact fallback.

## Audit order

1. **Reuse** — `s-*` for product UI; `ds-*` showcase-only.
2. **Tokens** — flag arbitrary colors/spacing/radii duplicating existing `--s-*`.
3. **Palette** — SACRA Graphite is the default. Theme-enabled screens may use only the registered semantic role palettes; accent/focus and success/danger stay separate roles.
4. **Typography/icons** — SF Mono/Nerd stack and SVG icons.
5. **Controls** — visible custom select from `SacraControls`; native select remains semantic; copy feedback from `SacraUtils.copy`; focus remains visible.
6. **Data UI** — local table scrolling, textual statuses, chart labels/data alternative, demo numbers identified.
7. **Motion** — real WASM remains real, reduced-motion/autopause works, measured performance is not replaced by constants.
8. **Responsive** — 320/390/768/1440 px with no page-level horizontal overflow.
9. **Accessibility** — labels, keyboard, `focus-visible`, dialogs, ARIA relationships, disabled/error semantics.
10. **Repo structure** — root `index.html` must keep CSS/JS/WASM external under `site/`; do not rebundle it into a giant HTML file.

## Repository checks

Use the smallest relevant checks:

```sh
node site/tests/wasm.test.cjs
python site/tests/controls.py
python site/tests/feedback.py
python site/tests/browser.py
```

Browser tests require a compatible browser/runtime. Do not claim Safari/macOS/iOS verification unless it was actually run.

Report concrete findings with file/path and consequence. Separate verified bugs from subjective design suggestions and prefer one root-cause patch.

## TUI audit

For terminal interfaces audit against `tui/docs/DESIGN.md`, `tui/docs/COMPONENTS.md` and `tui/docs/THEMES.md` (or the `sacra-ui-tui` fallback). Check cell-based layout, resize behavior, focus/selected/checked separation, keyboard modes, missing vs stale vs zero, theme-invariant geometry and terminal restoration. For charts run the TUI chart checks and verify renderer fallback/capability probing. Do not judge a TUI by web responsive breakpoints.

## Postavki frontend refresh

Run `python site/tests/postavki_browser.py` for uploads, local queue/detail, copy success/failure, language groups and responsive checks. Verify result grids use `minmax(0,1fr)` and code/table overflow stays local. Browser MIME checks do not replace server validation.

Read `site/docs/UPSTREAM-POSTAVKI.md` under the resolved kit root (current checkout or `$HOME/.codex/sacra-ui-kit`). Import the visuals/interactions, not the source application API contract. Base palette, custom select, checkbox, WASM and `SacraUtils.copy` remain unchanged.


## Web theme audit

When web themes are enabled, verify all eight palettes against `site/themes.json`. Check that palette changes are limited to semantic `--s-color-*` roles; layout, spacing, radii, typography, DOM structure, chart geometry, focus order and keyboard behavior must remain invariant. Graphite is the default, not a hard-coded requirement inside reusable components.
