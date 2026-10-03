# SACRA TUI compact reference

Use a character-cell layout: straight one-cell borders, square corners, one text size, fixed title/status/key bars, locally scrollable content, names left and numbers right. Wide layout may show navigation + content + inspector; collapse to fewer panes as columns shrink instead of shrinking type.

Keep focus, selected and checked separate. Focus uses the active accent, selected is a persistent row/object state, checked uses `[×]` or `(•)`. Success/error always include `[OK]`/`[ERR]`; missing values are `N/A`/`—` with a reason, never zero; stale values keep age metadata.

Keyboard is primary: Normal/Input/Confirm modes, Escape backs out one level, destructive actions require explicit confirmation. Use panels, tables, inspector, metrics, tree, select, input, tabs, progress, pagination, logs, command palette and confirmation patterns consistently.

SACRA Graphite is default. Alternate palettes remap the same semantic roles only; geometry and behavior never change with the theme. Mono must remain understandable without color.

The browser lab is a reference, not a terminal transport. Native implementations must handle actual terminal cell width, Unicode graphemes, resize, terminal restoration and capability probing.
