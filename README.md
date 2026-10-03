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
tui/                       # SACRA TUI Lab 0.2: browser reference, components, themes, charts, tests
  assets/
  docs/
  examples/
  tests/
  topology/                # user 0.3.2 arrows/scroll fix + adapter safety integration
  sdk/                     # native Go blocks + Python/JS/TS + JSONL
skills/                    # portable agent skills
  sacra-ui-build/
  sacra-ui-controls/
  sacra-ui-data-viz/
  sacra-ui-docs/
  sacra-ui-tui/
  sacra-ui-tui-charts/
  sacra-ui-tui-sdk/
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
| `sacra-ui-tui` | Terminal layouts, components, keyboard flows, themes and TUI state |
| `sacra-ui-tui-charts` | Terminal chart renderers, coordinates, gaps, cursor and telemetry graphics |
| `sacra-ui-tui-sdk` | Native blocks, Go/Python/JS/TS integrations, JSONL, terminal cleanup |
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

When a skill is used inside this checkout it should inspect `site/` for web tasks or `tui/` for terminal tasks. When the skill is installed standalone, its own `references/` directory is the compact fallback.


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

- full web reference: `~/.codex/sacra-ui-kit/site/`
- full TUI reference: `~/.codex/sacra-ui-kit/tui/`
- root web showcase: `~/.codex/sacra-ui-kit/index.html`
- TUI browser lab: `~/.codex/sacra-ui-kit/tui/index.html`
- native SDK: `~/.codex/sacra-ui-kit/tui/sdk/`
- all SACRA skills: installed globally for Codex and available from every Codex project

The skills resolve references in this order:

1. a full `sacra-ui-kit` checkout in the current workspace;
2. the global Codex reference at `$HOME/.codex/sacra-ui-kit/site/` for web or `$HOME/.codex/sacra-ui-kit/tui/` for terminal UI;
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

## TUI design system

`/tui` is the separate terminal branch of SACRA UI. It is not web CSS transplanted into a terminal and it is not an ultra-mog skin.

- `tui/index.html` — executable browser reference for components, tasks, charts, monitor and rules.
- `tui/docs/DESIGN.md` — character-cell geometry, state semantics, keyboard model and historical native integration plan.
- `tui/docs/NATIVE-SDK.md` — current native SDK implementation status.
- `tui/docs/COMPONENTS.md` — TUI component catalog.
- `tui/docs/THEMES.md` — SACRA Graphite plus Nord, Gruvbox, Dracula, Tokyo Night, Solarized Dark/Light and Mono role mappings. Themes change colors only, never geometry/behavior.
- `tui/assets/charts.js` + `tui/assets/coordinates.js` — chart segmentation/raster/coordinate contracts. `ultra-mog` contributes chart-rendering ideas only; its layout, labels, palette and navigation are explicitly excluded.
- `tui/tests/` — calculation tests plus browser QA evidence from the design lab.

The default terminal palette is SACRA Graphite and preserves the 17 SACRA color roles. Full browser-lab charts use real coordinate bounds, ticks/guides and a cursor; zero is a real sample, missing data creates a gap, and Pixels → Octant → ASCII is a renderer/fallback ladder rather than three different data models. Native SDK 0.1 does not implement the pixel/Octant backends.

Use `sacra-ui-tui` for terminal layouts/interactions and `sacra-ui-tui-charts` for terminal telemetry/chart work.

## SACRA contract

- Preserve semantic `--s-color-*` roles. SACRA Graphite is the default; alternate palettes may remap colors only.
- `s-*` is reusable product UI; `ds-*` is showcase/documentation-only.
- Yellow focus is keyboard navigation state; green check/toast is success feedback in the default Graphite theme.
- Custom selects remain backed by native `select` values/events.
- Do not fake telemetry or claim JavaScript-only animation is WASM.
- Synthetic chart data must be identified as synthetic/demo.
- Prefer existing modules/templates under `site/` or `tui/sdk/` over new dependencies or parallel abstractions.

## Privacy

This repository is **private**. Do not mirror its source, site or skills to a public repository without an explicit organization decision.

## Frontend refresh from Postavki (2026-10-02)

Source commit: `d74d09d357cf184026973dbb9d055f2ea91894a2`. Core SACRA UI 1.4.3 tokens and existing modules are retained.

- [Queue, upload and result example](site/examples/postavki.html): camera/file pickers, removable previews, validation, master/detail, raw/rendered result and JSON copy. This example is local-only and uses synthetic data.
- [Six-language code blocks](site/examples/documentation-code.html): cURL/Python/Go/TypeScript/Vue/React, synchronized tabs, keyboard navigation and confirmed copy feedback.
- `site/src/sacra-upload.js` + `site/src/sacra-operations.css`: reusable, transport-free components.
- [Source map and adaptations](site/docs/UPSTREAM-POSTAVKI.md).

The main `index.html` includes a working upload specimen and links to both examples. All runtime CSS/JS stays in `site/`; no code is baked into the entrypoint. The existing global Codex update command downloads the web site, TUI reference and all eight skills together.

UI checks: `python site/tests/postavki_browser.py` (requires Playwright + Chromium; `SACRA_CHROMIUM` may name an installed binary). No OCR service is contacted. These are not Safari or real-device camera tests.


## Web semantic themes

The web reference supports the same eight semantic palette families as the TUI. Graphite remains the default. Use `site/src/sacra-themes.js` or inspect `site/themes.json`. Palette changes are color-only: layout, spacing, radii, typography, DOM structure, navigation and keyboard behavior stay unchanged.

The main web showcase injects a theme selector automatically. Product integrations load `sacra-ui.css`, then `src/sacra-themes.js`, and call `SacraThemes.restore()` or `SacraThemes.apply(id)`.

## Native blocks and multi-language SDK

[SDK documentation](tui/sdk/README.md) · [Offline UTF-8 HTML](tui/sdk/README.html) · [Browser topology](tui/topology/index.html).

`tui/sdk` is a native terminal cell renderer: Go in-process, persistent Python/JS/TS bindings, and a version-1 JSONL protocol for other languages. The 12 block types can be composed or used alone. No browser, Electron, framework dependency or model/provider runtime is required.

```sh
cd tui/sdk
sh scripts/build.sh
./bin/sacra-tui --demo --color truecolor
```

The uploaded topology 0.3.2 arrows/scroll fix is preserved under `tui/topology/`, with escaping and literal adapter-state handling. The existing TUI Lab and web assets are not replaced. Read `tui/sdk/docs/QA.md` for actual tests and limits: native SDK 0.1 is not a full forms/dialogs port or arbitrary DAG renderer. `make test` checks native/bindings/PTY; `make test-browser` checks the topology reference.
