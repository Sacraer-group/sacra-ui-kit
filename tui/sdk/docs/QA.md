# Проверки SDK 0.1.0 и topology 0.3.3

Основа GitHub: `a88b177e2e6575c09c801bcf6ad473bc5aaa8d42`.
Пользовательский архив: `sacra-tui-topology-0.3.2-arrows-scroll-fixed(1).zip`.
SHA-256: `06bdb1955d036b6fd6f4c5e1232a63247e93f095db050193a9020bb111b662a4`.

## Реально выполнено

- Go 1.23.2 / Linux amd64: `go test -race ./...`, `go vet ./...`, сборка CLI.
- Нативные кадры: 8 тем × 10 ширин × 5 высот; 12 типов блоков;
  маршруты стрелок на каждой ширине 96..240; single fan-out/fan-in,
  отсутствие пересечений, missing slots, compact/list fallback.
- Отдельные проверки null/0, Unicode-клеток и clipping, control injection,
  fixed bars/local scroll, focus/selection, invalid/bounded input,
  typed placeholders и лимита расширения шаблонов.
- Python 3.13.5: 7 интеграционных тестов, включая живой worker, timeout,
  malformed JSONL recovery, `--once` примеры и input limit.
- Node 22.16.0: 3 теста, включая concurrent requests, missing executable
  и timeout cleanup; TypeScript strict type-check пройден.
- JSON Schema проверена вместе с реальными запросами к worker.
- Linux PTY: resize 160×44 → 80×24, SIGINT/SIGTERM; экран/курсор CLI
  восстановлены. Python curses и Node raw mode: q-exit восстанавливает termios.
- Browser Chromium 144.0.7559.96: smoke, 1280 edge combinations,
  52 resize/scale checks, 416 painted ports, 30 DPR/viewport checks,
  wheel/animation/local scroll, focus/DOM identity, reduced motion.
- Browser adapter: states/events не заменяются демо; HTML/script strings
  выводятся текстом; synthetic confidence bars не появляются.
- Кросс-компиляция CLI: darwin/arm64, darwin/amd64, windows/amd64 — успешно.
  Эти бинарники не запускались на целевых ОС.

## Границы результата

Нативный Safari/macOS/Windows не тестировался. Browser fixtures загружались
из локальных bytes в Playwright, не через пользовательский Safari file://.
Unicode не объявляется полностью UAX #29-конформным; см. `UNICODE.md`.
Pixels/Octant/Kitty native backends и полный набор terminal forms/dialogs не входят
в эту версию. Go — native package; Python/JS/TS — wrappers над Go worker,
не независимые реализации layout. Rust/C#/Java/C++ SDK-пакетов нет: есть JSONL.

SDK/runtime не исполняет команды или provider calls. Демо маркировано synthetic.
API keys не включены. Шрифты, зависимости из node_modules и бинарники не коммитятся.

## Воспроизвести

`make test` из `tui/sdk`; `make test-browser` для браузерных регрессий.
Для браузерных тестов нужен Playwright и Chromium; `SACRA_CHROMIUM` задаёт путь.
Дополнительная полная матрица: `python3 ../topology/tests/regression_matrix.py`.
