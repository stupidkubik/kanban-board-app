# Kanban Board App — operations

Статус: живой runbook, обновлён 27 июля 2026 года.

## Production baseline

- URL: `https://kanban-board-app-ten-psi.vercel.app/`
- Vercel project: `kanban-board-app`
- Node.js: `24.x`
- Next.js: `16.2.12`
- Production bundler: Webpack
- Firebase project: `kanban-mvp-1baf2`
- Последний проверенный deployment:
  `dpl_BbeqJFYm6y3hCLh1V5yfwhiT52Sk`
- Предыдущий rollback deployment:
  `dpl_GZB8xV5bwcBKrKonmPmuGFJufDcm`

## Credentials and security

Admin SDK использует один из следующих источников:

- `FIREBASE_SERVICE_ACCOUNT` в защищённых Vercel Environment Variables;
- managed Application Default Credentials;
- локальный `GOOGLE_APPLICATION_CREDENTIALS` вне репозитория.

Приложение не ищет service-account JSON в дереве проекта. Credential-файлы,
`.env.local`, private keys и полные значения secrets запрещено добавлять в Git,
логи и документацию.

Проверка Git history и server traces не нашла credential-файлы. Локальная
JSON-копия удалена. Ротация ключа нужна, если обнаружится его передача третьим
лицам, публикация или неизвестный active key в IAM.

App Check зарегистрирован через reCAPTCHA Enterprise, но enforcement для Auth и
Firestore выключен. Не включать его напрямую в production: сначала проверить
токены и метрики, затем включать в контролируемое окно и повторять sign-in,
server API и Firestore smoke.

## Release gate

Перед каждым production release:

1. `npm ci`
2. `npm run lint`
3. `npm run test:unit`
4. `npm run test:rules`
5. `npm run build`
6. `npm run cypress:run`
7. `npm run migrate:stale-member-profiles`
8. `npm run migrate:card-labels`
9. `npm audit --omit=dev`
10. Vercel preview deployment
11. preview `/`, `/sign-in`, protected API и runtime logs
12. promotion проверенного preview
13. production HTTP verification и runtime logs
14. `SMOKE_ALLOW_WRITES=true npm run smoke`
15. проверка cleanup

Ожидаемые unauthenticated ответы:

- `/` — `307` на `/sign-in`;
- `/sign-in` — `200`;
- защищённый API без session cookie — `401`, не `500`.

Последний полный gate:

| Проверка | Результат |
| --- | --- |
| Unit/component | 106 passed; 12 conditionally skipped |
| Firestore Rules | 12 passed |
| Server traces | 16, credential findings отсутствуют |
| Cypress | 3/3 passed |
| Production audit | 3 high, 8 moderate, 0 critical |
| Migration dry-runs | 7 boards, изменений не требуется |
| Production smoke | passed, cleanup verified |

## Dependency policy

Не запускать `npm audit fix --force`. Предложенный downgrade или semver-major
upgrade не считается безопасным исправлением.

Для обычного обновления:

1. проверить `npm outdated` и `npm audit --omit=dev`;
2. изучить direct/transitive diff в `package-lock.json`;
3. не смешивать framework и infrastructure upgrades;
4. повторить полный release gate;
5. зафиксировать advisories, которые нельзя исправить совместимо.

Известные ограничения:

- отслеживать `next -> postcss` и `next -> sharp`;
- держать `firebase-admin` на 13.x;
- Firebase Admin 14.x сейчас ломает Vercel Functions с `ERR_REQUIRE_ESM` через
  `jwks-rsa@4 -> jose@6`.

Будущее обновление Firebase Admin 14.x выполнять отдельной миграцией: отдельный
commit, clean install, полный gate, preview, проверка session/protected API и
runtime logs. Не объединять его с обновлением Next.js.

## Cypress and smoke

`npm run cypress:run` использует только Auth/Firestore emulators и project
`demo-kanban-e2e`. Launcher очищает `.next/dev`, отключает Turbopack filesystem
cache только для E2E, прогревает routes, создаёт локальных Auth users и
принудительно использует long polling для browser-to-emulator Firestore.

После suite Admin SDK проверяет отсутствие:

- boards;
- boardInvites;
- columns;
- cards;
- labels;
- memberProfiles.

Production smoke требует точного opt-in:

```bash
SMOKE_ALLOW_WRITES=true npm run smoke
```

Он создаёт только synthetic `smoke-*` identity, одну доску, две колонки,
member profile, label и assigned/labeled card. Все созданные документы удаляются
в `finally`, после чего cleanup проверяется отдельными reads.

## Migrations

Оба migration scripts read-only по умолчанию. Записи разрешены только при точном
`MIGRATION_APPLY=true`.

### Stale member profiles

```bash
npm run migrate:stale-member-profiles
MIGRATION_APPLY=true npm run migrate:stale-member-profiles
npm run migrate:stale-member-profiles
```

Скрипт повторно читает board в transaction, защищает owner и не удаляет профиль
UID, который вернулся в membership. Вывод не содержит email/display name.

Production dry-run 27 июля: 7 boards, 7 profiles, 0 stale. Apply не требовался.
Удаление окончательное; восстановление возможно только из backup или ручным
созданием конкретного profile.

### Legacy card labels

```bash
npm run migrate:card-labels
MIGRATION_APPLY=true npm run migrate:card-labels
npm run migrate:card-labels
```

Apply создаёт board-level catalog, заменяет legacy strings на `labelIds` и
удаляет legacy field. Production apply/dry-run не нашли legacy cards или
необходимых catalog changes.

Перед будущим apply экспортировать затронутые boards, cards и labels. Для repair
legacy `labels` можно восстановить из имён catalog documents, после чего
вернуть backup и удалить сгенерированные references. Автоматического
деструктивного rollback нет.

## Observability

Для текущего pet-project масштаба достаточно Vercel Observability и Firebase
Console вместе с error boundaries, correlation IDs и structured logs.

Перед релизом проверить:

1. Vercel runtime logs и 12-hour Functions/Edge overview;
2. Firestore operations, listeners и connections за 24 часа;
3. Authentication providers;
4. App Check registration, token metrics и enforcement;
5. неожиданные изменения ошибок, latency или usage.

Ограничения текущего baseline:

- Vercel Hobby даёт короткое окно runtime logs и не даёт anomaly alerts;
- Firebase Spark требует ручной проверки usage;
- browser-only exceptions не отправляются во внешний sink.

Sentry, OpenTelemetry, Log Drains или session replay добавлять только после
конкретного инцидента, который нельзя исследовать существующими средствами.

## Rollback

Application rollback:

1. переназначить production alias на
   `dpl_GZB8xV5bwcBKrKonmPmuGFJufDcm`;
2. проверить `/`, `/sign-in` и protected API;
3. просмотреть runtime logs;
4. не откатывать данные автоматически.

Новые label catalog fields опциональны, а legacy label strings остаются
read-compatible, поэтому предыдущий deployment может читать существующие cards.
Data rollback выполняется отдельно и только из контролируемого backup.
