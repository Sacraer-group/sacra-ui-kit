---
name: sacra-ui-tui
description: Design, implement, or review terminal user interfaces in the SACRA TUI design system. Use for TUI dashboards, monitors, task/workspace screens, terminal forms, keyboard navigation, tables, dialogs, themes, coordinate charts, pixel/octet/ASCII chart fallbacks, terminal capability degradation, or porting a SACRA web workflow into a real terminal interface.
metadata:
  author: Sacraer-group
  version: "1.0.0"
  argument-hint: <terminal-screen-or-feature>
---

# SACRA UI TUI

Use the dedicated terminal design system. Do not make a web page look terminal-like and do not copy ultra-mog's visual styling.

## Reference priority

Resolve the full kit in this order:

1. current `sacra-ui-kit` checkout containing `tui/`;
2. `$HOME/.codex/sacra-ui-kit/tui/`;
3. bundled `references/tui.md`.

When the full reference exists, read these before implementation:

- `tui/docs/DESIGN.md` — layout, states, keyboard and integration contract;
- `tui/docs/COMPONENTS.md` — component behavior;
- `tui/docs/THEMES.md` — role-based palettes and theme switching;
- `tui/docs/SOURCES.md` — exact boundary around ultra-mog-derived chart ideas;
- `tui/index.html` — executable browser simulation;
- `tui/examples/` — minimal chart/layout contracts;
- `tui/tests/` — runnable invariants.

## Design contract

- Layout is measured in terminal cells, not arbitrary pixels. Keep straight one-cell borders, fixed top/status rows and local scrolling.
- Do not shrink typography to rescue a narrow terminal. Collapse secondary panes instead.
- Keep `focus`, `selected`, `checked`, `pending`, `success`, `error`, `missing`, and `stale` visually and semantically distinct.
- SACRA Graphite is the default palette. Alternate themes remap the same semantic roles; they do not change layout or interaction.
- Yellow/accent means navigation/action; success and error use their semantic roles plus text/symbols. Never communicate state with color alone.
- Use local monospace fonts and terminal-safe symbols. Nerd glyphs are optional decoration, never required behavior.
- Destructive actions require an explicit confirm state; Escape backs out one mode at a time.

## Keyboard

Prefer boring terminal conventions: arrows plus `j/k` where useful, `/` for filter/search, `:` for commands, `?` for help, `Esc` for one-level cancel/back. Do not steal shell/tmux shortcuts without a concrete product reason. Input fields win over global hotkeys while editing.

## Charts

The TUI chart system has one data model and multiple renderer capabilities:

- Pixels / terminal graphics when the terminal explicitly supports them;
- Octant-style sub-cell line rendering as the default Unicode fallback;
- ASCII line rendering as the conservative fallback.

All renderers share real axes, units, coordinate grid, ticks, time window, legend and missing-data semantics. Missing samples split segments; zero remains a real baseline value. Never connect across missing data or turn `N/A` into `0`.

The chart *ideas* were adapted from `Sacraer-group/ultra-mog`; its palette, layout, frame styling, navigation and labels are explicitly not SACRA references. See `tui/docs/SOURCES.md` and preserve the upstream MIT notice in `tui/docs/ULTRA-MOG-LICENSE.txt`.

## Themes

Use role-based themes from `tui/assets/themes.json`. Current browser reference includes SACRA Graphite plus Nord, Gruvbox Dark, Dracula, Tokyo Night, Solarized Dark, Solarized Light and Mono Graphite. Theme switching must preserve current view, selection, input and pause/play state.

If implementing native terminal themes, map roles to the terminal capability level instead of embedding browser CSS. A 256-color or monochrome adapter is a renderer concern, not a new design system.

## Native implementation

Choose one native stack only when the target product requires it. Rust/Ratatui is suitable for Rust products; Go should use a Go TUI stack. Keep data -> state -> layout -> renderer -> input separated. Probe capabilities before terminal graphics and always restore terminal mode/placements on exit or error.

## Verification

For changes to the reference lab:

```sh
node tui/tests/charts.test.cjs
node tui/tests/coordinates-themes.test.cjs
```

Browser checks require Playwright/Chromium and are described in `tui/docs/QA.md`. For a native TUI additionally test resize, narrow widths, Unicode cell width, tmux/screen behavior, capability fallback and terminal-state restoration. Do not claim native-terminal support from the browser simulation alone.
