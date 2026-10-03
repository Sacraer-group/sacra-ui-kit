# SACRA TUI charts compact reference

A TUI history chart is defined by data segments, numeric bounds, a time window, units, coordinate frame and renderer. Zero is valid; missing/NaN/Infinity and large time gaps split segments. Never bridge unknown data or replace it with zero.

Full charts use real X/Y labels, ticks, optional guides, corner markers and a cursor/crosshair. The visual center is not zero unless the numeric bounds make it zero. Compact sparklines/bars may omit axes.

Renderer fallback: terminal pixel graphics only after capability probing → Octant/subcell → ASCII. All modes consume the same segments and bounds. Browser Canvas examples are simulations, not terminal graphics transport.

Charts use active SACRA TUI semantic theme roles. Theme changes color only; data, bounds, labels, geometry and keyboard behavior remain unchanged. Legends/text/symbols must keep multi-series charts understandable without color.
