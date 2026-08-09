## Amvera Deploy

Файлы для деплоя уже подготовлены:

- `Dockerfile`
- `amvera.yml`

Что делает конфиг:

- собирает `frontend` внутри Docker
- запускает `FastAPI` на `8000`
- хранит SQLite в `/data/crm.sqlite3`, чтобы база не терялась после рестартов

### Что загрузить в Amvera

Загрузите весь проект целиком как один репозиторий.

### Какие переменные окружения задать в Amvera

- `APP_SECRET` — длинная случайная строка
- `TELEGRAM_BOT_TOKEN` — токен вашего бота
- `WEBAPP_URL` — публичный URL приложения в Amvera, например `https://your-app.amvera.io`
- `RUN_EMBEDDED_BOT` — `true`
- `ALLOW_INSECURE_CLIENT_AUTH` — `false`
- `CORS_ORIGINS` — публичный URL приложения в Amvera, например `https://your-app.amvera.io`

В `amvera.yml` уже зафиксированы безопасные несекретные defaults: `APP_ENV=production`, `ALLOW_DEMO_SEED_DATA=false`, `PERSISTENT_DATA_DIR=/data`, `UPLOADS_ENABLED=true`. `/data` обязан оставаться подключённым persistent volume; иначе SQLite и uploads использовать нельзя.

### Важный порядок

1. Создайте приложение в Amvera и задеплойте проект.
2. Получите постоянный домен приложения в Amvera.
3. Вставьте этот домен в `WEBAPP_URL` и `CORS_ORIGINS`.
4. Перезапустите приложение.
5. Отправьте боту `/start`.

### Логины сотрудников

- `admin / admin`
- `ivan / master`
- `oleg / master`
- `owner / owner`

### Клиентский вход

Для реального использования внутри Telegram:

- `ALLOW_INSECURE_CLIENT_AUTH=false`

Для теста в обычном браузере можно временно поставить:

- `ALLOW_INSECURE_CLIENT_AUTH=true`
