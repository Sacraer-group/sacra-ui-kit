# SACRA TUI compact reference

Canonical full reference: `tui/` in `sacra-ui-kit` or `$HOME/.codex/sacra-ui-kit/tui/`.

Use a cell-based terminal layout with straight borders, one text scale, local scrolling, visible keyboard focus and separate selected/checked states. Default theme is SACRA Graphite; alternate themes remap semantic roles only. Accent is navigation/action, success and danger remain semantic and always include text/symbols.

Charts share one data model across Pixels, Octant and ASCII renderers. Keep real axes, ticks, units, time window and coordinate grid. Missing data splits a series; zero is a real baseline sample. Pixel/Octant/ASCII are capability fallbacks, not different chart semantics.

`ultra-mog` is only a source for chart rendering ideas (segmentation, bounded raster, sub-cell/ASCII fallbacks and compact trends). Never copy its visual styling, palette, page layout or navigation into SACRA TUI.

Core reference files: `tui/docs/DESIGN.md`, `COMPONENTS.md`, `THEMES.md`, `SOURCES.md`, `tui/index.html`, `tui/examples/`, `tui/tests/`.
