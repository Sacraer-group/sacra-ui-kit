# SACRA TUI SDK 0.1.0

Нативные терминальные блоки SACRA. **Без браузера, DOM, Electron и WebView.**
Это библиотека представления, а не агентный рантайм и не исполнитель команд.

## Что входит

| Слой | Путь | Как используется |
|---|---|---|
| Go | `go/` | Прямой импорт пакета `sacratui` в процесс приложения. |
| Python | `python/sacra_tui/` | Переиспользуемые builders и один долгоживущий процесс Go-рендерера. |
| JavaScript / TypeScript | `javascript/` | ESM-пакет с декларациями типов и асинхронным клиентом того же процесса. |
| Другие языки | `schema/request.schema.json` | JSONL через stdin/stdout; отдельный порт отрисовки не нужен. |
| Браузерный референс | `../topology/index.html` | Сохранены стрелки и прокрутка из пользовательского 0.3.2; есть защитные изменения 0.3.3 для adapter data. |

Python и Node не исполняют Go в своём процессе: нужен собранный `sacra-tui`.
Каждый `Client` запускает его **один раз**, а не на каждый кадр. Node/Python runtime-пакеты и Go-ядро не имеют внешних зависимостей. npm/PyPI-публикации не выполнялись; установка локальная.

## Быстрый запуск

Из каталога `tui/sdk` в checkout:

```sh
sh scripts/build.sh
./bin/sacra-tui --demo --color truecolor
```

Нужен Go 1.23 или новее. Демо использует синтетические данные. `Ctrl-C` завершает его и восстанавливает экран/курсор. Размер терминала на Linux/macOS перечитывается при каждом кадре; `--width`/`--height` задают явный размер.

Для обычного текстового вывода, перенаправления в файл или проверки без TTY:

```sh
./bin/sacra-tui --snapshot --width 160 --height 44
./bin/sacra-tui --snapshot --ascii --width 80 --height 32
```

`--ascii` меняет рамки/стрелки/штрихи, но не транслитерирует русские подписи.
`NO_COLOR` и `TERM=dumb` отключают цвета CLI. Библиотечный `Render` не читает окружение: приложение само передаёт `color`.

## Go: блоки напрямую

Module path: `github.com/Sacraer-group/sacra-ui-kit/tui/sdk/go`.
Package name: `sacratui`. Для приватного репозитория используйте собственный доступ к GitHub или локальный `replace`, не встраивайте токены в SDK.

```go
import tui "github.com/Sacraer-group/sacra-ui-kit/tui/sdk/go"

view := tui.HStack(
    tui.Panel("MODEL", tui.Text("provider / my-model")),
    tui.Panel("CONTEXT", tui.Block{
        Type: "meter", Title: "context", Value: tui.Value(25), Max: 100, Unit: "%",
    }),
)
frame, err := tui.Render(view, tui.Options{Width: 100, Height: 12})
// Обработайте err. frame.Lines — текст, frame.Runs — семантически окрашенные сегменты.
// frame.ToANSI("sacra", "truecolor") — SGR, без перемещения курсора.
```

Готовый пример: `cd go && go run ./examples/blocks`.
Для существующего TUI можно вернуть строки кадра из view-функции или перенести `Runs` в его cell buffer. `Canvas.Text`, `Box`, `Fill`, `Blit` доступны для собственных компонентов; `NewCanvas` паникует при некорректном/неограниченном размере, `Render` возвращает ошибку.

## Python

```sh
export SACRA_TUI_BIN="$PWD/bin/sacra-tui"
export PYTHONPATH="$PWD/python${PYTHONPATH:+:$PYTHONPATH}"
python3 examples/python_native.py
```

В Unix-примере используется стандартный `curses`: Tab — фокус, Enter — выбор, стрелки — прокрутка контента, p — пауза, q — выход. Шапка и нижняя строка не прокручиваются. `--once` выводит снимок без curses.

```python
from sacra_tui import Client, panel, text

with Client() as client:
    frame = client.render(panel("AGENT", text("my-model")), width=60, height=8)
    print(frame.plain)
```

Альтернатива PYTHONPATH: локальная установка `python3 -m pip install ./python`.
Этот вариант использует setuptools как build dependency; ему может понадобиться сеть, если setuptools не установлен.

## JavaScript / TypeScript

```sh
export SACRA_TUI_BIN="$PWD/bin/sacra-tui"
node examples/node_native.mjs
```

```js
import {Client, panel, text} from './javascript/index.mjs';
const client = new Client();
try {
  const frame = await client.render(panel('AGENT', text('my-model')), {width:60, height:8});
  process.stdout.write(frame.lines.join('\n') + '\n');
} finally {
  client.close();
}
```

Локальная установка пакета: `npm install /path/to/sacra-ui-kit/tui/sdk/javascript`.
После этого импортируйте из `@sacra/tui`. CommonJS-фасад не поставляется; используйте ESM или динамический `import()`.

## Данные и плейсхолдеры

`Node`: `id`, `slot`, `role`, `state`, `task`, `model`, `params`, `metrics`, `extra`.
Модели, провайдеры и параметры не захардкожены. Вложенные `params`/`metrics`/`extra` сохраняют JSON-типы. Значения примера — не каталог доступных моделей и не их тарифы.

```python
payload = client.hydrate(template, {
    "model": {"name": "my-model", "context": 65536, "enabled": False}
})
```

Точное `{{model.context}}` превращается в число, `{{model.enabled}}` — в boolean.
Внутри строки подстановка становится текстом. Отсутствующий путь — ошибка, а не пустая строка/ноль. Никакого `eval` и исполнения шаблона нет. Native hydration строже старого browser helper, который оставляет неизвестный placeholder видимым.

`events`, выбранный узел, фокус, прокрутка, часы и обработка ввода принадлежат вашему приложению. SDK ничего не опрашивает и не очищает данные сам. SSE/WS/HTTP/log reader размещается в host-adapter, передающем новые snapshots.

## Границы 0.1

Нативные блоки: `text`, `status`, `panel`, `row`, `column`, `kv`, `table`, `meter`, `sparkline`, `events`, `node`, `topology`. Это не полный порт всех форм/диалогов старого TUI Lab и не отдельный TUI-фреймворк.

`topology` рисует схему main → router → до трёх workers → review плюс architect. Узлы связываются по slots, а не по названиям моделей. При ширине <96 клеток или более трёх workers используется список **без ложных последовательных рёбер**. Отдельный узел можно выводить независимо. Это не универсальный layout произвольного DAG.

`row`/`column` задают компоновку; `height` фиксирует высоту, положительный `weight` в `column` получает оставшееся пространство. `scroll` относится к конкретному блоку; `options.scrollY` прокручивает целый корневой кадр. Для фиксированных header/footer задайте им `height:1`, контенту — `weight:1`.

Восемь палитр меняют только роли цвета. Выходы: plain Unicode, ASCII-рамки, ANSI16, truecolor и сегменты `Runs`. Pixels/Octant/Kitty-протоколы в native SDK не реализованы; они остаются отдельным направлением графиков в `tui/assets`.

Unicode-профиль консервативный, не полный UAX #29. Подробности и ограничения: `docs/UNICODE.md`. Windows-бинарник проверен только кросс-компиляцией; запуск на Windows и нативном Safari/macOS не подтверждён этим отчётом.

## Проверки

```sh
make test
make test-browser
```

Runtime не требует зависимостей. Для полного тестового набора нужны Node, TypeScript `tsc`, Python `jsonschema`, Playwright + Chromium; PTY/curses-тесты рассчитаны на Unix.

Протокол: `docs/CONTRACT.md`. Проверки и происхождение: `docs/QA.md`.
Для просмотра документации в браузере открывайте `README.html` и `docs/*.html`: у них явно задан UTF-8. Markdown сохранён в UTF-8 как исходник для редакторов.
