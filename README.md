# SACRA UI Kit

Private UI kit for Sacraer Group. Current reference: **SACRA UI 1.4.3 / Technical Editorial**.

The repository is intentionally structured so the showcase is a normal multi-file site rather than a giant baked HTML file.

## Repository layout

```text
index.html                 # showcase entrypoint; loads external assets from site/
site/                      # SACRA UI 1.4.3 package hierarchy, except index.html
  starter.html
  modular.html
  sacra-ui.css
  tokens.css
  tokens.json
  runtime-tokens.json
  docs/
  examples/
  previews/
  scripts/
  src/
  tests/
  wasm/
skills/                    # portable agent skills
  sacra-ui-build/
  sacra-ui-controls/
  sacra-ui-data-viz/
  sacra-ui-audit/
```

`index.html` does **not** embed the CSS, runtime JavaScript, C source, or WASM payload. It references the corresponding files under `site/`.

The `site/` directory preserves the **1.4.3 package hierarchy 1:1 except for `index.html`**, which lives at repository root by design.

## Agent skills

| Skill | Use it for |
|---|---|
| `sacra-ui-build` | Full screens, layouts, dashboards, forms, tables, workspaces |
| `sacra-ui-controls` | Custom selects, checkbox/switch, focus, copy/toast feedback |
| `sacra-ui-data-viz` | Charts, Canvas, technical graphics, real WASM motion |
| `sacra-ui-audit` | Design-system review, accessibility, responsive and regression QA |

### Just list the available skills

Your local Git client must already have access to this private repo:

```sh
npx skills add https://github.com/Sacraer-group/sacra-ui-kit.git --list
```

### Install skills only

Codex:

```sh
npx skills add https://github.com/Sacraer-group/sacra-ui-kit.git --skill '*' -g -a codex -y
```

Codex + OpenCode:

```sh
npx skills add https://github.com/Sacraer-group/sacra-ui-kit.git --skill '*' -g -a codex -a opencode -y
```

The remote `skills add` command installs the selected skill folders. It does **not** install the whole `site/` reference tree.

### Download the full UI reference + install all skills

This is the recommended workflow when the agent should be able to inspect every 1.4.3 template, source module, WASM file, example and QA reference:

```sh
gh repo clone Sacraer-group/sacra-ui-kit
cd sacra-ui-kit
npx skills add ./skills --skill '*' -g -a codex -a opencode -y
```

For Codex only:

```sh
gh repo clone Sacraer-group/sacra-ui-kit
cd sacra-ui-kit
npx skills add ./skills --skill '*' -g -a codex -y
```

When a skill is used inside this checkout it should inspect `site/` first. When the skill is installed standalone, its own `references/` directory is the compact fallback.

### Private-repo auth

```sh
gh auth status -h github.com
gh auth setup-git
git ls-remote https://github.com/Sacraer-group/sacra-ui-kit.git HEAD
```

If multiple GitHub accounts are stored, switch without deleting the others:

```sh
gh auth switch -h github.com -u renosaza
gh auth setup-git
```

## SACRA contract

- Preserve the graphite/yellow `--s-*` tokens.
- `s-*` is reusable product UI; `ds-*` is showcase/documentation-only.
- Yellow focus is keyboard navigation state; green check/toast is success feedback.
- Custom selects remain backed by native `select` values/events.
- Do not fake telemetry or claim JavaScript-only animation is WASM.
- Synthetic chart data must be identified as synthetic/demo.
- Prefer existing modules/templates under `site/` over new dependencies or parallel abstractions.

## Privacy

This repository is **private**. Do not mirror its source, site or skills to a public repository without an explicit organization decision.
