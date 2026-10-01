---
name: sacra-ui-data-viz
description: Build or integrate SACRA UI charts, technical graphics, and WebAssembly motion. Use for line/bar/scatter/radar/heatmap/donut/gauge/Sankey/treemap charts, animated wireframes, WASM geometry, Canvas/SVG rendering, exports, and performance controls.
metadata:
  author: Sacraer-group
  version: "1.0.0"
  argument-hint: <chart-or-motion-feature>
---

# SACRA UI Data Viz + WASM

Use the shipped modules instead of reimplementing charting or fake-WASM animation.

If the repository is available, read `docs/API.md`, `examples/charts.html`, `examples/motion.html`, `src/sacra-charts.js`, `src/sacra-motion.js`, `src/geometry.c`, and `wasm/manifest.json`.

## Charts

Mount charts with `SacraCharts.mount(host, spec)`. Existing chart families include line/area, bar, stacked bar, OHLC/candlestick, scatter, radar, heatmap, donut, gauge, Sankey, treemap and sparkline.

Rules:
- Use axis labels/scales where the chart requires them.
- Provide legend/text/symbols so color is not the only channel.
- Keep an accessible data alternative and exports where relevant (`CSV`, `JSON`, `SVG`).
- Mark synthetic/demo data explicitly.
- Reuse the graphite/yellow palette; success/danger colors are semantic, not decoration.

## Motion / WebAssembly

Use the real WASM geometry core. `src/geometry.c` computes vertices; `src/sacra-motion.js` owns Canvas2D rendering and UI behavior. Do not replace it with a JavaScript-only imitation while claiming WASM.

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

- Support play/pause and a user-controlled FPS limit.
- Pause work while hidden/offscreen where the module supports it.
- Respect `prefers-reduced-motion`.
- Report measured FPS/compute time only; never display made-up performance numbers.
- Keep decorative motion `aria-hidden` when it conveys no data.
- Use SVG/Canvas exports as the application needs; avoid unrelated WebGL dependencies unless the task truly requires them.

## Verification

For WASM changes rebuild with `scripts/build-wasm.sh`, refresh the embedded binary with `scripts/embed-wasm.py` if needed, then run `node tests/wasm.test.cjs` and the smallest relevant browser check. For chart changes test keyboard focus/tooltip/data export in addition to appearance.

See `references/data-viz.md` for the compact API contract.
