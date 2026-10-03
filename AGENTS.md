# SACRA UI repository rules

The web entrypoint is `index.html`. Reusable web SACRA UI 1.4.3 assets live under `site/`; the separate terminal design system and browser reference live under `tui/`; portable skills live under `skills/`.

Before UI work read `site/docs/AGENT-RULES.md` and `site/docs/DESIGN-SYSTEM.md`. For implementation details use `site/docs/API.md`.

Use reusable `s-*` classes and modules from `site/src/`. `ds-*` classes belong to the documentation showcase only.

Keep the established palette and token names. Do not replace the graphite canvas with black, introduce unrelated neon colors, remove keyboard focus indicators, or fake telemetry/performance values.

Prefer existing examples and templates:
- `site/starter.html`
- `site/examples/controls.html`
- `site/examples/feedback.html`
- `site/examples/charts.html`
- `site/examples/motion.html`
- `site/examples/workspace.html`
- `site/examples/documentation.html`
- `site/examples/documentation-guide.html`
- `tui/index.html`
- `tui/docs/DESIGN.md`
- `tui/docs/COMPONENTS.md`
- `tui/docs/THEMES.md`

Reusable agent skills:
- `skills/sacra-ui-build`
- `skills/sacra-ui-controls`
- `skills/sacra-ui-data-viz`
- `skills/sacra-ui-docs`
- `skills/sacra-ui-tui`
- `skills/sacra-ui-tui-charts`
- `skills/sacra-ui-audit`

For documentation UI, use `site/src/sacra-docs.css`, `site/src/sacra-docs.js`, and `site/docs/DOCUMENTATION.md`; examples define design/interaction only, never a target project's API facts.

## Web vs TUI routing

For browser/application UI, use `site/`. For terminal/TUI/CLI dashboards, use `tui/`; do not translate rounded web cards into fake terminal boxes or copy ultra-mog styling. Terminal themes may remap semantic colors, but layout, state labels and keyboard behavior stay invariant.

For TUI charts, use the contracts in `tui/docs/SOURCES.md`: preserve zero, split missing/time gaps, derive coordinate labels from actual bounds, and choose terminal pixel graphics only after capability probing with Octant/ASCII fallbacks.

For non-trivial changes run the smallest relevant check under `site/tests/`. Keep root `index.html` externalized: do not bake CSS/JS/WASM back into it.

## Postavki frontend refresh

Use `site/examples/postavki.html`, `site/examples/documentation-code.html` and `site/docs/UPSTREAM-POSTAVKI.md` for the newly extracted patterns. Keep source app APIs out of kit demos; reuse `SacraUpload` and `SacraUtils` rather than writing another picker/clipboard helper.


## TUI routing

For terminal/TUI work, do not use the web showcase as the visual reference. Read `tui/docs/DESIGN.md`, `tui/docs/COMPONENTS.md`, `tui/docs/THEMES.md`, and `tui/docs/SOURCES.md`; use `tui/index.html` as the executable reference and `skills/sacra-ui-tui` as the task skill.

Keep cell geometry, keyboard states and capability degradation terminal-native. SACRA Graphite is the default palette; alternate themes remap roles only. From ultra-mog only chart-rendering ideas are allowed—never its layout, palette, navigation or labels.
