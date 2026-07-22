# Kanban Board App — функциональное описание текущей версии

Статус документа: **as-is**, 22 июля 2026 года.
Назначение: единая точка входа для последующей доработки, тестирования и рефакторинга.
Источник истины: фактическая реализация в `app/`, `features/`, `lib/`, `firestore.rules`; известные дефекты перечислены в `PROJECT_AUDIT_2026-07-22.md`.

## 1. Назначение и границы продукта

Приложение — приватная realtime kanban-доска для небольших команд. Пользователь входит через Firebase Authentication, видит только доски, в которых состоит, и работает с колонками и карточками в рамках назначенной роли.

В текущий продукт входят:

- регистрация и вход по email/password;
- вход через Google;
- восстановление пароля;
- защищённая серверной session cookie область приложения;
- создание, просмотр, переименование и удаление досок;
- приглашения по email с ролями editor/viewer;
- список участников, удаление участника владельцем и самостоятельный выход;
- создание, переименование и удаление колонок;
- создание, редактирование, перемещение и удаление карточек;
- title, description и due date карточки;
- realtime-обновления Firestore;
- optimistic UI для создания, перемещения и удаления карточек;
- русский и английский интерфейс;
- светлая и тёмная тема;
- сортировка списка досок.

Не входят в готовый пользовательский функционал, хотя частично присутствуют в типах или документации:

- assignments карточек;
- labels/tags;
- archive UI;
- изменение роли уже принятого участника;
- передача владения доской;
- reorder колонок;
- комментарии, вложения, чек-листы, поиск и фильтры;
- уведомления по email/push и напоминания о сроках;
- activity/audit log;
- полноценный offline queue;
- pagination/virtualization;
- рабочая настройка языка существующей доски.

## 2. Термины и сущности

- **Пользователь** — Firebase Auth user с UID и опциональными email/displayName/photoURL.
- **Доска** — приватный контейнер участников, колонок и карточек.
- **Участник** — пользователь, UID которого присутствует одновременно в `board.members` и `board.roles`.
- **Владелец (owner)** — создатель доски и единственный пользователь, которому UI разрешает удалять доску, колонки, карточки и других участников.
- **Редактор (editor)** — участник, который может изменять доску, колонки и карточки, но не выполнять owner-only операции.
- **Наблюдатель (viewer)** — участник с доступом только на чтение.
- **Приглашение** — отдельный документ, адресованный нормализованному email и дающий editor/viewer после принятия.
- **Профиль участника** — snapshot имени, email и avatar для отображения внутри конкретной доски.
- **UI locale** — язык интерфейса пользователя, `ru` или `en`.
- **Board language** — поле metadata доски, выбранное при создании; сейчас не управляет языком страницы доски.

## 3. Роли и права

### 3.1 Матрица пользовательского интерфейса

| Операция | Owner | Editor | Viewer |
| --- | :---: | :---: | :---: |
| Открыть доску и видеть realtime-данные | да | да | да |
| Переименовать доску | да | да | нет |
| Создать колонку | да | да | нет |
| Переименовать колонку | да | да | нет |
| Удалить колонку | да | нет | нет |
| Создать карточку | да | да | нет |
| Редактировать title/description/due date | да | да | нет |
| Перемещать карточки DnD | да | да | нет |
| Удалить карточку | да | нет | нет |
| Пригласить editor/viewer | да | нет | нет |
| Удалить другого участника | да | нет | нет |
| Покинуть доску | нет | да | да |
| Удалить доску | да | нет | нет |

Owner не может покинуть собственную доску; передачи ownership нет.

### 3.2 Server/Firestore enforcement

UI-проверки не являются границей безопасности. Firestore Rules повторно проверяют membership и role:

- board read — любой текущий member;
- board create — authenticated user, который назначает себя owner и member;
- board content update — owner/editor при сохранении owner/membership для editor;
- board membership update — owner, адресат валидного invite или участник, покидающий доску;
- board delete — owner;
- column read — участник с валидной ролью;
- column create/update — owner/editor;
- column delete — owner;
- card read — участник с валидной ролью;
- card create/update — owner/editor;
- card delete — owner;
- invite create — owner соответствующей доски;
- invite read/delete — owner или адресат invitation;
- member profile read — member board;
- member profile create/update — только профиль самого authenticated member;
- user profile read/write — только сам пользователь;
- остальные документы — deny by default.

Удаление доски дополнительно авторизуется в server API через проверенную session cookie и `ownerId`.

## 4. Карта маршрутов

| Маршрут | Тип | Назначение |
| --- | --- | --- |
| `/sign-in` | публичная static page + client auth | вход, регистрация, Google, reset password, locale/theme |
| `/` | dynamic protected page | список приглашений и досок |
| `/boards/[boardId]` | dynamic protected page | участники, колонки, карточки, DnD |
| `POST /api/auth/session` | server route | обмен Firebase ID token на httpOnly session cookie |
| `DELETE /api/auth/session` | server route | очистка session cookie |
| `DELETE /api/boards/[boardId]` | server route | owner-only каскадное удаление board data |

`app/(app)/layout.tsx` проверяет session cookie до рендера `/` и `/boards/*`; при отсутствии валидной session выполняется redirect на `/sign-in`.

## 5. Аутентификация и сессия

### 5.1 Способы входа

Пользователь может:

1. Войти по email и паролю.
2. Создать Firebase account по email и паролю; минимальная длина пароля в UI — 6 символов.
3. Войти Google popup; при popup-blocked/closed/unsupported применяется redirect fallback.
4. Запросить password-reset email.

UI нормализует и проверяет email простой регулярной проверкой, а Firebase возвращает окончательный auth result/error.

### 5.2 Создание server session

После появления Firebase client user страница входа:

1. Принудительно получает свежий ID token через `user.getIdToken(true)`.
2. Отправляет token в `POST /api/auth/session`.
3. Server Admin SDK создаёт session cookie на 5 дней.
4. Cookie имеет `httpOnly`, `sameSite=lax`, `path=/`, `secure` в production.
5. После успеха пользователь перенаправляется на `/`.

Проверка session cookie использует `verifySessionCookie(cookie, true)`, то есть учитывает revoked sessions.

### 5.3 Выход

При выходе приложение:

1. Очищает RTK Query cache.
2. Вызывает `DELETE /api/auth/session`.
3. Выполняет Firebase client `signOut()`.
4. Перенаправляет на `/sign-in`.

Когда App Check настроен, общий client fetch получает актуальный token и отправляет `X-Firebase-AppCheck` во все custom API requests.

## 6. Главная страница

### 6.1 Верхняя панель

Показывает:

- название и subtitle приложения;
- email или UID текущего пользователя;
- выбор языка интерфейса ru/en;
- переключатель light/dark;
- кнопку выхода;
- ошибки через inline alert и toast.

### 6.2 Список приглашений

Приложение realtime-запросом получает `boardInvites`, где `email` равен email текущего пользователя в lowercase.

Для каждого invitation показываются board title и предлагаемая роль. Действия:

- **Принять** — batch добавляет `members.uid=true`, `roles.uid=<invite.role>` и удаляет invite; после batch отдельно создаётся/обновляется member profile.
- **Отклонить** — invitation удаляется.

После принятия Firestore listener списка boards автоматически добавляет доску на главную.

### 6.3 Список досок

Realtime-query выбирает boards по динамическому полю `members.<uid> == true`.

Список можно сортировать:

- по `createdAt`;
- по `title` с locale-aware `localeCompare`;
- ascending или descending.

Выбор сортировки хранится в `localStorage` (`boardsSortKey`, `boardsSortDirection`). По умолчанию — новые сначала.

### 6.4 Создание доски

Форма требует непустой title и позволяет выбрать `ru/en` как board language. По умолчанию используется текущий UI locale, пока пользователь явно не изменил выбор.

При создании записываются:

- title;
- ownerId;
- members с владельцем;
- roles с ролью owner;
- language;
- createdAt/updatedAt.

Board и owner member profile создаются одной Admin SDK transaction через `POST /api/boards`. Клиент заранее генерирует board id, поэтому повтор того же запроса идемпотентен. После успешной mutation board добавляется в cache, если listener ещё не успел прислать snapshot.

### 6.5 Карточка доски

Карточка показывает:

- детерминированный gradient по board id;
- title;
- роль текущего пользователя;
- до четырёх member avatars и overflow count;
- количество columns;
- количество cards;
- board language.

Клик, Enter или Space открывает `/boards/[boardId]`.

Editor/owner может переименовать board. Rename выполняется серверной транзакцией и одновременно обновляет `boardTitle` во всех ожидающих приглашениях. Owner может удалить board. После подтверждения удаление откладывается на 4 секунды; toast Undo отменяет ещё не отправленную server mutation. После отправки восстановление не предусмотрено.

Для статистик каждая карточка держит отдельные realtime listeners на memberProfiles, columns и cards соответствующей доски.

## 7. Страница доски

### 7.1 Header

Header показывает:

- ссылку назад на список досок;
- title доски;
- read-only badge для viewer;
- выбор UI locale;
- переключатель темы.

Если board listener не вернул документ, временно используется title `Board`. Отдельного 404/forbidden состояния сейчас нет.

### 7.2 Участники

Секция участников по умолчанию свёрнута и показывает preview до пяти avatars. В раскрытом виде для каждого активного member отображаются:

- avatar или первая буква имени;
- displayName/email/UID fallback;
- badge «Вы» для текущего пользователя;
- роль owner/editor/viewer или legacy `member`.

Owner может:

- открыть форму приглашения;
- пригласить lowercase email как editor или viewer;
- удалить любого участника, кроме себя/owner.

Editor/viewer может покинуть board с подтверждением. Owner вместо выхода видит invite action. Удаление участника и самостоятельный выход выполняются через server API: membership, role и `memberProfiles/{uid}` удаляются в одной Admin SDK transaction.

В header секции участников owner/editor также видит компактную форму создания колонки.

### 7.3 Колонки

Колонки загружаются realtime-query с `orderBy("order", "asc")`.

Owner/editor может:

- создать колонку с непустым title;
- переименовать колонку inline;
- добавлять в неё карточки.

Owner дополнительно может удалить пустую колонку с подтверждением. Удаление идёт через server API: транзакция повторно проверяет владельца и отклоняет запрос, если в колонке есть хотя бы одна карточка. После успешного удаления toast Undo пересоздаёт документ колонки с тем же id и order, но с новыми createdAt/updatedAt.

Колонки не перемещаются. При создании `order = Date.now()`.

Прямое удаление column client SDK запрещено Firestore Rules, поэтому обойти серверную проверку и создать карточки-сироты штатным клиентом нельзя.

### 7.4 Карточки

Cards загружаются одной realtime-подпиской на board-level subcollection и группируются по `columnId` в client state. Внутри колонок cards сортируются по numeric `order`.

#### Создание

Owner/editor открывает форму внутри конкретной колонки и может заполнить:

- обязательный title;
- optional description;
- optional due date через HTML date input.

Client заранее генерирует Firestore card id и `order = Date.now()`. Создание оптимистично добавляет card в board-level RTK cache и возможный per-column cache; при ошибке patch откатывается.

#### Просмотр

Card показывает title, description при наличии и due date в формате `DD.MM.YY`. Для editor/owner card кликабельна и keyboard-focusable; viewer видит её без edit behavior.

#### Редактирование

Owner/editor открывает dialog и изменяет title, description и due date. Пустое description сохраняется как `null`; пустой due date снимает срок.

Изменение content ожидает Firestore listener; optimistic move helper для него не применяется, если column/order не изменились.

#### Перемещение

DnD поддерживает PointerSensor с порогом 6px и KeyboardSensor с `sortableKeyboardCoordinates`.

Card можно:

- переместить между колонками;
- вставить перед конкретной card;
- бросить на пустую область/конец колонки.

Новый numeric order вычисляется по соседям:

- среднее между before/after;
- before + `ORDER_GAP`;
- after - `ORDER_GAP`;
- `Date.now()`, если соседей нет.

Mutation меняет `columnId` и `order`; RTK Query сразу патчит доступные board/per-column caches и откатывает их при ошибке.

#### Удаление и Undo

Только owner видит delete action. После подтверждения документ удаляется немедленно и оптимистично исчезает из cache. Toast Undo пересоздаёт card с тем же id, columnId, order и business fields; createdAt/updatedAt становятся новыми server timestamps.

### 7.5 Loading, empty и error states

- При загрузке columns может показываться skeleton.
- При отсутствии columns показывается empty state.
- При отсутствии cards в колонке показывается empty state.
- Mutation errors попадают в локальный `error`, inline alert и toast.
- Detail listener хранит явные loading/ready/not-found/forbidden/error состояния.
- При неоднозначном permission error server access check различает отсутствующую доску и недостаток membership.
- Error state предлагает Retry, который создаёт новую realtime subscription; terminal states дают ссылку назад к доскам.
- Listeners списков columns/cards пока преобразуют ошибки в пустые данные.

## 8. Локализация и тема

### 8.1 Язык интерфейса

Поддерживаются `ru` и `en`. Тексты хранятся централизованно в `lib/i18n.ts`.

На всех маршрутах locale:

1. Единый `usePreferredLocale` bootstrap-ится из `localStorage`.
2. Для авторизованного пользователя realtime-читается `users/{uid}.preferredLocale`.
3. При первом profile создаётся с email/timestamps.
4. При ручной смене локальное значение временно считается приоритетным и сразу записывается в Firestore с любой страницы.

Browser preferences для locale, theme и сортировки используют общий SSR-safe слой `useSyncExternalStore`, немедленно обновляют текущую вкладку и слушают `storage` events от других вкладок.

### 8.2 Язык доски

`board.language` хранится как `ru/en`, выбирается при создании, показывается на карточке и редактируется owner/editor в header доски. Это язык содержимого/команды доски; он намеренно не переключает персональный язык интерфейса пользователя.

### 8.3 Тема

Light/dark theme хранится в `localStorage`; ThemeToggle обновляет состояние документа. Настройка пользовательская и не связана с board.

## 9. Realtime, cache и optimistic state

### 9.1 RTK Query как слой подписок

`firestoreApi` использует `fakeBaseQuery`: первоначальный `queryFn` возвращает пустое значение, а `onCacheEntryAdded` создаёт Firestore `onSnapshot`.

Подписки существуют для:

- boards пользователя;
- одной board;
- invitations пользователя;
- columns board;
- memberProfiles board;
- cards board или optional cards одной column.

После `cacheEntryRemoved` вызывается `unsubscribe()`. На sign-out весь RTK API state сбрасывается.

### 9.2 Optimistic mutations

Оптимистично поддерживаются:

- create card;
- move card/reorder;
- delete card.

Патчи выполняются через `firestoreApi.util.updateQueryData` и имеют `undo()` при failed mutation.

Остальные изменения в основном подтверждаются realtime listener. Create board добавляет cache entry только после успешного server result. Delete board Undo — это 4-секундная отмена таймера, а не восстановление удалённых данных.

### 9.3 UI state

Redux `boardUiSlice` хранит по board:

- открытые add-card forms по column;
- drafts title/description/due;
- текущую editing card и её draft.

Локальные component hooks хранят dialogs, pending states, invite form, column edit и DnD hover/active state.

## 10. Firestore data model

### 10.1 `boards/{boardId}`

Фактически разрешённые/записываемые fields:

| Поле | Тип | Назначение |
| --- | --- | --- |
| `title` | string | отображаемое имя |
| `ownerId` | UID string | неизменяемый owner id |
| `members` | map UID -> true | membership lookup/query |
| `roles` | map UID -> owner/editor/viewer | role lookup |
| `language` | ru/en | metadata языка доски |
| `createdAt` | Timestamp | создание |
| `updatedAt` | Timestamp | последнее изменение |
| `createdBy` | optional legacy | допустим только равным ownerId |

`members` и `roles` должны иметь одинаковые keys. Legacy reads поддерживают `createdBy -> ownerId`.

### 10.2 `boards/{boardId}/columns/{columnId}`

| Поле | Тип |
| --- | --- |
| `title` | string |
| `order` | number |
| `createdAt` | Timestamp |
| `updatedAt` | Timestamp |

### 10.3 `boards/{boardId}/cards/{cardId}`

| Поле | Тип | UI status |
| --- | --- | --- |
| `columnId` | string | используется |
| `title` | string | используется |
| `description` | string/null | используется |
| `order` | number | используется DnD |
| `createdById` | UID string | записывается, не показывается |
| `dueAt` | Timestamp/null | используется |
| `assigneeIds` | string[] | data-layer only |
| `labels` | string[] | data-layer only |
| `archived` | boolean | data-layer only, query не фильтрует |
| `createdAt` | Timestamp | используется для данных |
| `updatedAt` | Timestamp | используется для данных |

Legacy reads поддерживают `createdBy -> createdById`.

### 10.4 `boards/{boardId}/memberProfiles/{uid}`

| Поле | Тип |
| --- | --- |
| `displayName` | string/null |
| `photoURL` | string/null |
| `email` | string/null |
| `joinedAt` | Timestamp |

Профиль является board-local snapshot. Текущий ruleset не разрешает delete.

### 10.5 `boardInvites/{boardId__email}`

| Поле | Тип |
| --- | --- |
| `boardId` | string |
| `boardTitle` | string snapshot |
| `email` | lowercase string |
| `role` | editor/viewer |
| `invitedById` | UID |
| `createdAt` | Timestamp |

Legacy reads поддерживают `invitedBy -> invitedById`.

### 10.6 `users/{uid}`

| Поле | Тип |
| --- | --- |
| `email` | string/null |
| `preferredLocale` | ru/en |
| `createdAt` | Timestamp |
| `updatedAt` | Timestamp |

### 10.7 Индексы

В `firestore.indexes.json` явно задан collection index для cards:

- `columnId ASC`;
- `order ASC`.

Остальные single-field queries используют автоматические индексы Firestore.

## 11. Server API и каскадное удаление

`POST /api/boards`:

1. Проверяет App Check и server session cookie.
2. Валидирует title, language и заранее сгенерированный board id.
3. Одной transaction создаёт board и профиль владельца.
4. Повтор запроса с тем же id и теми же данными возвращает success; конфликтующие данные дают 409.

`DELETE /api/boards/[boardId]`:

1. Проверяет App Check в зависимости от конфигурации.
2. Проверяет server session cookie.
3. Загружает board через Admin SDK.
4. Сравнивает `ownerId` с session UID.
5. Batch-циклами по 500 удаляет columns, cards, memberProfiles.
6. Удаляет все `boardInvites` по `boardId`.
7. Удаляет board document.

Ответы: 401 unauthenticated/App Check, 400 missing id, 404 board missing, 403 not owner, 500 internal delete error, 200 success.

`GET /api/boards/[boardId]` возвращает только access status и используется для безопасного различения 404/403 после ошибки client listener.

`PATCH /api/boards/[boardId]` проверяет owner/editor и одной transaction переименовывает board вместе со всеми ожидающими `boardInvites`. Прямое изменение title через client SDK запрещено правилами.

`DELETE /api/boards/[boardId]/columns/[columnId]`:

1. Проверяет App Check и server session cookie.
2. В Admin SDK transaction проверяет существование board и роль owner.
3. Проверяет существование column и выполняет query с `limit(1)` по cards этого `columnId`.
4. Возвращает 409 `COLUMN_NOT_EMPTY`, если найдена карточка; иначе удаляет column в той же транзакции.

`DELETE /api/boards/[boardId]/members/[memberId]`:

1. Проверяет App Check и server session cookie.
2. Разрешает owner удалить другого участника либо non-owner удалить самого себя.
3. Запрещает удаление/выход owner и проверяет актуальное membership.
4. В одной transaction удаляет UID из `members`/`roles` и документ `memberProfiles/{uid}`.

`POST /api/invites/[inviteId]/accept` атомарно проверяет email/role приглашения, добавляет membership, создаёт профиль и удаляет invite. Повтор после успешной операции безопасен для уже добавленного участника.

Прямое изменение membership для remove/leave и accept invite запрещено Firestore Rules.

## 12. Валидация и обработка ошибок

Client checks:

- title board/column/card после trim не должен быть пустым;
- email должен соответствовать простой форме `text@text.text`;
- password не короче 6 символов;
- нельзя приглашать собственный email;
- role invite только editor/viewer в Select;
- due date парсится из локального `YYYY-MM-DD`.

Firestore Rules дополнительно проверяют allowed keys, roles, timestamps, максимальные длины и размеры maps/lists. Карточка обязана ссылаться на существующую колонку; при создании `createdById` совпадает с UID автора; assignees входят в members; labels — строки ограниченной длины и количества.

Ошибки Firebase Auth переводятся на ru/en для известных кодов. Firestore/server errors часто показывают исходный `Error.message`, иначе используется локализованный fallback.

Toast system:

- максимум три сообщения;
- default duration 5 секунд;
- варианты info/success/error;
- optional async action, используемый для Undo;
- error toast имеет role `alert`, остальные `status`.

## 13. Тесты и проверяемые контракты

### 13.1 Unit/component

Покрыты:

- numeric card order и date conversion;
- DnD drop id helpers;
- permissions fallback;
- email/non-empty validation;
- Firestore/card normalization и legacy fields;
- CardEditDialog;
- Header viewer notice;
- notifications и Undo action.

### 13.2 Firestore Rules

Через emulator проверены:

- unauthenticated board read deny;
- member read allow;
- viewer board update deny;
- editor title update allow;
- viewer/editor create column;
- viewer/editor create card;
- invite acceptance только с matching role.

### 13.3 Cypress

Задуманы сценарии create board -> two columns -> card -> DnD и отправка invite. Текущие селекторы устарели относительно UI, credentials отсутствуют, cleanup тестовых данных не реализован; suite нельзя считать рабочим regression gate до обновления.

## 14. Нефункциональные характеристики текущей версии

- Приложение client-heavy; Firestore является основным data/backend слоем.
- Realtime consistency near-real-time, без транзакционной гарантии между отдельными client writes.
- Viewer read-only обеспечен UI и Rules.
- Все board cards/content загружаются без pagination/limit.
- Main page fan-out: три content listeners на каждую board.
- Card order не rebalance-ится.
- Нет service worker/offline mutation queue.
- Нет централизованной telemetry/error boundary.
- Responsive styles находятся в CSS Modules; основной board CSS крупный и общий для нескольких секций.

## 15. Инварианты для будущего рефакторинга

При любом изменении необходимо сохранить или явно мигрировать следующие контракты:

1. Viewer никогда не выполняет writes ни через UI, ни напрямую через Firestore.
2. Owner/editor могут менять content; destructive delete card/column/board остаётся owner-only, пока продукт явно не изменит политику.
3. `members` и `roles` остаются синхронны.
4. Owner остаётся member с ролью owner; ownerId нельзя незаметно менять.
5. Cards остаются board-level и ссылаются на существующую column либо миграция меняет schema/rules/indexes одновременно.
6. Любая listener subscription имеет deterministic cleanup.
7. Optimistic mutation имеет rollback и не создаёт duplicate card.
8. Move card атомарно меняет `columnId` и `order`.
9. Server cascade delete проверяет session UID и ownerId.
10. Никакие service-account JSON, `.env.local` или secrets не входят в git и deployment tracing.
11. Изменения `firestore.rules` сопровождаются `npm run test:rules`.
12. Изменения DnD сопровождаются рабочим E2E или эквивалентным integration coverage.
13. Изменения schema отражаются в `schema.md`, indexes и migration notes.
14. UI strings добавляются сразу для ru и en.

## 16. Решения, которые нужно принять до расширения продукта

1. Нужны ли assignments/labels/archive в ближайшем релизе или поля следует временно удалить?
2. Какая модель удаления профиля участника удовлетворяет privacy и Undo?
3. Как поддерживать board stats: denormalized counters, aggregation queries или server projection?
4. Какой размер board считать целевым для pagination/virtualization?
5. Нужна ли передача ownership и изменение ролей?
6. Какой Firebase project/emulator станет изолированной E2E средой?
9. Какая deployment-платформа и managed credential strategy являются целевыми?
10. Какие SLO/метрики нужны: startup latency, listener count, Firestore reads, mutation error rate?
