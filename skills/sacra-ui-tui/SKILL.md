---
name: sacra-ui-tui
description: Build or adapt terminal user interfaces with the SACRA TUI design system. Use for TUIs, terminal dashboards, CLI workspaces, process/task monitors, terminal forms, tables, inspectors, command palettes, theme pickers, keyboard navigation, and terminal-first layouts that should follow SACRA rather than web UI conventions.
metadata:
  author: Sacraer-group
  version: "1.0.0"
  argument-hint: <terminal-screen-or-feature>
---

# SACRA UI TUI

Build a real terminal interface, not a web screen squeezed into a terminal and not an ultra-mog visual clone.

## Reference priority

Resolve the TUI reference in this order:

1. current `sacra-ui-kit` checkout with `tui/`;
2. `$HOME/.codex/sacra-ui-kit/tui/`;
3. bundled `references/tui-design.md`.

When the full reference is available, inspect `tui/index.html`, `tui/docs/DESIGN.md`, `tui/docs/COMPONENTS.md`, `tui/docs/THEMES.md`, `tui/examples/`, and the relevant tests.

## Geometry

- Think in terminal cells, not CSS pixels. Use one row for ordinary controls and one-cell borders.
- Keep title/status/key bars fixed when the content region scrolls.
- Prefer straight borders, square corners, no shadows and no blur.
- At wide widths allow navigation + content + inspector; progressively collapse to content + inspector, then one main pane. At very narrow widths show one view at a time rather than shrinking type.
- Align names left and numbers right. Measure terminal display width, not UTF-8 byte length; production implementations must handle wide/combining graphemes safely.
- Use one terminal text size. Hierarchy comes from grouping, rules, whitespace, labels and contrast, not giant headings.

## State contract

Keep these states distinct:

- **focus**: current keyboard target; accent border/marker;
- **selected**: record opened in the inspector; persistent marker/fill independent of focus;
- **checked**: `[×]` / `(•)` value, not a selected row;
- **pending**: temporarily blocks repeat action;
- **success/error**: textual `[OK]` / `[ERR]` plus semantic color;
- **missing**: `N/A` or `—` plus reason; never convert missing telemetry to zero;
- **stale**: last known value with age, distinct from missing.

## Components and input

Start from the patterns in `tui/docs/COMPONENTS.md`: panel/frame, sidebar/tree, table, inspector, metric, charts, button, checkbox/radio, select, input, tabs, progress, pagination, status, logs, code block, command palette and confirmation dialog.

Keyboard is primary. Preserve a clear Normal → Input/Confirm → Normal model, make Escape go back exactly one level, and keep destructive confirmation separate with the safe action selected first. Do not trap terminal shortcuts accidentally; document keys in a fixed key bar/help view.

## Themes

SACRA Graphite is the default. The reference also contains Nord, Gruvbox Dark, Dracula, Tokyo Night, Solarized Dark, Solarized Light and Mono Graphite role mappings.

Themes change semantic color roles only. They must not change geometry, labels, keyboard behavior or component structure. Keep text/symbol state cues so mono/limited-color terminals still work. Do not copy btop or ultra-mog layout/styling just because a palette family came from there.

## Implementation

Follow the target project's language and existing TUI stack first. Keep data → state → layout → renderer → input separate. Avoid adding a second framework for one screen. The browser lab is a visual/state reference only; do not ship its DOM/Canvas code as a native terminal backend.

For another project, copy or translate the required contracts from `tui/`; do not runtime-link the private reference checkout.

## Verification

At minimum check narrow and wide terminal sizes, resize, keyboard-only operation, focus vs selection, modal/confirm escape paths, missing/stale data, theme changes, and cleanup/restoration of terminal state on exit/error. Use the smallest relevant checks under `tui/tests/` when working in this kit.
