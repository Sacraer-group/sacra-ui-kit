# SACRA TUI topology · 0.3.3 / SDK reference

Основа — пользовательский `sacra-tui-topology-0.3.2-arrows-scroll-fixed(1).zip`.
Сохранены измеренные точки подключения, общий fan-out/fan-in, непрерывные линии
под анимацией, keyed DOM updates и независимая прокрутка панелей.

Откройте `index.html` рядом с `assets/`. Сеть, npm и сборка не нужны.
Для документации в браузере: `../sdk/README.html`.

## Интеграция 0.3.3

`session.source: "synthetic"` явно включает демонстрационные фазы.
В остальных режимах `setData()` показывает фактические states/events, не
подменяет их демонстрацией и не рисует выдуманные confidence bars.
`step()`/`play()` не запускают синтетические изменения для adapter data.
Имена/параметры/события экранируются при выводе в DOM.

`SacraTopology.setData(payload)`, `useAdapter(fn)`,
`hydrateTemplate(template, values)` и `refreshLayout()` сохранены.
`data/topology.schema.json` — браузерный контракт; нативные блоки используют
дополнительный `../sdk/schema/request.schema.json`.

## Нативная версия

Браузер остаётся визуальным стендом, не терминальным backend.
Нативная библиотека и bindings: `../sdk/` (Go + Python + JS/TS + JSONL).
Native SDK не исполняет JS/CSS этого каталога.

## Регрессии

Снова выполнены smoke, edges, scroll и матрица тем/ширин/масштабов/фаз.
`tests/edges-results.json`: 1280 сочетаний, 52 live resize/scale checks.
`tests/scroll-results.json`: 416 painted-port checks, 30 DPR/viewport cases,
реальное колесо/таймер, nested scroll, DOM identity, focus и adapter events.
Дополнительно: `../sdk/tests/browser_adapter.py` — literal data/HTML injection.

Chromium 144 / Linux, локальные HTML/CSS/JS byte fixtures без сети.
Нативный Safari/macOS не запускался. `docs/ARROW-FIX-QA.md` — исторический
отчёт исходного fix; актуальные границы и проверки — `../sdk/docs/QA.html`.
