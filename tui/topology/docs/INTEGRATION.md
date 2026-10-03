# Integration contract

The browser lab is deliberately data-source agnostic. The fixed SACRA geometry reads one plain object.

## Direct payload

```js
SacraTopology.setData({
  session: { id: "abc", source: "codex" },
  runtime: { maxThreads: 6 },
  nodes: [
    {
      id: "main",
      slot: "main",
      role: "MAIN",
      model: { provider: "openai", name: "your-model", effort: "high" },
      state: "running",
      task: "current task",
      params: { context: 400000, temperature: 0.2 },
      metrics: { tokens: 12000, calls: 4 }
    }
  ],
  events: [],
  extra: { anything: "project-specific" }
});
```

## Async adapter

```js
await SacraTopology.useAdapter(async () => {
  return await client.getCurrentAgentRun();
});
```

The adapter can sit on top of Codex, OpenCode, an agent harness, log parser, SSE/WebSocket bridge, or a saved session file. The renderer does not know or care about the provider.

## Placeholder template

`data/topology.template.json` contains `{{path.to.value}}` placeholders. Hydrate it with:

```js
const payload = SacraTopology.hydrateTemplate(template, values);
SacraTopology.setData(payload);
```

`params`, `metrics`, and `extra` are intentionally open-ended so a future integration can carry model ids, effort, context, price, latency, tools, MCPs, approvals, hostnames, retries, or arbitrary project metadata without changing the renderer contract.

## Slots

Canonical preview slots: `main`, `router`, `worker1`, `worker2`, `worker3`, `architect`, `review`.

This is a visualization contract, not an orchestration protocol. A real integration maps its own runtime graph into those slots or extends the renderer later.

## Geometry refresh (0.3.2)

Routes use visual slots, not provider names or model IDs. The SVG uses a
`viewBox` matching its painted `getBoundingClientRect()` size. Card rectangles
are expressed relative to that same rectangle; layout does not call
`getScreenCTM()` or mix zoomed DOM coordinates with local SVG units.
The attachment clearance is three viewport CSS pixels.

Shared fork/merge lanes are outside card bounds. Hidden and empty slots do not
receive dangling connectors. A continuous underlying rail keeps animated dash
patterns from making a junction look disconnected. SVG path identities persist
across phase and selection updates, so unchanged animations do not restart.

`ResizeObserver` handles changed text/metric heights and wrapper dimensions.
`SacraTopology.refreshLayout()` is available after host-level position or CSS
transform changes. It does not alter data, selected node, playback, scroll or theme.
Axis-aligned translation/scaling is covered; rotated/skewed hosts are not supported.

## Live updates and scroll (0.3.2)

Within a view, the renderer patches existing DOM elements rather than replacing
`#screen`. The scrollable event/code containers, focused node buttons, and SVG
paths remain the same elements. Scroll positions are preserved synchronously;
there is no deferred restoration that could override a later user gesture.
The event area reserves 150 CSS pixels to prevent initial log growth from
changing the page height on each tick. The renderer does not force the feed to
the bottom on every event.

For a refresh of the same `session.id`, `setData(payload)` preserves the current
synthetic phase and the selected node if its ID still exists. Incoming `events`
are retained. A different session resets the synthetic phase to zero. `reset()`
is the explicit operation that clears synthetic events and resets the phase.

A deliberate view switch mounts the new view. If content or a view becomes
shorter than the current scroll position, the browser may clamp to its new
maximum; this is not an automatic return to the top on an animation tick.


## SDK integration 0.3.3

`session.source === "synthetic"` enables the browser phase simulator. Other
sources display their supplied node states and events literally, without fake
confidence bars. Native blocks and JSONL adapters live in `../../sdk/`; this
DOM renderer is not the native backend. See `../../sdk/README.html`.
