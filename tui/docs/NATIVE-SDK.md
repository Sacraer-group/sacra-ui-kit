# Нативный SDK: статус реализации

Нативный backend, обозначенный как будущий в историческом DESIGN.md лаборатории,
существует в `../sdk/`. Это не полный порт всех компонентов Lab.

## Нативные библиотеки

**Go:** `../sdk/go/`, пакет `sacratui`, прямой импорт в процесс приложения.
Документация: `../sdk/README.md` / `../sdk/README.html`.

**Rust:** `../sdk/rust/`, crate `sacra-tui`, импорт `sacra_tui`, версия 0.1.0.
Это самостоятельная Rust-реализация layout, ячеек, стрелок, тем и placeholders.
Никакой Go-worker, subprocess, браузер или FFI для библиотеки не нужен.
Документация: `../sdk/rust/README.md` / `../sdk/rust/README.html`.
Опциональный feature `ratatui` добавляет FrameWidget для существующего TUI;
feature `terminal` включает интерактивное CLI. Core не требует этих features.

Обе библиотеки дают 12 видов блоков, независимые focus/selected, локальную
прокрутку, восемь семантических палитр и данные с произвольными model/params/
metrics/extra. Ввод, таймеры и источники данных принадлежат host-приложению.

## Bindings и wire protocol

Python и JS/TS по умолчанию используют прежний persistent Go JSONL worker.
Они не были переписаны и автоматически на Rust не переключаются.
Rust дополнительно умеет JSONL v1 через `sacra-tui-rs --stdio`, но собственные
Rust-проекты должны использовать crate напрямую. Другие языки могут реализовать
клиент wire protocol; отдельных C#/Java/C++ пакетов здесь пока нет.

## Референсы и проверки

Браузерная topology: `../topology/index.html`; пользовательский arrows/scroll fix
сохранён, в Rust-дополнении браузерные файлы не менялись.

Go/bindings: `../sdk/docs/QA.md`. Rust: `../sdk/rust/QA.md`.
Rust проверен на Linux x86_64: integration/doctest, Clippy и CLI/PTY resize/cleanup.
Запуск этой Rust-реализации на macOS/Windows в данном отчёте не заявляется.
Старые документы bundle 0.1, где Rust указан как ещё отсутствующий, описывают
состояние до добавления `sdk/rust`; текущий статус определяется этим файлом.

Для native задач используйте `sacra-ui-tui-sdk`; для общих terminal design rules —
`sacra-ui-tui`; для графиков — `sacra-ui-tui-charts`. Нативные Pixels/Octant/Kitty,
универсальный DAG renderer и полный набор forms/dialogs ещё не реализованы.
