# Native SDK compact reference

Resolve the full kit from the current checkout or `$HOME/.codex/sacra-ui-kit`.
Canonical implementations: `tui/sdk/go` and `tui/sdk/rust`.
Bindings: `tui/sdk/python/sacra_tui`, `tui/sdk/javascript`.
Wire schema: `tui/sdk/schema/request.schema.json`.
Browser reference: `tui/topology/index.html`; do not use its DOM as a native backend.

Go: build from `tui/sdk` with `sh scripts/build.sh`; `bin/sacra-tui --demo`
or `--snapshot`. Go 1.23+, no external Go dependencies. Python/JS clients use
this persistent executable by default through `SACRA_TUI_BIN` or PATH.

Rust: `tui/sdk/rust`, crate `sacra-tui`, import `sacra_tui`.
Read `tui/sdk/rust/README.md`, `QA.md`, `src/` and `examples/`.
Rust `render(&Block, &Options)` operates inside the host process: no Go, subprocess,
FFI or browser. Native builders: Block::text/panel/row/column/node/topology;
Block::new(kind) exposes the remaining block kinds. `Frame` has lines/runs/cells/
regions and optional ANSI. Feature `ratatui` adds a FrameWidget for an existing
Ratatui Terminal. Feature `terminal` adds the interactive CLI. Both are optional.
From `tui/sdk/rust`: `cargo run --locked --release --features terminal --bin sacra-tui-rs -- --demo --color truecolor`.
Use a project dependency or vendor copy, not a production dependency on the
agent's home directory. The private crate is not published to crates.io.

Protocol: one UTF-8 JSON object per line; version:1, string id, op:render/hydrate/info.
Render takes block and options `{width,height,theme,color,ascii,scrollY,focusId,selectedId}`.
Returns `{version,id,ok,frame}` or error. ANSI contains SGR only. Host owns terminal
modes, input, time and network adapters. Rust exposes JSONL as an optional transport,
not as a prerequisite for native Rust use.

Blocks: text/status/panel/row/column/kv/table/meter/sparkline/events/node/topology.
Exact placeholders preserve JSON types; null is missing and 0 is a value.
One-cell geometry and eight semantic palettes. Built-in topology becomes a list
below 96 columns or above three workers. No native Pixels/Octant or full forms.
Go has a conservative Unicode profile; Rust uses unicode-segmentation/unicode-width.
Neither guarantees identical emoji width in all terminal emulators.

Go/bindings tests: `make test` in `tui/sdk`; browser: `make test-browser`.
Rust: `cargo test --locked --all-features`, `cargo clippy --locked --all-targets --all-features -- -D warnings`,
`cargo build --locked --features terminal`, `python3 tests/cli.py` from `tui/sdk/rust`.
The CLI test uses Unix PTY. Close owned clients and restore terminal modes.
