# Аудит Kanban Board App

Дата: 22 июля 2026 года
Объект аудита: состояние ветки `main` на коммите `d153001` до изменения документации
Формат: статический анализ кода и документации, установка по lock-файлу, lint, тесты, production-сборка и аудит зависимостей.

Статус remediation: P0 с автоматической упаковкой service-account JSON и P1 с отсутствующим App Check header устранены после аудита. Fallback на файл в project tree удалён из приложения и smoke-скрипта; `npm run build` теперь обязательно проверяет Next.js server traces на credential-файлы. Все custom API requests получают App Check token через общий fetch helper, когда App Check настроен. Patch/minor refresh снизил полный audit с 26 до 16 записей, а production audit — с 13 до 11; critical advisories больше нет. Оставшиеся цепочки Next.js и Firebase Admin требуют отдельных upstream/major решений.

## Краткий вывод

Проект собирается, типизируется и проходит имеющиеся unit/component-тесты и тесты Firestore Rules. Архитектурная основа здравая: функциональность разделена по feature-модулям, доступ проверяется и в UI, и в Firestore Rules, realtime-подписки освобождаются, а опасное удаление доски выполняется на сервере с проверкой владельца.

До развития продукта стоит провести короткий этап стабилизации. Наиболее важны потенциальное включение файла сервисного аккаунта в серверный deployment bundle, несовместимость пользовательских запросов с включённым App Check, нарушение целостности данных при удалении колонок и участников, а также накопившиеся уязвимости зависимостей. После этого основной выигрыш даст сокращение числа realtime-подписок на главной странице и разбиение нескольких крупных модулей.

## Что было проверено

| Проверка | Результат | Комментарий |
| --- | --- | --- |
| `npm ci` | пройдено | Установлено 1327 пакетов строго по обновлённому `package-lock.json`. |
| `npm run lint` | пройдено | Ошибок ESLint нет. |
| `npm run test:unit` | пройдено | 12 файлов и 29 тестов пройдены; 1 файл/11 тестов правил ожидаемо пропущены без эмулятора. |
| `npm run test:rules` | пройдено | 11/11 тестов Firestore Rules через эмулятор Java 25. |
| `npm run build` | пройдено | Next.js 16.2.11; дополнительная проверка 12 server trace-манифестов не нашла секреты или файлы проекта. |
| `npm audit` | требует действий | После обновлений: 12 moderate и 2 high; critical-уязвимости устранены. |
| `npm audit --omit=dev` | требует действий | После перехода на Firebase Admin SDK 14: 7 moderate и 2 high. |
| `npm outdated` | частично обработано | Patch/minor версии обновлены, `firebase-admin` переведён на 14.2.0; оставшиеся major-обновления требуют отдельных миграций. |
| Cypress E2E | не запускался | Учетные данные не настроены; тесты выполняют записи в реальный Firebase-проект и не очищают данные. Статически обнаружены устаревшие селекторы. |
| Smoke script | не запускался | Скрипт создаёт/изменяет внешние данные и не нужен для read-only аудита. |

## Приоритетные находки

### P0 — исключить долгоживущий ключ из deployment bundle — устранено

`lib/firebase/admin.ts` вычисляет резервный путь к JSON-ключу через `path.join(process.cwd(), ...)` и читает его динамически. Production-сборка сообщает, что из-за этого трассируется весь проект. Проверка `.next/server/app/api/*/route.js.nft.json` показала, что в список файлов обеих API-функций попал локальный, не отслеживаемый git файл:

`kanban-mvp-1baf2-firebase-adminsdk-fbsvc-ae0f47a077.json`

Файл не попал в git и не отдаётся браузеру как static asset, но может быть упакован в serverless/server deployment artifact. Если этот artifact уже загружался во внешнюю инфраструктуру, ключ следует считать распространённым шире необходимого.

Рекомендация:

1. Перейти на `FIREBASE_SERVICE_ACCOUNT` из защищённого хранилища платформы или на managed identity/Application Default Credentials.
2. Удалить fallback на JSON в корне проекта и ограничить статическую трассировку.
3. Пересобрать проект и убедиться, что NFT-манифесты не содержат ключ, исходники, тесты и всю рабочую директорию.
4. Если сборки с этим ключом публиковались, отозвать/ротировать ключ в Google Cloud после переключения приложения.

### P1 — App Check ломает собственные API при включении — устранено

Серверные маршруты `/api/auth/session` и `/api/boards/[boardId]` проверяют заголовок `X-Firebase-AppCheck`, когда включён `FIREBASE_APPCHECK_ENFORCE` или production-сборка имеет site key. Клиент инициализирует App Check, но ни один `fetch` не получает токен через `getToken()` и не отправляет этот заголовок.

Следствие: при рекомендуемой конфигурации App Check перестанут работать создание/очистка session cookie и удаление доски; вход может зациклиться на ошибке сессии.

Рекомендация: экспортировать клиентский App Check instance, сделать общий wrapper для защищённых `fetch` и покрыть POST/DELETE API интеграционными тестами с включённой проверкой.

### P1 — удаление колонки оставляет карточки-сироты — устранено

Карточки лежат в `boards/{boardId}/cards` и ссылаются на колонку через `columnId`. `deleteColumn()` удаляет только документ колонки. Карточки остаются в Firestore, продолжают загружаться и учитываться в статистике доски, но не отображаются ни в одной существующей колонке.

Undo случайно маскирует проблему: восстановленная с тем же id колонка снова показывает старые карточки. Если Undo не нажат, данные остаются сиротами бессрочно.

Решение: удалять можно только пустую колонку. Операция перенесена в защищённый server route с Admin SDK transaction; наличие хотя бы одной карточки даёт 409. Firestore Rules запрещают прямое client delete, а rules regression-тест закрепляет этот запрет.

### P1 — профили удалённых участников не очищаются — устранено для новых операций

Удаление участника и выход с доски удаляют только `members.{uid}` и `roles.{uid}`. Документ `memberProfiles/{uid}` остаётся, а правила полностью запрещают его удаление. Экран участников фильтруется по `board.members`, но карточка доски строит аватары и количество участников непосредственно по всей subcollection `memberProfiles`.

Следствие: бывшие участники продолжают отображаться в аватарах/счётчике и занимают место в данных. Сам бывший участник доступ к профилям теряет, поэтому это не даёт ему новый доступ, но создаёт неверный UI и нежелательное хранение PII.

Решение: remove/leave перенесены в доверенный server route. Admin SDK transaction одновременно удаляет UID из `members`/`roles` и `memberProfiles/{uid}`; Firestore Rules запрещают старый прямой client update. Для профилей, оставшихся до исправления, по-прежнему нужна одноразовая миграция внешних данных.

### P1 — production-зависимости содержат известные уязвимости — частично устранено

После обновления patch/minor зависимостей и перехода на `firebase-admin` 14.2.0 production-дерево содержит 9 записей: 2 high и 7 moderate; critical-уязвимостей больше нет. Ключевые оставшиеся цепочки:

- `next@16.2.11 -> sharp` и `postcss` — high/moderate; исправленные версии ещё не доступны через совместимый релиз Next.js;
- `firebase-admin@14.2.0 -> @google-cloud/storage -> teeny-request/gaxios -> uuid` — moderate;
- `retry-request` — транзитивный moderate advisory в той же цепочке хранения.

Наличие пакета в audit не означает, что уязвимый путь обязательно вызывается приложением, однако production bundle требует обновления и повторной проверки. Автоматический `npm audit fix --force` применять нельзя: он предлагает несовместимые и местами некорректные downgrades.

Рекомендация: отслеживать совместимые обновления Next.js и Google Cloud зависимостей; после обновлений повторять lint, unit, rules, build и E2E. Не применять текущий `npm audit fix --force`: он предлагает несовместимые downgrades Next.js и Firebase Admin SDK.

### P1 — Cypress E2E больше не соответствует UI — устранено статически

`cypress/e2e/kanban.cy.ts` ожидает `data-testid="add-column-trigger"`, `data-testid="invite-email"` и `data-testid="invite-submit"` на карточке доски. Таких test id в текущей реализации нет; приглашение теперь находится внутри раскрываемой секции участников на странице доски, а форма создания колонки показывается напрямую.

Кроме того, E2E создаёт минимум две доски и приглашение на каждый запуск, но cleanup отсутствует. Поэтому даже после настройки credentials тесты, вероятно, упадут и будут загрязнять Firebase.

Решение: селекторы обновлены под текущую board page, добавлены стабильные test ids. Suite требует явный `CYPRESS_E2E_ALLOW_WRITES=true`, документация требует отдельный Firebase test project, а `afterEach` удаляет все созданные доски и их subcollections. Фактический прогон остаётся release-gate с внешними credentials.

## Функциональные расхождения и целостность данных

### P2 — язык доски является почти неиспользуемым metadata — устранено

При создании можно выбрать `board.language`, и язык показывается в статистике карточки. Mutation `updateBoardLanguage` существует, но нигде не вызывается. Страница доски использует глобальный `uiLocale`, а не `board.language`.

Решение: поле закреплено как отдельный язык содержимого доски, не связанный с персональным UI locale. Owner/editor теперь меняет его в header доски; viewer видит read-only значение, карточка продолжает показывать metadata.

### P2 — locale синхронизируется неодинаково на разных страницах — устранено

Главная страница синхронизирует `uiLocale` с `users/{uid}.preferredLocale`. Страница доски и страница входа используют только `localStorage`; изменение языка на доске лишь ставит `uiLocaleTouched=1` и попадёт в Firestore только после возврата на главную страницу.

Решение: добавлен единый `usePreferredLocale`, отвечающий за local fallback, realtime profile bootstrap, touched-state и запись `users/{uid}`. Главная, вход и страница доски используют один lifecycle и одинаковую обработку ошибок.

### P2 — операции создания/принятия приглашения частично атомарны — устранено

- Создание доски сначала создаёт board, затем отдельным запросом owner profile. Ошибка второго запроса оставляет рабочую доску без профиля.
- Принятие приглашения batch-операцией добавляет membership и удаляет invite, а профиль пишет следующим запросом. Ошибка профиля показывается как ошибка принятия, хотя приглашение уже принято и удалено.
- Переименование доски не обновляет `boardTitle` в уже отправленных invitations, поэтому получатель может видеть старое название.

Решение: create board и accept invite перенесены в защищённые Admin SDK transactions. Клиент передаёт заранее созданный board id, повторные запросы обрабатываются идемпотентно, а прямой client accept запрещён правилами. Rename board также перенесён на сервер и атомарно обновляет `boardTitle` во всех ожидающих invitations.

### P2 — archived/assignees/labels описаны, но не являются UI-функциями — прояснено

Типы, normalizers и card mutations поддерживают `assigneeIds`, `labels`, `archived`, однако интерфейс не позволяет назначать участников, управлять labels или архивировать карточки. Более того, запросы не фильтруют `archived`, поэтому внешне архивированная карточка продолжит отображаться. В `schema.md` поля `archived` заявлены также для board и column, но Firestore Rules их запрещают.

Решение: поля явно отмечены в schema/spec как reserved data-layer, а ложные `archived` для board/column удалены из schema. Карточки с `archived: true` теперь исключаются из active kanban; assignment/labels/archive UI по-прежнему не заявлены как готовый функционал.

### P2 — нет явного состояния «нет доступа / доска не найдена» — устранено

Ошибка listener в `getBoard` превращается в `null`; ошибки columns/cards очищают массивы. Страница при этом может показывать пустую доску с заголовком `Board`, не объясняя 404/permission denied. Начальная загрузка тоже основана на stub `queryFn`, поэтому empty state может мигать до первого snapshot.

Решение: detail query хранит явный status первого snapshot. При permission error защищённый `GET /api/boards/[boardId]` различает 404 и 403 без раскрытия данных клиенту; UI показывает отдельные loading/not-found/forbidden/error состояния и создаёт новую realtime subscription по Retry.

## Безопасность и правила данных

### P2 — валидация правил недостаточно ограничивает форму данных — устранено

Правила хорошо ограничивают разрешённые ключи и базовые роли, но не проверяют несколько инвариантов:

- максимальную длину title/description/email/displayName/labels;
- что `createdById == request.auth.uid` при создании карточки;
- что `columnId` у карточки указывает на существующую колонку этой доски;
- что элементы `assigneeIds` и `labels` являются строками и assignee входит в members;
- разумные пределы количества members, roles, labels и assignees;
- соответствие timestamp серверному времени, где это важно.

Решение: добавлены пределы строк, maps и lists; create card требует `createdById == request.auth.uid` и существующую колонку; assignees ограничены участниками доски; labels проверяются по типу, длине и количеству. Базовые timestamps по-прежнему проверяются как timestamps, без жёсткого равенства `request.time`, чтобы сохранить offline writes.

### P2 — покрытие Firestore Rules недостаточно для рефакторинга — существенно расширено

Сейчас проверены базовый read, viewer/editor update, создание column/card и принятие invite. Не покрыты owner/editor/viewer для update/delete карточек и колонок, удаление доски, invite create/read/delete, remove member, leave board, memberProfiles и `users/{uid}`.

Добавлены сценарии update/delete карточек по ролям, malformed relationships/data, server-only rename/accept/remove, invite create/read/decline, memberProfiles и users. Suite содержит 11 проходящих emulator-тестов; дальнейшие новые операции должны добавляться в ту же матрицу.

### P3 — отсутствуют системные security headers и rate limiting — устранено для текущего deployment

Добавлены CSP (включая `frame-ancestors`), `Referrer-Policy`, `Permissions-Policy`, запрет MIME sniffing и framing, а также совместимый с Google sign-in `Cross-Origin-Opener-Policy`. Создание session cookie ограничено десятью попытками в минуту на IP до дорогостоящей проверки токенов. Лимитер хранится в памяти процесса; если приложение будет горизонтально масштабироваться на несколько постоянно работающих instances и лимит должен быть глобальным, состояние нужно перенести в общий Redis/KV store или edge firewall.

## Производительность и масштабирование

### P1 — главная страница создаёт три realtime listener на каждую доску — устранено

Каждая `KanbanBoardCard` подписывается на все `memberProfiles`, все columns и все cards своей доски ради аватаров и трёх статистик. При N досках главная страница держит `1 + 3N` listeners (плюс invitations/profile) и первоначально читает содержимое всех досок.

Это главный текущий bottleneck по времени загрузки, Firestore reads и памяти. Он проявится раньше, чем виртуализация карточек внутри одной доски.

Решение: `KanbanBoardCard` больше не создаёт content listeners. Counts загружаются одноразовыми Firestore aggregation queries, profiles ограничены preview из восьми документов и фильтруются по актуальному `board.members`; основной realtime остаётся только на списке boards. Следующий шаг при росте — server-maintained counters, чтобы убрать и `2N` one-shot aggregation queries.

### P1 — все сущности загружаются без limit/pagination — ограничено

Решение для текущего MVP: realtime queries ограничены 500 cards, 100 columns и 100 profiles. При достижении card cap UI явно предупреждает о неполной выборке и отключает content editing, чтобы не менять доску на основе скрытых данных. Поддерживаемая стратегия — разделить такую доску; полноценная cursor pagination остаётся будущим продуктовым расширением, несовместимым с текущим global DnD.

### P2 — порядок карточек со временем теряет числовой зазор — устранено

Решение: обычный DnD сохраняет дешёвую запись среднего значения. Когда относительный зазор становится меньше `1e-6`, после move запускается редкий batch rebalance целевой колонки с шагом `ORDER_GAP`; unit-тест закрепляет порог и новые значения. Один repair ограничен Firestore batch limit в 500 карточек.

Рекомендация: определить threshold минимального gap и редкую batch-нормализацию порядка либо перейти на устойчивый fractional indexing key.

### P3 — изображения профилей всегда `unoptimized` — устранено

Google profile avatars обрабатываются через оптимизатор `next/image`; разрешён только ожидаемый HTTPS-host `lh3.googleusercontent.com`. Неизвестные произвольные image domains не проксируются сервером.

## Поддерживаемость

### P2 — несколько модулей стали точками концентрации логики

Крупнейшие файлы:

- `lib/store/firestore-api.ts` — 737 строк;
- `features/cards/model/use-board-cards.ts` — 578;
- `lib/i18n.ts` — 530;
- `app/(auth)/sign-in/page.tsx` — 415;
- `features/board/ui/board-page.module.css` — 902.

Рекомендация: разделить RTK API по entity endpoint builders, выделить card CRUD и DnD controller из `useBoardCards`, вынести auth forms и locale provider, разделить CSS по компонентам. Делать после regression-тестов, небольшими PR.

### P2 — дублируются инфраструктурные обязанности

Повторяются `toMillis`, email validation, чтение/запись locale, подготовка ошибок и прямые Firestore mutations вне data layer. Это повышает вероятность расхождений, уже заметных на locale и profile lifecycle.

### P2 — нет error boundary и наблюдаемости

Ошибки listener частично пишутся в `console.error`, mutation errors показываются toast, но нет общего error boundary, structured logging, correlation id и клиентского crash reporting. Для realtime-приложения это затруднит диагностику рассинхронизаций.

### P3 — документация расходится с реализацией

`schema.md` всё ещё говорит «once columns/cards are implemented», хотя они реализованы; описывает `archived` для board/column, запрещённый rules; README завышает готовность board language. Новый документ `docs/FUNCTIONAL_SPEC.md` фиксирует состояние as-is и должен стать основой следующего рефакторинга.

## Что в проекте уже сделано хорошо

- `strict` TypeScript, чистый lint и успешная production-сборка.
- Feature-oriented структура и shared UI primitives.
- Серверная проверка session cookie на закрытых App Router страницах.
- Роли дублируются в UI и Firestore Rules; viewer остаётся read-only.
- Удаление доски проверяет владельца на сервере и каскадно удаляет subcollections/invites.
- Realtime subscriptions корректно вызывают `unsubscribe()` после удаления RTK cache entry.
- Оптимистичные create/move/delete карточек имеют rollback при ошибке.
- DnD поддерживает pointer и keyboard sensors.
- Firestore timestamps нормализуются перед помещением в Redux.
- Есть unit/component/rules/E2E уровни тестов, хотя покрытие неполное.
- Секреты и `.env.local` исключены из git; `git ls-files` не показал tracked credential files.

## Рекомендуемый порядок работ

### Этап 0 — безопасность deployment (сразу)

1. [x] Убрать default service-account file fallback; ротировать ключ при необходимости остаётся операционной задачей владельца инфраструктуры.
2. [x] Исправить App Check headers для custom API.
3. [x] Обновить patch/minor зависимости и провести повторный audit.
4. [x] Отдельно мигрировать `firebase-admin` 13 -> 14 и закрепить Node.js >=22.

### Этап 1 — целостность данных

1. [x] Запретить удаление непустой колонки и исключить создание карточек-сирот.
2. [x] Исправить lifecycle `memberProfiles` для новых remove/leave; миграция ранее накопленных stale profiles остаётся операционной задачей.
3. [x] Сделать create board / accept invite идемпотентными и согласованными.
4. [x] Расширить rules/integration tests на матрицу ролей, lifecycle и malformed data.

### Этап 2 — достоверность функционала

1. [x] Завершить board language как отдельную редактируемую настройку доски.
2. [x] Сделать единый locale lifecycle через `usePreferredLocale`.
3. [x] Добавить not-found/forbidden/loading/retry states.
4. [x] Обновить Cypress selectors, обязательный test-project opt-in и cleanup; запускать suite перед релизом с E2E credentials.

### Этап 3 — стоимость и производительность

1. [x] Убрать `3N` listeners с главной страницы через aggregation queries и capped preview.
2. [x] Ввести query limits и безопасный read-only guard для больших досок; cursor pagination отложена до пересмотра global DnD.
3. [x] Добавить автоматический order rebalance при схлопывании числового зазора.
4. После снижения reads рассмотреть virtualization UI.

### Этап 4 — рефакторинг и развитие

1. Разбить крупные API/hooks/CSS модули.
2. Централизовать data access, locale, errors и timestamp normalization.
3. Добавить error boundaries, telemetry и performance budgets.
4. Только затем развивать assignments, labels, archive, audit log, reminders и offline queue.

## Ограничения аудита

- Не исследовались реальные данные, Firebase console, usage/billing и production logs.
- Не выполнялись Lighthouse, browser profiling и нагрузочное тестирование.
- E2E и smoke не запускались, чтобы не делать неконтролируемые записи во внешний Firebase; credentials E2E отсутствуют.
- Audit зависимостей отражает состояние npm registry на дату документа и должен повторяться перед каждым релизом.
