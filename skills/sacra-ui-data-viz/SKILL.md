---
name: sacra-ui-data-viz
description: Build or integrate SACRA UI charts, technical graphics, and WebAssembly motion. Use for line/bar/scatter/radar/heatmap/donut/gauge/Sankey/treemap charts, animated wireframes, WASM geometry, Canvas/SVG rendering, exports, and performance controls.
metadata:
  author: Sacraer-group
  version: "1.5.0"
  argument-hint: <chart-or-motion-feature>
---

# SACRA UI Data Viz + WASM

Resolve the full reference root in this order: current `sacra-ui-kit` checkout, then `$HOME/.codex/sacra-ui-kit`, then bundled `references/data-viz.md`.

When a full reference root is available, inspect `site/docs/API.md`, `site/examples/charts.html`, `site/examples/motion.html`, `site/src/sacra-charts.js`, `site/src/sacra-motion.js`, `site/src/geometry.c`, and `site/wasm/manifest.json`.

## Charts

Use `SacraCharts.mount(host, spec)` and existing chart families before adding a chart dependency: line/area, bar, stacked bar, OHLC/candlestick, scatter, radar, heatmap, donut, gauge, Sankey, treemap and sparkline.

- Use axis labels/scales where applicable.
- Provide legend/text/symbols so color is not the only channel.
- Preserve accessible data alternatives and CSV/JSON/SVG exports where relevant.
- Mark synthetic/demo data explicitly.
- Keep green/red semantic rather than decorative.

## Motion / WebAssembly

Use the real geometry core in `site/wasm/geometry.wasm`, compiled from `site/src/geometry.c`. JavaScript in `site/src/sacra-motion.js` renders it to Canvas.

```js
await SacraMotion.ready;
const view = SacraMotion.mount(canvas, {
  mode: 0,
  density: 30,
  speed: 1,
  deformation: 0.5,
  fpsLimit: 60
});
```

Support play/pause and FPS limits, pause hidden/offscreen work where supported, respect `prefers-reduced-motion`, and report only measured FPS/compute time. Never replace the WASM path with a JavaScript imitation while still calling it WASM.

For WASM changes use `site/scripts/build-wasm.sh` / `site/scripts/embed-wasm.py` and `node site/tests/wasm.test.cjs`.

## Terminal/TUI charts

For terminal charts switch to the `sacra-ui-tui-charts` contract under `tui/`: shared segments/bounds across Pixels, Octant and ASCII; real coordinate labels; zero preserved; missing/NaN/time gaps split lines; theme changes color roles only. The ultra-mog source is a rendering-idea reference, not a visual-theme/layout reference.

## Postavki frontend refresh

For document-processing dashboards, reuse `site/examples/postavki.html` metric strip and state/detail cards. A processed-page counter is not an overall completion percentage. Demo queue values are not telemetry; never replace measured WASM statistics with synthetic data.

Read `site/docs/UPSTREAM-POSTAVKI.md` under the resolved kit root (current checkout or `$HOME/.codex/sacra-ui-kit`). Import the visuals/interactions, not the source application API contract. Base palette, custom select, checkbox, WASM and `SacraUtils.copy` remain unchanged.


## Web themes and renderers

Web themes come from `site/src/sacra-themes.js` / `site/themes.json`. Graphite is the default. Theme changes are color-role remaps only. SVG/Canvas renderers that cache computed colors must refresh or rerender after `sacra-themechange`; never rebuild chart bounds, data, units, geometry, or interaction state because the palette changed.
