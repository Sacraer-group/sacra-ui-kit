# SACRA Control Nocturne — bug audit / 2026-10-19

**Scope:** The user-supplied Pinterest moodboards and Windows-oriented `kb_gpu.py`, the 16-file concept archive, the standalone `preview.html`, TUI reference links and the current private `Sacraer-group/sacra-ui-kit` integration contract. This is **not** an independent line-by-line audit of every original SACRA component.

## Confirmed bugs fixed in the concept

| Severity | Defect (before) | Correction (after) | Check |
|---|---|---|---|
| P1 | Network page widened the whole document to 480 CSS px at viewport widths 320/390 (grid min-content sizing) | `minmax(0,1fr)` and `min-width:0` at layout boundaries; 320/390 no overflow | Browser width matrix |
| P1 | Terminal screen linked to nonexistent `tui_demo.py` | Replaced claim with existing Go/Rust SDK locations; static screen explicitly identified | `validate_bundle.py` |
| P2 | When nav text was hidden at tablet widths, icon-only buttons had meaningless accessible names | Added 7 explicit accessible button names | HTML contract test |
| P2 | Command palette did not contain keyboard focus, and closing did not restore focus | Bounded Tab cycling, focus restoration, return focus to main view after navigation | Command palette smoke |
| P2 | Icon-only restart and command buttons lacked explicit action names | Added `aria-label`, including target workload on Restart | Static review |
| P2 | Generic image/* accepted SVG with unreviewed active/vector format semantics | Restrict local demo to PNG/JPEG/WebP/GIF; escape `src`, surface read errors and retain 8 MiB bound | Filename injection test / source review |
| P2 | The prototype's light paper mode preserved bright status colours, reducing readability | Light-mode role overrides for status/accent hues; geometry unchanged | Light screenshot and role review |
| P3 | Term bar said `LIVE PREVIEW` although it was static | `STATIC MOCK / NO PTY` | Source assertion |
| P3 | Proposed CSS introduced two unregistered semantic roles (`info`, `warning`) on top of SACRA's 17-role contract | Removed unregistered CSS vars and matching proposal JSON extras | Contract/mirror check |
| P3 | Mobile top command shortcut badge wrapped into the content region | Compact top actions below 580 px | 320 CSS px visual inspection |

Copied Python reference: fixed the invalid `\L` escape by making the LibreHardwareMonitor PowerShell command a raw string; functional payload unchanged.

## What remains intentionally **not implemented**

The mock does **not** support real network topology discovery, Proxmox/VM/LXC actions, a host adapter, streaming chat, native terminal image rendering (Kitty/iTerm2/Sixel), SSH/tmux capability probing, keyboard-interactive native TUI, production logs or production accessibility semantics. The standalone mock must not be treated as `site/` production components or native `tui/sdk` code.

`kb_gpu.py` is Windows-specific (`msvcrt`, Win32 Job Objects, LibreHardwareMonitor). Only colour interpolation and graphic conventions were exercised without importing its platform-specific modules. Collectors, fixed sample windows, power estimates and hardware names are **not** portable. Do not run its `--stop` path on a production host.

## Executed checks

- Browser UI: 7 routes × 4 viewport widths = 28 render/overflow checks, plus 4 JS exception checks and 14 interaction/safety checks = **46/46 pass**. Browser was headless Chromium, **not** macOS Safari.
- Static/source validation: 17/17 semantic roles; CSS/JSON mirror; three surface variants × five text/action foregrounds (contrast >=4.5:1); original interpolation endpoints; markup/ARIA/nav smoke.
- ZIP: all 16 entries were intact (`ZipFile.testzip()` returned no CRC error); the final ZIP is rebuilt with the fixes.
- TUI external link existence: 12/12 GitHub repositories returned current metadata; `ink-image` was last updated 2022-06-19 and should not be the primary image backend.

## Release gate to production

After converting the mock to actual shared `s-*` components and natively rendered `tui/sdk` blocks, run and publish `site/tests`, `tui/tests`, `make test` in `tui/sdk`, `cargo test --locked --all-features` in `tui/sdk/rust`, keyboard navigation across light/dark/mono themes, Safari/macOS PTY, SSH+tmux capability negotiation and live authorization/audit tests on a disposable lab environment. None of those production integration checks is implied by this concept's smoke-suite.
