# Prompt for OpenDesign / design agent

Build an **evolution of existing SACRA UI Kit**, not a new disconnected UI kit. The source of truth is the private repository `Sacraer-group/sacra-ui-kit` on main. Read its `AGENTS.md`, `site/tokens.json`, `site/src/`, `site/examples/`, `tui/docs/`, and `tui/sdk/` before drawing any new component. Existing **SACRA UI 1.4.3 / Technical Editorial** and the native Go/Rust TUI SDK are reusable foundations. Keep Graphite as the default and treat images as moodboard material, not as ready-made app layouts.

## Visual materials and direction

Use the supplied four Pinterest collages: black and gray with atmospheric violet/pink/cold blue accents, black-and-white anime/photographic cutouts, Japanese editorial graphics, paper/halftone/crosshair motifs and technically precise text. Build **SACRA Nocturne** as a new *semantic color-only* theme. Do not copy artwork. No glitter gradients or grunge texture underneath chart axes, CLI logs, forms, credentials or critical control surfaces. Keep familiar SACRA Swiss grid, mono typography, 4px spacing and tight corner radii.

## Design these screens and reusable patterns

1. Network/host overview: CPU/RAM/GPU/net throughput, peak/last sample, alert counts, stale and missing sample states, health/scope selector.
2. Network topology: host/IP/MAC/VLAN/port/interface inspector, traces, segmented topology at various scales, list fallback for narrow layouts.
3. Containers/VMs: task-focused table, selection/inspector, life-cycle states, start/stop/restart dialogs, pending and audit receipt. No real action in concept.
4. GPU/LLM: four metric gradient bars following `kb_gpu.py` (`load`, `mem`, `heat`, `power`), model TTL, TPS, queue, slots, VRAM, events and logs. Synthetic values clearly labeled.
5. Web assistant: streaming Markdown, code copy, image attachments with accessible alt, tool status and explicit approvals.
6. Native TUI: wide 120×36 and compact 80×24 screens, actual character-cell geometry, chart fallback and chat/image viewport prototypes, not web-in-terminal screenshots. Draw states for truecolor/256/16/mono.
7. Design-system showcase: tokens, component anatomy, states, interaction contracts, dark/light/Nocturne contrast and icon/typographic rules.

## Guardrails

- Reuse `s-*` components; `ds-*` only for docs. Do not redefine existing tokens under unrelated names.
- Existing theme changes modify colors **only**. Never alter layout, radii, typography, DOM or key map during a palette switch.
- Preserve `focus`, `selected`, `checked`, `pending`, `stale`, `missing`, `success`, `error` as distinct states.
- Do not fake real Proxmox telemetry, shell actions, network discovery or live model output; concepts use labeled synthetic data.
- For real images in TUI, design a renderer contract: capability probing, Kitty/iTerm2/Sixel fallback → halfblock → alt text, correct scroll/resize cleanup. Existing native SACRA SDK does **not** yet implement this feature.
- Use exact field names and version contracts from the source repository; do not invent current APIs.

## Deliverables

A. Editable reusable components with design tokens and state variants, separately for web and native TUI; B. 7 complete web mock screens; C. 5 native terminal screen mockups plus chat/media states; D. documented palette and component mapping onto upstream SACRA; E. cross-language adapter references (Rust, Go, Python, JS/TS, C++ JSONL), realistic terminal protocol matrix; F. QA for 320/390/768/1440 web and 60/80/120/160 terminal columns.

Review output against `SACRA-CONTROL-SPEC.md`. Do not call static mockups a production implementation.
