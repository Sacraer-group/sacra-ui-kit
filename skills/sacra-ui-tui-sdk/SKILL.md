---
name: sacra-ui-tui-sdk
description: Build native SACRA terminal screens from reusable blocks in Go or Rust, use Python/JavaScript/TypeScript bindings, or integrate another language through the versioned JSONL renderer protocol. Use for native terminal topology, Ratatui widgets, agent dashboards, composable panels, tables, metrics, logs, bindings and SDK integration.
metadata:
  author: Sacraer-group
  version: "1.1.0"
  argument-hint: <native-block-or-integration>
---

# SACRA native TUI SDK

Resolve the kit from the current checkout, then `$HOME/.codex/sacra-ui-kit`,
then `references/native-sdk.md`. Read `tui/docs/NATIVE-SDK.md` for implementation
status. For Go/bindings read `tui/sdk/README.md`, `tui/sdk/docs/CONTRACT.md`
and `tui/sdk/docs/UNICODE.md`. For Rust read `tui/sdk/rust/README.md`,
`tui/sdk/rust/QA.md`, `tui/sdk/rust/src/` and `tui/sdk/rust/examples/`.
Use `tui/topology/` as a browser reference only, never as a native backend.

## Select the actual integration

Go: import package `sacratui` from
`github.com/Sacraer-group/sacra-ui-kit/tui/sdk/go`.

Rust: import crate `sacra-tui` as `sacra_tui` from `tui/sdk/rust`.
This is a native in-process implementation: no Go-worker, subprocess, browser
or FFI is needed. `render(&Block, &Options)` returns a native frame.
The optional `ratatui` feature supplies `ratatui_widget::FrameWidget` for the
host's existing Ratatui Terminal. The optional `terminal` feature enables the
interactive `sacra-tui-rs` demo; neither feature is required by the core.

Python: `tui/sdk/python/sacra_tui`; JS/TS: `tui/sdk/javascript`.
These existing bindings use a built `sacra-tui --stdio` Go process by default.
They are not independent language ports. Keep one Client alive, set a timeout,
close it. Other languages may implement JSONL v1; do not invent a C#, Java or
C++ package. Rust also exposes an optional JSONL worker, separate from its
in-process library. Do not publish this private kit to public registries.

## Compose instead of copying a whole screen

Use only needed blocks: text, status, panel, row, column, kv, table, meter,
sparkline, events, node, topology. Both native implementations return lines,
semantic runs, regions and optional ANSI; they do not own input or terminal
state. Keep an existing host framework. Do not embed DOM/Canvas/Electron as
a terminal backend. Fixed bars use height:1; content uses weight:1 plus local scroll.

For Rust start from `Block::text`, `Block::panel`, `Block::row`,
`Block::column`, `Block::node` or `Block::topology`. Construct additional types
with `Block::new(kind)` and typed fields. `FrameWidget` consumes a prepared
frame; render it at the target area dimensions before passing it to Ratatui.

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
Pixels/Octant/Kitty and all original Lab forms are not implemented by either
0.1 native renderer. Read each implementation's Unicode limits: Rust uses
unicode-segmentation/unicode-width, while Go has a conservative local profile.
Neither implies universal terminal emoji-width compatibility. Width is not
UTF-8 length. Do not bundle font files.

## Verify

For Go/bindings run `make test` in `tui/sdk`.
For Rust run from `tui/sdk/rust`:

```sh
cargo test --locked --all-features
cargo clippy --locked --all-targets --all-features -- -D warnings
cargo build --locked --features terminal
python3 tests/cli.py
```

The Python test uses Unix PTY and is not a Rust runtime dependency.
For browser edits use `make test-browser` and the topology regression matrix.
Check small/wide sizes, resize, actual null/zero, focused versus selected,
malformed inputs, timeout cleanup, no terminal-control injection, and terminal
restoration on exit/error. Cross-compilation is not execution on the target OS.
