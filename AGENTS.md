# SACRA UI repository rules

Use the reusable `s-*` classes and the public modules in `src/`; `ds-*` classes belong to the documentation showcase only.

Before UI work, read `docs/AGENT-RULES.md`. For implementation details use `docs/API.md`; for visual rules use `docs/DESIGN-SYSTEM.md`.

Keep the established palette and token names. Do not replace the graphite canvas with black, introduce unrelated neon colors, remove keyboard focus indicators, or fake telemetry/performance values.

Prefer existing components and modules over new dependencies or parallel abstractions. For non-trivial changes run the smallest relevant checks; before a release run `python scripts/package.py` and the relevant tests from `docs/QA.md`.

Portable agent skills live in `skills/`:
- `sacra-ui-build`
- `sacra-ui-controls`
- `sacra-ui-data-viz`
- `sacra-ui-audit`
