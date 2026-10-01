---
name: sacra-ui-audit
description: Audit, maintain, or refactor SACRA UI implementations for design-system consistency, accessibility, responsive behavior, build integrity, and regression risk. Use for code review, visual QA, cleanup, upgrades, and release checks.
metadata:
  author: Sacraer-group
  version: "1.0.0"
  argument-hint: <files-or-change>
---

# SACRA UI Audit

Review the real implementation, not screenshots alone. Trace the classes/modules involved and fix shared sources rather than patching one demo path.

## Audit order

1. **Reuse** — product UI should use `s-*`; `ds-*` belongs to the documentation showcase.
2. **Tokens** — flag arbitrary colors/spacing/radii that duplicate existing `--s-*` tokens.
3. **Palette** — canvas stays graphite (`#15191F`), not black; yellow is primary focus/action, green/red are semantic.
4. **Typography/icons** — SF Mono/Nerd stack; SVG icons; no bundled font files or external font CDN.
5. **Controls** — custom select uses `SacraControls`, native select remains semantic; copy feedback uses `SacraUtils.copy`; focus stays visible.
6. **Data UI** — tables scroll locally, statuses include text/symbol, charts include labels/data alternative, demo numbers are identified.
7. **Motion** — real WASM remains real, reduced-motion/autopause work, measured FPS is not replaced by constants.
8. **Responsive** — check at least 320/390/768/1440 px and avoid full-page horizontal overflow.
9. **Accessibility** — labels, keyboard, `focus-visible`, dialogs, ARIA relationships, disabled/error semantics.

## Repository checks

Run the smallest relevant set, then the package step for release work:

```sh
python scripts/package.py
node tests/wasm.test.cjs
SACRA_CHROMIUM=/path/to/chromium python tests/controls.py
SACRA_CHROMIUM=/path/to/chromium python tests/feedback.py
SACRA_CHROMIUM=/path/to/chromium python tests/browser.py
```

Browser tests require Playwright. Do not claim Safari/macOS/iOS verification unless it was actually run.

## Output

Report concrete findings with file/path and consequence. Separate verified bugs from subjective design suggestions. Prefer one root-cause patch over duplicate fixes. Keep non-trivial logic covered by the smallest runnable regression check.

Use `references/audit-checklist.md` when the full repository docs are not available.
