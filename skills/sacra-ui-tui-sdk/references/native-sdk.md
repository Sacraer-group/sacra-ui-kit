# Native SDK compact reference

Canonical paths: `tui/sdk/go`, `python/sacra_tui`, `javascript`,
`schema/request.schema.json`; browser reference: `tui/topology/index.html`.
Build from `tui/sdk`: `sh scripts/build.sh`; `bin/sacra-tui --demo` or `--snapshot`.
Go 1.23+, no external Go dependencies. Python/JS need this persistent executable,
located through `SACRA_TUI_BIN` or PATH. Go integrates in process.

Protocol: one UTF-8 JSON object per line; version:1, string id, op:render/hydrate/info.
Render takes block and options `{width,height,theme,color,ascii,scrollY,focusId,selectedId}`.
Returns `{version,id,ok,frame}` or error. Frame contains lines, runs, regions;
ANSI contains SGR only. Host owns terminal modes/input and network adapters.

Blocks: text/status/panel/row/column/kv/table/meter/sparkline/events/node/topology.
Exact placeholders preserve JSON types; null is missing and 0 is a value.
One-cell geometry and eight semantic palettes. Built-in topology becomes a list
below 96 columns or above three workers. No native Pixels/Octant or full forms.
Unicode profile is conservative, not full UAX #29; do not claim universal emoji width.
Tests: `make test`, `make test-browser`; cleanup clients and terminal modes.
