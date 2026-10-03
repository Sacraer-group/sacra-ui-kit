---
name: sacra-ui-tui-charts
description: Implement or review SACRA TUI charts and telemetry graphics. Use for terminal history charts, coordinate grids, Pixels/Kitty-style renderers, Octant or ASCII fallbacks, sparklines, usage bars, chart cursors, time windows, missing-data gaps, and theme-aware terminal chart rendering.
metadata:
  author: Sacraer-group
  version: "1.0.0"
  argument-hint: <terminal-chart-or-telemetry-view>
---

# SACRA TUI Charts

Use SACRA's chart contract. `ultra-mog` is only an upstream source for chart-rendering ideas; its palette, frames, navigation and overall UI are not design references.

## Reference priority

Resolve in this order:

1. current `sacra-ui-kit/tui/`;
2. `$HOME/.codex/sacra-ui-kit/tui/`;
3. bundled `references/tui-charts.md`.

With the full reference, inspect `tui/assets/charts.js`, `tui/assets/coordinates.js`, `tui/docs/DESIGN.md`, `tui/docs/SOURCES.md`, `tui/docs/THEMES.md`, `tui/examples/minimal-chart.*`, and chart tests.

## Data contract

- Zero is a valid sample and stays on the baseline.
- Missing/NaN/Infinity splits the line; do not connect across the gap.
- Large time gaps split the line as well; the lab uses >20 seconds.
- Clip/project values to explicit bounds. Axis labels must derive from those same bounds.
- A chart window is explicit (for example 1/5/15 min) and X labels reflect the selected window.
- Shared-series charts use the same numeric scale when absolute comparison matters.
- Synthetic/demo data must be marked as such; never invent FPS, power, temperature, confidence or telemetry.

## Coordinate frame

Full charts use a technical coordinate frame: perimeter, corner markers, major/minor ticks, optional internal guides, real numeric X/Y labels and a keyboard-accessible crosshair/cursor. The visual center is not automatically zero; zero follows the actual bounds.

Compact sparklines and fixed-width bars intentionally omit the full coordinate frame.

## Renderer ladder

Prefer the best renderer the terminal actually supports, with graceful fallback:

1. pixel/terminal graphics only after a capability probe and bounded memory/placement handling;
2. Octant/subcell line rendering when available;
3. ASCII as the universal fallback.

All renderer modes represent the same segments, bounds and units. Switching renderer must not change the data semantics.

If a pixel renderer uses terminal graphics, clean placements and restore terminal state on exit/error. Do not claim browser Canvas simulation is Kitty/terminal graphics.

## Themes

Charts read the active TUI semantic roles. Theme changes recolor the chart but do not alter bounds, gaps, cursor position, units or geometry. First/second series must also be distinguishable by legend/text/symbols; color is not the only channel.

## Verification

Test at least: zero baseline, missing sample, NaN/Infinity, large time gap, window clipping, multiple series, renderer fallback, coordinate labels, theme switch, cursor boundaries and bounded raster memory. In this kit run:

```sh
node tui/tests/charts.test.cjs
node tui/tests/coordinates-themes.test.cjs
```
