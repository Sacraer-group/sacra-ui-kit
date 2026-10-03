# Нативный SDK: статус реализации

Нативный backend, обозначенный как будущий в историческом DESIGN.md лаборатории,
теперь существует в `../sdk/` как SDK 0.1.0. Это не полный порт всех компонентов Lab.

Открыть документацию в браузере: `../sdk/README.html`.
Go-блоки работают напрямую; Python и JS/TS используют persistent JSONL worker.
Данные, темы и geometry остаются отдельными слоями. Браузерный референс topology:
`../topology/index.html`; сохранён пользовательский arrows/scroll fix 0.3.2.

Исполняемые примеры и команды: `../sdk/README.md`. Реальные проверки/ограничения:
`../sdk/docs/QA.md`. Для новых native задач используйте skill `sacra-ui-tui-sdk`,
для общих terminal design rules — `sacra-ui-tui`.
