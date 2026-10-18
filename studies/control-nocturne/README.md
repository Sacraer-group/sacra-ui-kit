# SACRA Control / Nocturne concept bundle

This is a **design and architecture concept**, not a fork or released version of private [SACRA UI Kit](https://github.com/Sacraer-group/sacra-ui-kit). Its `preview.html` is a navigable standalone browser mock with synthetic data. No hosts, containers, LLMs or APIs are connected, and control buttons affect browser state only.

**Review** `SACRA-CONTROL-SPEC.md`, then open `preview.html` in Chromium/Safari. Review `TUI-REFERENCES.md` and `OPENDESIGN-PROMPT.md` for actual implementation direction. The theme JSON and CSS only propose a palette; upstream theme registries, component sources and tests remain unchanged.

Design direction: an opt-in Nocturne reinterpretation of the Pinterest moodboard layered over SACRA's Technical Editorial foundation. Existing Graphite/Go/Rust implementations remain the canonical source of truth.

## Run the checks

```sh
python3 validate_bundle.py
python3 qa_tests.py   # optional: Python playwright + a local Chromium binary
```

The preview is standalone; Playwright injects its HTML with `page.set_content` for compatibility with test runners that block all navigation by browser policy. `qa_tests.py` requires Chromium at `/usr/bin/chromium`; adjust that test-only path for other systems. It performs local browser tests; it does **not** use an API, a PTY, or real network/VM access.

Study only: The HTML uses bespoke CSS and must not be copied into `site/` as a production SACRA `s-*` implementation. `theme.nocturne.json`/CSS only describe a proposal and are not wired into production theme registries.

See `QA-REPORT.md` for found defects, regression results, and unimplemented infrastructure/image functionality.
