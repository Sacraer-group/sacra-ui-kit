# SACRA UI audit checklist

- [ ] `s-*` used for reusable product UI; `ds-*` limited to showcase/docs.
- [ ] No full black background; palette/tokens preserved.
- [ ] No random neon/rainbow/glass/glow additions.
- [ ] Keyboard focus is visible and yellow focus is not confused with success.
- [ ] Custom select is a DOM listbox backed by a native select.
- [ ] Clipboard success is confirmed only after the copy operation resolves successfully.
- [ ] Tables/forms/charts remain readable at 320/390/768/1440 px.
- [ ] Status has text/symbol, not color alone.
- [ ] Motion respects reduced-motion and reports measured performance only.
- [ ] WASM code path remains real WASM when claimed.
- [ ] Demo/synthetic data is explicitly labeled.
- [ ] Relevant package/test command has been run and its scope stated accurately.

## Postavki refresh

Run `python site/tests/postavki_browser.py` for uploads, local queue/detail, copy success/failure, language groups and responsive checks. Verify result grids use `minmax(0,1fr)` and code/table overflow stays local. Browser MIME checks do not replace server validation.
The full source map is `site/docs/UPSTREAM-POSTAVKI.md` in the global or local kit.
