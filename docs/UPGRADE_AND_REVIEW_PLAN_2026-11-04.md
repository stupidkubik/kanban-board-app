# Kanban Board App — план актуализации и результаты ревью (2026-11-04)

Документ для агентов и людей, которые будут выполнять обновление и исправления
в следующих сессиях. Всё ниже проверено на коде и в живом окружении 4 ноября
2026 года (ветка `main`, коммит `58962a8` после rebase). Не доверяйте цифрам из
старых документов (`README.md`, `docs/DEVELOPMENT_HISTORY.md`,
`docs/OPERATIONS.md`) — они описывают состояние на июль 2026.

> **Важно про `docs/maintenance/`.** Папка не отслеживается git (`??`) и описывает
> ДРУГОЙ проект (Jest, mock API, `usersDb`, Zustand, Tailwind, `examples/*`,
> четыре локали). К этому репозиторию она не имеет отношения. Её нужно удалить,
> чтобы не вводить агентов в заблуждение. Единственный актуальный план — этот файл.

---

## 0. Правила для исполнителя

1. Один этап = один PR в `main` (стековые PR тоже делаются с base `main`).
   Не смешивать security-обновления, мажорные апгрейды и рефакторинг в одном PR.
2. Перед каждым PR: `npm ci && npm run lint && npx tsc --noEmit && npm run test:unit && npm run build`.
   Пока нет скрипта `typecheck` — вызывать `tsc` напрямую. После этапа 0 — `npm run check`.
3. Если тронут `firestore.rules` — обязательно `npm run test:rules` (нужен Java для эмулятора).
4. Если тронут DnD, карточки или колонки — `npm run cypress:run`.
5. После каждого этапа дописывать в раздел 9 («Журнал») дату, PR и результат.
6. Production — Vercel, проект `kanban-board-app`, URL
   `https://kanban-board-app-ten-psi.vercel.app/`. Деплой на push в `main`.
   Проверять деплой через `gh api repos/stupidkubik/kanban-board-app/deployments`
   и статусы, либо `npx vercel inspect <dpl_id> --logs` (CLI авторизован).
7. Секреты (`.env.local`, service-account JSON) не читать в логи и не коммитить.

---

## 1. Состояние на 2026-11-04 (факты)

### 1.1 Репозиторий

| Факт | Значение |
| --- | --- |
| GitHub | `stupidkubik/kanban-board-app` (раньше `canban-board`; remote URL обновлён локально) |
| Локальный путь | `/Users/evgenii/Desktop/dev/kanban-board-app/kanban-board-app` (вложен в папку с тем же именем; внешняя папка `dev/` — отдельный git-репозиторий, его `git status` шумит — это не этот проект) |
| Ветка | `main`, rebase выполнен: 2 локальных коммита (`1e7d04b feat(board): consolidate settings menu`, `58962a8 docs: refresh project overview and references`) теперь поверх `origin/main` (`214fb98`). **Они ещё не запушены.** |
| Резервная копия | ветка `backup/main-before-rebase-2026-11-04` (состояние до rebase) |
| Непушенные изменения в 2 коммитах | удалены `screenshots/*.png` из репо (добавлен `/screenshots/` в `.gitignore`), удалены `docs/UI_UX_BASELINE.md` и `docs/UI_UX_REFACTOR_PLAN.md`, объединено меню настроек в `board-toolbar.tsx`, обновлены README/BACKLOG/FUNCTIONAL_SPEC/OPERATIONS |
| CI | отсутствует (`.github/` никогда не существовал). Dependabot security updates включены, `dependabot.yml` нет |
| Открытые PR / issues | нет. Последние Dependabot PR #15–#17 смержены (сент–окт 2026) |
| Node | `engines: 24.x`, локально 24.22.1, npm 11.19.1. `.nvmrc` нет |

### 1.2 Production сломан с 8 сентября 2026

Последние два деплоя на Vercel **упали**, живой сайт отдаёт сборку от 29 июля
(`5aea543`):

| Деплой | Коммит | Статус |
| --- | --- | --- |
| 2026-07-29 | `5aea543` | success (это и есть текущий prod) |
| 2026-09-08 | `7b2796c` (PR #15, `@hono/node-server`) | success |
| 2026-09-08 | `579491d` (PR #16, 10 пакетов, в т.ч. `next` 16.3.4) | **failure** |
| 2026-10-25 | `214fb98` (PR #17, `@vitest/mocker` 4.1.11) | **failure** |

Причина (подтверждена логами Vercel `dpl_EnRgDybi9S5d8LRTD6byjXKd8pXg` и
локальным `npm run build`): `next build` выполняет `tsc` по всему `tsconfig.include`
(включая `tests/**`), и после обновления vitest/TypeScript в тестах появились
5 ошибок типов:

```
tests/components/labels-section.test.tsx(58,7): error TS2322: Type 'Mock<Procedure | Constructable>' is not assignable to type '(message: string | null) => void'.
tests/unit/card-labels-migration.test.ts(3,1): error TS2578: Unused '@ts-expect-error' directive.
tests/unit/server-trace.test.ts(6,1): error TS2578: Unused '@ts-expect-error' directive.
tests/unit/smoke-kanban.test.ts(3,1): error TS2578: Unused '@ts-expect-error' directive.
tests/unit/stale-member-profiles-migration.test.ts(3,1): error TS2578: Unused '@ts-expect-error' directive.
```

Рецепт починки проверен (после него `tsc` чистый, 17 затронутых тестов проходят):

- удалить строки `// @ts-expect-error ... JavaScript module.` в четырёх файлах
  (TypeScript с `allowJs` теперь сам резолвит `.mjs`);
- в `tests/components/labels-section.test.tsx`: импортировать `type Mock` из
  `vitest`, заменить `setError = vi.fn()` на
  `setError = vi.fn<(message: string | null) => void>()` и тип
  `setError?: ReturnType<typeof vi.fn>` на
  `setError?: Mock<(message: string | null) => void>`.

### 1.3 Baseline (после `npm ci` на текущем lockfile)

| Проверка | Результат |
| --- | --- |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | FAIL — 5 ошибок выше |
| `npm run test:unit` | PASS — 40 файлов, 128 тестов, 12 skipped (`tests/firestore` без эмулятора) |
| `npm run build` | FAIL — «Failed to type check» (те же 5 ошибок) |
| `npm audit` | 67 (2 critical, 21 high, 44 moderate) |
| GitHub Dependabot | 61 открытых алертов |

Побочное наблюдение в тестах: RTK Query ругается «non-serializable value … `Error: delete failed`» —
`queryFn` в `features/cards/data/cards-api.ts:224` возвращает `{ error: new Error(...) }`.
Это не падает, но шумит; см. находку C6 (ошибки должны быть кодами, а не `Error`).

### 1.4 Версии: lockfile сейчас → цель

| Пакет | В lockfile | Последняя в текущем мажоре | Последняя (мажор) | Решение |
| --- | --- | --- | --- | --- |
| next | 16.3.4 | **16.4.5** | 16.4.5 | этап 1 (закрывает 11 алертов, 3 critical RCE) |
| eslint-config-next | 16.2.12 | **16.4.5** | 16.4.5 | этап 1, вместе с next |
| react / react-dom | 19.2.3 (pin) | 19.2.3 | 19.3.1 | этап 3 (minor, отдельный PR) |
| firebase | 12.16.0 | 12.19.0 | **13.2.0** | этап 1 → 12.19; этап 4 → 13 (вместе с `@firebase/rules-unit-testing` 6) |
| firebase-admin | 13.10.0 | 13.10.0 | **14.5.0** | этап 4, через preview-деплой (см. 3.4) |
| firebase-tools | 15.24.0 | **15.34.2** | 15.34.2 | этап 1 (закрывает ~30 dev-алертов) |
| vitest / @vitest/mocker | 4.1.11 | **4.1.12** | 5.1.0 | этап 1 → 4.1.12; этап 4 → 5 |
| @vitejs/plugin-react | 6.0.4 | 6.2.1 | 6.2.1 | этап 1 |
| cypress | 15.19.0 | 15.21.1 | 16.2.1 | этап 1 → 15.21.1; этап 4 → 16 |
| eslint | 9.39.5 | 9.39.5 | 10.14.0 | этап 4 (peer `eslint-plugin-import` ещё `^9` → ждать или `--legacy-peer-deps`; см. 3.4) |
| typescript | 5.9.3 | 5.9.3 | 7.0.2 | **не обновлять до 7**: `typescript-eslint` поддерживает `<6.1` |
| jsdom | 27.4.0 | 27.4.0 | 30.1.3 | этап 4 |
| @testing-library/jest-dom | 6.9.1 | 6.9.1 | 7.0.1 | этап 4 |
| @types/node | 25.9.5 | 25.9.9 | 26.6.6 | держать на линии Node 24 (25.x ок), мажор игнорировать в Dependabot |
| @reduxjs/toolkit / react-redux | 2.12.0 / 9.3.0 | 2.14.0 / 9.3.1 | те же | этап 1 |
| radix-ui | 1.6.7 | 1.8.1 | 1.8.1 | этап 1 |
| @firebase/rules-unit-testing | 5.0.1 | 5.0.2 | 6.0.0 (peer firebase ^13) | этап 1 → 5.0.2; этап 4 вместе с firebase 13 |
| @dnd-kit/*, @phosphor-icons/react, clsx, cva | актуальны | — | — | без изменений |

---

## 2. Уязвимости: что откуда и что их закрывает

### 2.1 Сводка 61 алерта GitHub по корневому пакету

| Пакет (кол-во алертов) | Критичность | Кто тянет | Runtime? | Закрывается |
| --- | --- | --- | --- | --- |
| next (11) | 3 critical (RCE в `next/og`, Image Optimization SVG, `use cache`), 2 high (SSRF, DoS), medium/low | прямая | **да** | `next@16.4.5` — этап 1 |
| undici (8) | high | firebase-tools (6.x и 8.x) | нет (dev) | `firebase-tools@15.34.2` → undici 6.29.1 / 8.12.3 |
| vite (5) | high/medium | vitest | нет | `vitest@4.1.12` → vite 8.3.5 |
| @modelcontextprotocol/sdk (4) | high/medium | firebase-tools | нет | firebase-tools 15.34.2 |
| fast-uri (4) | medium/low | firebase-tools → ajv | нет | firebase-tools 15.34.2 |
| @grpc/grpc-js (4) | high/low | `@firebase/firestore` (pin `~1.9.0`) и `google-gax` (firebase-admin/tools) | частично (Node-режим Firestore SDK: тесты и скрипты; в браузере не используется) | линия 1.14.x → 1.14.7 (этап 1). **Линия 1.9.16 не закрывается** — `@firebase/firestore@4.19.1` (firebase 13) всё ещё пинит `~1.9.0`. См. 2.3 |
| systeminformation (3) | high/medium/low | cypress | нет | `cypress@15.21.1` → 5.33.19 |
| stream-json (3), brace-expansion (3), morgan (2), hono (1), @hono/node-server (1), csv-parse (1), compression (1), proxy-addr (1, critical), ip-address (1) | medium…critical | firebase-tools / eslint | нет | firebase-tools 15.34.2 + eslint-config-next 16.4.5 |
| @fastify/busboy (3) | high/medium | firebase-admin | **да** | обновление lockfile в рамках `^3` → 3.2.4 (этап 1) |
| @vitest/mocker (2) | medium | vitest | нет | vitest 4.1.12 |
| sharp (1) | high | next | да | next 16.4.5 → sharp 0.35.5 |
| source-map-js (1) | high | next → postcss | да | next 16.4.5 → postcss 8.5.32 |
| uuid (1) | medium | firebase-tools → gaxios 6.7.1 | нет | **не закрывается** на firebase-tools 15.34.2 (uuid 9.0.1 остаётся). См. 2.3 |

### 2.2 Результаты симуляции (fresh lockfile в изолированной папке)

| Сценарий | npm audit | Остаток |
| --- | --- | --- |
| Сейчас | 67: 2 critical, 21 high, 44 moderate | — |
| **A — минор/патч в текущих мажорах** (next 16.4.5, firebase 12.19, firebase-admin 13.10, firebase-tools 15.34.2, vitest 4.1.12, cypress 15.21.1, eslint-config-next 16.4.5 и т.д.) | **40: 0 critical, 5 high, 35 moderate** | high — только цепочка `@grpc/grpc-js@1.9.16` (5 записей одной цепочки); moderate — `minimatch`/`glob`/`uuid`/`@opentelemetry/core` внутри firebase-tools и eslint, фикса у апстрима нет |
| **B — все мажоры** (firebase 13, firebase-admin 14.5, vitest 5, cypress 16, eslint 10, jsdom 30, react 19.3.1) | 35: 0 critical, 5 high, 30 moderate | то же самое; 3 предупреждения ERESOLVE по peer `eslint` (eslint-plugin-import требует `^9`) |

Вывод: **сценарий A закрывает 58 из 61 алертов GitHub**, включая все critical и
все runtime-high. Остаются 3: `@grpc/grpc-js` 1.9.16 (2 алерта: high + low) и
`uuid` 9.0.1 (medium). Мажорные апгрейды (сценарий B) безопасности почти не
добавляют — их ценность в поддерживаемости, поэтому они идут отдельными PR позже.

### 2.3 Остаточные алерты — как закрыть

- `@grpc/grpc-js@1.9.16` (через `firebase → @firebase/firestore`). Вариант 1:
  `overrides` в `package.json`: `"@firebase/firestore": { "@grpc/grpc-js": "^1.14.7" }`,
  затем `npm run test:rules` и `npm run cypress:run` — если проходят, оставить.
  Вариант 2: dismiss в GitHub с причиной «vulnerable code is not actually used»
  (в браузерном бандле gRPC нет; Node-режим используется только в тестах/скриптах).
  Выбор зафиксировать в разделе 9.
- `uuid@9.0.1` (через `firebase-tools → gaxios`). Dev-only. Либо override
  `"gaxios": { "uuid": "^11.1.1" }` (проверить `firebase emulators:exec`), либо
  dismiss «dev dependency, not exploitable in this context».
- Нужен `.github/dependabot.yml` (раздел 3.2), иначе такие же завалы будут
  копиться дальше.

---

## 3. Этапы обновления

### Этап 0 — вернуть зелёную сборку и прод (P0, 1 PR, ~1 час)

Цель: `main` снова собирается, Vercel деплоит, появляется честный quality gate.

1. Починить 5 ошибок типов по рецепту из 1.3.
2. `package.json` scripts:
   ```json
   "typecheck": "tsc --noEmit",
   "test": "vitest run",
   "test:watch": "vitest",
   "test:unit": "vitest run --project unit",
   "check": "npm run lint -- --max-warnings 0 && npm run typecheck && npm run test"
   ```
   (`--project unit` — после разделения конфигурации Vitest в этапе 2; до этого
   оставить `vitest run tests/unit tests/components`).
3. Добавить `.nvmrc` = `24`.
4. Добавить `.github/workflows/quality.yml` по образцу
   `/Users/evgenii/Desktop/dev/my-website/.github/workflows/quality.yml`:
   jobs `quality` (npm ci → `npm run check` → `npm run build`) и `audit`
   (`npm audit --omit=dev --audit-level=high`, отдельной job, чтобы advisory не
   прятал сломанную сборку). Для `build` в CI нужны фиктивные
   `NEXT_PUBLIC_FIREBASE_*` (build их читает; значения любые непустые) — вынести
   в `env:` workflow. `FIREBASE_SERVICE_ACCOUNT` для build не нужен (Admin SDK
   инициализируется лениво на запросе? — **проверить**: `lib/firebase/admin.ts`
   вызывает `initAdminApp()` на уровне модуля; если build это исполняет, в CI
   выставить `FIRESTORE_EMULATOR_HOST=localhost:8080` и `GCLOUD_PROJECT=demo-ci`,
   тогда сработает emulator-ветка без credentials).
5. Смержить, убедиться, что деплой Vercel `success`, открыть прод, проверить
   вход и доску.

Exit criteria: lint, typecheck, test, build зелёные локально и в CI; деплой
успешен; `README.md` раздел «release gate» ссылается на CI.

### Этап 1 — security-обновления в текущих мажорах (P0, 1–2 PR)

Цель: закрыть 58 алертов без смены мажоров.

```bash
npm install next@16.4.5 eslint-config-next@16.4.5 firebase@^12.19.0 firebase-tools@^15.34.2 \
  vitest@^4.1.12 @vitejs/plugin-react@^6.2.1 cypress@^15.21.1 \
  @reduxjs/toolkit@^2.14.0 react-redux@^9.3.1 radix-ui@^1.8.1 \
  @types/node@^25.9.9 @types/react@^19.3.0 @types/react-dom@^19.3.0 \
  @testing-library/react@^16.3.3 @testing-library/user-event@^14.6.8 \
  @firebase/rules-unit-testing@^5.0.2
npm update            # подтянуть транзитивные (busboy 3.2.4, grpc 1.14.7, undici, sharp 0.35.5)
npm audit             # ожидание: 0 critical, high только @grpc/grpc-js 1.9.x
```

Если `npm update` не обновляет вложенные версии — пересобрать lockfile:
`rm -rf node_modules package-lock.json && npm install` (так делалась симуляция;
результат в 2.2).

Проверки: `npm run check`, `npm run build`, `npm run test:rules`,
`npm run cypress:run`, ручная проверка на preview-деплое: вход email и Google,
создание доски, DnD карточки, приглашение. Next 16.3 → 16.4 — minor, но
в changelog посмотреть изменения `images`/`headers`/`experimental.turbopackFileSystemCacheForDev`.

После мержа: убедиться, что GitHub показывает ≤3 открытых алерта; оставшиеся
обработать по 2.3.

Exit criteria: Dependabot ≤3 алерта и все задокументированы; прод задеплоен.

### Этап 2 — тулинг и тестовая инфраструктура (P1, 2–3 PR)

- `.github/dependabot.yml` по образцу `my-website` (weekly, группы
  `production-minor-patch` / `development-minor-patch`, отдельные группы
  `next` (next + eslint-config-next), `react` (react, react-dom, @types/react*),
  `vitest` (vitest, @vitest/*), `firebase` (firebase, firebase-admin,
  @firebase/*), ignore: `typescript >=7`, `@types/node` major, `eslint` major —
  пока `eslint-plugin-import` не поддержит 10). Открытых PR ≤10.
- Vitest: разделить проекты `unit` (`tests/unit`, `tests/components`, jsdom) и
  `rules` (`tests/firestore`, node), чтобы `test:unit` не включал 12 skipped;
  `afterEach(cleanup)` в `tests/setup.ts`; `coverage` (v8) с порогом после
  замера.
- Prettier (или `@stylistic`) + реальный `format`; `labels-section.tsx` имеет
  строки по ~900 символов — переформатировать отдельным механическим PR.
- `tsconfig.json`: `target` → `ES2022`; `cypress/tsconfig.json`, чтобы спек
  проверялся типами.
- Удалить `docs/maintenance/` (чужой проект). Удалить no-op `globalIgnores` из
  `eslint.config.mjs`, пустой `postcss.config.mjs` (или задокументировать).
- Ruleset на `main` с required checks из CI (как в `Stripe-mini-app`:
  bypass только admin).

### Этап 3 — исправления безопасности и критичных багов (P1, несколько PR)

Делать по списку из раздела 4 в порядке: S1, S2, C1, C2, S3–S5, C3–C5.
Каждый фикс — с регрессионным тестом (список непокрытого — раздел 6).

### Этап 4 — мажорные апгрейды (P2, по одному PR на пакет)

Порядок и условия:

1. **vitest 5 + @vitest/mocker** (peer vite ^8 ок, node ≥22.12). Проверить
   `vi.fn` типы и `environment`.
2. **jsdom 30**, **@testing-library/jest-dom 7**.
3. **react 19.3.1** (minor, но пин точный — обновить `react`, `react-dom`,
   `@types/react*` одной группой).
4. **firebase 13 + @firebase/rules-unit-testing 6** (peer `firebase ^13`).
   Прогнать `test:rules`, Cypress, проверить `connectAuthEmulator`/App Check API
   в `lib/firebase/client.ts`.
5. **firebase-admin 14.5** — требует Node ≥22; тянет `jwks-rsa@4 → jose@6`
   (ESM-only, `"type": "module"`). Утверждение в `AGENTS.md` про
   `ERR_REQUIRE_ESM` на Vercel относится к старому runtime: на Node ≥22.12 /
   24 `require(esm)` работает, `jwks-rsa@4` сам объявляет engines
   `^20.19 || ^22.12 || >=23`. Процедура: обновить в ветке, задеплоить preview,
   вызвать `/api/auth/session` (POST с тестовым idToken) и `/api/boards`,
   посмотреть runtime-логи. Если ок — снять блокировку в `AGENTS.md`,
   `docs/OPERATIONS.md:94-96`, `docs/FUNCTIONAL_SPEC.md:702`.
6. **cypress 16** — прочитать migration guide, `allowCypressEnv` уже выставлен.
7. **eslint 10** — только когда `eslint-plugin-import` (через
   `eslint-config-next`) объявит peer `^10`; до этого ignore в Dependabot.
8. **TypeScript 7** — не раньше поддержки в `typescript-eslint`.
9. Отдельно: попробовать убрать `--webpack` из `build` (Turbopack — дефолт
   Next 16) на preview-деплое; причина флага нигде не задокументирована.
   Если работает — убрать флаг и `experimental.turbopackFileSystemCacheForDev`
   пересмотреть.

### Этап 5 — UI/a11y и рефакторинг (P2)

По разделам 4.3–4.4. Сначала контраст и ARIA (видимые дефекты), потом
дедупликация форм карточки и prop drilling.

### Не делать одним PR

- все мажоры сразу; firebase-admin 14 вместе с чем-либо ещё;
- включение Prettier вместе с функциональными правками;
- переписывание ошибок на коды (C6) вместе с изменением rules.

---

## 4. Результаты ревью

Три независимых прохода (сервер/безопасность, клиентское состояние, UI/тесты/
документация); ключевые утверждения перепроверены вручную по коду, C1
воспроизведён временным тестом. Нумерация: S — security/server, C — client,
U — UI/a11y, T — tests/tooling, D — docs.

### 4.1 Безопасность и сервер

| # | Приоритет | Проблема | Где | Исправление |
| --- | --- | --- | --- | --- |
| S1 | **HIGH** | Приглашение принимается по **непроверённому** email: `email_verified` не проверяется ни в API, ни в rules, при регистрации `sendEmailVerification` не вызывается. Злоумышленник регистрирует адрес приглашённого паролем и принимает все его инвайты (editor-доступ к доске, утечка названий досок). | `app/api/invites/[inviteId]/accept/route.ts:80`, `firestore.rules:458-462` (`isInvitee`), `app/(auth)/sign-in/use-email-auth-controller.ts:63`, `lib/store/firestore-listeners.ts:79-82` | В API требовать `session.email_verified === true` (или провайдер `google.com`); в rules `isInvitee()` добавить `request.auth.token.email_verified == true`; слать verification при регистрации; тесты на mismatch/unverified (сейчас их нет). |
| S2 | **HIGH** | Admin-роуты не валидируют размеры/типы, которые rules навязывают клиенту: `boardId` любой строки (`"a/b"` → 500 с сырым SDK-сообщением), `title` без лимита 120, `displayName`/`photoURL` без `typeof`/лимитов (можно положить объект или сотни КБ, которые скачают все участники), `members` без лимита 100 (после — клиентские апдейты доски падают на `membersValid`). | `app/api/boards/route.ts:36-37,72-77`, `app/api/boards/[boardId]/route.ts:82-87`, `app/api/invites/[inviteId]/accept/route.ts:92-105`, `lib/validation.ts` | Общий серверный валидатор: `boardId /^[A-Za-z0-9_-]{1,64}$/`, `title ≤120`, `displayName ≤120 string|null`, `photoURL ≤2048 https|null`, `members ≤100`, отказ по неизвестным полям. |
| S3 | MEDIUM | 500-ответы отдают сырые сообщения Firestore/Admin (`lib/errors.ts` возвращает `error.message` для любого `Error`): пути ресурсов, gRPC-коды, `ALREADY_EXISTS`. | `lib/errors.ts:1-2`; все `catch` в `app/api/**` | Логировать на сервере с correlation id, клиенту — только fallback. |
| S4 | MEDIUM | Сессии: `createSessionCookie` без try/catch → невалидный idToken даёт 500 вместо 401; `idToken` не проверяется на тип; logout не вызывает `revokeRefreshTokens` — украденная cookie живёт 5 дней; нет префикса `__Host-`. | `app/api/auth/session/route.ts:32,41,46-54`, `lib/firebase/session.ts` | try/catch → 401; на DELETE верифицировать cookie и `revokeRefreshTokens(uid)`; `__Host-session`. |
| S5 | MEDIUM | CSRF держится только на `SameSite=Lax`; проверок `Origin`/`Sec-Fetch-Site` нет. App Check **fail-open**: в проде включается только если задан site key; при пропаже env все запросы проходят. Для прямых клиентских записей (cards/columns/invites) App Check не enforced вовсе (см. `docs/OPERATIONS.md`). | `lib/firebase/app-check.ts:9-20`, все mutating-роуты | Отклонять мутации с чужим Origin; fail-closed в production, если `FIREBASE_APPCHECK_ENFORCE !== "false"`; валидация env при старте. |
| S6 | MEDIUM | Rate limit — in-memory `Map` на `globalThis`: на Vercel у каждого инстанса свой счётчик; ключ — первый `x-forwarded-for` (подделывается вне Vercel); ограничен только `POST /api/auth/session`. Нет лимитов на создание досок, меток, инвайтов (при >499 инвайтов rename падает `TOO_MANY_INVITES`). | `lib/server/rate-limit.ts:47-57`, `app/api/auth/session/route.ts:8-11` | Upstash/Firestore-счётчик или Vercel WAF; лимиты на доски/инвайты на пользователя. |
| S7 | MEDIUM | Удаление метки и удаление участника двухфазные: сначала batch по карточкам, потом транзакция по каталогу/ролям. Между ними редактор может вернуть метку/assignee; затем rules (`cardLabelIdsValid`, `cardAssigneesValid` на любой update) блокируют **любое** изменение карточки, включая drag. Клиент не самовосстанавливается (`buildCardUpdates` не фильтрует по `allowedIds`). | `app/api/boards/[boardId]/labels/[labelId]/route.ts:100-142`, `app/api/boards/[boardId]/members/[memberId]/route.ts:63-116`, `firestore.rules:564-579` | Делать выборку+обновление карточек внутри той же транзакции (≤500 docs), либо валидировать `labelIds`/`assigneeIds` в rules только когда они в `affectedKeys()`. |
| S8 | MEDIUM | Каскадное удаление доски неатомарно: документ доски удаляется последним, до этого редакторы могут создавать колонки/профили → сироты; при сбое посередине — 500 и частично удалённые дети. `POST /api/boards` принимает клиентский `boardId` и `transaction.create` — бывший участник может «воскресить» доску с теми же сиротами. | `app/api/boards/[boardId]/route.ts:182-190`, `app/api/boards/route.ts:37-71` | Удалять документ доски первым (rules тогда запрещают детей), потом детей; генерировать `boardId` на сервере. |
| S9 | MEDIUM | CSP: `script-src 'unsafe-inline'` обнуляет защиту от XSS; `img-src https:` — wildcard; HSTS не выставляется приложением (его добавляет Vercel). | `next.config.ts:5-8` | Nonce-based CSP (`'nonce-…' 'strict-dynamic'`) через proxy/middleware; HSTS явно; сузить `img-src`. Это же нужно для inline-скрипта темы (U8). |
| S10 | MEDIUM | Rules разрешают участнику писать свой `memberProfiles/{uid}` с любым `email` — можно показать себя под чужим адресом в списке участников. Клиент этот путь не использует (пишет только API). | `firestore.rules:590-596`, `features/participants/model/use-board-participants.ts:84-96` | `allow create, update: if false` (server-only) или `email == request.auth.token.email`. |
| S11 | LOW | `POST /api/boards` — оракул существования чужих `boardId` (409 vs 200). | `app/api/boards/route.ts:53-58` | Решается серверной генерацией id (S8). |
| S12 | LOW | `lib/permissions.ts:23` по умолчанию даёт роль `editor` участнику без явной роли, хотя rules и сервер требуют явную роль → UI показывает кнопки, бэкенд отвергает. | `lib/permissions.ts:15-23` | Возвращать `null`/`viewer`. |
| S13 | LOW | Мёртвые функции в rules (`inviteDoc`, `hasInvite`, `inviteRole`, `inviteDocMatches`, `canAcceptInvite`, `canLeaveBoard`). Rules не фиксируют `createdAt`/`updatedAt` доски при update (редактор может переписать `createdAt`, по которому сортировка). Формат email инвайта в rules не проверяется. | `firestore.rules:149-199,215-235,486-490` | Удалить мёртвый код; `createdAt` unchanged; проверка email. |
| S14 | LOW | `cardColumnValid` в rules проверяет `exists(column)` вне транзакции удаления колонки → карточка может «приземлиться» в только что удалённую колонку: невидимый сирота, считается в cap 500, не редактируется. | `app/api/boards/[boardId]/columns/[columnId]/route.ts:49-82`, `firestore.rules:354-358` | Принять риск + периодическая чистка сирот, либо soft-delete колонки. |
| S15 | LOW | Секреты: `admin.ts` оборачивает `JSON.parse` с `cause` — `SyntaxError` в Node ≥20 содержит фрагмент входа (часть ключа в логах); `scripts/migrate-card-labels.mjs:17` — unguarded `JSON.parse`; `.gitignore:26` содержит реальное имя service-account файла (утечка key id); `lib/firebase/config.ts:8` хардкодит `measurementId`. | см. слева | Не прикладывать `cause`; обобщить `.gitignore` до `*firebase-adminsdk*.json`; `measurementId` в env. |
| S16 | LOW | Скрипты миграций: нет `EXPECTED_PROJECT_ID` — пишут в тот проект, на который указывает `.env.local`; `migrate-card-labels` неатомарен (метка, созданная между scan и apply, выпадает из каталога); `scanBoard` бросает на первой доске >500 карточек и прерывает все остальные; `smoke-kanban.mjs` пишет поля вне схемы (`createdAt/updatedAt` в memberProfiles, `dueDate` вместо `dueAt`) и обходит и rules, и API. | `scripts/*.mjs` | Guard по project id; транзакционный apply; продолжать после ошибки доски; smoke через публичный API/клиентский SDK. |
| S17 | IMPROVEMENT | Авторизация (App Check → session → params) скопирована в 8 роутов с дрейфом (labels использует `LabelRouteError`). `lib/store/firestore-operations.ts:189` интерполирует `boardId` без `encodeURIComponent`. Emulator-режим в `admin.ts` без guard `NODE_ENV !== "production"`. | | `authorizeRequest()` helper; health-роут; валидация env при старте. |

### 4.2 Клиентское состояние, данные, DnD

| # | Приоритет | Проблема | Где | Исправление |
| --- | --- | --- | --- | --- |
| C1 | **HIGH (воспроизведено)** | `invalidatesTags` у мутаций перезапускает **заглушечный** `queryFn` (`async () => ({ data: [] })`) и затирает данные, которые приходят из Firestore-listener. Временный тест: после `updateBoardTitle` кеш `getBoards` = `[]`. Симптомы: после переименования/удаления доски с главной список досок пустеет до следующего snapshot; смена языка доски → `getBoard` становится `loading` → `BoardContent` размонтируется и все 5 listener-ов пересоздаются; удаление колонки → «Нет колонок» до следующего события. | `features/boards/data/boards-api.ts:32,75,182-216`, `features/columns/data/columns-api.ts:20,78-111` | Убрать `invalidatesTags` у мутаций, чьи запросы питаются listener-ами (listener и так отражает запись), либо в stub `queryFn` возвращать текущее значение из `getState()`. Добавить тест: initiate → snapshot → мутация → данные не изменились. |
| C2 | MEDIUM | Ошибка listener-а (permission-denied и т.п.) молча превращается в пустой список: `console.error` + `draft.length = 0`; Firestore после ошибки отписывает listener, запрос остаётся `fulfilled` с `[]` без retry. Только `getBoard` моделирует `status: "error"`. | `features/cards/data/card-queries-api.ts:47-51`, `columns-api.ts:55-59`, `participants-api.ts:51-55`, `labels-api.ts:46-50`, `boards-api.ts:62-67`, `invites-api.ts:38-42` | Хранить `{ status, items }`, показывать ошибку с Retry (`subscriptionKey`), `notifyError`. |
| C3 | MEDIUM | `shouldRebalanceOrder` срабатывает почти на каждом drop между недавно созданными карточками: порог `1e-6 * scale`, а `order` новых карточек = `Date.now()` (~1.76e12) → порог ≈ 29 минут. Итог — batch-перезапись всей колонки (до 500 docs) на обычном перетаскивании. | `lib/board-order.ts:24-31`, `features/cards/model/use-card-create-controller.ts:104`, `features/cards/model/use-card-dnd.ts:106-121` | Абсолютный минимальный gap (например `< 1e-3`); новые карточки — `lastOrder + ORDER_GAP`, а не `Date.now()`. Тест с реалистичными значениями (сейчас тестируется только `1000` vs `1000+EPSILON`). |
| C4 | MEDIUM | Rebalance пишет `columnId` для каждой карточки колонки из устаревшего замыкания → откатывает параллельные перемещения других пользователей; без транзакции. | `features/cards/data/card-operations.ts:153-158`, `use-card-dnd.ts:113-120` | Писать только `order`, либо транзакция с перечитыванием колонки, либо rebalance на сервере. |
| C5 | MEDIUM | Позиция drop не совпадает с превью dnd-kit при движении вниз: карточка всегда вставляется **перед** `over`, dnd-kit (`arrayMove`) — после. Перетащить карточку вниз на один слот через соседа невозможно (no-op + лишняя запись в Firestore). То же для клавиатурного DnD (ArrowDown). | `features/cards/model/use-card-dnd.ts:78-85`, `features/cards/ui/cards-column-body.tsx:247-256` | При `activeColumnId === overColumnId` и исходный index < over index — вставлять после; тесты на `handleDragEnd` (их нет вообще). |
| C6 | MEDIUM | Локализованные тексты ошибок мертвы: data-слой кидает `Error` с английским текстом, `getErrorMessage` возвращает `error.message`, fallback из `uiCopy` никогда не используется → русский пользователь видит «Missing or insufficient permissions.» Это же даёт warning non-serializable в RTK (см. 1.3). | `features/cards/data/cards-api.ts:66,130,224`, `lib/errors.ts`, `use-card-create-controller.ts:113`, `auth-error.ts:34` | Коды ошибок (`{ code }`) из data-слоя, маппинг код → copy в контроллерах; raw — в console. |
| C7 | MEDIUM | Страница входа может уйти в цикл или показать пустой экран, если сервер отвергает только что созданную session cookie (http без Secure, clock skew, revoked): `page.tsx` рендерит `null` при наличии `user`, bootstrap делает POST → `replace("/")` → layout редиректит обратно → remount → POST… | `app/(auth)/sign-in/page.tsx:60-62`, `use-session-bootstrap.ts:46-50`, `app/(app)/layout.tsx:6-9` | Ограничить попытки на mount, при второй неудаче — ошибка с кнопкой «Выйти». |
| C8 | MEDIUM | Cap карточек считается на клиенте после `limit(500)` по `order`; архивные документы занимают окно; новая карточка (`order = Date.now()`, максимальный) вне окна — появляется оптимистично и исчезает на следующем snapshot. `archived` пишется через `UpdateCardInput`, хотя UI его не ставит. | `lib/store/firestore-listeners.ts:180-201`, `features/cards/model/use-board-cards.ts:67-70` | `where("archived","==",false)` (поле с дефолтом) или `archivedAt`; cap через aggregation count. |
| C9 | LOW | При sign-out сбрасывается только `firestoreApi`; черновики `boardUi` (тексты add/edit) остаются следующему пользователю в той же вкладке. | `components/auth-provider.tsx:51-52`, `lib/store/board-ui-slice.ts` | Сбрасывать `boardUi` на `authSignedOut`. |
| C10 | LOW | Лишний `resetApiState` до `signOut` в `kanban-app.tsx:57-60` заставляет RTK тут же пересоздать listener досок, который падает permission-denied. | `features/home/ui/kanban-app.tsx:57-60` | Убрать (auth-provider уже сбрасывает) или сначала навигация. |
| C11 | LOW | Sign-out в другой вкладке показывает «forbidden» вместо редиректа на `/sign-in`. | `components/auth-provider.tsx:50-53`, `features/board/ui/board-page.tsx:31-34` | Клиентский guard: `user === null` → `router.replace("/sign-in")`. |
| C12 | LOW | Optimistic `undo()` индексный (Immer patches по индексу массива); listener каждый snapshot заменяет массив целиком → undo после snapshot может применить `replace /i` или `add /i` к другой карточке (дубликат до следующего snapshot). | `features/cards/model/optimistic-helpers.ts`, `card-queries-api.ts:42-45` | Реконсиляция по id вместо индексных патчей; тест с чередованием snapshot/rollback. |
| C13 | LOW | `ensureCardId` вызывается дважды (`queryFn` и `onQueryStarted`) → при отсутствии `cardId` два разных id; `queryFn` мутирует `args`. Сейчас все вызовы передают `cardId` — латентно. | `features/cards/data/cards-api.ts:55-61,71,120-125` | Генерировать id один раз до dispatch. |
| C14 | LOW | Undo удаления карточки через 5 с может воскресить её в уже удалённую колонку → сирота. | `features/cards/model/use-card-delete-controller.ts:64-78` | Проверять существование колонки перед restore. |
| C15 | LOW | Отложенное (4 с) удаление доски отменяется при unmount `BoardCard` (переход внутрь доски, пересортировка) после показанного тоста «удаление запланировано». | `features/boards/ui/board-card.tsx:100-104` | Таймер вне компонента (store/module-level) или блокировать навигацию. |
| C16 | LOW | Per-column ветки `getCards` в optimistic-helpers — мёртвый код (никто не подписывается с `columnId`), ~40% модуля. | `features/cards/data/cards-api.ts:47,104,140,233`, `optimistic-helpers.ts:137-307` | Удалить. |
| C17 | LOW | `localStorage` читается без try/catch в `getSnapshot` → в приватных режимах с SecurityError падает всё дерево. | `lib/browser-preferences.ts:70,125,129` | try/catch как в `app-check-fetch.ts`. |
| C18 | LOW | Google sign-in уходит в full-page redirect, когда пользователь просто **закрыл** popup (`popup-closed-by-user`, `cancelled-popup-request` в списке fallback). | `app/(auth)/sign-in/use-google-auth-controller.ts:17-22` | Оставить fallback только для `popup-blocked` и `operation-not-supported-in-this-environment`. |
| C19 | LOW | `useBoardSummary`: счётчики колонок/карточек на главной не обновляются, пока страница смонтирована; `summaryCache` никогда не чистится. | `features/boards/model/use-board-summary.ts:36-40,127-142` | TTL-рефреш или listener; eviction. |
| C20 | LOW | `NotificationsProvider`: таймеры не чистятся при unmount; `notify({ id })` с существующим id — дубликат тоста и дубликат React key. | `features/notifications/ui/notifications-provider.tsx:21-56` | Cleanup-эффект; upsert по id. |
| C21 | IMPROVEMENT | Каждый snapshot заменяет все объекты (`draft.length = 0; push(...)`) → `React.memo(SortableCardItem)` бесполезен, при 500 карточках любая правка коллеги перерисовывает всё. `handleDeleteColumn` зависит от `columns` → ломает `memo(ColumnsGrid)`. | `card-queries-api.ts:42-45`, `use-board-columns.ts:192` | Реконсиляция по id (сохранять прежний объект при shallow-equal) или `docChanges()`; ref для columns. |
| C22 | IMPROVEMENT | `auth`-slice в Redux не читается никем (User живёт в React context); store — singleton на уровне модуля, разделяемый между SSR-запросами; нормализаторы доверяют payload через `as` (`title: undefined` типизирован как `string`). Записи инвайтов не используют `retryFirebaseWrite`. `reportClientError` — console-only. | `lib/store/auth-slice.ts`, `lib/store/index.ts:8`, `lib/store/firestore-normalizers.ts:40-106`, `features/invites/data/invite-operations.ts:22,33`, `lib/client/report-error.ts` | Удалить slice или сделать источником истины; `makeStore` per-request; runtime-валидация документов; retry для инвайтов. |

### 4.3 UI и доступность

| # | Приоритет | Проблема | Где | Исправление |
| --- | --- | --- | --- | --- |
| U1 | **A11Y-HIGH** | Чипы меток в тёмной теме: белый текст на пастельных токенах (`#facc15`, `#4ade80`…) — контраст 1.5–2.8:1 (норма 4.5). Orange и в светлой 3.56:1. | `features/cards/ui/cards.module.css:240-268`, `app/globals.css:104-111` | В тёмной теме тёмный текст на чипе (`--color-label-*-contrast`) или насыщенные фоны. |
| U2 | **A11Y-HIGH** | Обложки досок: белый заголовок/бейдж на градиентах с контрастом 1.8–2.8:1. | `lib/board-cover.ts:1-8`, `features/home/ui/kanban-app.module.css:267-292` | Тёмный scrim под текстом или другие концы градиентов; цвета — в токены. |
| U3 | A11Y | Вложенные интерактивные элементы внутри `role="link"`/`role="button"` (карточка доски и карточка задачи содержат кнопки). ARIA это запрещает, screen reader озвучивает одним контролом. | `features/boards/ui/board-card.tsx:172-213,334-349`, `features/cards/ui/cards-column-body.tsx:110-154` | Заголовок — `<a>`/`<button>` + «stretched link», контейнер неинтерактивен, действия вне интерактивной области. |
| U4 | A11Y | Enter перехватывается у dnd-kit (открывает редактор) — захват только Space, нигде не сказано; `DndContext` без `accessibility={{ announcements, screenReaderInstructions }}` → русский пользователь слышит английские «Picked up draggable item…». | `cards-column-body.tsx:124-132`, `features/columns/ui/columns-grid.tsx:176-183` | Локализованные announcements из `uiCopy`; вернуть Enter dnd-kit (видимая кнопка Edit) или описать Space в instructions. |
| U5 | A11Y | Toast: live-region монтируется лениво вместе с первым тостом (AT пропускает первое объявление); кнопка закрытия имеет `aria-label` = текст сообщения и глиф `x`; автодисмисс 5 с не ставится на паузу при hover/focus; Undo живёт только в тосте (WCAG 2.2.1). | `features/notifications/ui/toast-stack.tsx:25-30,72-75`, `notifications-provider.tsx:20` | Всегда рендерить viewport; label «Закрыть/Dismiss»; иконка `aria-hidden`; пауза таймеров. |
| U6 | A11Y | Одна ошибка объявляется дважды: inline `role="alert"` + error-toast с `role="alert"`. | `features/board/ui/board-content.tsx:88-92`, `board-status.tsx:17`, `toast-stack.tsx:38`, `kanban-app.tsx:47-51,112-116` | Один канал: inline для форм/контекста, toast для фоновых мутаций. |
| U7 | A11Y | Ошибки валидации форм не связаны с полями (`aria-invalid`/`aria-describedby` нет); `FieldError` существует, но нигде не используется. | `use-card-edit-controller.ts:92-95`, `boards-section.tsx:92-96`, `board-card.tsx:112-116`, `components/ui/field.tsx:145-194` | Рендерить `FieldError` под полем, ставить `aria-invalid`. |
| U8 | BUG/A11Y | Flash темы и локали при загрузке; `<html lang="en">` никогда не становится `ru`. Server snapshot = `light`/`en`, `data-theme` ставится в `useEffect`, inline pre-paint скрипта нет, `suppressHydrationWarning` нет. | `lib/browser-preferences.ts:73,100-103`, `app/layout.tsx:53` | Inline-скрипт до hydration (читает `localStorage`, ставит `data-theme` и `lang`) — требует nonce в CSP (S9); `suppressHydrationWarning` на `<html>`; обновлять `lang` в `usePreferredLocale`. |
| U9 | IMPROVEMENT | Два разных контрола настроек: дома и на sign-in — `ThemeToggle` + `Select`, на доске — `DropdownMenu`; docs утверждают «один settings menu». | `kanban-app.tsx:79-105`, `sign-in/page.tsx:64-96`, `board-toolbar.tsx:134-205` | Один `PreferencesMenu` на всех трёх маршрутах. |
| U10 | IMPROVEMENT | Дублирование: форма создания и форма редактирования карточки (~110 строк каждая), `isOverdueDate` определена дважды, DragOverlay повторяет разметку карточки; рукописный trash-`<svg>` при наличии `TrashSimple`; inline `cursor`. | `cards-column-body.tsx:36,92,150-153,315-425`, `card-edit-dialog.tsx:56-157`, `columns-grid.tsx:42,244-253,325-352` | `CardFormFields` + `CardSurface`; `isOverdueDate` в `lib/board-order.ts`; `IconButton` везде. |
| U11 | IMPROVEMENT | Prop drilling: `ColumnsGrid` — 41 prop, `CardsColumnBody` — 28, `CardsSection` — 20; файлы 440/387 строк. Два типа для одного объекта copy (`ReturnType<typeof getCopy>` ×11 и `BoardCopy` ×18, причём `lib/types/board-ui.ts:37` и `lib/i18n/types.ts:55` объявляют разные `BoardCopy`); `lib/i18n.ts` — shim над `lib/i18n/index.ts`. | см. слева | Context для действий доски; вынести `SortableCardItem`, `AddCardDialog`; один тип `Copy`. |
| U12 | IMPROVEMENT | `Spinner` по умолчанию `aria-label="Loading"` (не переводится). Магические числа и raw-цвета в CSS-модулях вместо токенов (18 мест: `alert-dialog.module.css`, `cards.module.css`, `kanban-app.module.css`, `participants.module.css`, `board-page.module.css`, `board-header.module.css`). | см. слева | Обязательный `label`; токены `--duration-*`, `--color-on-cover`. |
| U13 | IMPROVEMENT | Нет `<main>`/`<nav>`, skip link, `<h1>` на страницах приложения (home начинается с `<h2>`). Invite-toggle без `aria-controls` и перевода фокуса; `aria-label` дублирует видимый `<Label>`. Reduced motion: hover transform карточек и spring-easing остаются. | `app/(app)/layout.tsx`, `kanban-app.tsx:69`, `participants-section-view.tsx:120-165`, `globals.css:177-186`, `cards.module.css:40-50` | Landmarks, h1, skip link; `aria-controls` + autoFocus; `transform: none` в reduced-motion. |
| U14 | IMPROVEMENT | Нет `loading.tsx`, `not-found.tsx`; неизвестная доска — HTTP 200 с generic title; sign-in — client page без `metadata`. Metadata: нет OG image/twitter, `themeColor` только тёмный при светлой теме по умолчанию; `site.webmanifest` без `description`, `start_url`, `lang`, maskable-иконок. `global-error.tsx` англоязычный; ошибки только в console. | `app/(app)/**`, `app/layout.tsx:16-45`, `public/site.webmanifest`, `app/global-error.tsx:37-41` | `loading.tsx` на `ColumnsSkeleton`, `generateMetadata` для `/boards/[boardId]`, тонкий server `page.tsx` для sign-in; themeColor с media; доделать manifest. |
| U15 | CLEANUP | Неиспользуемые CSS-классы (`kanban-app.module.css`: `.inlineSpinner .input .inviteRow .label .meta .section`; `cards.module.css`: `.cardFormRow`), неиспользуемые примитивы/экспорты (`InputGroup*`, `TooltipProvider`, `Field*` кроме `Field`/`FieldLabel`, `CardAction`, `DropdownMenuCheckboxItem`, `DropdownMenuSub*`, `SelectGroup/Label/Separator`, `AlertDialogMedia`, `badgeVariants`, `buttonVariants`, `DialogOverlay/Portal`), мёртвые экспорты (`ORDER_GAP`, `useStoredTheme`, `UiTheme`, `RateLimitResult`, `AuthUser`, `AuthStatus`, `labelsApi`, `CARD_LABEL_LIMIT`, `CardsProjection`, `LabelBody`, …), неиспользуемые ключи copy (`board.createColumn`, `boards-home.ownerLabel`, `errors.signInToCreate`, `errors.signInToUpdate`, `participantsShow`, `participantsHide`). | | Удалить после подключения `FieldError` (U7). |

### 4.4 Тесты и тулинг

| # | Приоритет | Проблема | Где | Исправление |
| --- | --- | --- | --- | --- |
| T1 | **P0** | CI отсутствует; тесты и typecheck никогда не запускаются автоматически → прод сломан два месяца незамеченно. | — | Этап 0. |
| T2 | P1 | Нет `typecheck`; `format` = `eslint --fix` (не форматирует); `test` = watch; `tsconfig` `target: ES2017`, `cypress` исключён из typecheck; нет `.nvmrc`. | `package.json:8-24`, `tsconfig.json` | Этапы 0 и 2. |
| T3 | P1 | Vitest: нет `include`/`coverage`/`globals`; без `globals` Testing Library не делает auto-cleanup, часть тестов рендерит по 4 раза без cleanup (проходят случайно из-за `aria-hidden` Radix); `vitest run` включает `tests/firestore` (12 skipped). | `vitest.config.ts`, `tests/setup.ts`, `card-edit-dialog.test.tsx`, `dialog.test.tsx`, `icon-button.test.tsx`, `card-label-list.test.tsx` | `afterEach(cleanup)`; проекты `unit`/`rules`; coverage с порогом. |
| T4 | P2 | Flaky-паттерны: `cy.wait(100)` в `dragAndDrop`, `setTimeout(25)` в `sign-in-page.test.tsx:177`, глобальные таймауты 15/120 с. Тесты завязаны на implementation details (`data-testid` ×40, `fireEvent.change` вперемешку с `userEvent`; `notifications.test.tsx:57` опирается на имя кнопки = текст сообщения, что само по себе баг U5; `labels-section.tsx:112` key с `updatedAt` сбрасывает редактирование при realtime-апдейте — тест это закрепляет, а не ловит). | `cypress/e2e/kanban.cy.ts:96`, `tests/components/*` | Assertions на `data-drop-active`; `waitFor`; `userEvent` везде. |
| T5 | P2 | README обещает keyboard DnD, но ни один тест не переносит карточку клавиатурой (только pick-up/Escape). Нет unit-тестов для `use-card-dnd`, `cards-column-body`, `columns-grid`, `board-card`, `boards-section`, `invites-section`, `kanban-app`, `board-page` (not-found/forbidden/error), `use-card-delete-controller` (Undo), `use-board-participants`, `theme-toggle`, `select`, `dropdown-menu`, `alert-dialog`. Серверные пробелы — раздел 6. | | Писать вместе с фиксами C1–C8, S1–S8. |
| T6 | P2 | `next build --webpack`: причина «Vercel runtime incompatibility» нигде не раскрыта (нет текста ошибки, версии). | `package.json:10`, `AGENTS.md:83` | Проверить Turbopack на preview (этап 4.9), задокументировать результат в `docs/OPERATIONS.md`. |
| T7 | CLEANUP | Локальный мусор (не отслеживается, `.gitignore` покрывает): `.DS_Store`, `tsconfig.tsbuildinfo` (867 KB), `firestore-debug.log`, `screenshots/`, `.next/`. Удалить при желании. | | |

### 4.5 Документация — «написано / на самом деле»

| Документ говорит | Код делает |
| --- | --- |
| `docs/maintenance/*`: Jest, mock API, Zustand, 4 локали, `SettingsSidebar.test.tsx`, «README обещает Node 18+» | Ничего из этого здесь нет. Папка от другого проекта — удалить. |
| `README.md:122`, `docs/OPERATIONS.md:63`: «128 passing unit and component tests, 12 skips»; `DEVELOPMENT_HISTORY.md:142`: «106 passed» | Сейчас 128 passed / 12 skipped — совпадает с README, но числа расходятся между документами и нигде не производятся CI. |
| `DEVELOPMENT_HISTORY.md:144`: Next 16.2.12 | `next@16.3.4` в lockfile, `^16.3.4` в package.json. |
| `AGENTS.md:84`, `OPERATIONS.md:94-96`, `FUNCTIONAL_SPEC.md:702`: firebase-admin 14 падает на Vercel с `ERR_REQUIRE_ESM` | Не проверяемо из репо; на Node ≥22.12/24 `require(esm)` работает — перепроверить на preview (этап 4.5). |
| `UI_PATTERNS.md:13-14`, `FUNCTIONAL_SPEC.md §8.3`: один settings menu | Три разных контрола (U9). |
| `UI_PATTERNS.md:21`: диалоги возвращают фокус | Удаление карточки открывается программно из удаляемого элемента → фокус на `<body>`; `onCloseAutoFocus` только в `labels-section.tsx:115`. |
| `README.md:39`, `AGENTS.md:12`: keyboard drag-and-drop | Только Space, английские announcements, drop клавиатурой не тестируется (U4, T5). |
| `FUNCTIONAL_SPEC.md:103-121` таблица роутов | Нет `GET/POST …/labels`, `PATCH/DELETE …/labels/[labelId]` (есть ниже на 595-602 и в `AGENTS.md:41`). |
| `AGENTS.md:112`: `npm run format` auto-fix lint | Это `eslint . --fix`; форматтера нет. |
| `AGENTS.md:120`: `npm run test` (Vitest) | Watch-режим; README рекомендует `test:unit`. |
| `README.md:71`: `components/ui` — shared accessible primitives | Часть примитивов не используется (U15), `Spinner` не переводится (U12). |
| `schema.md` vs `firestore.rules` | Совпадают (поля, cap, rebalance `1e-6`). |

---

## 5. Рекомендуемая очередь PR

| # | Содержание | Этап | Размер |
| --- | --- | --- | --- |
| 1 | Починка 5 ошибок типов + `typecheck`/`check`/`test` скрипты + `.nvmrc` + CI workflow (quality + audit) | 0 | S |
| 2 | Security-обновления в текущих мажорах (сценарий A) + `npm update` lockfile | 1 | S (большой diff lockfile) |
| 3 | Override/dismiss остаточных `@grpc/grpc-js` и `uuid`; `dependabot.yml`; ruleset на `main` | 1–2 | S |
| 4 | Удалить `docs/maintenance/`; обновить README/AGENTS/OPERATIONS под новые скрипты и версии; таблица 4.5 | 2 | S |
| 5 | S1: `email_verified` в API + rules + verification при регистрации + тесты | 3 | S |
| 6 | C1: убрать `invalidatesTags` у listener-driven запросов + тест | 3 | S |
| 7 | S2: серверный валидатор body/boardId + тесты роутов (`/api/boards`, `[boardId]`, columns, accept) | 3 | M |
| 8 | S3 + C6: коды ошибок вместо сырых сообщений; локализация ошибок | 3 | M |
| 9 | S4, S5: session 401/revoke/`__Host-`, Origin-check, App Check fail-closed | 3 | S |
| 10 | C3, C4, C5: ordering/rebalance/drop-position + тесты `use-card-dnd` | 3 | M |
| 11 | C2, C7, C8: ошибки listener-ов с retry; sign-in loop guard; archived вне окна | 3 | M |
| 12 | S7, S8, S10: атомарность label/member cleanup, порядок каскада, rules для memberProfiles | 3 | M |
| 13 | Vitest: проекты, cleanup, coverage; Prettier + механический формат | 2 | S+S |
| 14 | U1, U2, U8 (+S9 nonce CSP): контраст, pre-paint тема/lang | 5 | M |
| 15 | U3–U7: ARIA-структура карточек, DnD announcements, toast, FieldError | 5 | M |
| 16 | Мажоры по одному: vitest 5 → jsdom 30 / jest-dom 7 → react 19.3 → firebase 13 → firebase-admin 14 (preview) → cypress 16 | 4 | S каждый |
| 17 | U9–U15, C9–C22, S11–S17: рефакторинг и cleanup | 5 | по вкусу |

---

## 6. Что НЕ покрыто тестами (куда добавлять регрессии)

Сервер: `/api/auth/session` целиком; `verifyAppCheckToken` (fail-open); `POST /api/boards`
(create/409/невалидные поля); `GET/PATCH /api/boards/[boardId]` (rename + fan-out,
`TOO_MANY_INVITES`); `DELETE …/columns/[columnId]` (`COLUMN_NOT_EMPTY`); accept-invite
негативные пути (mismatch, unverified, board mismatch, invalid role); member self-leave;
утечка внутренних сообщений в 500; rules: `email_verified`, spoof email профиля,
mutation `createdAt`, границы cap 100/20/10, перемещение карточки со stale labelId.

Клиент: C1 (invalidation vs listener); `handleDragEnd`/`handleDragOver` (нет тестов
вообще); `shouldRebalanceOrder` с `Date.now()`-масштабом; onError listener-ов → UI;
undo с чередованием snapshot; undo удаления карточки/колонки; 4-секундное удаление
доски и его отмена на unmount; sign-out, sign-out из другой вкладки, цикл session
cookie; `usePreferredLocale`/`browser-preferences` при падении storage; cap 500 с
archived; `NotificationsProvider` таймеры; Google redirect fallback.

E2E: keyboard move + drop; rename доски; rename/delete колонки; delete карточки без
Undo; leave board; decline invite; remove member; label rename/delete; тёмная тема;
ru-локаль; мобильный viewport; not-found/forbidden маршруты.

---

## 7. Проверено и в порядке (не тратить время повторно)

- Инвариант одного владельца: клиент не может менять `roles`/`members`; accept пишет
  только `editor|viewer`; PATCH/DELETE участника отказывают владельцу.
- Viewer read-only во всех слоях (rules, API, UI).
- Не-участники не читают доску/дети; `/{document=**}` deny-all.
- Каталог меток server-only, уникальность в транзакции, cap 50, цвета whitelist.
- Клиентские записи карточек/колонок полностью валидируются rules (ключи, размеры,
  `createdById`, `labelIds ⊆ catalog`, `assigneeIds ⊆ members`).
- Session cookie: HttpOnly, Lax, Secure в проде, 5 дней, `verifySessionCookie(…, true)`;
  `(app)/layout.tsx` редиректит неавторизованных на сервере.
- Каскадные батчи ≤500 и циклятся; транзакции перечитывают авторизацию внутри.
- Индексы Firestore соответствуют запросам (ничего лишнего/недостающего).
- Listener-ы RTK Query: guard на `!arg`, `cacheDataLoaded` до подписки, `unsubscribe`
  после `cacheEntryRemoved`; `resetApiState` корректно их гасит.
- Optimistic rollback без вмешательства snapshot корректен и покрыт тестами.
- Timestamps нормализуются в millis; `Date` в args не попадает в state.
- Auth: `onIdTokenChanged` не вызывает лишних рендеров; `refreshServerSession`
  дедуплицирован и троттлится 6 ч; `fetchWithAppCheck` ретраит после 401.
- Malformed JSON → 400 во всех роутах с телом; `check-server-trace.mjs` ловит
  секреты в server trace; emulator-ы не подключаются в production.
- Зависимости: неиспользуемых пакетов нет; `firebase-tools` нужен только как CLI
  (можно вынести в `npx`, чтобы не ставить ~1300 пакетов).

---

## 8. Открытые вопросы владельцу

1. `@grpc/grpc-js` 1.9.x — override или dismiss (2.3)?
2. Rate limiting (S6): готовы ли подключать Upstash/Vercel WAF или достаточно
   лимитов на уровне Firestore-счётчиков?
3. Нужен ли переход на nonce-CSP (S9) сейчас, или достаточно inline-скрипта темы с
   hash?
4. `firebase-tools` оставить в devDependencies или перейти на `npx firebase-tools@15`
   в скриптах (ускоряет `npm ci` в CI в разы)?
5. Node: оставаться на 24.x (текущий LTS) — да; но `@types/node` 26 игнорировать.

---

## 9. Журнал

| Дата | Что сделано | Кем/где |
| --- | --- | --- |
| 2026-11-04 | Rebase локальной `main` на `origin/main` (backup-ветка создана), remote URL обновлён, `npm ci`, baseline снят, 61 алерт разобран, симуляция сценариев A/B, ревью тремя агентами, этот документ. Коммиты не пушились. | сессия Claude Code |
| 2026-11-04 | Коммиты из rebase и сам план запушены в `main` (`7131fde`); деплои `be82b2e` и `7131fde` тоже упали на тех же 5 ошибках типов. | — |
| 2026-11-04 | Этап 0: 5 ошибок типов исправлены по рецепту 1.2; скрипты `typecheck`, `test` (single run), `test:watch`, `test:unit` (`tests/unit tests/components`), `check`; `.nvmrc` = 24; `.github/workflows/quality.yml` (`quality`: `npm ci` → `check` → `build`; `audit`: `npm audit --omit=dev --audit-level=high`). Проверено в чистом worktree без `.env.local` и Admin credentials: build проходит с фиктивными `NEXT_PUBLIC_FIREBASE_*` — `initAdminApp()` с `applicationDefault()` при сборке не обращается к сети, emulator-переменные не нужны. Job `audit` будет красной до этапа 1 (next, sharp, busboy, grpc, source-map-js, uuid). | сессия Claude Code, PR этапа 0 |
| 2026-11-04 | Этап 1 (сценарий A): `npm install` по списку из раздела 3 + `npm update`. Итог: next/eslint-config-next 16.4.5, firebase 12.19.0, firebase-admin 13.10.0, firebase-tools 15.34.2, vitest 4.1.12 (vite 8.3.5), cypress 15.21.1, sharp 0.35.5, @fastify/busboy 3.2.4, postcss 8.5.32, undici 6.29.1/8.12.3; react 19.2.3 без изменений. `npm audit`: 67 → 30 (0 critical, 5 high, 25 moderate); `--omit=dev`: 16 → 12 (4 high — цепочка `@grpc/grpc-js@1.9.16` через `@firebase/firestore@4.17.2`; 8 moderate — `uuid@9.0.1` через `firebase-admin@13 → google-gax/@google-cloud/storage`, закрывается только firebase-admin ≥14.3). Поправка к 2.1/2.3: `uuid` тянется не только firebase-tools, но и production-зависимостью firebase-admin 13. Проверки: `check` (128 passed / 12 skipped), `build`, `test:rules` (12/12), `cypress:run` (3/3). Vite предупреждает, что `vitest.config.ts` (ESM в CJS-пакете) не поддержит будущий `configLoader: 'native'` — переименовать в `.mts` в этапе 2. Vercel собирает только production: `commandForIgnoringBuildStep` выходит с 0 для всех не-production деплоев, preview PR не собираются. | сессия Claude Code, PR этапа 1 |
| 2026-11-04 | PR 3 (раздел 2.3, вариант 1 — override): `overrides` `@firebase/firestore → @grpc/grpc-js ^1.14.7` и `gaxios`/`google-gax`/`teeny-request → uuid ^11.1.1`. `npm audit --omit=dev` → 0; `npm audit` → 18 moderate (dev: `minimatch`/`glob`/`@opentelemetry/core` внутри firebase-tools и eslint). Проверено: `check`, `build`, `test:rules` 12/12, `cypress:run` 3/3. Добавлен `.github/dependabot.yml` (группы `next`, `react`, `vitest`, `firebase`, production/development minor-patch; firebase-admin вне групп; ignore TS ≥7, eslint major, @types/node major; github-actions). Ruleset на `main` — ждёт решения владельца. Вопрос 8.1 закрывается выбором override, если PR смержен. | сессия Claude Code, PR 3 |
| 2026-11-04 | Владелец смержил #18, #19, #20 (`ed245d4`). Production-деплой `dpl_9J4UyMqydnsZWXQ7uMCUkKBQv6Tm` Ready — первый успешный с 2026-09-08; `/` 307 → `/sign-in`, `/sign-in` 200, `POST /api/boards` 401. CI на `main`: `quality` зелёный на всех трёх коммитах, `audit` зелёный с `ed245d4`. Dependabot: 61 → 1 открытый алерт (`minimatch`, dev, medium). По новому `dependabot.yml` бот сразу открыл 9 PR с мажорами (#21–#29): #23 firebase 13 и #28 rules-unit-testing 6 пришли раздельно и падают на ERESOLVE (нужен один общий PR, этап 4.4); #29 cypress 16 падает на typecheck — в 16 удалена опция `allowCypressEnv` (поправка к 4.6). Создан ruleset «Protect main» (id 26557141): required checks `quality`, `audit`, запрет force-push и удаления, bypass — admin. | сессия Claude Code |
| 2026-11-04 | Этап 2, тулинг: `vitest.config.ts` → `vitest.config.mts` (`import.meta.dirname`, warning Vite ушёл); проекты `unit` (tests/unit + tests/components, jsdom) и `rules` (tests/firestore, node); `afterEach(cleanup)` в `tests/setup.ts` (тесты не сломались, ручные cleanup в 4 файлах убраны); `@vitest/coverage-v8` с порогами чуть ниже baseline (46.0/38.4/47.3/45.8 → 45/38/47/45); `check` гоняет `test:coverage`; `typecheck` проверяет и `cypress/tsconfig.json`; `tsconfig` target ES2022; из `eslint.config.mjs` убран дубликат игноров eslint-config-next, добавлен `coverage/**`; `postcss.config.mjs` оставлен с комментарием (удаление включит Autoprefixer/preset-env Next и изменит CSS — отдельное решение с визуальной проверкой). `docs/maintenance/` перенесена в Корзину. Документация по 4.5: роуты меток в `FUNCTIONAL_SPEC.md`, baseline в README, таблица gate в OPERATIONS с датами. Prettier — отдельным PR. | сессия Claude Code, PR этапа 2 |
| 2026-11-04 | Этап 2, Prettier 3.9.10 (точная версия): `semi: false`, `trailingComma: "es5"`, `printWidth: 80` — из 4 вариантов этот дал наименьший diff (122 файла, +3023/−1630; стиль кода и так без `;` и с двойными кавычками). Markdown, `design-system.json`, `public/`, lockfile не форматируются. Скрипты: `format` (Prettier), `format:check` (в `check`), прежний `eslint --fix` → `lint:fix`. Механический коммит вынесен в `.git-blame-ignore-revs`. Проверено: `check`, `build`, `test:rules` 12/12, `cypress:run` 3/3. | сессия Claude Code, PR Prettier |
| 2026-11-04 | Этап 3, S1: `POST /api/invites/[inviteId]/accept` читает живую запись `adminAuth.getUser(uid)` (claims session cookie заморожены на момент входа и не видят позднее подтверждение) и отвечает `403 email-not-verified` без email или с `emailVerified: false`; сравнение и email профиля — из этой записи, `body.email` больше не используется. Rules: `isInvitee()` требует `email_verified == true`. Регистрация шлёт `sendEmailVerification`; на главной для неподтверждённого адреса вместо списка приглашений — карточка «Подтвердите email» («Я подтвердил» → `reload()` + `getIdToken(true)`; «Отправить ещё раз»); `AuthProvider` публикует `emailVerified` отдельным полем. E2E-сидинг подтверждает пользователей через admin API эмулятора. Тесты: 5 на accept-роут (4 падают на старом коде), rules-регрессия (падает на старых rules), 3 на карточку, sign-up шлёт письмо. `check` (136), `build`, `test:rules` 12/12, `cypress:run` 3/3. **Rules требуют отдельного `firebase deploy --only firestore:rules`** (добавлено в OPERATIONS). | сессия Claude Code, PR S1 |
| 2026-11-04 | Этап 3, C1: убраны `invalidatesTags` у `updateBoardTitle`, `updateBoardLanguage`, `deleteBoard`, `createColumn`, `updateColumn`, `deleteColumn` — их запросы питаются listener-ами, а инвалидация перезапускала заглушечный `queryFn`. Регрессия `tests/unit/listener-cache-mutations.test.ts`: на старом коде 3 из 4 падают (список досок `[]`, доска `loading`, колонки `[]`). `check` (140), `cypress:run` 3/3. | сессия Claude Code, PR C1 |
| 2026-11-04 | Этап 3, S2: `lib/server/route-input.ts` — `isDocumentId` (`^[A-Za-z0-9_-]{1,128}$`, закрывает и path injection через `boardId` из OWASP-аудита), `isInviteId` (`board__email`, без `/`, ≤512), `parseBoardTitle` (trim, 1..120), `parseProfileFields` (`displayName` string ≤120 | null, `photoURL` `https://` ≤2048 | null), allowlist ключей тела. Применено во всех 8 роутах с параметрами и в `POST /api/boards`, `PATCH /api/boards/[boardId]`, accept; accept отвечает 409 при 100 участниках. `email` из тела create/accept больше не пишется (только из session/account). `boardId` по-прежнему генерирует клиент — серверная генерация в S8. Тесты: `tests/unit/route-input.test.ts` (15). `check` (155), `cypress:run` 3/3. | сессия Claude Code, PR S2 |
| 2026-11-04 | Этап 3, S3 + C6. Сервер: `lib/server/error-response.ts` → `internalErrorResponse(error, fallback)` пишет `{event: "api_error", errorId, code, message}` в лог и отдаёт клиенту только `{ error: fallback, errorId }`; применено во всех 500 всех роутов (кроме session — это S4). Accept отдаёт `code: "member-limit"`. Клиент: `getErrorMessage` больше не возвращает `error.message` — только локализованный fallback, сырое — в `console.warn`; `ApiError` + `readApiError` сохраняют `status`/`code` ответа сервера; `serializeError` вместо `new Error` в `queryFn` (предупреждение RTK non-serializable исчезло); `COLUMN_NOT_EMPTY`, `email-not-verified`, `member-limit` сопоставлены с copy по коду. Тесты: `tests/unit/errors.test.ts` (5) + no-leak в `route-input.test.ts`. `check` (161), `cypress:run` 3/3. | сессия Claude Code, PR S3+C6 |
| 2026-11-04 | Этап 3, S4 + часть S5. Сессия: `idToken` — строка ≤16 KB, иначе 400; отказ `createSessionCookie` → 401 вместо 500; выход вызывает `revokeRefreshTokens(uid)` (выход на всех устройствах); в production cookie `__Host-session` (`session` локально; старая `session` читается и очищается). CSRF: `proxy.ts` (Next 16 proxy) на `/api/*` отклоняет мутации с `Sec-Fetch-Site` ≠ `same-origin`/`none` или с `Origin`, чей host ≠ `X-Forwarded-Host`/`Host` (сравнение с `request.url` ломалось в dev: Next строит его из `--hostname`). Тесты `tests/unit/session-route.test.ts` (17). `check`, `build` (Proxy в манифесте, trace-check 17 манифестов), `cypress:run` 3/3. **Не сделано из S5 — App Check fail-closed:** в Vercel production нет ни `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY`, ни `FIREBASE_APPCHECK_ENFORCE` — App Check сейчас не работает вовсе; fail-closed без настройки ключей положил бы все API. Нужна настройка владельцем. | сессия Claude Code, PR S4+S5 |
| 2026-11-04 | Этап 3, C3 + C4 + C5. C3: порог rebalance абсолютный — `gap ≤ max(0.001, 16·ε·|order|)` вместо `1e-6·|order|` (≈29 мин для `Date.now()`-порядков); новые карточки — `getAppendOrder` (наибольший `order` колонки + `ORDER_GAP`), пустая колонка — `ORDER_GAP` вместо `Date.now()`. C4: `rebalanceCardOrders` пишет только `order`/`updatedAt`, без `columnId` из устаревшего снимка. C5: внутри колонки при движении вниз карточка встаёт после `over` (как `arrayMove` dnd-kit), вверх и в другую колонку — перед. Тесты: `tests/unit/use-card-dnd.test.ts` (7, на старом коде 5 падают — первых тестов `handleDragEnd`), `board-order.test.ts` с реалистичными значениями (4 падают на старом). `check` (187), `cypress:run` 3/3. schema.md и FUNCTIONAL_SPEC обновлены. | сессия Claude Code, PR C3–C5 |
| 2026-11-04 | Владелец смержил #33–#37 (`e24722e`); rules S1 выкачены в Firebase после деплоя #32. Ревью-бот Codex (P2) нашёл на #32/#36 две проблемы, не закрытые последующими PR: (1) `AuthProvider` публиковал `user.emailVerified`, а `user.reload()` вызывает `onIdTokenChanged` до обновления токена → подписка на приглашения стартовала со старым `email_verified: false`, падала и не пересоздавалась; теперь публикуется claim `email_verified` текущего ID token (`getIdTokenResult()`), устаревшие ответы отбрасываются. (2) `revokeCurrentSession` проверял cookie без `checkRevoked` → уже отозванная (украденная) cookie могла снова и снова разлогинивать аккаунт; теперь `verifySessionCookie(cookie, true)`. Тесты: 3 новых (падают на старом коде). `check` (190), `cypress:run` 3/3. | сессия Claude Code, PR review-fixes |
