# SACRA documentation pattern

This pattern defines the **visual and interaction language** for technical documentation. It is intentionally content-agnostic: API names, product terminology and programming languages belong to the project using the pattern.

## Files

- `site/src/sacra-docs.css` — reusable `s-doc-*` documentation layout and code styles.
- `site/src/sacra-docs.js` — synchronized language tabs, code-copy actions and active TOC state.
- `site/examples/documentation.html` — API/reference example.
- `site/examples/documentation-guide.html` — guide/tutorial example.

Load `site/sacra-ui.css` first, then `sacra-docs.css`. For interactive docs load `sacra-utils.js` before `sacra-docs.js`.

## Layout

Use a wide graphite shell with:

1. compact masthead and product/doc identity;
2. editorial hero with kicker, large title and short description;
3. two-column document body: sticky 210 px TOC + readable content column;
4. horizontal section rules and numbered section markers;
5. single-column fallback on tablets/mobile.

The TOC is navigation, not decoration. Keep section anchors stable and let `sacra-docs.js` mark the current section.

## Code blocks

Use `s-doc-code` with a narrow technical header. Put the copy button in the same top-right position in every code sample. `data-doc-copy` delegates copy confirmation to `SacraUtils.copy`, so success remains the standard green check + `Скопировано` toast and failure never shows false success.

## Language tabs

Wrap a language group with `data-doc-languages` and mark tabs/panels using `data-doc-language` and `data-doc-panel`.

```html
<div class="s-doc-lang" data-doc-languages>
  <div class="s-tabs s-doc-lang__tabs" role="tablist">
    <button class="s-tab" role="tab" data-doc-language="curl">cURL</button>
    <button class="s-tab" role="tab" data-doc-language="python">Python</button>
  </div>
  <div class="s-doc-lang__panel" data-doc-panel="curl">...</div>
  <div class="s-doc-lang__panel" data-doc-panel="python" hidden>...</div>
</div>
```

Language selection is synchronized across all language groups on the page and persisted locally when possible. ArrowLeft/ArrowRight/Home/End work inside a tab group.

## Documentation components

- `s-doc-callout` — note/warning/success block; always include text, never rely on border color alone.
- `s-doc-table` — endpoint/property/status tables.
- `s-doc-pair` — request/response or before/after code pair.
- `s-doc-step` — ordered tutorial steps.
- `s-doc-pager` — previous/next documentation navigation.
- `s-doc-version` — compact version/read-time metadata.

## Visual rules

- Keep the SACRA graphite/yellow palette; no white documentation theme variant by default.
- SF Mono/Nerd stack remains the primary type language.
- Use yellow for navigation/action/current language; green/red only for semantic success/error.
- Keep code surfaces inset (`--s-color-sunken`) and body copy on canvas/surface; avoid texture behind prose or code.
- Prefer short paragraphs, small tables, and visible structure over large card grids.
- Documentation pages may be expressive in masthead/hero, but the reading column stays calm.

## Accessibility

- Language controls use tab roles and keyboard navigation.
- Copy buttons have explicit `aria-label`s.
- Sticky TOC becomes non-sticky on narrow screens.
- Code samples remain selectable text and horizontally scroll when necessary.
- Keep SACRA `:focus-visible`; yellow focus is keyboard navigation state, not success.
