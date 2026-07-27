# Kanban Board App — план закрытия аудита и рефакторинга

- Дата: 23 июля 2026 года
- Статус: рабочий план, готов к последовательному выполнению

Источники:

- `docs/PROJECT_AUDIT_2026-07-22.md`;
- `docs/FUNCTIONAL_SPEC.md`;
- фактическая структура `app/`, `features/`, `lib/`, `tests/`, `cypress/` и `scripts/`.

## 1. Цель плана

План объединяет:

1. незакрытые операционные и технические остатки аудита;
2. подготовку безопасной основы для дальнейшего рефакторинга;
3. целевое разбиение крупных модулей без изменения поведения;
4. согласованные продуктовые расширения: изменение роли `editor/viewer`, несколько исполнителей и каталог labels;
5. обязательные проверки, документацию и release gates для каждой фазы.

Главный принцип: сначала получить воспроизводимый baseline и закрыть внешние риски, затем рефакторить под тестами, и только после этого менять data model или добавлять UI-функции.

## 2. Текущее состояние

### 2.1 Что уже стабилизировано

- P0/P1 дефекты целостности новых операций устранены.
- Viewer остаётся read-only в UI и Firestore Rules.
- Создание доски и принятие приглашения выполняются серверными транзакциями.
- Удаление доски, участника и колонки выполняется через защищённые server routes.
- Realtime listeners вынесены в adapters и имеют cleanup.
- Optimistic create/move/delete карточек имеют rollback.
- Main-page listener fan-out заменён aggregation queries и capped preview.
- Доска ограничена 500 карточками, 100 колонками и 100 профилями.
- Добавлен автоматический card-order rebalance.
- Production работает на Vercel с Webpack и `firebase-admin` 13.x.
- Unit/component suite содержит 40 проходящих тестов; Firestore Rules suite — 11 сценариев.
- Документация описывает текущие роли, API, schema, limits и принятые продуктовые решения.

### 2.2 Незакрытые остатки аудита

| ID | Остаток | Приоритет | Характер работы |
| --- | --- | --- | --- |
| AUD-01 | Закрыт 27 июля: Git/trace чисты, Vercel secret обновлён, локальная JSON-копия удалена | закрыт | внешняя инфраструктура |
| AUD-02 | Закрыт 27 июля: production dry-run проверил 7 boards/7 profiles, stale profiles — 0 | закрыт | одноразовая data migration |
| AUD-03 | Фактически запустить изолированный Cypress E2E и проверить cleanup | закрыт 27 июля | release validation |
| AUD-04 | Закрыт 27 июля: два production smoke и HTTP redirect/sign-in verification прошли с cleanup | закрыт | release validation |
| AUD-05 | Закрыт 27 июля: authenticated Vercel/Firebase review завершён, решение зафиксировано | закрыт | открытое решение №8 |
| AUD-06 | Сопровождать 3 high и 8 moderate production advisories без `npm audit fix --force` | средний, постоянный | dependency maintenance |
| AUD-07 | Не обновлять `firebase-admin` до 14.x без preview/runtime проверки | высокий, постоянный | deployment compatibility |
| AUD-08 | Закрыт 27 июля: legacy E2E Auth user и orphan `users/{uid}` удалены; read-only Admin SDK check подтвердил 0/0 | закрыт | внешняя инфраструктура |
| AUD-09 | При необходимости выполнить Lighthouse/browser profiling и ограниченный load check | низкий, по сигналу | performance validation |
| AUD-10 | Декомпозировать крупные связные модули только под тестами и вместе с понятными границами ответственности | средний | рефакторинг |

### 2.3 Крупные текущие модули

Размеры являются сигналом для анализа, а не самостоятельной причиной дробления:

| Файл | Размер | Основная ответственность |
| --- | ---: | --- |
| Feature RTK Query APIs | до 228 строк на модуль | единый base API, feature endpoints и optimistic card cache |
| `features/cards/model/use-board-cards.ts` | 452 строки | card query projection, forms, CRUD, dialogs, notifications |
| `lib/i18n.ts` | 560 строк | типы и весь ru/en copy |
| `app/(auth)/sign-in/page.tsx` | 403 строки | auth modes, providers, reset, session, UI |
| `features/board/ui/board-page.module.css` | 924 строки | стили нескольких board subfeatures |

DnD controller, Firestore listener adapters, data operations, locale lifecycle и общие normalizers уже вынесены. Повторно объединять или переносить их не нужно.

### 2.4 Карта остатков по фазам

| Фаза | Закрываемые пункты |
| --- | --- |
| 0. Baseline | AUD-03, подготовка AUD-04 |
| 1. Operations | AUD-01, AUD-02, AUD-04, AUD-05, AUD-06, AUD-07, AUD-08; условно AUD-09 |
| 2. Safety net | недостающее regression coverage перед AUD-10 |
| 3–4. Structural refactor | AUD-10 |
| 5. Roles | принятое продуктовое решение `editor <-> viewer` |
| 6. Assignments | принятое решение о нескольких исполнителях |
| 7. Labels | принятое решение о board-level каталоге |
| 8. Stabilization | повторная проверка всех закрытых остатков и release |

## 3. Зафиксированные ограничения и не-цели

Эти решения нельзя незаметно отменить во время рефакторинга:

- Archive не реализуется; отдельной archive view не будет.
- Передачи ownership нет.
- Из управления ролями добавляется только `editor <-> viewer`.
- Assignments поддерживают несколько исполнителей через `assigneeIds`.
- Labels используют единый каталог на уровне доски; потребуется новая schema entity.
- Board stats остаются на aggregation queries.
- Pagination и virtualization не вводятся.
- Product caps остаются: 500 cards, 100 columns, 100 member profiles.
- Большую доску нужно разделить; скрытые данные нельзя частично редактировать.
- Полный E2E использует только локальные Auth/Firestore emulators и demo project;
  cloud Firebase проверяется отдельным контролируемым smoke.
- Production остаётся на Vercel, сборка — `next build --webpack`.
- `firebase-admin` остаётся на 13.x до отдельной совместимой миграции.
- Внешняя telemetry система не выбирается до проверки Vercel Observability и Firebase Console.
- Audit log, reminders, attachments, comments, search, offline queue и notifications не входят в этот план.

## 4. Инварианты, обязательные во всех фазах

1. Viewer не выполняет writes через UI или Firestore.
2. Owner/editor меняют content; destructive delete card/column/board остаётся owner-only.
3. `members` и `roles` имеют одинаковый набор UID.
4. Owner остаётся member с ролью `owner`; `ownerId` не меняется.
5. Card ссылается на существующую column.
6. Listener всегда имеет deterministic cleanup.
7. Optimistic mutation всегда имеет rollback и не создаёт duplicate entity.
8. Card move атомарно меняет `columnId` и `order`.
9. Server destructive route проверяет session UID и полномочия.
10. Secrets и credential-файлы не входят в git, build trace или логи.
11. Изменение Rules требует `npm run test:rules`.
12. Изменение DnD требует E2E или эквивалентного integration coverage.
13. Изменение data model одновременно обновляет `schema.md`, Rules, indexes, tests и migration notes.
14. UI copy добавляется сразу для ru и en.
15. Product caps и read-only guard сохраняются на каждом промежуточном коммите.

## 5. Общие правила выполнения

Каждая фаза выполняется отдельной серией небольших коммитов. Фаза не смешивает:

- чистый refactor и изменение поведения;
- schema migration и крупный UI rewrite;
- dependency upgrade и feature work;
- production infrastructure change и необязательную оптимизацию.

Минимальный локальный gate для любого изменения:

```bash
npm run lint
npm run test:unit
npm run build
git diff --check
```

Дополнительные gates:

- Rules/schema: `npm run test:rules`;
- DnD или основной пользовательский flow: `npm run cypress:run`;
- dependency/deployment: `npm audit --omit=dev`, preview deployment, runtime logs и production smoke;
- migration: dry-run, ограниченный apply, повторный dry-run и отчёт о количестве изменений.

## 6. Фаза 0 — зафиксировать воспроизводимый baseline

- Приоритет: P0
- Оценка: 0,5–1 рабочий день
- Зависимости: локальные Java и Firebase CLI

### Цель

Получить подтверждённую исходную точку перед structural refactor, включая
воспроизводимый E2E без внешних credentials и cloud writes.

### Прогресс на 27 июля 2026 года

- Пункт 0.1 пересмотрен: Cypress полностью переведён на локальные Auth/Firestore
  emulators под non-routable project `demo-kanban-e2e`.
- `npm ci`, lint, unit suite, Rules suite, production Webpack build и server-trace check прошли.
- Cypress: 2/2 сценария прошли; DnD и server-route delete подтверждены.
- После исправления гонки initial snapshot и DnD helper выполнены три
  последовательных зелёных Cypress run.
- Независимая Admin-проверка подтвердила отсутствие boards, invites, columns,
  cards и memberProfiles после каждого run.
- Полный gate пройден на code baseline
  `34c968063fe6e56725207004fd5885f12223be28`, результат записан в
  `docs/BASELINE_VALIDATION_2026-07-25.md`.

### Работы

#### 0.1 Согласовать E2E-контракт с принятым решением — выполнено

- `npm run cypress:run` сам поднимает Auth/Firestore emulators, Next.js и Cypress.
- Используется только non-routable demo project `demo-kanban-e2e`.
- Локальный Auth-пользователь создаётся launcher’ом; credentials не являются
  секретом и не читаются из `.env.local`.
- Уникальные названия создаются для каждого сценария.
- `afterEach` удаляет доски через server API; launcher независимо проверяет
  отсутствие root collections и board subcollections.
- App Check отключается только внутри emulator child process.

#### 0.2 Выполнить полный baseline

Последовательно выполнить:

1. `npm ci`;
2. `npm run lint`;
3. `npm run test:unit`;
4. `npm run test:rules`;
5. `npm run build`;
6. `npm run cypress:run` (самодостаточный emulator run).

Зафиксировать:

- версии Node.js, npm, Java и Firebase emulator;
- commit SHA;
- количество unit/rules/E2E сценариев;
- emulator project id;
- список созданных и удалённых E2E boards.

#### 0.3 Проверить cleanup

- После Cypress выполнить независимые Admin queries к emulator.
- Убедиться, что не осталось boards, columns, cards, profiles или invites.
- Launcher завершает run ошибкой при любом leftover.

### Результаты фазы

- воспроизводимый baseline;
- фактически зелёный E2E;
- отсутствие тестовых данных после запуска;
- короткий validation record в документации или release notes.

### Критерий завершения

Все команды проходят на одном commit SHA, а повторная проверка Firebase не находит созданных E2E данных.

## 7. Фаза 1 — закрыть внешние и операционные остатки аудита

- Приоритет: P0/P1
- Оценка: 2–4 рабочих дня, часть действий условная
- Зависимости: доступ к Vercel, Firebase Console и Google Cloud IAM

### 1.1 Проверить и при необходимости ротировать service-account ключ

Работа выполняется только если ключ из старого локального файла когда-либо использовался в опубликованной сборке или Vercel environment.

Проверка закрыта 27 июля и зафиксирована в
`docs/CREDENTIAL_AUDIT_2026-07-27.md`: Git history и server trace чисты, полный
JSON перенесён в защищённую Vercel Variable, новый deployment отвечает без
initialization errors, file fallback не используется, локальная копия удалена.

Шаги:

1. Найти active service-account key IDs в Google Cloud IAM.
2. Сопоставить их с текущим `FIREBASE_SERVICE_ACCOUNT` в Vercel, не выводя JSON в терминал или логи.
3. Определить, мог ли старый ключ попасть в deployment artifact до удаления file fallback.
4. Если риск есть:
   - создать новый ключ;
   - обновить защищённую Vercel environment variable;
   - выполнить preview deployment;
   - проверить `/`, session API и один защищённый board API;
   - переключить production;
   - отключить и затем удалить старый ключ.
5. Проверить `npm run check:server-trace`.

Критерии завершения:

- production работает с новым ключом;
- старый ключ отключён;
- credential-файл отсутствует в git и deployment trace;
- в документации зафиксирован только key ID/дата ротации, но не секрет.

### 1.2 Одноразово очистить stale `memberProfiles`

Статус на 27 июля: безопасный admin script, pure unit tests и emulator-проверка
dry-run/apply/re-run готовы. Production dry-run проверил 7 boards и 7 profiles,
stale profiles не найдены, поэтому apply не выполнялся. Результат записан в
`docs/MIGRATION_STALE_MEMBER_PROFILES_2026-07-27.md`.

Создать отдельный admin script, безопасный по умолчанию:

- default mode — dry-run;
- apply требует явный флаг, например `MIGRATION_APPLY=true`;
- credentials берутся тем же способом, что и у других admin scripts;
- для каждой board сравниваются keys `members` и документы `memberProfiles`;
- удаляются только профили UID, которых нет в `members`;
- удаление окончательное, без archive и Undo;
- обработка идемпотентна;
- batch учитывает лимит 500 writes;
- лог содержит board id и counts, но не email/displayName.

Порядок:

1. dry-run на текущем Firebase project;
2. сохранить агрегированный отчёт `boards scanned / stale profiles found`;
3. проверить несколько результатов вручную;
4. выполнить apply;
5. повторить dry-run — ожидается `0 stale profiles`;
6. добавить unit tests для pure comparison/batching logic.

Критерии завершения:

- stale profiles отсутствуют;
- актуальные участники и owner profiles не затронуты;
- повторный запуск ничего не меняет.

### 1.3 Выполнить контролируемый smoke

Статус на 27 июля: скрипт требует `SMOKE_ALLOW_WRITES=true`, принимает только
synthetic `smoke-*` UID, использует уникальный prefix и независимо проверяет
cleanup. Два последовательных production run прошли; `/ -> /sign-in` и sign-in
page также отвечают без 500.

Текущий `npm run smoke` напрямую создаёт board и columns через Admin SDK, проверяет list/order queries и удаляет созданные документы в `finally`.

Перед первым внешним запуском:

- добавить явный opt-in, например `SMOKE_ALLOW_WRITES=true`;
- вывести выбранный project id и test UID до записи;
- запретить production-like UID по умолчанию;
- использовать уникальный smoke prefix;
- убедиться, что cleanup не зависит от успешного завершения assertions;
- не выводить service-account JSON.

Порядок:

1. проверить environment и project id;
2. запустить smoke;
3. убедиться, что board/columns найдены ожидаемыми queries;
4. подтвердить cleanup по уникальному prefix;
5. повторить запуск для проверки идемпотентности;
6. отдельно выполнить HTTP smoke production `/ -> /sign-in` без изменения данных.

Критерий завершения:

- оба запуска успешны;
- после каждого запуска не остаётся smoke data;
- production redirect и конечная sign-in page отвечают без 500.

### 1.4 Проверить observability — открытый вопрос №8

Статус на 27 июля: authenticated read-only review завершён и записан в
`docs/OBSERVABILITY_AUDIT_2026-07-27.md`. Vercel + Firebase Console выбраны как
достаточный baseline для текущего пет-проекта; внешний telemetry SDK не
добавляется без воспроизводимого client-side diagnostic gap.

Vercel Hobby даёт raw logs максимум за час и 12-часовой Observability overview;
за проверенный период function errors/timeouts — 0%, anomaly alerts и 30-day
retention требуют Pro. Firebase работает на Spark; Firestore за 24 часа показал
249 reads, 7 writes, 6 deletes, пик 5 listeners и 4 connections. App Check web
app зарегистрирован, но Firestore/Auth enforcement выключен и требует отдельного
staged rollout.

Также найден legacy cloud-E2E Auth user: board memberships и `memberProfiles`
отсутствуют, но `users/{uid}` существует. Его удаление не выполнялось без
явного разрешения.

Нельзя считать Vercel Observability и Firebase Console настроенными только потому, что проекты существуют.

Проверить Vercel:

- видны ли runtime 4xx/5xx и stack/error messages;
- доступны ли latency и route/deployment filters;
- каков retention на текущем плане;
- можно ли настроить уведомление без перехода на другой тариф;
- можно ли найти инцидент по deployment id, route, request id или correlation id;
- не попадают ли в логи email, card content, tokens или service-account данные.

Проверить Firebase Console:

- Firestore reads/writes/deletes;
- quota и usage по дням;
- billing status и budget alerts;
- Authentication usage;
- App Check metrics и enforcement status.

Провести контролируемую проверку:

1. создать безопасное тестовое structured log event без PII;
2. убедиться, что событие находится в Vercel;
3. выполнить E2E/smoke и проверить отражение usage в Firebase;
4. записать доступные метрики, retention и alerts.

Decision gate:

- если данных достаточно для пет-проекта — закрепить Vercel + Firebase как окончательное решение;
- если клиентские ошибки невозможно расследовать — отдельно рассмотреть минимальный error sink;
- не подключать Sentry/OTel/replay «на всякий случай».

### 1.5 Зафиксировать dependency policy

Статус на 27 июля: checklist добавлен в `docs/DEPENDENCY_POLICY.md`. Проверенный
baseline обновлён до Next.js 16.2.12, `eslint-config-next` 16.2.12 и `radix-ui`
1.6.7; `firebase-admin` остаётся на 13.x.

Текущее состояние: 3 high и 8 moderate production advisories, совместимого автоматического исправления нет.

Работы:

- добавить короткий dependency review checklist;
- проверять `npm outdated` и `npm audit --omit=dev` перед релизом;
- не применять `npm audit fix --force`;
- отдельно отслеживать исправленные версии Next.js/sharp/postcss;
- отдельно отслеживать Firebase Admin/jwks-rsa/jose;
- не смешивать обновление Next.js и Firebase Admin в одном коммите.

Для будущего `firebase-admin` 14.x:

1. отдельная branch/commit;
2. clean install;
3. lint/unit/rules/build;
4. preview deployment;
5. запрос `/` и protected APIs;
6. просмотр Vercel runtime logs;
7. только затем production promotion.

### 1.6 Условно выполнить performance profiling

Исходный аудит не включал Lighthouse, browser profiling и нагрузочные тесты. Для текущего пет-проекта это не блокирует рефакторинг само по себе.

Работу выполнять только если:

- Vercel/Firebase показывают рост latency или reads;
- появляется воспроизводимый UI lag;
- требуется portfolio baseline перед крупным UI изменением;
- меняются DnD, card rendering или board queries.

Минимальный безопасный объём:

- Lighthouse для `/sign-in`;
- browser profile board page на fixture с большим числом cards;
- DnD profile без записи в production;
- ограниченный load/check только на emulator или контролируемых fixture data;
- сравнение до/после, без введения pagination, virtualization или counters без измеримого основания.

Эта работа оценивается отдельно в 0,5–1,5 дня и не входит в обязательный critical path.

### Результаты фазы

- закрыта или документированно отклонена ротация ключа;
- удалены старые stale profiles;
- вопрос №8 получает доказательный ответ;
- dependency upgrades имеют безопасную процедуру.

## 8. Фаза 2 — усилить страховочную сетку перед рефакторингом

- Приоритет: P1
- Оценка: 2–4 рабочих дня
- Зависимости: фаза 0
- Статус: закрыта 27 июля; полный gate и evidence зафиксированы в
  `docs/REGRESSION_COVERAGE_MATRIX.md`

### Цель

Закрепить именно те контракты, которые легко сломать при разделении RTK Query, hooks и UI.

### 2.1 Матрица regression coverage

Добавить или подтвердить тесты:

Статус на 27 июля: фактическое покрытие и оставшиеся gaps зафиксированы в
`docs/REGRESSION_COVERAGE_MATRIX.md`. Первый блок RTK Query orchestration начат:
закреплены one-listener/cleanup, error/retry, idempotent create и rollback
create/move/delete. Тест rollback обнаружил и закрыл безусловную invalidation
после rejected card mutation. Route-level tests закрепляют 401/403/owner delete,
а также атомарную синхронизацию `members`/`roles` при invite acceptance и
member removal. Component coverage подтверждает owner-only participant controls,
а pure model test закрепляет отключение card editing на границе 500 записей.

| Контракт | Минимальное покрытие |
| --- | --- |
| Viewer read-only | component + Rules |
| Owner/editor content writes | Rules + targeted integration |
| Owner-only destructive actions | component + Rules/server route |
| `members`/`roles` sync | Rules + server route |
| Listener cleanup | unit/integration вокруг `cacheEntryRemoved` |
| Optimistic rollback | unit для create/update/move/delete error path |
| Duplicate prevention | repeated/idempotent create scenario |
| Card move | unit order calculation + E2E DnD |
| Card cap guard | component/model test |
| App Check headers | unit для custom fetch wrapper |
| Session and API authorization | route-level tests или reproducible integration scenarios |
| Secret-free trace | `check-server-trace` unit + production build |

### 2.2 Добавить тесты RTK Query orchestration

Приоритетные сценарии:

Статус на 27 июля: выполнено. Listener lifecycle, error/retry, optimistic
create/move/delete rollback, stable entity id и one-shot board summary закреплены
unit/integration tests.

- listener стартует один раз на cache entry;
- `unsubscribe()` вызывается после `cacheEntryRemoved`;
- listener error переводится в ожидаемое state;
- Retry создаёт новую subscription;
- optimistic create не создаёт duplicate card;
- optimistic move восстанавливает `columnId/order` после reject;
- delete/Undo использует тот же entity id;
- board card aggregation не создаёт realtime listener.

Тестировать observable contract, а не приватные функции RTK Query.

### 2.3 Расширить E2E только критичными сценариями

До feature work добавить:

Статус на 27 июля: выполнено в изолированных Auth/Firestore emulators. Core flow
покрывает sign-in/session redirect, board, две columns, card create/edit/delete/
Undo, cross-column DnD и cleanup; отдельный flow покрывает invite create и
cleanup. Два последовательных прогона прошли.

- вход и session redirect;
- create board;
- create two columns;
- create/edit/delete/Undo card;
- DnD между колонками;
- invite create;
- cleanup.

Role matrix и assignments/labels добавляются в соответствующих feature-фазах, а не заранее.

### Критерий завершения

Structural refactor может менять расположение файлов без изменения тестовых контрактов; намеренно сломанный listener cleanup или rollback приводит к падению теста.

## 9. Фаза 3 — рефакторинг data/store слоя

- Приоритет: P1
- Оценка: 2–3 рабочих дня
- Риск: высокий из-за realtime cache и optimistic state
- Зависимости: фаза 2
- Статус: закрыта 27 июля. Base API и типы находятся в `lib/store/`; board,
  invite, columns, member profile и card endpoints — в feature data modules.
  Старый compatibility barrel удалён после механической миграции imports.
  Regression-test подтверждает один API object и reducer path; публичные hooks,
  cache keys, tag names и keepUnusedDataFor не изменены. Финальный gate:
  lint, 60 unit, 11 Rules, production build/14 traces и два последовательных
  Cypress 2/2 с cleanup

### Цель

Уменьшить `lib/store/firestore-api.ts`, сохранив единственный RTK Query cache и все текущие hook contracts.

### Целевая структура

Рекомендуемая модель:

- один базовый `firestoreApi`;
- feature-модули добавляют endpoints через `injectEndpoints`;
- listeners остаются в read adapters;
- document writes остаются в data operations;
- optimistic helpers остаются pure functions;
- root store подключает один reducer/middleware.

Возможное разделение:

- `lib/store/firestore-base-api.ts`;
- `features/boards/data/boards-api.ts`;
- `features/invites/data/invites-api.ts`;
- `features/columns/data/columns-api.ts`;
- `features/cards/data/cards-api.ts`;
- `features/participants/data/participants-api.ts`;
- совместимый barrel для временного сохранения существующих imports.

### Последовательность

1. Вынести только base API и общие типы.
2. Перенести read-only board/invite endpoints.
3. Запустить полный unit gate.
4. Перенести columns/members endpoints.
5. Перенести cards endpoints и optimistic mutations последними.
6. Удалить compatibility barrel только после миграции всех imports.
7. Не менять query args, cache keys, tag names или keepUnusedDataFor одновременно с переносом.

### Что не делать в этой фазе

- не менять Firestore schema;
- не добавлять labels/role updates;
- не менять DnD;
- не создавать несколько независимых `createApi`;
- не заменять RTK Query другим state manager;
- не переписывать optimistic updates.

### Критерии завершения

- `firestore-api.ts` перестаёт быть feature-монолитом;
- снаружи сохраняются существующие hooks либо миграция imports выполняется механически;
- listener cleanup и rollback tests проходят;
- число активных subscriptions не увеличивается;
- UI и Firestore traffic не меняются.

## 10. Фаза 4 — рефакторинг feature orchestration и UI

- Приоритет: P2
- Оценка: 3–5 рабочих дней
- Зависимости: фаза 3
- Статус: закрыта 27 июля. Card query projection вынесена в pure function,
  create/edit/delete — в отдельные controllers, а `useBoardCards` оставлен
  тонким composition hook поверх существующего DnD. Sign-in разделён на
  error mapping, email/reset/Google/session controllers и presentational form.
  Типизированные ru/en словари разнесены по шести доменам при сохранении
  `getCopy(locale)` и прежней формы `Copy`. Board CSS разделён между
  card, participants, header/status и board layout modules. Финальный gate:
  lint, 70 unit tests, production build/14 traces, Cypress 2/2 с DnD, Undo,
  invite flow и подтверждённым cleanup

### 4.1 Разделить `use-board-cards.ts`

Текущий hook одновременно:

- читает и группирует cards;
- управляет add/edit/delete forms;
- вызывает mutations;
- управляет dialogs;
- показывает notifications;
- подключает DnD.

Рекомендуемое разделение:

- pure selector/projection `cards -> cardsByColumn/cardColumnById`;
- `useCardCreateController`;
- `useCardEditController`;
- `useCardDeleteController`;
- существующий `useCardDnd`;
- тонкий composition hook или прямое объединение в `CardsSection`.

Правила:

- не переносить form state обратно из Redux без отдельного решения;
- сохранить stable callbacks там, где они нужны DnD/dialogs;
- delete snapshot и Undo остаются согласованными;
- derived maps не должны сортироваться заново без изменения данных.

### 4.2 Разделить sign-in page

Выделить:

- auth error mapping;
- email sign-in/sign-up controller;
- password-reset controller;
- Google popup/redirect controller;
- session bootstrap;
- presentational auth form.

Страница должна отвечать за composition и redirect, а не содержать все auth branches.

Обязательные тесты:

- invalid email/password;
- sign-in/sign-up toggle;
- reset flow;
- popup fallback to redirect;
- session API error;
- ru/en copy.

### 4.3 Разделить i18n по доменам

Сохранить единый типизированный `Copy`, но разнести словари:

- common;
- auth;
- boards/home;
- board/card/column;
- participants/invites;
- notifications/errors.

Требования:

- `getCopy(locale)` остаётся простой точкой входа;
- TypeScript проверяет одинаковые keys для ru/en;
- не вводить runtime i18n library без необходимости;
- отсутствующий перевод должен падать на этапе typecheck/test, а не тихо в production.

### 4.4 Разделять board CSS только вместе с компонентами

Не выполнять механический перенос всех 924 строк одним коммитом.

Порядок:

1. выделить styles для cards dialogs/forms;
2. затем participants;
3. затем board header/status;
4. оставить layout/grid tokens в board-level module;
5. удалить неиспользуемые classes после каждого переноса.

Проверки:

- desktop/mobile screenshots или browser walkthrough;
- keyboard focus;
- DnD hit areas;
- viewer state;
- dark/light theme.

### Критерий завершения

Крупные модули имеют одну понятную orchestration responsibility, поведение и UI не меняются, а следующая feature-фаза не требует снова редактировать общий монолит.

## 11. Фаза 5 — изменение роли editor/viewer

- Приоритет: P1 среди новых функций
- Оценка: 1,5–2,5 рабочих дня
- Зависимости: фазы 2–4
- Статус: закрыта 27 июля. Owner-only PATCH меняет только принятого non-owner
  участника между `editor` и `viewer` в Admin SDK transaction; invalid role,
  owner target, отсутствующий member и non-owner actor отклоняются, повтор роли
  является idempotent no-op. Participants API/UI используют server mutation и
  owner-only Select, а board listener немедленно обновляет write/read-only UI.
  Финальный gate: lint, 78 unit/component tests, 11 Rules scenarios, production
  build/14 traces и Cypress 3/3, включая двухпользовательский editor -> viewer
  flow и подтверждённый emulator cleanup

### Целевой контракт

- Только owner меняет роль принятого участника.
- Допустимы только `editor` и `viewer`.
- Owner нельзя понизить или изменить.
- Передачи ownership нет.
- Membership и `memberProfiles` не меняются.
- Прямой client update роли не разрешается; операция проходит через server API.

### Реализация

1. Расширить route `boards/[boardId]/members/[memberId]` методом `PATCH` либо создать узкий role route.
2. Проверить session, App Check, board ownership и существование target member.
3. В Admin SDK transaction:
   - перечитать board;
   - запретить target owner;
   - проверить роль;
   - изменить только `roles.{memberId}`;
   - сохранить одинаковые keys `members` и `roles`;
   - обновить `updatedAt`, если это принятный board contract.
4. Добавить mutation в participants data/API layer.
5. В UI owner получает Select; editor/viewer видят read-only role.
6. Добавить success/error state и ru/en copy.

### Тесты

- owner: editor -> viewer;
- owner: viewer -> editor;
- editor/viewer не могут менять роли;
- owner role не меняется;
- отсутствующий member -> 404;
- invalid role -> 400;
- repeated same role — idempotent success либо документированный no-op;
- viewer после понижения немедленно теряет write UI и write permission.

### Критерий завершения

Роль меняется атомарно, realtime UI обновляется без перезагрузки, Firestore Rules по-прежнему запрещают обход server route.

## 12. Фаза 6 — несколько исполнителей

- Приоритет: P2 среди новых функций
- Оценка: 2–3 рабочих дня
- Зависимости: участники и card refactor

### Целевой контракт

- Card может иметь несколько assignees.
- Источник вариантов — актуальные members текущей board.
- Используется существующее `assigneeIds`.
- Максимум остаётся 20 UID согласно Rules.
- Viewer видит assignees, но не редактирует.
- Удалённый участник не должен оставаться доступным для нового назначения.

### Реализация

1. Добавить typed multi-select в create/edit card UI.
2. Показывать avatar/name/email fallback без хранения нового PII в card.
3. Передавать `assigneeIds` через существующие create/update operations.
4. Обновить optimistic card draft.
5. Показывать assignee chips/avatars на card.
6. При удалении участника выбрать и закрепить cleanup:
   - рекомендуемый вариант — server remove-member route batch-удаляет UID из cards;
   - batch укладывается в product cap 500 cards;
   - если cleanup не выполнен, normalizer/UI должен скрывать UID, отсутствующий в members.
7. Обновить copy и accessibility labels.

### Тесты

- назначение 0/1/нескольких members;
- duplicate UID не сохраняется;
- outsider UID отклоняется Rules;
- viewer не видит edit control;
- optimistic update/rollback;
- remove member очищает assignments;
- card cap не нарушает cleanup batch.

### Критерий завершения

Несколько исполнителей корректно синхронизируются realtime, не дают новых прав доступа и не создают stale references после удаления участника.

## 13. Фаза 7 — каталог labels на уровне доски

- Приоритет: P2 среди новых функций
- Оценка: 4–6 рабочих дней
- Риск: изменение data model
- Зависимости: фазы 2–4

### 13.1 Уточнить технический контракт

Рекомендуемая schema:

`boards/{boardId}/labels/{labelId}`

Поля:

- `name`: string;
- `color`: значение из ограниченной палитры либо валидируемый hex;
- `order`: number, если нужен стабильный порядок;
- `createdAt`;
- `updatedAt`.

Для cards рекомендуется ввести однозначное поле `labelIds: string[]`, а legacy `labels: string[]` временно читать только для migration. Это исключит смешение названий и document IDs.

Перед реализацией подтвердить:

- уникальность name с учётом регистра;
- максимальное число labels на board;
- палитру colors;
- кто управляет каталогом: рекомендуется owner/editor;
- что происходит при удалении используемой label.

### 13.2 Schema, Rules и migration

1. Обновить `lib/types/boards.ts`.
2. Добавить label normalizer/listener/operations.
3. Добавить Rules для board members:
   - read — member;
   - create/update — owner/editor;
   - delete — owner/editor через выбранную безопасную операцию;
   - limits на name/color/order и количество доступных labels.
4. Обновить `schema.md` и `docs/FUNCTIONAL_SPEC.md`.
5. Проверить indexes; не добавлять composite index без реального query.
6. Подготовить migration:
   - найти legacy string labels в cards;
   - создать catalog entries;
   - заменить их на `labelIds`;
   - dry-run/apply/idempotency;
   - после миграции удалить legacy write path.

### 13.3 Catalog UI

Добавить board-level управление:

- список labels;
- создание name + color;
- rename/recolor;
- delete confirmation;
- одинаковый UI для ru/en;
- viewer read-only.

### 13.4 Card integration

- multi-select labels в create/edit card;
- chips на card;
- неизвестный/deleted label отображается безопасно или скрывается;
- максимум 10 labels на card сохраняется;
- optimistic update имеет rollback.

### 13.5 Удаление label

Рекомендуемый вариант:

- server route проверяет owner/editor;
- выбирает cards, содержащие label id;
- batch удаляет id из максимум 500 cards;
- удаляет catalog document;
- операция повторяема и безопасна при retry.

Это соответствует product cap и не оставляет dangling references.

### Тесты

- Rules CRUD по матрице owner/editor/viewer;
- invalid/too-long name и invalid color;
- duplicate name;
- назначение до 10 labels;
- outsider/unknown label;
- rename/recolor отражается на всех cards без перезаписи cards;
- delete label очищает card references;
- migration dry-run/apply/re-run;
- E2E catalog + card assignment.

### Критерий завершения

Labels имеют единый board-level каталог, rename/recolor не требуют обновлять каждую card, legacy strings мигрированы, Rules и docs соответствуют новой schema.

## 14. Фаза 8 — стабилизация и production release

- Приоритет: P1
- Оценка: 1–2 рабочих дня
- Зависимости: завершённая выбранная feature-фаза

### Полный gate

1. clean install;
2. lint;
3. unit/component;
4. Firestore Rules emulator;
5. production Webpack build;
6. server trace check;
7. Cypress E2E;
8. migration dry-run;
9. `npm audit --omit=dev`;
10. preview deployment;
11. runtime log review;
12. production smoke;
13. cleanup test/migration data.

### Документация

Обновить:

- `README.md`;
- `AGENTS.md`;
- `schema.md`;
- `docs/FUNCTIONAL_SPEC.md`;
- `docs/PROJECT_AUDIT_2026-07-22.md`;
- этот план: отметить выполненные items и фактические отклонения.

### Production verification

Проверить:

- `/` -> `/sign-in`;
- email и Google auth;
- session cookie;
- board list/create/open;
- role matrix;
- column/card CRUD;
- DnD;
- invites;
- assignments/labels, если соответствующая фаза вошла в release;
- absence of new 500;
- Vercel/Firebase observability, если вопрос №8 уже закрыт.

## 15. Рекомендуемая последовательность коммитов

Ориентировочно:

1. `test: align and run direct Firebase E2E baseline`
2. `chore: add stale member profile migration`
3. `docs: record infrastructure and observability verification`
4. `test: cover realtime cleanup and optimistic rollback`
5. `refactor: split RTK Query endpoints by feature`
6. `refactor: split card orchestration controllers`
7. `refactor: extract auth controllers and forms`
8. `refactor: split typed locale dictionaries`
9. `feat: allow owner to change editor viewer roles`
10. `feat: add multiple card assignees`
11. `feat: add board label catalogue schema`
12. `feat: add label management and card labels`
13. `docs: finalize schema feature and release status`

Каждый коммит должен быть самостоятельно собираемым. Schema migration и UI, который от неё зависит, можно объединять только если промежуточный production deploy исключён.

## 16. Оценка трудозатрат

| Блок | Оценка |
| --- | ---: |
| Фаза 0: baseline/E2E | 0,5–1 день |
| Фаза 1: operational leftovers | 2–4 дня |
| Фаза 2: regression safety net | 2–4 дня |
| Фаза 3: data/store refactor | 2–3 дня |
| Фаза 4: feature/UI refactor | 3–5 дней |
| Фаза 5: editor/viewer role change | 1,5–2,5 дня |
| Фаза 6: assignments | 2–3 дня |
| Фаза 7: labels catalogue | 4–6 дней |
| Фаза 8: stabilization/release | 1–2 дня |

Итого:

- закрыть аудит и подготовить безопасный refactor baseline: примерно 4,5–9 дней;
- выполнить structural refactor: ещё 5–8 дней;
- реализовать согласованные product features: ещё 7,5–11,5 дней;
- полный объём вместе со стабилизацией: ориентировочно 18–30,5 рабочих дней при последовательной работе одного разработчика.

Оценка не включает ожидание внешних credentials, ручную работу в Google Cloud/Vercel/Firebase Console, условный performance profiling и возможное исправление неизвестных production-data проблем.

## 17. Контрольные точки

### Gate A — можно начинать structural refactor

Статус: пройден 27 июля 2026 года на code baseline
`34c968063fe6e56725207004fd5885f12223be28`.

- baseline полностью зелёный;
- E2E фактически запущен;
- cleanup подтверждён;
- migration stale profiles подготовлена или выполнена;
- критичный credential risk закрыт.

### Gate B — можно добавлять feature work

- data/store endpoints разделены без изменения поведения;
- listener/rollback contracts покрыты;
- card/auth orchestration имеет понятные границы;
- текущий production smoke зелёный.

### Gate C — можно менять schema для labels

- assignments и participants flows стабильны;
- migration framework проверен;
- Rules suite зелёный;
- согласованы `labelIds`, limits, palette и delete semantics.

### Gate D — можно выпускать production

- полный gate фазы 8 зелёный;
- preview не содержит runtime errors;
- migration имеет dry-run и rollback/repair procedure;
- документация соответствует фактическому release;
- тестовые данные удалены.

## 18. Первый практический шаг

Начать с фазы 0:

1. [x] перевести Cypress на Auth/Firestore emulators;
2. [x] добавить локальный seed и изоляцию от `.env.local`;
3. [x] запустить E2E baseline;
4. [x] независимо проверить cleanup;
5. [x] повторить полный gate на итоговом commit SHA;
6. [x] подготовить migration stale member profiles и перейти к остальным Gate A работам.

Рабочий end-to-end contract подтверждён реальным запуском без cloud writes и без
использования долгоживущих локальных service-account ключей.
