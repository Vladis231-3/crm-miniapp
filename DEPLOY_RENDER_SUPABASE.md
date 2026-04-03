## Render + Supabase

Подготовленные файлы:

- `Dockerfile`
- `render.yaml`

### Что использовать бесплатно

- `Render` free web service
- `Supabase` free Postgres

### Важный момент по базе

Для `Render` используйте в `Supabase` не direct IPv6 connection string, а строку из панели **Connection String** / **Supavisor** (pooler, IPv4-совместимая).

Формат обычно выглядит так:

`postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`

Если в пароле есть специальные символы, их нужно percent-encode.

### Как задеплоить

1. Залейте проект в GitHub.
2. В `Supabase` создайте новый project.
3. Откройте `Connect` и скопируйте Postgres connection string из панели `Connection String` / `Supavisor`.
4. В `Render` создайте `Blueprint` из этого репозитория.
5. Render подхватит `render.yaml` и создаст web service.
6. В env переменные Render вставьте:

- `DATABASE_URL` — строка подключения Supabase
- `TELEGRAM_BOT_TOKEN` — токен бота
- `WEBAPP_URL` — адрес сервиса Render, например `https://crm-tg-miniapp.onrender.com`
- `CORS_ORIGINS` — тот же адрес Render

Остальные переменные уже заданы в `render.yaml`.

### После первого деплоя

1. Откройте выданный `onrender.com` URL.
2. Убедитесь, что `/api/health` отвечает.
3. Перезапустите сервис, если меняли `WEBAPP_URL`.
4. В Telegram отправьте боту `/start`.

### Тестовые логины сотрудников

- `admin / admin`
- `ivan / master`
- `oleg / master`
- `owner / owner`

### Клиентский вход

В проде оставляйте:

- `ALLOW_INSECURE_CLIENT_AUTH=false`

Если нужно тестировать в обычном браузере вне Telegram, временно можно поставить:

- `ALLOW_INSECURE_CLIENT_AUTH=true`
