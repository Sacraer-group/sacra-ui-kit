# SACRA UI Kit

Private UI kit for Sacraer Group. Current source target: **SACRA UI 1.4.3 / Technical Editorial**.

Graphite surfaces, yellow focus/action accent, SF Mono/Nerd typography, Swiss grid structure, restrained brutalism, technical/cyber graphics, reusable controls, charts, WebAssembly motion, and workspace patterns.

## Agent skills

This repo ships four portable skills:

| Skill | Use it for |
|---|---|
| `sacra-ui-build` | Building/adapting full screens and layouts in SACRA UI |
| `sacra-ui-controls` | Forms, custom selects, checkbox/switch, focus, copy/toast feedback |
| `sacra-ui-data-viz` | Charts, technical graphics, Canvas, WebAssembly motion |
| `sacra-ui-audit` | Review, accessibility, responsive QA, regression/release checks |

The commands below use the open `skills` CLI. Because this repository is private, authenticate GitHub first. The SSH form is simplest when your GitHub SSH key already works.

### List available skills

```sh
npx skills add git@github.com:Sacraer-group/sacra-ui-kit.git --list
```

### Install all SACRA skills globally for Codex

```sh
npx skills add git@github.com:Sacraer-group/sacra-ui-kit.git --skill '*' -g -a codex -y
```

### Install all for Codex + OpenCode

```sh
npx skills add git@github.com:Sacraer-group/sacra-ui-kit.git --skill '*' -g -a codex -a opencode -y
```

### Install one skill

```sh
npx skills add git@github.com:Sacraer-group/sacra-ui-kit.git --skill sacra-ui-build -g -a codex -y
```

If you prefer HTTPS, configure GitHub CLI credentials first:

```sh
gh auth login
gh auth setup-git
npx skills add https://github.com/Sacraer-group/sacra-ui-kit --list
```

Optional: disable anonymous `skills` CLI telemetry for the command:

```sh
DISABLE_TELEMETRY=1 npx skills add git@github.com:Sacraer-group/sacra-ui-kit.git --list
```

## SACRA design contract

- Preserve the graphite/yellow palette and `--s-*` tokens.
- `s-*` is the reusable product layer; `ds-*` is documentation-showcase-only.
- Keep keyboard focus visible. Yellow focus is navigation state; green check/toast is success feedback.
- Do not fake performance/telemetry or label JavaScript-only animation as WASM.
- Demo/synthetic chart data must be identified as such.
- Reuse existing modules and components before creating new dependencies or abstractions.

## Privacy

This GitHub repository is intentionally **private**. Do not mirror its source or skills into a public repository without an explicit decision from the organization.
