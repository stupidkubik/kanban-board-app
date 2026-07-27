# Baseline validation — 25 июля 2026 года

Статус: локальные проверки и изолированный Cypress gate пройдены; финальная
фиксация commit SHA ожидает коммита.

## Контекст

- Исходный commit SHA: `6b63d0e6c3d1321dea535adacf8a67363241daa5`.
- Firebase project id: `kanban-mvp-1baf2`.
- Node.js: `v24.18.0`.
- npm: `11.16.0`.
- Java: OpenJDK `25.0.3`.
- Firebase CLI: `15.24.0`.

Проверки выполнялись поверх исходного commit с рабочими изменениями E2E-контракта
и документации. Cypress больше не требует внешних credentials и не обращается к
cloud Firebase. Финальный baseline необходимо повторить на зафиксированном commit
SHA перед Gate A.

## Результаты

| Проверка | Результат |
| --- | --- |
| `npm ci` | Пройдено; установлено 1333 пакета |
| `npm run lint` | Пройдено |
| `npm run test:unit` | Пройдено: 14 test files, 34 tests; 1 file и 11 tests skipped |
| `npm run test:rules` | Пройдено: 1 test file, 11 tests |
| `npm run build` | Пройдено с `next build --webpack` |
| `npm run check:server-trace` | Пройдено: 14 manifests |
| `git diff --check` | Пройдено |
| `npm run cypress:run` | Пройдено 27 июля: 2 сценария, 2 passed |
| Проверка cleanup | Пройдена: boards, invites и board subcollections отсутствуют |

## Cypress-контракт

`npm run cypress:run` поднимает Auth и Firestore emulators для demo project
`demo-kanban-e2e`, запускает Next.js на `127.0.0.1:3100`, создаёт локального
Auth-пользователя и передаёт credentials только дочернему Cypress process.
После suite launcher через Admin SDK подтверждает отсутствие boards, columns,
cards, member profiles и invites. Cloud project `kanban-mvp-1baf2` не используется.
