# Stale member profiles migration — 27 июля 2026 года

## Статус

Миграция подготовлена и проверена на локальном Firestore emulator. Production
dry-run и apply ещё не выполнялись.

## Контракт безопасности

- `npm run migrate:stale-member-profiles` всегда запускает dry-run;
- записи разрешены только при точном `MIGRATION_APPLY=true`;
- project id и Admin SDK credentials берутся из тех же environment variables,
  что используются сервером и другими admin scripts;
- owner защищён даже при повреждённой legacy-карте `members`;
- перед удалением каждый batch повторно читает board внутри transaction и не
  удаляет профиль, если UID успел вернуться в membership;
- один transaction удаляет не более 500 документов;
- повторный запуск идемпотентен;
- вывод содержит только project id, board id и агрегированные счётчики, без
  email и display name.

## Проверка на emulator

На demo project `demo-kanban-migration` выполнена последовательность:

1. создана board с owner, editor и двумя stale profiles;
2. dry-run: найдено 2, удалено 0;
3. apply: найдено 2, удалено 2;
4. проверено, что owner и editor profiles остались;
5. повторный dry-run: найдено 0;
6. тестовая board удалена.

Pure comparison и batching logic покрыты unit tests.

## Production runbook

Перед запуском выбрать и явно проверить целевой project id, затем предоставить
Admin SDK credentials через защищённое environment или ADC. Не копировать
credential JSON в репозиторий или отчёт.

```bash
npm run migrate:stale-member-profiles
```

Сохранить итоговые `boardsScanned`, `profilesScanned` и `staleProfilesFound`.
Вручную проверить несколько board id из отчёта, сверив membership и profiles.
После подтверждения:

```bash
MIGRATION_APPLY=true npm run migrate:stale-member-profiles
npm run migrate:stale-member-profiles
```

Критерий завершения: итоговый dry-run возвращает
`staleProfilesFound: 0`, а число удалённых документов в apply не превышает число,
зафиксированное первым dry-run.

Удаление окончательное. Если ручная проверка выявит ошибку до apply, запуск нужно
отменить. После apply восстановление возможно только из контролируемого backup
или ручным повторным созданием конкретного profile; поэтому production apply
нельзя выполнять без сохранённого dry-run отчёта и проверки выбранных board id.
