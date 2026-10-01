---
name: sacra-ui-audit
description: Audit, maintain, or refactor SACRA UI implementations for design-system consistency, accessibility, responsive behavior, build integrity, and regression risk. Use for code review, visual QA, cleanup, upgrades, and release checks.
metadata:
  author: Sacraer-group
  version: "1.1.0"
  argument-hint: <files-or-change>
---

# SACRA UI Audit

Review the real implementation and fix shared sources rather than one demo symptom.

When this repository checkout is available, treat `site/` as the canonical downloadable 1.4.3 reference and use `site/docs/QA.md`. Standalone skill installs use `references/audit-checklist.md`.

## Audit order

1. **Reuse** — `s-*` for product UI; `ds-*` showcase-only.
2. **Tokens** — flag arbitrary colors/spacing/radii duplicating existing `--s-*`.
3. **Palette** — canvas stays graphite, yellow is action/focus, green/red semantic.
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
