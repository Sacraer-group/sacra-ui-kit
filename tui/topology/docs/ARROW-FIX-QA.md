# Arrow and scroll fix — QA · 0.3.2

Input: the uploaded `sacra-tui-agent-topology-arrows-fixed(1).zip` (0.3.1).
No GitHub writes. Tests were rerun against the files in this archive.

## Reproduced in the input build

The live event feed at `scrollTop = 110` returned to `0` on the next phase.
A focused Worker button was removed by the next phase render and focus was lost.
The page height changed when events were appended. The outer page did not jump
to zero in that particular Chromium reproduction; native Safari was unavailable.
The fixes remove wholesale screen replacement and the unguarded Escape focus.

## Passed

- `node --check assets/topology.js`.
- `tests/smoke.py`: controls, scale, adapter data and theme dialog.
- `tests/regression_matrix.py`: eight themes × five widths × four scales × eight
  phases, plus reduced-motion startup.
- `tests/edges_geometry.py`: 1,280 geometry cases (768 wired, 512 compact),
  52 live resize/zoom checks, wrapped content, custom IDs, empty slots,
  pause/resume and reduced motion.
- `tests/scroll_regression.py`: constant scroll and height over repeated phase
  changes; real timer ticks sampled every animation frame; user wheel scrolling
  remains possible and its new position remains stable; nested feed/code and
  horizontal overflow positions remain stable.
- Card, SVG, SVG path and feed element identities survive normal updates.
  Focus and selection survive same-session adapter refreshes; supplied events
  are retained. Escape/theme interaction does not move the page; native arrow
  scrolling works outside node navigation.
- 416 independently projected port checks plus painted SVG bounding-box checks;
  30 additional DPR/window/scale combinations; translated/scaled host; layout
  still works when `getScreenCTM` is deliberately made unavailable.
- Fan-out at 100% and merge at 80% screenshots visually inspected.
- No JavaScript page errors in the successful regression runs.

Reports: `tests/edges-results.json`, `tests/scroll-results.json`.

## Environment and limits

Chromium 144.0.7559.96 / Linux / Python Playwright. Local HTML/CSS/JS bytes are
injected into the test page; browser policy blocks both `file://` navigation
and the attempted HTTP test origin. Direct double-click launch was therefore
not executed in this environment. Browser assets are local relative files.

Native Safari/macOS was not run. Installing the additional WebKit test runtime
failed because download-host DNS was unavailable. API-independence tests are
not a substitute for a native Safari test. No real terminal, live adapter,
rotation/skew transform, or production deployment is claimed.

## Run

```sh
node --check assets/topology.js
python tests/smoke.py
python tests/edges_geometry.py
python tests/scroll_regression.py
python tests/regression_matrix.py
```

Requires Python Playwright and Chromium. Geometry/scroll tests accept
`SACRA_CHROMIUM` for the browser executable. `SACRA_SCREENSHOTS` optionally sets
an output directory for the scroll test's two visual QA screenshots.
