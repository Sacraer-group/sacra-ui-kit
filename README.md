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
  sacra-ui-docs/
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
| `sacra-ui-docs` | API/SDK docs, guides, code copy blocks, synchronized language tabs |
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


### Install the full site + all skills globally for every Codex project

This is the recommended global Codex setup. It keeps one private checkout at `~/.codex/sacra-ui-kit`, so globally installed SACRA skills can inspect the complete 1.4.3 site/reference from **any** Codex project:

```sh
mkdir -p "$HOME/.codex"

if [ -d "$HOME/.codex/sacra-ui-kit/.git" ]; then
  git -C "$HOME/.codex/sacra-ui-kit" pull --ff-only
else
  gh repo clone Sacraer-group/sacra-ui-kit "$HOME/.codex/sacra-ui-kit"
fi

npx skills add "$HOME/.codex/sacra-ui-kit/skills" \
  --skill '*' \
  -g \
  -a codex \
  -y
```

After that:

- full global reference: `~/.codex/sacra-ui-kit/site/`
- root showcase: `~/.codex/sacra-ui-kit/index.html`
- all SACRA skills: installed globally for Codex and available from every Codex project

The skills resolve references in this order:

1. a full `sacra-ui-kit` checkout in the current workspace;
2. the global Codex reference at `$HOME/.codex/sacra-ui-kit/site/`;
3. the compact `references/` bundled inside the installed skill.

To update the global site and reinstall the latest skills later:

```sh
git -C "$HOME/.codex/sacra-ui-kit" pull --ff-only && \
npx skills add "$HOME/.codex/sacra-ui-kit/skills" --skill '*' -g -a codex -y
```

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

## Documentation examples

The repository now includes a reusable documentation layer based on the SACRA visual language:

- `site/examples/documentation.html` — API/reference layout with sticky TOC, endpoint table, request/response blocks, code-copy feedback and synchronized cURL/Python/Go/TypeScript tabs.
- `site/examples/documentation-guide.html` — guide/tutorial layout with ordered steps, code samples, callouts and previous/next navigation.
- `site/src/sacra-docs.css` — reusable `s-doc-*` styles.
- `site/src/sacra-docs.js` — global language selection, copy bindings and active TOC state.
- `site/docs/DOCUMENTATION.md` — design and interaction rules.

The example text and endpoints are intentionally synthetic. Reuse the **design and interaction**, not the demo API contract.

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
