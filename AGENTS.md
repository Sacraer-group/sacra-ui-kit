# SACRA UI repository rules

The repository entrypoint is `index.html`. All reusable SACRA UI 1.4.3 assets and templates live under `site/`; portable skills live under `skills/`.

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

Reusable agent skills:
- `skills/sacra-ui-build`
- `skills/sacra-ui-controls`
- `skills/sacra-ui-data-viz`
- `skills/sacra-ui-audit`

For non-trivial changes run the smallest relevant check under `site/tests/`. Keep root `index.html` externalized: do not bake CSS/JS/WASM back into it.
