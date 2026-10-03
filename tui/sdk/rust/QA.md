# Rust native 0.1.0 — проверка 2026-10-03

Реально выполнено на Linux x86_64, rustc/cargo 1.99.0, в изолированном временном каталоге gpt-rdc. Пользовательские репозитории/конфиги Rust на машине не изменялись.

- `cargo test --locked --all-features`: 10 integration tests + 1 doctest, 0 failures.
- `cargo clippy --locked --all-targets --all-features -- -D warnings`: успешно.
- Release CLI с feature terminal собран; примеры blocks и Ratatui TestBackend запущены.
- `tests/cli.py`: 7 проверок, включая JSONL recovery/types, snapshot/NO_COLOR, q/Ctrl-C/SIGINT/SIGTERM, возврат termios/курсора/alternate screen после выхода и ошибки render, resize 160×44 → 80×24.

Матрица renderer: 12 блоков × 8 тем × 10 ширин × 4 высоты. Геометрия стрелок проверяется на каждой ширине 96..240: общий fan-out/fan-in, корректные порты, отсутствие пересечений с карточками. Отдельно проверяются Unicode clipping, wide-cell overwrite, null/0/gaps, bounded inputs, typed placeholders, focus/selection и независимая прокрутка с фиксированными барами. 12 параллельных render-запросов дают одинаковый результат. Ratatui widget проверен на позиционирование и обрезку широкого символа.

Эти результаты относятся к нативному Rust SDK. Нативные macOS/Windows, производительность на реальном live-provider и полная Unicode-конформность всех терминальных эмуляторов не заявляются. Browser code не менялся; его старые QA-отчёты не выдаются за новые Rust-тесты. Crate не зависит от Go-worker; Python/JS клиенты старого SDK по умолчанию остались на прежнем Go backend.
