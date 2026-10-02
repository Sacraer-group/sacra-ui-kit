# Postavki → SACRA UI: frontend refresh, 2026-10-02

Source: `Sacraer-group/postavki`, commit `d74d09d357cf184026973dbb9d055f2ea91894a2`.
Target: the existing SACRA UI 1.4.3 reference. This is a component refresh, not an OCR backend migration.

## Source-derived patterns

| Source | Imported behavior / presentation | Kit destination |
|---|---|---|
| `internal/admin/index.html` | Camera/file pickers, document selection, three metrics, task list + detail panel | `site/examples/postavki.html` |
| `internal/admin/static/admin.css` | Upload thumbnails, counter/actions, narrow-screen layout, selected task edge, result cards, `minmax(0,1fr)` result grid | `site/src/sacra-operations.css` |
| `internal/admin/static/admin.js` | Batch MIME/size/count checks before mutation; removable Object URL previews; pending state; keep files on failure | `site/src/sacra-upload.js` |
| `internal/admin/static/admin.js` | All/live/history filtering; task detail, raw/rendered result, floating JSON copy button | `site/examples/postavki.js` (explicitly synthetic, local-only) |
| `internal/admin/static/docs.js` and earlier supplied docs reference | Synchronized language tabs, keyboard arrows/Home/End, one copy control per code sample | `site/src/sacra-docs.js`, `site/examples/documentation-code.html` |

The source CSS blob is `195b6573407cec168a1d5e34d6ca384fd2d74654`; the source admin JS blob is `760be4f62a31e886762533656b359087509f3bb1`. This map records provenance; it does not claim byte-for-byte vendoring of the entire application.

## What was already identical

The upstream `static/sacra-ui.css` and kit `site/sacra-ui.css` share blob `72a43c4c63c42ca7f124379342f7daf9d649a075`. The copy implementation is the same shared `SacraUtils` code plus the upstream `window.copyText` adapter. We kept the accepted checkbox, custom select, palette, WASM and copy success/failure logic unchanged.

## Adaptations made for the kit

- Product-local class names became scoped `s-ops-*`, `s-upload*`, `s-result-*`, `s-code-float` classes. Literal colors were mapped to existing SACRA tokens so these patterns do not restyle unrelated pages.
- `SacraUpload.mount(root, {maxFiles, maxBytes, onSubmit, successMessage})` reuses the upstream selection flow without any endpoint, token or transport. `onSubmit(files)` must be provided by the application; rejection retains the selection. `destroy()` removes listeners and releases Object URLs.
- The source defaults (10 JPEG/PNG images, up to 10 MiB each) are example defaults, not a universal API contract. Checks cover browser MIME metadata, byte size and count only. Server-side content decoding and validation remain the application's responsibility.
- The demo uses trusted, explicitly synthetic DOM/table data, not a real OCR service or telemetry. It never parses arbitrary HTML. Upstream production Markdown uses Marked + DOMPurify; do not copy its HTML insertion while omitting sanitization.
- Language tabs retain one visible panel in every group even when a language is absent from another group. Added tab/panel IDs, ARIA relationships, roving tabindex and current TOC markers. No unrelated application tabs are selected.
- Code/prose use local overflow and wrapped long text. The copy affordance is consistently placed and delegates to `SacraUtils.copy`, including its failure fallback.

## Usage

Load `sacra-ui.css` and `src/sacra-operations.css`; load `src/sacra-upload.js` for the picker behavior. Copy the `.s-upload` markup from `examples/postavki.html`. `onSubmit` receives the chosen `File[]` in order. The kit does not construct requests or assume service credentials.

For documentation, load `src/sacra-docs.css` and load `src/sacra-utils.js` before `src/sacra-docs.js`. Start from `examples/documentation-code.html` for six-language code blocks, or the existing reference/guide examples for complete pages.

Run `python site/tests/postavki_browser.py` with Playwright + Chromium installed. `SACRA_CHROMIUM` can select an existing Chromium binary. This is UI/DOM and local browser validation; it does not validate a backend, real mobile camera behavior, Safari, or hardware performance.
