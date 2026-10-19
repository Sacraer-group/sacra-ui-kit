# SACRA Nocturne · UI QA

Checked on 2026-10-19.

## Implementation

- Replaced pseudo-icons (side nav, brand, theme picker, command search,
  controls, chat avatars, attachment, send, start/stop/restart, host/resources,
  network topology) with 32 verified official Lucide SVG paths.
- Bundled the icon sprite within `preview.html` for offline use. No CDN,
  runtime import, font file or invented icon glyphs required.
- Added per-host CPU/RAM/disk/network/GPU metrics and top 3 processes.
- Added per-VM/LXC resource and process cards and terminal process examples.
- Network map now selects a host inspector using semantic button elements.
- Status labels translated to `ACTIVE / INACTIVE`, and dynamic actions reflected
  in the overview service badges and workload registry.
- Fixed the `.topomap svg` selector conflict (full-size SVG rule was stretching
  Lucide icons into oversized overlays). Corrected core-switch fixture IP.
- Removed double-active-looking nav hover card: only the active route receives
  the persistent filled navigation state.

## Validated

- JS syntax: `node --check` succeeded.
- Chromium Playwright: 270 assertions passed over 7 routes and 5 viewport widths
  (320, 390, 768, 1024, 1440 CSS px).
- Checked no JS exceptions, no page-global horizontal overflow, one active nav
  item per route, proper icon symbol resolution, machine/process counts, host
  selection, inactive data behavior, and demo-only start/stop actions.
- Visually inspected desktop and 390px captures. CSS stretch bug fixed.

## Limits

- This is a *standalone offline web concept* with synthetic fixtures, not actual
  Proxmox/LXC/Rust/Go native TUI application behavior.
- Chromium navigation to local files and localhost is blocked by the test
  environment administrator. Browser tests used Playwright `set_content()` to
  exercise the full standalone HTML/CSS/JS. Navigation load from a real HTTP
  server, Safari, accessibility audits and remote terminal graphics are NOT
  claimed as verified.
- Visual QA screenshots are generated with Chromium, not verified on macOS Safari.