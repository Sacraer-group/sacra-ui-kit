# SACRA UI Control / design-system expansion proposal

**Status:** design specification + interactive browser **mock**. **Not** a released Sacra UI Kit version or a production network-management service. 18 October 2026.

## 0. Verified starting point

Source of truth: private repository [`Sacraer-group/sacra-ui-kit`](https://github.com/Sacraer-group/sacra-ui-kit), `main` inspected on 2026-10-18.

- Web: SACRA UI **1.4.3**, `site/` with reusable `s-*` components, `--s-color-*` semantics, charts, controls, documentation, eight registered palette families. `ds-*` classes are for showcase only.
- TUI: Lab **0.2** in `tui/`, native **Go SDK 0.1** with Python and JS/TS persistent-worker bindings, **native Rust SDK 0.1** in `tui/sdk/rust` with optional Ratatui adapter, versioned JSONL for other languages.
- Native SDK currently has twelve reusable block kinds: `text`, `status`, `panel`, `row`, `column`, `kv`, `table`, `meter`, `sparkline`, `events`, `node`, `topology`. It does **not** yet include native Kitty/iTerm2/Sixel image rendering or the entire TUI Lab input/form vocabulary.
- Default identity: **SACRA Graphite**, Swiss grid / restrained brutalism / Technical Editorial, mono type, 4px spacing, 2/4/6/8px radii, yellow keyboard focus, green success, red danger. Keep default unchanged.

**Design problem:** the foundation exists, but reusable domain patterns for infrastructure control, conversational interfaces and real terminal images are missing. Filling these gaps is more valuable than renaming the design system or replacing its stack.

## 1. Visual direction: SACRA × Nocturne

Reference moodboard supplied by user: distressed Japanese editorial collage, dark anime, scanned paper, purple and magenta accents, gray/black photo textures, cyber-typography and high-contrast frames. Extract *motifs*, **not literal UI screenshots** or copyrighted illustrations:

1. **Information surface:** no collage/grain/glitch behind timeseries axes, charts, logs, code, passwords, confirmation dialogs or tables. Status and telemetry must remain legible.
2. **Expressive surface:** hero, empty state, splash, product mark, document cover, mode transition, background margin only. Optional very low-opacity geometry, large editorial index numbers, restrained Japanese texture.
3. **Shared system identity:** same semantic roles, spacing and component structure in all product themes; Nocturne is a **color-role palette**, not a second CSS framework or competing component geometry. A separate *art direction* layer can decorate selected marketing/empty-state components.
4. **Graphite remains default**. Proposed `nocturne` is opt-in; user chooses it in both portal and TUI. A theme change never changes screen layout, key bindings, icon meaning, chart axis, error/success semantics or typography.

The file `theme.nocturne.json` is the proposed **17-role** new semantic palette; `sacra-nocturne.css` is a standalone opt-in preview overlay. Neither is currently registered in the upstream web/TUI theme registry. Register all affected mirrors and tests together after visual approval.

### Typography and geometry

Use the existing SACRA font stack (SF Mono / fallback monospace), pixel-resolved grid for Web and character-cell geometry for TUI. Use 4px spacing increments on the Web and integer cells in TUI. Preserve native geometry: square terminal corners, no shadow/blur; web components retain the existing tight corner radii. Japanese/ornamental typography must not become the only representation of actions, device IDs or metric labels. Labels stay Russian/English as appropriate; icon-only controls require text/ARIA names.

## 2. Reusable component families to add

| Package (proposed) | Components | Required states and contracts |
|---|---|---|
| `monitoring` | MetricCard, ThresholdBar, Timeseries, Sparkline, HealthBadge, Peak, LastUpdated | real zero vs missing, stale samples, units, raw/aggregated origin, age of data, warning thresholds |
| `network` | DeviceRow, DeviceInspector, Interface, PortMap, Link, VLAN, RouteTable, Topology | selected/focus separated; host identity; status provenance; large topologies clipped/zoomable |
| `workloads` | VMCard, CTTable, RuntimeState, ConsoleLink, ResourceLimit, ActionMenu, OperationReceipt | starting/stopping/failed/unknown/pending; per-action RBAC; confirmation for disruption |
| `assistant` | Conversation, Message, Markdown, CodeFence, ImageAttachment, ToolCall, Progress, Composer | roles, streaming updates, cancel, retry, citations/links, image alt text, history pagination |
| `media` | ImageViewport, AttachmentChip, FilePreview, CapabilityReport | Kitty/iTerm2/Sixel or fallback, bounded decode/cache, SSH/tmux support, remove stale placements |
| `system` | ActivityStream, LogViewer, PermissionGate, AuditRecord, Toast, ConfirmDialog | immutable audit id, action target, result, error category, no false success |

Create domain components once at the **semantic level**, then render separately in web and native TUI. Do not convert the web DOM into ANSI or a browser screenshot into a terminal renderer.

## 3. Portal IA / navigation

**Primary workspace:** Overview → Network → Hosts → Containers & VMs → GPUs & Models → Assistant & Media → Alerts & Logs → Settings.

- **Overview:** fleet health, alert count, aggregated CPU/RAM, network traffic, recent changes, selected scope, provenance of each metric.
- **Network:** topology view + list fallback, VLAN/subnets, interfaces, ports/links, DHCP/ARP/discovery provenance, route/packet-loss inspector. No assumed automatic discovery via one protocol.
- **Hosts:** Proxmox nodes, disks/storage, sensors, CPU/GPU, running workloads, power/thermal events. Detail inspector and timeline.
- **Containers & VMs:** filterable table and detail pane; start/stop/restart available **only through a trusted backend**, with pending states, typed confirmation for dangerous actions, role checks, audit trail and timeout outcome.
- **GPU & LLM:** memory, GPU utilization, power/temp, per-process memory, models, group, state, TTL, tokens/s, decode/s, slots, queue, event list. Expose estimate/source when power or VRAM per process is unavailable.
- **Assistant & Media:** rich conversation with inline images, files, formatted code/Markdown, response streaming and inspectable action approvals. No uncontrolled shell commands from chat output.
- **Alerts & Logs:** event timestamps, severity, source, correlation ID, search/filter, and stale-data banner.

**Web responsive contract:** desktop at 1440+ with nav/content/inspector; tablet at 768 switches inspector to a drawer and local table scrolling; 390/320 supports one main region + bottom actions without global horizontal scrolling. Keep actual controls clickable at touch size, preserve keyboard focus and screen-reader content.

## 4. TUI layout contract

| Terminal | Layout | Priorities |
|---|---|---|
| **≥120 columns × ≥36 rows** | header + nav / content / inspector + keybar | chart plus node list; chat with image viewport where available |
| **80–119 columns** | top tabs + single focus region + collapsible inspector | event table, work queue, summary; image viewport hidden until selected |
| **<80 columns** | compact single view with keyboard paging | latest metrics, actionable list, text alternative for charts/images; do not shrink type |

Native input modes: Normal → Search/Compose/Confirm → Normal. `Esc` unwinds exactly one level. Distinguish focus, selected, checked, pending, stale, missing and actual zero. All device controls are explicit actions, not implicit `Enter` side effects; destructive operations default to cancel.

**TUI chat:** scrollback as message records, virtualization by viewport, assistant streaming chunks, code fences with horizontal local scrolling, composer history, `/` search, `Ctrl+C` semantics that do not accidentally kill managed processes. Chat text is treated as data and sanitized before it touches ANSI output. Image placements are attached to message IDs and deleted on scroll/resize/exit.

**Actual images:** detect terminal capability per session with timeouts; prefer Kitty Graphics where genuinely available, otherwise iTerm2 inline images / Sixel as appropriate, then Unicode halfblocks and finally a text card with filename, dimensions and alternate description. SSH, tmux and multiplexers are separate compatibility cases. Never claim a full-resolution image was displayed when only halfblocks/alt text were sent. Bounded image decode and max texture memory are required. Renderers must clean up placements and restore terminal state on all exits.

## 5. Telemetry / chart contract

From user-provided `kb_gpu.py` use its *presentation ideas*, not the Windows-specific collectors: `PALETTES`, `_lerp`, `grad`, `bar`, `render`, per-model table, peaks, TTL, events/logs. Source facts: poll period **2 seconds**; GPU via `nvidia-smi`; CPU temperature/power optionally from Windows LibreHardwareMonitor; estimated CPU power is not a sensor value. A Linux host agent needs independent collectors/metrics, and data sources must be visible in UI.

- Gradient bars: **load** green→yellow→red; **memory** cyan→violet→pink; **temperature** blue→amber→red; **power** green→yellow→orange. These are **metric palettes**; they are not a replacement for success/warning/error roles.
- Every chart must specify unit, bounds, time window and actual sample timestamp. Zero is a sample, null/NaN/stale is not zero; gap the series rather than inventing a line. Graph cursor/labels use the same bounds as the data.
- Values normalize to documented thresholds. E.g., temperature need not be `temp/100`; configure safe/warn/critical per GPU/CPU model, show actual °C regardless. Use peak history based on selected time window or explicit session peak.
- The Web and native terminal share metric JSON, alert semantics and chart tokens, **not** one rendering backend. Native capabilities: plain Unicode/ANSI, ASCII, optional pixel subcell backends after separate implementation and QA.

## 6. Frontend/backend separation

**Proposed API**, not an assertion about existing endpoints:

```
GET  /v1/fleet/snapshot       # user-authorized objects and freshness metadata
GET  /v1/hosts/{id}/metrics   # metric series and metadata
GET  /v1/network/topology     # topology nodes/edges + discovery provenance
GET  /v1/workloads           # VM/CT read view
POST /v1/workloads/{id}/actions  # audited, idempotent action with approval
GET  /v1/operations/{id}     # pending/result/failure
GET  /v1/events              # paged, filtered audit/event view
WS   /v1/stream              # snapshots and action status updates
```

Data collectors are adapters: Proxmox API, LXC/containers, host sensors (`proc`, NVML or `nvidia-smi`), networking and model runtime. The server owns credentials. Portal and TUI consume a shared stable domain schema; clients cannot directly execute arbitrary commands via chat output. Secure remote access (TLS/VPN), RBAC, CSRF for web, audit, and explicit confirmation are prerequisites to any live workload control.

## 7. Implementation stages and acceptance

**Phase A — baseline + tokens:** compare current `site/` and `tui/` with mock; register Nocturne **17 semantic roles** into web/TUI registries and test mirrors, preserve Graphite default; add screenshot/story states, contrast matrix, accessibility review. *Accept:* palette change does not affect geometry/behavior; keyboard focus visible.

**Phase B — domain components:** add reusable monitoring/network/workload UI components with synthetic fixtures **clearly marked**. Build web Overview/Network/Containers and TUI Overview/Workloads with real SDK blocks. *Accept:* 320/390/768/1440 px and 60/80/120/160 columns, zero/null/stale/pending tests, no action sent to a host.

**Phase C — media/chat:** richer Markdown+code+image messages, one shared content model, terminal image capability probe and protocol adapters, correct tmux/SSH fallback, clipboard/a11y. *Accept:* PNG/JPEG formats with size/decode caps; resize/scroll/exit clean image placements, no control-sequence injection.

**Phase D — backend:** connect read-only collectors first, then authorized actions with audit and confirmations. *Accept:* users cannot act beyond scopes, backend reports exact failures; no fake success or stale health masquerading as fresh.

**Phase E — release:** code + visual tests for each palette, Go SDK `make test`, native Rust `cargo test --locked --all-features`, chart tests, docs/examples and versioned changelog. Cross-platform claims require real target OS/terminal tests.

## 8. Files in this concept bundle

- `preview.html` — navigable 7-view **self-contained mock**, with synthetic data, local-only interaction. This is a visual *study*, not a drop-in `s-*` implementation.
- `theme.nocturne.json` — proposed palette mapped to SACRA's color-role keys; includes four gradient preset families.
- `sacra-nocturne.css` — opt-in CSS override proof of concept for `data-s-theme="nocturne"`; upstream theme registry not modified.
- `TUI-REFERENCES.md` — real multi-language libraries and image-rendering references.
- `OPENDESIGN-PROMPT.md` — detailed prompt to generate/adapt SACRA design components from moodboards without discarding baseline.

Sources: [`site/tokens.json`](https://github.com/Sacraer-group/sacra-ui-kit/blob/main/site/tokens.json), [`AGENTS.md`](https://github.com/Sacraer-group/sacra-ui-kit/blob/main/AGENTS.md), [`tui/sdk/rust/README.md`](https://github.com/Sacraer-group/sacra-ui-kit/blob/main/tui/sdk/rust/README.md), [`tui/sdk/README.md`](https://github.com/Sacraer-group/sacra-ui-kit/blob/main/tui/sdk/README.md), [`tui/docs/SOURCES.md`](https://github.com/Sacraer-group/sacra-ui-kit/blob/main/tui/docs/SOURCES.md), [`skills/sacra-ui-build/SKILL.md`](https://github.com/Sacraer-group/sacra-ui-kit/blob/main/skills/sacra-ui-build/SKILL.md), [`skills/sacra-ui-tui/SKILL.md`](https://github.com/Sacraer-group/sacra-ui-kit/blob/main/skills/sacra-ui-tui/SKILL.md).
