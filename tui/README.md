# SACRA / TUI

Dedicated terminal-interface design system for SACRA UI. The browser lab is an executable visual reference; it is **not** a PTY/ANSI emulator and does not prove support in a real terminal.

Open `tui/index.html` to inspect the current reference.

## Reference map

- `docs/DESIGN.md` — geometry, layout, states, keyboard and integration contract.
- `docs/COMPONENTS.md` — component behaviors.
- `docs/THEMES.md` — role-based palettes and switching rules.
- `docs/SOURCES.md` — provenance and the ultra-mog boundary.
- `assets/` — browser simulation, tokens, themes, coordinate frame and chart algorithms.
- `examples/` — minimal chart/layout contracts.
- `tests/` — chart and theme/coordinate invariants.

## Core rules

The terminal layer is measured in cells/rows, uses straight one-cell borders, visible keyboard focus and local scrolling. Narrow layouts collapse secondary panes instead of shrinking typography.

SACRA Graphite is the default palette. Alternate themes remap semantic roles only and never change layout or interaction.

Charts share one data model across Pixels, Octant-style and ASCII renderers. They keep real axes, ticks, units, time windows and missing-data semantics. Zero is data; missing is a gap.

Only chart-rendering ideas are adapted from `Sacraer-group/ultra-mog`. Its palette, page layout, navigation, labels and visual styling are explicitly not SACRA references. The upstream MIT notice is preserved in `docs/ULTRA-MOG-LICENSE.txt`.

## Checks

```sh
node tui/tests/charts.test.cjs
node tui/tests/coordinates-themes.test.cjs
```

Browser checks are described in `docs/QA.md`. Real terminal support must additionally verify resize, Unicode cell width, tmux/screen behavior, capability fallback, graphics cleanup and terminal-state restoration.
