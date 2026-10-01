# SACRA data-viz compact reference

Motion: `SacraMotion.ready` resolves when the embedded/loaded WASM core is ready. `SacraMotion.mount(canvas, options)` returns a view with play/pause/state-style control. Geometry originates in `geometry.wasm` compiled from `src/geometry.c`; JavaScript renders it.

Charts: `SacraCharts.mount(host, spec)` renders the provided chart spec. Use existing chart types rather than adding a dependency first. Provide accessible labels/data alternatives and explicit units. Synthetic data must be labeled as demo/synthetic.

Visuals stay within the SACRA palette: graphite canvas/surfaces and yellow primary series. Green/red are semantic target/success/danger channels. Avoid rainbow palettes and glow.
