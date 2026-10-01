---
name: sacra-ui-docs
description: Design or implement technical documentation with the SACRA UI documentation pattern. Use for API references, SDK docs, developer guides, code examples, language switchers, copy-to-clipboard code blocks, sticky tables of contents, callouts, endpoint tables, tutorials, and documentation page styling.
metadata:
  author: Sacraer-group
  version: "1.0.0"
  argument-hint: <documentation-page-or-section>
---

# SACRA UI Documentation

Use the SACRA documentation visual pattern; do not copy product-specific wording from examples unless the target project actually uses it.

## Reference priority

Resolve the full kit in this order:

1. current `sacra-ui-kit` checkout;
2. `$HOME/.codex/sacra-ui-kit`;
3. bundled `references/documentation.md`.

When the full kit is available, inspect:

- `site/examples/documentation.html` — API/reference layout;
- `site/examples/documentation-guide.html` — tutorial/guide layout;
- `site/src/sacra-docs.css` — reusable `s-doc-*` styles;
- `site/src/sacra-docs.js` — synchronized language tabs, copy actions, TOC state;
- `site/docs/DOCUMENTATION.md` — canonical pattern rules.

## Build rules

- Load `sacra-ui.css`, then `sacra-docs.css`.
- For copy feedback load `sacra-utils.js` before `sacra-docs.js`.
- Use `s-doc-shell`, `s-doc-topbar`, `s-doc-hero`, `s-doc-layout`, `s-doc-toc`, `s-doc-section` for the page skeleton.
- Use `s-doc-code` for every copyable code example so copy controls stay in a consistent position.
- Use `data-doc-languages`, `data-doc-language`, and `data-doc-panel` for multi-language examples. The selected language should synchronize across the page.
- Use `s-doc-callout`, `s-doc-table`, `s-doc-pair`, `s-doc-step`, and `s-doc-pager` instead of inventing one-off doc blocks.

## Visual language

The documentation inherits SACRA UI: graphite canvas/surfaces, yellow navigation/action/focus, SF Mono/Nerd typography, thin rules and technical labels. Keep prose/code surfaces calm; decorative wireframes and motion are not default documentation backgrounds.

The examples define **design and interaction**, not the target product's terminology or API contract. Replace demo endpoint names, snippets, version numbers, and copy with facts from the target project.

## Copy and language behavior

`data-doc-copy` delegates to `SacraUtils.copy`. Success is the standard temporary green check plus `Скопировано` toast; failure must not display success.

Language tabs must work with click plus ArrowLeft/ArrowRight/Home/End. Preserve semantic tab roles and visible focus.

## Verification

Check:

- keyboard navigation through TOC, language tabs and copy buttons;
- global language sync across multiple code groups;
- copy success/failure feedback;
- no page-level horizontal overflow at 320/390/768/1440 px;
- code blocks scroll locally instead of expanding the page.

In this repository run `python site/tests/documentation.py` plus any broader relevant UI check.
