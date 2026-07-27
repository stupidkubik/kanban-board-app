# Kanban Board App — development history

Этот файл сохраняет историю закрытого цикла аудита и рефакторинга 22–27 июля
2026 года. Он не является текущим backlog или runbook. Текущие контракты
находятся в `FUNCTIONAL_SPEC.md`, operational процедуры — в `OPERATIONS.md`.

## Исходный аудит

Проект уже имел рабочую feature-oriented архитектуру, Firebase Rules,
realtime-подписки и optimistic UI, но аудит выявил несколько системных рисков:

- service-account fallback мог попасть в server trace;
- App Check token не передавался в custom API;
- удаление колонки могло оставлять cards-сироты;
- remove/leave оставлял stale member profiles;
- create board и accept invite не были полностью атомарны;
- главная страница создавала `1 + 3N` realtime listeners;
- queries не имели product caps;
- Cypress зависел от cloud credentials и не гарантировал cleanup;
- крупные data/auth/card/i18n модули мешали безопасному feature work;
- роли accepted members, multiple assignees и labels отсутствовали в UI.

Работа была разделена на восемь фаз с контрольными Gate A–D.

## Статус фаз

| Фаза | Результат |
| --- | --- |
| 0 — baseline | закрыта |
| 1 — operational risks | закрыта |
| 2 — regression safety net | закрыта |
| 3 — data/store refactor | закрыта |
| 4 — orchestration/UI refactor | закрыта |
| 5 — editor/viewer roles | закрыта |
| 6 — multiple assignees | закрыта |
| 7 — board label catalog | закрыта |
| 8 — stabilization/release | закрыта и выпущена в production |

Не являются незакрытыми пунктами этого плана: archive UI, ownership transfer,
audit log, reminders, offline queue и масштабирование выше product caps. Это
отдельные будущие продуктовые решения, а не хвост завершённого рефакторинга.

## Фаза 0 — воспроизводимый baseline

- Cypress переведён на локальные Auth/Firestore emulators.
- Добавлены seed, write opt-in и независимая cleanup-проверка.
- Node.js закреплён на 24.x.
- Production build закреплён на Webpack.
- Server trace получил автоматическую проверку secrets.

Gate A был пройден на `34c968063fe6e56725207004fd5885f12223be28`.

## Фаза 1 — operational risks

- Service-account file fallback удалён.
- Credential history и deployment traces проверены.
- Stale member profiles migration подготовлена и проверена.
- Production smoke получил synthetic UID, guard и cleanup.
- Vercel/Firebase observability исследована без изменения инфраструктуры.
- Зафиксирована dependency policy и блокировка Firebase Admin 14.x.

Production stale-profile dry-run: 7 boards, 7 profiles, 0 stale.

## Фаза 2 — regression safety net

Добавлено покрытие для:

- owner/editor/viewer permissions;
- server-only membership operations;
- listener lifecycle и retry;
- optimistic rollback и duplicate prevention;
- card cap;
- DnD;
- App Check headers;
- secret-free server traces.

Матрица покрытия стала частью тестов и перестала требовать отдельного живого
документа.

## Фаза 3 — data/store refactor

- RTK Query endpoints разнесены по feature boundaries.
- Firestore listeners и операции вынесены из общего store-модуля.
- Shared types и base API сохранены в `lib/store`.
- Consumers переведены на feature APIs без изменения внешнего поведения.

## Фаза 4 — orchestration and UI refactor

- Card CRUD, DnD и form orchestration разделены на controllers.
- Sign-in forms/controllers вынесены из route page.
- i18n разделён на typed domain dictionaries.
- Board CSS разделялся вместе с компонентами, без массового механического move.

Ключевые коммиты:

- `c38f386 refactor: extract card endpoints`
- `d8aaaa4 refactor: migrate consumers to feature APIs`
- `53f1ad6 refactor: split auth and card controllers`
- `0607764 refactor: split i18n and board styles`
- `6528879 docs: record phase 4 completion`

## Фаза 5 — role management

Owner получил server-only PATCH для переключения accepted non-owner member между
editor и viewer. Owner role нельзя изменить, repeated role является
идемпотентным no-op, а realtime board listener немедленно обновляет read-only UI.

Коммит: `fba052d feat: manage accepted member roles`.

## Фаза 6 — multiple assignees

Cards получили до 20 актуальных assignee UIDs, multi-select и profile/auth
fallback chips. Optimistic cache updates имеют rollback. Remove-member route
очищает assignments в пределах product cap 500 cards.

Коммит: `d214c96 feat: add multiple card assignees`.

## Фаза 7 — board label catalog

Реализован realtime catalog до 50 labels на board и до 10 labels на card.
Rename/recolor не переписывает cards; delete label очищает references. Rules
проверяют server-maintained catalog index. Legacy migration имеет
dry-run/apply/idempotent re-run и пропускает no-op board writes.

Ключевые коммиты:

- `38c8698 feat: add board label catalog`
- `1db5ca6 chore: add card labels migration`
- `6cfbb25 fix: skip no-op label migration writes`

Production migration не нашла legacy cards.

## Фаза 8 — stabilization and release

Production smoke расширен до columns, profile, label и assigned/labeled card.
E2E launcher стабилизирован для cold routes, controlled inputs и
browser-to-emulator transport. Финальный gate:

| Gate | Результат |
| --- | --- |
| Clean install | 1333 packages |
| Unit/component | 106 passed |
| Rules | 12 passed |
| Build | Next.js 16.2.12, Webpack |
| Server traces | 16 clean |
| Cypress | 3/3 with cleanup |
| Audit | 3 high, 8 moderate, 0 critical |
| Migrations | dry-runs clean |

Preview `dpl_61qTbWpt1Qwc6K1dNjCfzmnojrok` прошёл HTTP и runtime-log checks.
Production release `dpl_BbeqJFYm6y3hCLh1V5yfwhiT52Sk` опубликован на
`https://kanban-board-app-ten-psi.vercel.app/`. Post-deploy smoke и cleanup
прошли.

Ключевые коммиты:

- `7f38f62 test: extend production release smoke`
- `7de5839 test: stabilize emulator release gate`
- `0898e80 docs: record phase 8 production release`

## Итоговые решения

- Viewer остаётся read-only в UI и Rules.
- Destructive board/content operations сохраняют owner-only policy.
- Cards остаются board-level и группируются client-side.
- Product caps: 500 cards, 100 columns, 100 profiles.
- Board statistics остаются one-shot aggregation queries.
- Archive UI, ownership transfer, audit log, reminders и offline queue не входят
  в текущий продукт.
- Firebase Admin остаётся на 13.x до совместимого Vercel runtime.
- Vercel Observability + Firebase Console достаточно для текущего масштаба.
- Дальнейший refactor выполняется вместе с функциональными изменениями, а не
  отдельным массовым перемещением файлов.
