# SACRA documentation compact reference

Use a graphite documentation shell with a compact masthead, editorial hero, sticky TOC and calm reading column. Prefer numbered sections, thin horizontal rules, endpoint/property tables, callout strips and consistent code headers.

Reusable classes: `s-doc-shell`, `s-doc-topbar`, `s-doc-brand`, `s-doc-hero`, `s-doc-layout`, `s-doc-toc`, `s-doc-section`, `s-doc-callout`, `s-doc-table`, `s-doc-lang`, `s-doc-code`, `s-doc-pair`, `s-doc-step`, `s-doc-pager`.

Multi-language examples use `data-doc-languages`, tabs with `data-doc-language`, and panels with `data-doc-panel`. Selection synchronizes across the page. Copy buttons use `data-doc-copy` and `SacraUtils.copy` so success is green check + toast and failure remains explicit.

Keep content project-specific. The SACRA examples define visual structure and interaction only; do not invent API contracts from them.

## Postavki refresh

Use `site/examples/documentation-code.html` for six-language synchronized code tabs and copy buttons. Preserve tab/panel ARIA links and a visible fallback panel if a language is missing from a group. Do not label a snippet with a language it is not written in.
The full source map is `site/docs/UPSTREAM-POSTAVKI.md` in the global or local kit.


## Web themes

Documentation may use the shared eight semantic web palettes. Theme changes are color-only and must not alter reading/layout/navigation behavior.
