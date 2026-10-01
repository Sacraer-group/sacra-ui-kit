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
