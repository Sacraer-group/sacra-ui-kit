---
name: sacra-ui-data-viz
description: Build or integrate SACRA UI charts, technical graphics, and WebAssembly motion. Use for line/bar/scatter/radar/heatmap/donut/gauge/Sankey/treemap charts, animated wireframes, WASM geometry, Canvas/SVG rendering, exports, and performance controls.
metadata:
  author: Sacraer-group
  version: "1.1.0"
  argument-hint: <chart-or-motion-feature>
---

# SACRA UI Data Viz + WASM

If the full kit checkout is available, inspect `site/docs/API.md`, `site/examples/charts.html`, `site/examples/motion.html`, `site/src/sacra-charts.js`, `site/src/sacra-motion.js`, `site/src/geometry.c`, and `site/wasm/manifest.json`. Standalone installs use `references/data-viz.md` as the compact fallback.

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
