# Credential audit — 27 июля 2026 года

## Статус

Credential risk Gate A закрыт. Владелец проекта подтвердил, что ключ никогда не
добавлялся в Git; полный service-account JSON перенесён в защищённую Vercel
Environment Variable, deployment обновлён, старая локальная JSON-копия удалена.

## Подтверждённые факты

- service-account JSON не отслеживается Git и игнорируется `.gitignore`;
- поиск по всей Git history не нашёл commit, добавлявший маркеры service-account
  JSON или private key;
- production build и проверка 14 server trace manifests не нашли credential
  files;
- серверный код использует только защищённый `FIREBASE_SERVICE_ACCOUNT`, ADC или
  emulator credentials и не ищет JSON в дереве проекта;
- полный JSON сохранён в `FIREBASE_SERVICE_ACCOUNT` в Vercel Variables и применён
  новым deployment;
- `/`, `/sign-in` и неавторизованный защищённый API отвечают ожидаемыми
  `307`/`200`/`401`, без initialization `500`;
- локальный `FIREBASE_SERVICE_ACCOUNT` приведён к валидной однострочной
  dotenv-форме; обязательные поля проверены без вывода значений;
- старая отдельная JSON-копия удалена из корня проекта;
- `FIREBASE_SERVICE_ACCOUNT_PATH` больше не требуется;
- Node.js major зафиксирован на `24.x`, поэтому Vercel не перейдёт на новый major
  автоматически.

## Решение о ротации

Ротация не требуется только на основании расположения прежней локальной копии:
Git history и deployment trace чисты, а владелец подтвердил отсутствие публикации
ключа. Если позднее обнаружится передача файла третьим лицам, попадание в backup с
широким доступом или неизвестный active key в IAM, ключ нужно немедленно
ротировать.

Authenticated production board operation остаётся частью AUD-04. Private key и
полный service-account JSON в документацию и логи не сохраняются.
