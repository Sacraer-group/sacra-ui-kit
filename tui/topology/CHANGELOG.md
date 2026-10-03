# Changelog

## 0.3.3 — SDK reference integration

- Keep 0.3.2 arrow geometry, keyed DOM and scroll/focus preservation.
- Render adapter states literally; synthetic phase animation is opt-in.
- Escape node, inspector, gate and event content before DOM insertion.
- Add native SDK reference links and adapter security regression.

## 0.3.2 — arrows and scroll

- Replace full-screen per-tick DOM replacement with incremental keyed updates.
- Preserve focus, selected node, scroll containers and SVG path identities.
- Reserve event-log height; preserve synchronous scroll positions without
  scheduling a stale scroll restoration after user input.
- Compute geometry using a measured SVG viewBox and relative painted rectangles.
- Add continuous connector rails below the existing flow animation.
- Keep arrow marker colours in sync with edge state without a delayed stroke
  colour transition.
- Make Escape/theme focus non-scrolling and stop capturing native page arrow
  scrolling outside node navigation.
- Preserve adapter-supplied events and same-session selection/phase on setData.
- Version local asset references as 0.3.2 to avoid stale CSS/JS cache reuse.
- Add dedicated scroll, focus, DOM-identity and painted-coordinate regressions.

## 0.3.1 — input archive

Shared orthogonal fan-out/merge routes, measured card ports and ResizeObserver.
