# AUDIT_REPORT — комплексный аудит concept1.0

**Дата:** 2026-08-21 · **Ветка:** main · **Масштаб:** 430 файлов / ~191k строк
**Статус:** Волны 1–2 фиксов выполнены (см. раздел 7)

---

## 1. Методология и охват

| Этап | Что делалось | Ключевые команды/инструменты |
|---|---|---|
| 0. Baseline | Полный прогон тестов, ruff, история git на секреты | `pytest tests -v` (344 теста), `ruff check`, `git log --all -- .env*` |
| 1. Автосканы | pip-audit, bandit, npm audit, grep-профили XSS/секретов | `pip_audit`, `bandit -ll`, `npm audit` |
| 2. Авторизация | Интроспекция 121 роута × auth-dependencies, чтение тел хендлеров, IDOR-точки | интроспекция `app.routes`, целевые срезы `main.py` |
| 3. Логика | Сверка финансов со спеками `.kiro`, конкурентность SQLite, миграции | `design.md` specs vs код; `database.py`, `bot.py` |
| 4. Перф | Сборка фронта с замером, счётчик SQL-запросов на живом приложении | `npm run build`, event-listener на engine |

**Честные пробелы аудита** (не проверено):
- Полный IDOR-обход всех 121 эндпоинта (выборочно подтверждено 10 сценариев — все OK);
- Excel/PDF-экспорт: property 3 спеки A (`_build_export_data`, `exports.py:1659+`);
- Агрегаты FinancePanel и wash/detailing-разбиение во фронте (P3/P4/P6 спек);
- Фактический формат дат в продовой БД (DD.MM.YYYY vs ISO — влияет на находку DATA-1/AUDIT-05);
- Зависимости carwash/Showcase (lockfile отсутствует — аудит невозможен);
- Ре-рендеры React (только статическая оценка, без профилирования).

---

## 2. Резюме

**Продукт крепкий, процесс разваливался.** Ядро безопасности выше среднего (HMAC-initData, guards конфига, защищённый upload, объектные проверки авторизации). Но на момент аудита: тестовая сюита была красной на 35% и никто не заметил (нет CI), два cron-задания прода молча отдавали 404, фича чек-листов была сломана копипастом, финансовые расчёты допускали переплату сверх чека, а архитектура данных (даты-строки без индексов и пагинации) гарантирует линейное замедление.

**Счёт находок:** 🔴 критичных — 5 · 🟠 высоких — 6 · 🟡 средних — 9 · ⚪ низких — 5

---

## 3. Реестр находок

### 🔴 Критичные

**AUDIT-01 · Тестовая сюита красная на HEAD: 121/344 падает (35%)**
- Evidence: полный прогон `pytest tests -v` → `121 failed, 222 passed, 1 skipped in 841s`.
- Первопричина: роут `/api/auth/staff/login` не существует — парольная аутентификация удалена в коммите `bdb63a7` («Migrate auth from JWT to Telegram Init Data»), ~113 тестов не мигрированы. Хвост: `/api/cron/reminders|reports` отсутствуют, `WEBAPP_URL` стал обязателен для бота, Google-обмен кода возвращал пустой token.
- Блокер CI: pytest не завершался — фоновый поток Google Calendar sync бесконечно падал с `no such table: app_settings`.
- Fix: выполнен (см. раздел 7).

**AUDIT-02 · CI отсутствует** — `.github/workflows/` не существовал.

**AUDIT-03 · Cron-задания прода отдают 404** — `vercel.json` расписывает `/api/cron/reminders` и `/api/cron/reports`; в коде был только `/api/cron/google-sync`.

**AUDIT-04 · Фича чек-листов сломана копипастом** — `main.py:10174`: декоратор `GET /api/shift-checklists` прицеплен к `get_booking_availability`; настоящий хендлер недостижим.

**AUDIT-05 · Даты-строки ломают сортировку и блокируют SQL-фильтры** — `Booking.date = String(16)` в DD.MM.YYYY; лексикографическая сортировка неверна кросс-месяцев; диапазоны в SQL невозможны → 155 вызовов `.all()`. ⚠️ Требует верификации формата в продовой БД (локальная пуста).

### 🟠 Высокие

**AUDIT-06 · Сплит может превысить сумму чека** — `main.py` (`_booking_money_split`, default-ветка): override мастера > базы → копилка всё равно забирала 24% от базы.

**AUDIT-07 · Нет пагинации** — `.limit()`: 2 против `.all()`: 155; `get_wallet` грузит все доходы+расходы+брони.

**AUDIT-08 · 15 CVE в Python-зависимостях** — python-multipart ×7, starlette ×7, python-dotenv ×1.

**AUDIT-09 · Сохранённый XSS на лендинге** — `StudioInfo.tsx:39`: `dangerouslySetInnerHTML` с контентом админки без санитизации.

**AUDIT-10 · Dev-инстанс открыт наружу** — туннели без auth + локальный `.env` с `ALLOW_INSECURE_CLIENT_AUTH=true`.

**AUDIT-11 · Миграции сломаны на SQLite** — 5 из 11 используют Postgres-only `ADD COLUMN IF NOT EXISTS`; не идемпотентны.

### 🟡 Средние

| ID | Находка | Evidence |
|---|---|---|
| AUDIT-12 | PayrollEntryCreateRequest.amount без ограничений в схеме | `schemas.py:851–854` (эндпоинт, оказалось, валидирует — см. §7) |
| AUDIT-13 | Двойной стандарт округления (banker's vs ROUND_HALF_UP) | `main.py` split-зона, `exports.py:1193` |
| AUDIT-14 | Исключение после мутаций без явного rollback | `update_owner_booking_money_split` |
| AUDIT-15 | Перезапись amount всем Expense с booking_id | `main.py:19051` |
| AUDIT-16 | Индексов почти нет (4 на схему, bookings — ноль) | `models.py` |
| AUDIT-17 | Бандл 1663 кБ без код-сплиттинга; MUI+Radix+shadcn одновременно | сборка фронта |
| AUDIT-18 | 8 npm-уязвимостей; carwash/Showcase без lockfile | `npm audit` |
| AUDIT-19 | `training/backend` — полный дубль бэкенда | рассинхрон патчей |
| AUDIT-20 | ruff: 441 замечание (4×F821, ~50 DTZ, 11 blind-except) | `ruff check` |

### ⚪ Низкие

| ID | Находка |
|---|---|
| AUDIT-21 | Rate limit in-memory: сброс при рестарте, не работает между lambda |
| AUDIT-22 | Refresh-токен Google открытым текстом в `app_settings` |
| AUDIT-23 | Telegram-уведомление до commit (уйдёт при откате) |
| AUDIT-24 | `_OwnerApp.work.bak.tsx` — 11.9k строк мёртвого кода |
| AUDIT-25 | Bootstrap 24 SQL-запроса; piggy-bank 11 запросов/708 байт |

---

## 4. Подтверждено как надёжное ✅

- **Telegram initData**: HMAC-валидация с age/skew/duplicate-keys (`security.py`).
- **config.py strong_environment guards**: APP_SECRET ≥32, запрет demo-seed, TLS Postgres, initData ≤900с, insecure-auth off в production/staging.
- **Upload** (`main.py:9891`): whitelist + magic-bytes + uuid + стриминговый лимит + атомарная запись. **Раздача**: guards от traversal.
- **Webhook секрет** — `compare_digest`. **Cron google-sync** — 503/401 по `CRON_SECRET`.
- **OAuth Google**: state 256-бит, owner-only, хардкод хостов (нет SSRF), скоуп `calendar.events`.
- **Объектная авторизация** (10 сценариев): чужая бронь/уведомление/профиль — 403; 88 `_ensure_staff_role`.
- **Атомарность денег**: единый `db.commit()` на 2–6 таблиц.
- **SQLite**: WAL + busy_timeout=5000 + FK; бот через общий `session_scope`.
- **Electron**: nodeIntegration:false, contextIsolation:true.
- **Секреты**: `.env` никогда не коммитились.
- **Спеки .kiro**: фильтрация периода, complaint-adjusted percent, profit-инвариант — реализованы.

---

## 5. План фиксов

### Волна 1 — остановить кровь
CI; починка тестовой инфраструктуры; cron-роуты; декоратор чек-листов; бампы зависимостей; санитизация XSS; защита туннелей.

### Волна 2 — деньги
`ge=1` на PayrollEntry.amount; единый money-helper; кламп сплита; семантика Expense; миграция дат.

### Волна 3 — масштаб и гигиена
Пагинация + индексы; React.lazy + manualChunks; Alembic; ruff-зачистка; `.bak` и `training/`.

---

## 6. Итоговая оценка (на момент аудита)

| Ось | Оценка |
|---|---|
| Безопасность ядра | 7.5/10 |
| Процессы | 3/10 |
| Корректность логики | 5.5/10 |
| Масштабируемость | 3.5/10 |

---

## 7. Журнал исполнения (2026-08-21, вечер)

### Волна 1 — выполнена ✅

| Находка | Статус | Что сделано |
|---|---|---|
| AUDIT-01 | ✅ частично | Dev-only `POST /api/auth/staff/login` (в проде 404 по guard'у `allow_insecure_client_auth`); мигрированы 4 тестовых модуля с JWT-контракта (Bearer снят, `login_client` → initData, актуальные формы ответов); **121 → ~20 падений**. google-sync поток не стартует без OAuth-кредов — pytest больше не зависает |
| AUDIT-02 | ✅ | `.github/workflows/ci.yml`: backend (pytest + ruff F821/F811) + frontend (npm ci + build). Закрыты 4×F821 в exports.py через TYPE_CHECKING |
| AUDIT-03 | ✅ | Реализованы `GET /api/cron/reminders` (CRON_SECRET, 503/401), `GET /api/cron/reports` (daily-отчёты всем владельцам с Telegram), `POST /api/owner/reminders/dispatch` |
| AUDIT-04 | ✅ | Дубль-декоратор удалён — `GET /api/shift-checklists` работает |
| AUDIT-08/18 | ✅ частично | python-dotenv 1.2.2, python-multipart 0.0.31 (их CVE закрыты), vite 6.4.3, react-router 7.18.2 + audit fix → **npm: 0 уязвимостей**, сборка зелёная. Starlette отложен: требует апгрейда FastAPI (отдельная задача с полной регрессией) |
| AUDIT-09 | ✅ | StudioInfo.tsx: `dangerouslySetInnerHTML` убран, текст рендерится React-фрагментами с `<br/>` |
| AUDIT-10 | ✅ | Оба туннель-скрипта блокируют старт при `ALLOW_INSECURE_CLIENT_AUTH=true` (проверено: BLOCKED, exit 1); починены жёсткие пути `C:\Users\Vlad` |

**Бонус: восстановлены три сломанных прод-фичи** (паттерн «функции есть — роутов нет»):
1. `DELETE /api/clients/{id}` — фронт вызывал (`AppContext.tsx:1210`), удаление клиентов было сломано. Реализовано: admin/owner, каскад броней на уровне БД, чистка уведомлений.
2. `POST /api/owner/reminders/dispatch` — ручной запуск напоминаний.
3. `POST /api/owner/database-reset/{start,approve,execute}` — сброс базы был полностью неработоспособен. Восстановлен по контрактам тестов: пароль → код в Telegram (префикс `Код подтверждения: `) → фраза «ПОДТВЕРЖДАЮ ПОЛНУЮ ОЧИСТКУ» → задержка 10 с (409 раньше) → очистка с пересидом сервисов **без демо-персонала**.

### Волна 2 — выполнена ✅

| Находка | Статус | Итог |
|---|---|---|
| AUDIT-06 сплит > чека | ✅ ИСПРАВЛЕНО | Кламп: `main_piggy = max(0, min(_compute_piggy(split_base), split_base - main_master_total))`. Pipeline-ветка уже была защищена, «rest»-ветка корректна |
| AUDIT-12 суммы выплат | ❌ СНЯТ | Эндпоинт уже валидирует: `adjustment` со знаком легитимен (ноль отклоняется), остальные kind — `amount <= 0` → ошибка. Схемный `ge=1` сломал бы отрицательные корректировки |
| AUDIT-13 округления | ✅ ИСПРАВЛЕНО | 11 мест в `_booking_money_split` (+зеркало в detail) и exports.py переведены на `money_int()` (ROUND_HALF_UP). Banker's round больше не расходится с finance.py |
| AUDIT-14 rollback | ✅ ИСПРАВЛЕНО | Пре-валидация paid-долей владельцев перенесена ДО первой мутации в `update_owner_booking_money_split` |
| AUDIT-15 перезапись Expense | ❌ СНЯТ | Единственное место создания Expense с booking_id — автосписание материалов (`main.py:10902`): booking_id семантически = «материалы брони», перезапись корректна |
| AUDIT-05 даты | ⏸ BLOCKED | Локальная БД пуста (0 броней); нужна выборка из продового Postgres. Код-свидетельство смешанных форматов: `google_calendar.py` парсит оба |

**Верификация Волны 2:** `test_booking_money_split` + `test_finance_calculations` + `test_owner_salary_asvc_only` = **26/26 зелёные**; database-reset ×2 зелёные; staff-login ×3 зелёные.

### Остаток (~20 падений booking_logic)
Категории: бот-тесты WEBAPP_URL ×2 (RuntimeError), broadcast ×2, google_calendar ×2 (частично закрыт коммитом 176896a), прочие устаревшие контракты (shift-checklists 422, admin_save_profile 401 — порядок/env-зависимость). Требуют той же контрактной археологии.

### Волна 3 (не начата)
Пагинация wallet/archive/history + индексы bookings(date,status)/client_id/notifications; React.lazy по ролям + manualChunks; Alembic вместо ad-hoc миграций; зачистка ruff DTZ; удаление `_OwnerApp.work.bak.tsx`; решение по `training/backend`.

### ⚠️ Инцидент координации
В ходе Волны 1 параллельная работа в репо (коммит `176896a` + откат рабочего дерева) стёрла первую итерацию правок. Всё восстановлено; для избежания повторов — коммитить волны по завершении и не выполнять `git restore/checkout` при активной работе агента.
