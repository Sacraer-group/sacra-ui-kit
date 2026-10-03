---
name: sacra-ui-tui-sdk
description: Build native SACRA terminal screens from reusable blocks in Go, Python, JavaScript or TypeScript, or integrate another language through the versioned JSONL renderer protocol. Use for native terminal topology, agent dashboards, composable panels, tables, metrics, logs, bindings and SDK integration.
metadata:
  author: Sacraer-group
  version: "1.0.0"
  argument-hint: <native-block-or-integration>
---

# SACRA native TUI SDK

Resolve the kit from the current checkout, then `$HOME/.codex/sacra-ui-kit`,
then `references/native-sdk.md`. Read `tui/sdk/README.md`, `docs/CONTRACT.md`
and `docs/UNICODE.md`. Use `tui/topology/` as a browser reference only.

## Select the actual integration

Go: import package `sacratui` from
`github.com/Sacraer-group/sacra-ui-kit/tui/sdk/go`.
Python: `tui/sdk/python/sacra_tui`; JS/TS: `tui/sdk/javascript`.
Both bindings require a built `sacra-tui --stdio` process. They are not
independent language ports. Keep one Client alive, set a timeout, close it.
Other languages implement the version-1 JSONL protocol; do not claim a Rust,
C#, Java or C++ package exists. Do not publish this private kit to registries.

## Compose instead of copying a whole screen

Use only needed blocks: text, status, panel, row, column, kv, table, meter,
sparkline, events, node, topology. Go `Render` returns lines, semantic runs,
regions and optional ANSI; it does not own input or terminal state.
Keep an existing host framework. Do not embed DOM/Canvas/Electron as a terminal
backend. Fixed bars use height:1; flexible content uses weight:1 plus local scroll.

## Data boundaries

Feed actual provider/model/params/metrics/extra JSON. Exact `{{path}}` bindings
preserve false/0/null/objects; missing native bindings are errors. No eval.
Selection, focus, checked and runtime state are distinct. The host owns events,
clock, polling, SSE/WS and approvals. Renderer does not simulate real progress.
`session.source: synthetic` is the explicit browser demo opt-in.
Do not expose credentials in snapshots, frames, inspector data or logs.

## Geometry and capabilities

Think in cells. Themes change semantic colors only. Built-in topology handles
main/router/workers/review/architect, not an arbitrary DAG. Under 96 columns or
above three workers it becomes a list without invented sequential connections.
Native colors: none/ANSI16/truecolor; ASCII replaces geometry glyphs only.
Pixels/Octant/Kitty and all original Lab forms are not implemented in SDK 0.1.
Read the conservative Unicode profile; never promise complete grapheme/emoji
compatibility. Width is not UTF-8 length. Do not bundle font files.

## Verify

Run `make test` in `tui/sdk` (Go race/vet, bindings, schema, PTY, strict TS).
For browser edits use `make test-browser` and the full topology regression matrix.
Check small/wide sizes, resize, actual null/zero, focused versus selected,
malformed inputs, timeout cleanup, no terminal-control injection, and terminal
restoration on exit/error. Cross-compilation is not execution on the target OS.
