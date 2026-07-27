# Baseline validation — 25 июля 2026 года

Статус: полный локальный Gate A пройден на зафиксированном code baseline.

## Контекст

- Проверенный commit SHA: `34c968063fe6e56725207004fd5885f12223be28`.
- Состояние проверки включает исправления realtime cache/Cypress DnD,
  подготовленную migration и Node.js runtime pin.
- E2E Firebase project id: `demo-kanban-e2e`.
- Node.js: `v24.18.0`.
- npm: `11.16.0`.
- Java: OpenJDK `25.0.3`.
- Firebase CLI: `15.24.0`.
- Cypress: `15.19.0`.

Проверки выполнялись 27 июля 2026 года на исходном дереве указанного commit.
Cypress не требует внешних credentials и не обращается к cloud Firebase.

## Результаты

| Проверка | Результат |
| --- | --- |
| `npm ci` | Пройдено; установлено 1333 пакета |
| `npm run lint` | Пройдено |
| `npm run test:unit` | Пройдено: 17 test files, 40 tests; 1 file и 11 tests skipped |
| `npm run test:rules` | Пройдено: 1 test file, 11 tests |
| `npm run build` | Пройдено с `next build --webpack` |
| `npm run check:server-trace` | Пройдено: 14 manifests |
| `git diff --check` | Пройдено |
| `npm run cypress:run` | Финальный run пройден: 2 сценария, 2 passed; до него пройдены 3 последовательных контрольных run |
| Проверка cleanup | Пройдена после каждого run: boards, invites и board subcollections отсутствуют |
| `npm audit --omit=dev` | Зафиксировано: 3 high, 8 moderate; автоматический force fix не применяется |

## Production HTTP verification

После обновления `FIREBASE_SERVICE_ACCOUNT` и Vercel deployment:

- `/` отвечает `307` с redirect на `/sign-in`;
- `/sign-in` отвечает `200`;
- защищённый `/api/boards/{boardId}` загружает server route и без сессии отвечает
  ожидаемым `401`, а не `500`;
- локальная Webpack build с тем же полным JSON credential проходит;
- server trace не содержит credential files.

Authenticated production data smoke остаётся отдельной задачей AUD-04 и не
выполнялся в рамках emulator baseline.

## Cypress-контракт

`npm run cypress:run` поднимает Auth и Firestore emulators для demo project
`demo-kanban-e2e`, запускает Next.js на `127.0.0.1:3100`, создаёт локального
Auth-пользователя и передаёт credentials только дочернему Cypress process.
После suite launcher через Admin SDK подтверждает отсутствие boards, columns,
cards, member profiles и invites. Cloud project `kanban-mvp-1baf2` не используется.

В ходе проверки устранены две причины нестабильности:

- Firestore listeners теперь начинают обновлять RTK Query только после
  `cacheDataLoaded`, поэтому быстрый initial snapshot не теряется;
- Cypress завершает DnD жест на стабильном `body`, а не на карточке, которую
  dnd-kit может заменить во время drag.
