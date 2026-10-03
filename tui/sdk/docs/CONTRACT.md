# JSONL / SACRA TUI SDK v1

Один процесс `sacra-tui --stdio`, один JSON-объект на строку UTF-8, один JSON-ответ на запрос.
Никакие кадры, логи или ANSI-команды вне JSON в stdout не печатаются. Диагностика завершения — stderr.

## Render

```json
{"version":1,"id":"req-1","op":"render","block":{"type":"panel","title":"AGENT","children":[{"type":"text","text":"my-model"}]},"options":{"width":60,"height":8,"theme":"sacra","color":"none"}}
```

Ответ: `version`, строковый `id`, `ok` и `frame`; при ошибке — `ok:false` и `error`.
`frame.lines` имеет ровно `height` строк, каждая — `width` клеток по профилю SDK.
`frame.runs[y]` содержит `{text,fg,bg}` с названиями семантических цветовых ролей.
`frame.ansi` появляется при `color:"ansi16"` или `"truecolor"`; содержит только SGR/reset и переводы строк. По умолчанию нет цветов и нет ANSI.

`contentHeight`/`scrollY` описывают корневую область. `regions` содержит hit/selection rectangles с `id`, `type`, `x`, `y`, `width`, `height`. Частично видимые regions могут иметь отрицательный y; перед hit-testing пересеките их с viewport. Вложенная прокрутка задаётся в `block.scroll`.

Важные options:

| Поле | Назначение |
|---|---|
| `width`, `height` | Целые клетки: 1..500 × 1..4000, суммарно не более 200000. |
| `theme` | sacra/nord/gruvbox/dracula/tokyo/solarized/solarized-light/mono. |
| `color` | none/ansi16/truecolor. |
| `ascii` | ASCII для геометрии; содержимое не транслитерируется. |
| `selectedId` | Выбранный узел: `>` и отдельный фон. |
| `focusId` | Фокус: метка FOCUS на рамке и accent; выбор не меняется. |
| `activeEdges` | IDs рёбер для подсветки; фактические события определяет host. |
| `scrollY` | Прокрутка всего корня. Для фиксированных баров используйте `block.scroll` у контента. |

Табличные row IDs: `<block.id>/<zero-based-row-index>`.
Рёбра встроенной топологии: `main-router`, `router-fanout`, `router-<worker.id>`, `<worker.id>-review`, `merge-review`, `architect-review`. Доступен Go `LayoutTopology`, возвращающий узлы и ортогональные маршруты до растеризации.

## Hydrate

```json
{"version":1,"id":"req-2","op":"hydrate","template":{"model":"{{models.main}}","context":"{{limits.context}}","enabled":"{{flags.enabled}}"},"bindings":{"models":{"main":"my-model"},"limits":{"context":65536},"flags":{"enabled":false}}}
```

Ответ возвращает `data`. Точное совпадение сохраняет JSON-тип, включая null/false/0/array/object; частичное совпадение заменяется текстом. Путь проходит по объектным ключам через точку. Индексы массива и выражения не поддерживаются. Зарезервированные prototype-paths запрещены. Ошибка неизвестного binding не портит следующий запрос.

## Info

```json
{"version":1,"id":"req-3","op":"info"}
```

Возвращает SDK version, protocol version, palette IDs и типы блоков.

## Ошибки и ограничения

Вход — до 1 MiB на строку. Некорректный JSON возвращает ошибку, процесс продолжает читать следующие строки; превышение лимита строки закрывает worker с ненулевым exit code. Максимум 512 блоков и глубина 16; template depth 32; расширение placeholders ограничено бюджетом 1 MiB. NaN/Infinity недопустимы: преобразуйте пропуск в null в адаптере, не в 0.

Версия 1 принимает только `render`, `hydrate`, `info`. Это не RPC для запуска инструментов, файлового доступа, сетевых вызовов или shell-команд. Метаданные в node — данные, а не исполняемая конфигурация.

CLI/SDK не сохраняет API keys или события. Не передавайте секреты, которые не должны появляться в инспекторе, кадре, дампе JSON или логе host-приложения.

Python/JS используют исполняемый файл без shell. Timeout/повреждённый ответ закрывают worker; late-response не может быть принят за следующий кадр. Обычная validation error не перезапускает процесс. Python Client сериализует запросы; JS допускает до 64 ожидающих запросов. При удалении view закройте владеющий клиент.

## Встраивание в ещё один язык

Запустите `[path-to-sacra-tui, "--stdio"]` как subprocess без shell, передайте JSONL, прочитайте один ответ с тем же id. Примените собственный timeout, лимит ответа и cleanup. Отрисуйте `lines` либо `runs` средствами своего терминального фреймворка. Никакой отдельной копии layout/arrow math не требуется.

Готовые Go/Python/JS/TS реализации поставляются в этом SDK. Отдельных Rust/C#/Java/C++ пакетов в версии 0.1 нет; для них определён wire contract.
