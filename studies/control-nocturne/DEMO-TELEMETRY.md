# SACRA Control · Machine Resources & Processes

## Scope

This package is an offline design concept, NOT a Proxmox agent, SSH dashboard,
working process monitor, or permissioned container management system.
All hostnames, IPs, percentages, wattage, PIDs, processes, RAM, disk capacities
and statuses are **synthetic UI fixtures**; no polling, API or host control exists.

## UX contract

- `ACTIVE` and `INACTIVE` are the English state names across overview, models,
  registry, workload cards and network inspector. `ERROR` is a different state.
- Per machine display CPU%, used/total RAM, disk occupancy, RX/TX link rates,
  optional GPU VRAM, and **TOP 3 processes ranked descending by CPU%**.
- If a machine is inactive, do not present running processes. If a router/switch
  does not expose OS process data, display `N/A`, not zero or made-up processes.
- Values preserve units. Compact resource bars are supplementary to numeric text.
- Each network device is keyboard-selectable; selected and focused are separate.
- VM/LXC workload cards appear for every guest entry. Services are not treated
  as virtual machines. Workload action buttons change **only** the local mock.
- The terminal screen also includes a static machine-process sample; it is not
  a live terminal, nor does the web mock implement Kitty/iTerm2/Sixel protocols.
- The canvas stays limited to the existing concept; do not integrate a new
  parallel design system into `site/` or `tui/sdk/` without adapting to `s-*`.

## Proposed production data contract (not yet implemented)

```ts
type MachineSnapshot = {
  id: string; kind: 'pve-node' | 'vm' | 'lxc' | 'workstation' | 'network-device';
  state: 'active' | 'inactive' | 'unknown' | 'error';
  sampledAt: string | null;  // ISO timestamp; stale state must be represented
  cpuPercent: number | null;
  memory: { usedBytes: number | null; totalBytes: number | null };
  disk: { usedBytes: number | null; totalBytes: number | null };
  network: { rxBytesPerSec: number | null; txBytesPerSec: number | null };
  gpu?: { vramUsedBytes: number | null; vramTotalBytes: number | null };
  processes: Array<{ pid: number; name: string; cpuPercent: number; rssBytes: number }> | null;
  processesReason?: 'offline' | 'permission-denied' | 'collector-unavailable';
  dataSource: 'real' | 'synthetic';
};
```

Production design requires dedicated authenticated collectors with audit and
redaction rules: a Proxmox API integration for VM/node stats, and OS-specific
collectors **inside guests/hosts** for per-process CPU and RSS. Proxmox node
stats alone are not enough to infer guest process lists. Do not infer or
fabricate data from shell, API or sparse telemetry. For multiple data sources,
standardize sampling intervals and process CPU normalization before ranking.

## Icons

- Real SVGs from Lucide at a pinned git revision, locally embedded as `<symbol>`.
- Central `icon(name)` helper uses a strict allowlist and the same icon geometry
  in all web concept screens; the theme supplies currentColor, no font file.
- TUI Unicode box-drawing glyphs are not web icons and remain unchanged.
- See [LUCIDE-LICENSE.md](LUCIDE-LICENSE.md) for full attribution and license.