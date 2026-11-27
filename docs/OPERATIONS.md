# Kanban Board App — operations

Статус: живой runbook, обновлён 27 ноября 2026 года.

## Production baseline

- URL: `https://kanban-board-app-ten-psi.vercel.app/`
- Vercel project: `kanban-board-app`
- Node.js: `24.x`
- Next.js: `16.2.12`
- Production bundler: Webpack
- Firebase project: `kanban-mvp-1baf2`

Конкретные deployment IDs намеренно не закрепляются в документации: они
устаревают после каждого релиза. Текущий production и доступные rollback
кандидаты следует определять в Vercel dashboard или CLI непосредственно перед
операцией.

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

GitHub Actions (`.github/workflows/quality.yml`) на каждый PR и push в `main`
выполняет шаги 1, 2 и 4 (`npm ci`, `npm run check`, `npm run build`) и отдельной
job — `npm audit --omit=dev --audit-level=high`. Остальные шаги — вручную.

Перед каждым production release:

1. `npm ci`
2. `npm run check` (ESLint без warnings, `tsc` для приложения, тестов и Cypress, Vitest `unit` с порогами coverage)
3. `npm run test:rules`
4. `npm run build`
5. `npm run cypress:run`
6. `npm run migrate:stale-member-profiles`
7. `npm run migrate:card-labels`
8. `npm audit --omit=dev`
9. Vercel preview deployment
10. preview `/`, `/sign-in`, protected API и runtime logs
11. promotion проверенного preview
12. production HTTP verification и runtime logs
13. `SMOKE_ALLOW_WRITES=true npm run smoke`
14. проверка cleanup

Ожидаемые unauthenticated ответы:

- `/` — `307` на `/sign-in`;
- `/sign-in` — `200`;
- защищённый API без session cookie — `401`, не `500`.

Последний полный gate:

| Проверка | Результат | Дата |
| --- | --- | --- |
| Unit/component | 128 passed (project `unit`); coverage 46% statements | 2026-11-04 |
| Firestore Rules | 12 passed (project `rules`) | 2026-11-04 |
| Server traces | 16, credential findings отсутствуют | 2026-11-04 |
| Cypress | 3/3 passed | 2026-11-04 |
| Production audit | 0 (`npm audit --omit=dev`) | 2026-11-04 |
| Production HTTP | `/` 307, `/sign-in` 200, `POST /api/boards` 401 | 2026-11-04 |
| Migration dry-runs | 7 boards, изменений не требуется | 2026-07-29 |
| Production smoke | passed, cleanup verified | 2026-07-29 |

## Firestore Rules deploy

Vercel не публикует `firestore.rules`: после мержа изменений в rules их нужно
выкатить отдельно, иначе в production продолжают действовать старые правила.

1. `npm run test:rules` на ветке, которая уходит в `main`;
2. дождаться production-деплоя приложения на Vercel (клиент должен уже
   соответствовать новым правилам);
3. `npx firebase deploy --only firestore:rules --project kanban-mvp-1baf2`;
4. проверить в Firebase Console → Firestore → Rules дату публикации и повторить
   sign-in и открытие доски в production.

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

`package.json` → `overrides` (добавлены 2026-11-04, закрывают оставшиеся
production advisories):

- `@firebase/firestore` → `@grpc/grpc-js ^1.14.7`: `@firebase/firestore` пинит
  `~1.9.0` (1.9.16 уязвима). gRPC нужен только Node-сборке Firestore SDK (rules
  tests, скрипты); проверено `npm run test:rules` и `npm run cypress:run`.
  Удалить, когда `firebase` перестанет пинить 1.9.x (`npm ls @grpc/grpc-js`).
- `gaxios`, `google-gax`, `teeny-request` → `uuid ^11.1.1`: `firebase-admin` 13
  и `firebase-tools` тянут `uuid@9.0.1`; пакеты используют только `v4()`.
  Удалить после перехода на `firebase-admin` ≥14.3, если `npm ls uuid` чистый.

Dependabot (`.github/dependabot.yml`) раз в неделю открывает группы `next`,
`react`, `vitest`, `firebase` и minor/patch для production/development; мажоры
`typescript` ≥7, `eslint` и `@types/node` игнорируются. Overrides он не обновляет.

Будущее обновление Firebase Admin 14.x выполнять отдельной миграцией: отдельный
commit, clean install, полный gate, preview, проверка session/protected API и
runtime logs. Не объединять его с обновлением Next.js.

### Проверка обновления зависимостей — 2026-11-27

Причины падений открытых PR Dependabot:

| PR | Причина | Исправление |
| --- | --- | --- |
| [#22](https://github.com/stupidkubik/kanban-board-app/pull/22), [#40](https://github.com/stupidkubik/kanban-board-app/pull/40) | `npm ci`: Vitest и coverage требуют одинаковую версию | Оба пакета обновлены до 5.1.2 |
| [#23](https://github.com/stupidkubik/kanban-board-app/pull/23), [#28](https://github.com/stupidkubik/kanban-board-app/pull/28) | `npm ci`: несовместимые peer-версии Firebase и rules-unit-testing | Firebase 13.4.0 + rules-unit-testing 6.0.0 |
| [#29](https://github.com/stupidkubik/kanban-board-app/pull/29) | TypeScript: Cypress 16 удалил `allowCypressEnv` | Cypress 16.4.0, устаревший параметр удалён; тесты уже используют `cy.env()` |
| [#27](https://github.com/stupidkubik/kanban-board-app/pull/27) | Последний CI зелёный | TypeScript 6.0.3 включён в обновление |

Также обновлены Next.js / eslint-config-next до 16.4.6, Redux Toolkit до 2.15.0,
Firebase CLI до 15.37.0 и совместимые dev-зависимости. `@types/node` возвращён
на 24.x в соответствии с runtime. Уже слитый Admin SDK 14.5.1 возвращён на
13.10.0 согласно ограничениям выше; его мажоры добавлены в ignore Dependabot.

После обновления Firebase нужен единый `@firebase/app` во всём дереве:
сохранённая в lockfile копия 0.16.2 рядом с 0.16.7 приводила к
`Service firestore is not available` в rules tests. `npm dedupe` устранил дубли;
чистый `npm ci` воспроизводит рабочее дерево. Существующие security overrides
пока нужны: Firestore по-прежнему требует `@grpc/grpc-js ~1.9.0`, Admin 13 — uuid 9.

Локально прошли `npm ci`, `npm run check` (196 unit/component tests; coverage:
53.98% statements, 44.54% branches, 54.23% functions, 53.92% lines),
`npm run test:rules -- --project demo-kanban-e2e` (12/12), Webpack build и
проверка 17 server traces, `cypress verify`, `npm run cypress:run` (3/3,
cleanup подтверждён). Cypress использовал встроенный Electron; в версии 16
этот браузер deprecated, переход на Chrome нужно проверить отдельно.
Это локальная проверка обновления, а не подтверждение production release.

`npm audit --omit=dev`: 0 уязвимостей. Полный audit: 11 moderate, все через
Firebase CLI (`glob` / `minimatch`, OpenTelemetry); high/critical отсутствуют.
Совместимый апдейт typescript-eslint до 8.74.0 устранил ещё 6 dev-advisories.
Предложенный audit понижает google-gax или Firebase CLI; такое исправление
не применялось. Jest DOM 8 и jsdom 31 на этом этапе оставлены для отдельных
миграций; ограничения на ESLint 10, TypeScript 7 и Admin 14 сохраняются.

Дополнение: [#43](https://github.com/stupidkubik/kanban-board-app/pull/43)
обновляет Jest DOM до 8.0.0 (поддержка Vitest 5),
[#42](https://github.com/stupidkubik/kanban-board-app/pull/42) — jsdom до 31.0.1.
Новый jsdom возвращает live computed styles: Radix видит CSS-анимацию выхода
из диалога и ждёт `animationend`, который jsdom самостоятельно не отправляет.
Component test явно завершает анимации диалога и overlay, затем по-прежнему
проверяет закрытие и возврат фокуса на кнопку удаления. Cypress дополнительно
проверяет отмену удаления метки и возврат фокуса в браузере. Код приложения
для этой миграции менять не потребовалось.
Совместно прошли clean install, `npm run check` (196 tests), Webpack build с
проверкой 17 traces и Cypress (3/3, включая возврат фокуса; cleanup подтверждён).
Production audit по-прежнему показывает 0 уязвимостей.

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

1. в Vercel выбрать последний deployment, который прошёл полный release gate;
2. переназначить на него production alias;
3. проверить `/`, `/sign-in` и protected API;
4. просмотреть runtime logs;
5. не откатывать данные автоматически.

Новые label catalog fields опциональны, а legacy label strings остаются
read-compatible, поэтому предыдущий deployment может читать существующие cards.
Data rollback выполняется отдельно и только из контролируемого backup.
