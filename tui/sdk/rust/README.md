# SACRA TUI — native Rust 0.1.0

Нативный Rust-crate `sacra-tui` (импорт `sacra_tui`). Layout, ячейки, стрелки, темы и placeholders вычисляются внутри Rust-процесса. **Go, subprocess, браузер, DOM и FFI для использования библиотеки не нужны.**

Этот каталог добавляет самостоятельную Rust-реализацию к ранее выпущенному Go-based SDK 0.1. Старые утверждения об отсутствии Rust-пакета в документах Go-based bundle относятся к состоянию до этого дополнения.

## Подключить в проект

Для соседних checkout в `Cargo.toml` приложения:

```toml
[dependencies]
sacra-tui = { path = "../sacra-ui-kit/tui/sdk/rust" }
```

Путь относителен к Cargo.toml приложения. Для поставки проекта оформите свою зависимость на приватный Git или vendor-копию crate; не привязывайте production-приложение к домашнему каталогу агента. Crate не опубликован на crates.io (`publish = false`).

```rust
use sacra_tui::{render, Block, Options};

fn main() -> Result<(), sacra_tui::Error> {
    let meter = Block {
        title: "context".into(), value: Some(25.0), max: 100.0,
        unit: "%".into(), ..Block::new("meter")
    };
    let view = Block::row(vec![
        Block::panel("MODEL", Block::text("provider / my-model")),
        Block::panel("CONTEXT", meter),
    ]);
    let frame = render(&view, &Options::new(100, 10))?;
    println!("{}", frame.plain());
    Ok(())
}
```

Возвращаются `Frame.lines`, `runs`, `cells`, `regions`, `content_height` и `scroll_y`. `frame.to_ansi("sacra", "truecolor")?` создаёт только SGR/reset, без управления курсором и терминальными режимами. Input loop, сеть, часы, фокус, выбор и прокрутка остаются у приложения.

## Блоки и данные

Все 12 типов: `text`, `status`, `panel`, `row`, `column`, `kv`, `table`, `meter`, `sparkline`, `events`, `node`, `topology`.

`Block::topology(data)` принимает `Topology`; `Block::node(node)` выводит отдельный узел. Модели задаются через `Node.model`, параметры/метрики — `params` и `metrics`, проектные данные — `extra`. Это `BTreeMap<String, serde_json::Value>`, без перечня разрешённых провайдеров или моделей.

`hydrate(&template, &bindings)?` подставляет `{{path.to.key}}`: точное совпадение сохраняет число, bool, null, массив или объект. Неизвестный путь возвращает ошибку. Нет eval, запуска команд и неявного опроса API.

Фиксированные бары: `Block::status(...)`. Контент: `.with_weight(1).with_scroll(offset)` внутри `Block::column(...)`. `Options.focus_id` и `selected_id` независимы; `active_edges` задаётся фактическими событиями приложения, не симулятором SDK.

## Темы и топология

Восемь семантических палитр: sacra, nord, gruvbox, dracula, tokyo, solarized, solarized-light, mono. Смена палитры не меняет geometry. Выход: plain Unicode, ASCII-геометрия, ANSI16, truecolor, raw cells/runs.

Встроенная топология: main → router → до трёх workers → review, отдельный architect. Разветвление и сборка имеют по одному общему стволу. `layout_topology(&data, width)?` возвращает прямоугольники и ортогональные маршруты до отрисовки. При ширине <96 или более трёх workers — список без выдуманных последовательных рёбер. Это не layout произвольного DAG.

## Ratatui — опционально

```toml
sacra-tui = { path = "../sacra-ui-kit/tui/sdk/rust", features = ["ratatui"] }
```

```rust,ignore
use sacra_tui::{render, theme, Options, ratatui_widget::FrameWidget};
let surface = render(&view, &Options::new(area.width as usize, area.height as usize))?;
let widget = FrameWidget::new(&surface, theme("sacra")?);
// В draw callback вашего существующего Ratatui Terminal:
frame.render_widget(&widget, area);
```

`FrameWidget` не создаёт второй терминал и не перехватывает ввод. Рабочий пример `examples/ratatui.rs` использует TestBackend, поэтому запускается без TTY.

## Запустить

Из `tui/sdk/rust`:

```sh
cargo run --locked --example blocks
cargo run --locked --features ratatui --example ratatui
cargo run --locked --release --features terminal --bin sacra-tui-rs -- --demo --color truecolor
```

В демо: q / Esc / Ctrl-C — выход, p / Space — пауза, стрелки вверх/вниз — прокрутка, вправо — шаг, Tab — фокус, Enter — выбор, t — тема. Размер читается из текущего TTY. Демо явно synthetic; библиотека `render()` сама не продвигает состояния.

Снимок без захвата терминала и JSONL-worker:

```sh
cargo run --locked --bin sacra-tui-rs -- --snapshot --width 160 --height 44
cargo run --locked --bin sacra-tui-rs -- --stdio
```

JSONL-worker — необязательный способ интеграции для других языков, а не основа Rust API. Wire version 1 использует `render`, `hydrate`, `info`; схема блоков — `../schema/request.schema.json`. `NO_COLOR`/`TERM=dumb` учитывает CLI; библиотечный renderer получает явный `Options.color`.

## Зависимости и ограничения

Core: serde, serde_json, unicode-segmentation, unicode-width. `terminal` добавляет crossterm/ctrlc только для интерактивного CLI; `ratatui` добавляет соответствующий адаптер. Оба feature выключены по умолчанию. Проверенные версии зафиксированы в Cargo.lock; первый Cargo build может обращаться к crates.io.

В этой Rust-реализации grapheme segmentation и ширины берутся из unicode-segmentation/unicode-width, а не из консервативного Go-профиля. Это не гарантия одинаковой ширины каждого emoji во всех терминальных эмуляторах. ASCII меняет геометрию, не транслитерирует labels. Контрольные ESC/OSC и bidi override/isolate удаляются из пользовательского текста.

Лимиты: 200000 ячеек, 1..500 колонок, 1..4000 строк, 512 блоков, глубина 16, template depth 32, JSON payload 1 MiB. NaN/Infinity — ошибка; null — пропуск; zero — значение.

Native Pixels/Octant/Kitty, полный набор Lab forms/dialogs и универсальный DAG renderer не добавлены. Browser reference `../../topology/` не изменён. Rust проверен на Linux x86_64; macOS/Windows этой реализацией здесь не запускались. MSRV отдельно не установлен.

## Проверки

```sh
cargo test --locked --all-features
cargo clippy --locked --all-targets --all-features -- -D warnings
cargo build --locked --features terminal
python3 tests/cli.py
```

Последняя команда использует Unix PTY. `SACRA_RUST_BIN` переопределяет путь к проверяемому бинарнику. Результаты и границы: [QA.md](QA.md).
