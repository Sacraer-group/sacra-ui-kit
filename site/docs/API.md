# SACRA UI API

- `SacraControls.enhance(root)` / `refresh(select)` — custom selects backed by native values/events.
- `SacraUtils.copy(text,{trigger,message})` — real copy result with success/error feedback.
- `SacraCharts.mount(host,spec)` — SVG chart runtime.
- `await SacraMotion.ready; SacraMotion.mount(canvas,options)` — real WASM geometry + Canvas renderer.
- `SacraWorkspace.mount(host,{persist:false})` — table/kanban/inspector workspace.
