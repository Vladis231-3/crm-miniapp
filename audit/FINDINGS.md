# FINDINGS — Реестр находок аудита

> Формат: `ID | severity | файл:строка | описание | статус`
> Классы: **P0** (аварийные/безопасность), **P1** (логика данных/деньги), **P2** (качество/риски), **P3** (запахи)
> Статусы: `open` | `подтверждён` | `шум` | `осознанный код` | `fixed (test)`

## Фаза 1 — Статический анализ (2026-08-31)

### P0 — кандидаты на runtime-краш / безопасность

| ID | Где | Находка | Статус |
|---|---|---|---|
| F-001 | `frontend/src/app/components/worker/WorkerApp.tsx:704-772` | `selectedCompletedOrder` / `setSelectedCompletedOrder` — **25 использований в JSX, 0 объявлений** (tsc TS2304 ×25). При рендере карточки завершённого заказа → `ReferenceError` (vite/esbuild это не ловит, CI зелёный) | fixed (7fd3b94; проверено 03.09: декларация WorkerApp.tsx:120, tsc по WorkerApp — 0) |
| F-002 | `frontend/src/app/components/admin/screens/AdminClientsPage.tsx:305-386`, `client/screens/ProfileScreen.tsx:105-107` | `<StatTile>` используется без импорта (объявлен в `components/atmosfera/StatTile.tsx:11`, экспорт `atmosfera/index.ts:16`). 10 использований → `ReferenceError` при рендере страниц клиентов | fixed (03.09, audit/phase1-deps: +StatTile в импорты обоих файлов; TS2304 ×10 → 0, tsc 235→225, `npm run build` ✓) |
| F-003 | `backend/requirements.txt` | `starlette==0.47.3` — **8 известных уязвимостей** (pip-audit: PYSEC-2026-161, -248, -249, -1942, -2281, -2280; фиксы ≥0.49.1/1.x). Придётся поднимать fastapi. `npm audit`: 0 уязвимостей — чисто | fixed (03.09, audit/phase1-deps: fastapi 0.116.1→0.141.1 + явный пин starlette==1.6.0; on_event-шим FastAPI проверен — on_startup в lifespan; pip-audit по пакетам — 0; регрессия 172 passed: smoke 30 + money 35 + booking_logic 107) |

### P1 — логика данных (требуют верификации в Фазах 2–3)

| ID | Где | Находка | Статус |
|---|---|---|---|
| F-004 | `backend/app/main.py:12980-12986` | `setattr(booking, "is_outsource" / "outsource_amount", ...)` — у модели `Booking` таких полей **нет** (они в `BookingAdditionalService`, models.py:255-256). SQLAlchemy сохранит в атрибут объекта, не в БД → тихая потеря данных, если фронт шлёт isOutsource. Проверить эндпоинт (между :12800 и :12970) и payload | fixed (P1: подтверждён REAL — PATCH /api/bookings писал is_outsource в void; теперь явный 400 + тест test_booking_outsource_guard.py 3/3) |
| F-005 | `frontend/.../OwnerApp.tsx:5356, 2897` | TS2367: сравнение `OwnerPage` vs `"wallet"` — типы не пересекаются (мёртвая ветка или неверный id страницы); string vs number сравнение | fixed (P1: sourceBookingId number→string — ветка была вечно ложной; 'wallet' добавлен в OwnerPage — gotoWallet полагался на рантайм; tsc TS2367 по обоим — 0) |
| F-006 | `frontend/.../AdminApp.tsx:358, 367` | Деструктуризация `content`, `revokeSession` — полей нет в `AppContextType` → всегда `undefined` из контекста | fixed (P1: content добавлен в AppContextType — значение уже было в провайдере; revokeSession→честные TTL-тосты в OwnerApp + WorkerProfileScreen по паттерну AdminApp; revoke-API нет — см. SESS-001) |
| F-007 | `backend/app/main.py:7515, 7517` | `"...".join(list[Any \| None])` — если элемент None → TypeError в рантайме | fixed (P1: подтверждён REAL — checked-элементы без name/workerName роняли отчёт инспекции; фильтр в _admin_shift_inspection_payload) |
| F-008 | `backend/app/main.py:16199-16200` | Decimal в bool-контексте генератора (any/all?) — правдивость вместо сравнения | шум (P1: не воспроизводится — все денежные ветвления main.py/finance.py — явные `== 0`/`> 0`/`< 0`; вероятно, ушёл с money_int-рефактором Волны 2) |
| F-009 | `backend/app/exports.py:1980-1982` | `min`/`max` по `datetime \| None` — TypeError если в списке None | шум (P1: все три сайта защищены — `if period_dated`, `if booking_dates`, `if month_net_rows`; дочистка: walrus в booking_dates убрал двойной вызов + 4 mypy-ошибки) |
| F-010 | `backend/app/security.py:72` | `.encode()` на `str \| None` — AttributeError на None | шум (P1: недостижим — `.encode()` внутри `if not skip_validation`, а там bot_token гарантирован guard'ом; вызовы только со str) |
| F-011 | `backend/app/main.py:6193-6213` | Переменная типа `BookingWorkerPayload` переопределяется `StaffUser \| None`, затем читаются `.role/.active/.id/.name` | fixed (P1: двойной `.get().name` → walrus single-get; `bool(name) and` → `is not None and` — оба рантайм-безопасны были, теперь и mypy чист) |
| F-012 | `backend/app/exports.py:2213, 2339-2343` | `int + object`; list перезаписывает dict-переменную, затем индексируется int'ом | fixed (P1: рантайм был корректен (числовая башня) — убрана путаница: `row`→`cat_row`, `list[int]`→`list[Any]`; mypy-ошибки точек — 0) |

### P2 — качество/риски

| ID | Где | Находка | Статус |
|---|---|---|---|
| F-013 | backend (50 мест) | DTZ005/007/011/901: naive `datetime.now()`, `strptime()` без tz, `date.today()` — кандидаты на сдвиги дат в отчётах. Классифицировать осознанность в Фазе 2 | open |
| F-014 | `main.py:9401,9453,9501,1427` | `append` к `Sequence` — проверить, что это `.all()` (list), а не живой Query | open |
| F-015 | `frontend`, 187 мест | TS6133 unused + ESLint 184 no-unused-vars — мёртвый код (в т.ч. `AdminApp.tsx` ~40) | open |
| F-016 | `AdminApp.tsx:14-36` | 10× TS2300 duplicate identifier (секции объявлены дважды) | open |
| F-017 | `AdminApp.tsx:9` | `import { Toggle }` — экспорта нет в lucide-react (TS2305) | open |
| F-018 | backend mypy ~190 ошибок | Системная: Decimal передаётся в `float`/`int` поля Pydantic-схем (~60 мест в piggy/deposit/wallet/payroll) — риск усечений; унифицировать схемы на Decimal | open |
| F-019 | frontend, 12 мест | ESLint no-empty: пустые блоки (глотание ошибок) | open |
| F-020 | frontend, 6 файлов | Inline `eslint-disable react-hooks/exhaustive-deps` — плагин не установлен, проверки hooks реально отключены. Установить eslint-plugin-react-hooks в Фазе 5 | open |
| F-021 | backend, 10 мест | B904 raise без from; 6 global; 5 try/except pass | open |
| F-022 | `main.py:6873` | `assert` в prod-коде (исчезает при `python -O`) | open |

### Bandit — классификация
- B324 MD5 ×2 (`error_notifier.py:183,300`) — **осознанный код**: fingerprint дедупа уведомлений, не криптография. Опционально `usedforsecurity=False`.
- B310 urllib ×3 (`bot.py`) — **осознанный код**: Telegram API, https.
- B104 bind 0.0.0.0 (`config.py:254`), B108 tmp (`config.py:14`) — проверить контекст деплоя в Фазе 4.
- B406 xml (`exports.py:21`), B105 'None'-строки ×3 — шум/низкий.
- B110 try/except pass ×5 → F-021.

### Артефакты
`audit/reports/`: ruff_full.txt (100), ruff_statistics.txt (1149 raw), mypy_full.txt (~190), bandit_full.txt (17), vulture_full.txt (чист, только pydantic cls), tsc_baseline.txt (400), eslint_full.txt (207), npm_audit.json (0), pip_audit.txt (8 vulns).
Фаза 0 (2026-09-03): `baseline.json` (свежие счётчики + pytest по чанкам), `uncovered_routes.md` (53 роута).

### Изменения инфраструктуры (не код)
- `frontend/tsconfig.json` — создан (baseline: strict=false, noEmit)
- `frontend/eslint.config.mjs` — создан (js recommended + typescript-eslint recommended, no-explicit-any=off)
- `frontend/package.json` — devDeps: typescript, eslint, typescript-eslint, @eslint/js
- knip/depcheck — отложены в Фазу 5 (бесполезны до разбиения монолитов; dead code уже виден по TS6133/TS2304)

## Фаза 0 — Baseline (2026-09-03)

Счётчики: `audit/reports/baseline.json`. Динамика к 31.08: ruff 100→**396**, mypy ~190→**232**,
tsc 400→**235** (лучше), eslint 207→**155** (23 errors), bandit 17→**18**,
pip-audit: starlette 8 vulns держатся (F-003) + **новый** setuptools PYSEC-2026-3447;
`npm audit` фронта — 0. Сюита: **431 тест** (было 344), чанками **427 passed / 3 failed / 1 skipped**;
полный single-run >15 мин — песочницей остановлен, непроверен. Фронт: 0 тестовых файлов;
`carwash/`, `Showcase/` без lockfile.

| ID | Где | Находка | Статус |
|---|---|---|---|
| B-001 | `backend/tests/test_broadcast_edge_cases.py` + соседи по прогону | Order-зависимость: изолированно 5/5 зелёных, в группе с `test_booking_money_split/test_deposit/test_error_notifier` — 3 падения `AssertionError: 4 != 2 : expected 2 owners, found 4` (загрязнение сида общей БД). Тот же класс риска, что остаток `booking_logic` в AUDIT_REPORT | fixed (коммит 37b6f82 сторонней ветки работ: изоляция broadcast-тестов; проверено 03.09: связка 4 файлов 51/51 зелёных) |
| B-002 | `backend/app/main.py` (139 декораторов, 109 путей) vs `backend/tests/` | **53 роута** без прямых обращений из тестов (эвристика по литералам; список и приоритет — `audit/reports/uncovered_routes.md`). В топе риска: `owner/deposits/*`, `money-split`, `payroll/*`, `bookings/{id}` | open |
| B-003 | `backend/requirements.txt` | setuptools PYSEC-2026-3447 (fix 83.0.0) — новый относительно pip_audit.txt от 31.08 | fixed (03.09: setuptools 82.0.1→84.0.0 в окружении; в requirements.txt его нет — repo-изменений не требует) |
| SESS-001 | `backend/app/main.py:23967` (`GET /api/auth/sessions` → `return []`), `frontend/.../OwnerApp.tsx:8190`, `WorkerProfileScreen.tsx:604` | Сессии заглушены с обеих сторон; revoke-эндпоинта нет вовсе. Фронт обезврежен TTL-тостами (P1), но фича не работает — нужен контракт: или настоящий API + IDOR (владелец видит/гасит только свои сессии), или удалить UI | open |
| S-001 | `backend/app/main.py:debug_db` | `GET /api/debug/db` без авторизации отдавал staff-логины/имена/города + трейсбеки. Фикс: гейт `_debug_owner_session` (перенесён выше по файлу — Depends резолвится на декорировании); тесты test_idor_spot.py 4/4 (anon→401, worker→403, owner→200; чужой PATCH→403; клиент изолирован). Остальные OPEN? из route_matrix.md разобраны: cron — CRON_SECRET ✓, mojibake — owner ✓, auth/callback/webhook/uploads/contact/content — по дизайну | fixed (test) |
| M-001 | `backend/app/main.py:_validated_booking_workers`, POST/PATCH bookings + additional-services | Сумма процентов бригады >100% принималась API (фронт блокирует): сплит переплачивал мастеров сверх базы (fuzz case=20: 2 при базе 1). Фикс: `_ensure_worker_percent_cap` в 4 точках; тесты test_worker_percent_cap.py 5/5 | fixed (test) |
| M-002 | `backend/app/main.py:_ensure_subtract_fits_net`, asvc carve-out → piggy | Subtract-вычет больше net парковал фантомный carve-out в копилку сверх чека (price=0+subtract=50 → piggyDeposit=50; при complete — реальный депозит). Фикс: валидация вычета ≤ net на create/update asvc; тесты test_subtract_fits_net.py 4/4; fuzz-инвариант «распил ≤ чек» 120/120 | fixed (test) |
| G-001 | `backend/migrations/add_pay_type_to_workers.py` | Хардкод `backend/data/crm.sqlite3` (CWD-зависим, на проде мимо) + побочки на импорте (коннект и ALTER в теле модуля). Переписать на `_common.ensure_column` | fixed (переписано на ensure_column + downgrade; эмпирика: drop→add→rerun чисто) |
| G-002 | `backend/migrations/change_int_to_float.py` | Postgres-only синтаксис без dialect-guard (на SQLite падает); ниоткуда не вызывается (мёртв); тянет деньги в DOUBLE против NUMERIC(18,2) из finance_consistency — конфликт направлений. Удалить или пометить superseded | fixed (superseded-guard: явный RuntimeError вместо тихого ALTER) |
| G-003 | `backend/migrations/add_service_times.py`, `add_write_off_booking_fields.py` | Нет `if __name__ == "__main__"` — запуск по задокументированному Usage молча ничего не делает (проверено эмпирически: пустой вывод). Добавить guard | fixed (гарды добавлены; модули выполняются) |
| G-004 | `backend/migrations/_common.py:52-57` | `column_type_postgres` используется только в print — на Postgres применяется sqlite-тип. Латентно (текущие типы кросс-валидны) | fixed (выбор типа по dialect; sqlite-путь покрыт прогонами) |
| G-005 | `migrate_additional_services.py`, `sync_client_schema.py`, `add_referral_source.py` | Глоб `data/*.sqlite3` — миграции трогают и тестовые БД. Ограничить прод-файлом/явным параметром | fixed (MIGRATION_DB override; проверено: затронут ровно указанный файл) |
| G-OK | 5 `_common`-миграций, `finance_consistency --dry-run`, `payroll_entry_dates` | Эмпирика 03.09 на scratch-БД (`audit/scripts/migration_idempotency.py`): add×2 → VERIFY PASS; dry-run'ы чистые; конкурентный PATCH ×8 потоков — все 200 (`test_concurrent_booking_patch.py`) | verified |
| D-001 | дрейф фронт↔бэк (`audit/scripts/check_api_drift.py` → `audit/reports/api_drift.md`) | 113 вызовов фронта × 138 роутов: broken=0, method_mismatch=0. Хвост «ни фронта, ни тестов» — 2 endpoint'а, оба легитимны и покрыты `test_orphan_endpoints.py` 2/2 (outsource/payroll считает верно; photo отдаёт 404 на чужом id). Остальные сироты — инфра/auth/динамика (секция D отчёта) | fixed (test) |
| V-001 | покрытие backend 81% (`audit/reports/coverage_backend.txt`) | finance 97%, models 100%, schemas 95%, main.py 76%. Крупнейшие дыры: owner_salary_detail, revoke_penalty, shift-attendance (×2), save_boxes/save_schedule, get_piggy_bank, submit_contact, telegram_linking 58%. Цель: точечные тесты на settings-write и salary-detail | partial (settings-write, penalties, contact, piggy покрыты test_v1_gaps.py 6/6) |
| C-001 | публичный POST /api/contact ронял 500 при недоступности Telegram | Синхронный send_telegram_message в хендлере без обработки ошибок (поймано V-001 тестом). Фикс: `_send_telegram_safe` (fail-open, как везде) | fixed (test) |
| R-001 | двойные записи: `_box_is_available` всегда True, `_ensure_booking_has_no_conflicts` проверял лишь парсинг | Два POST в один бокс/слот давали 200+200 (доказано тестом). Фикс: общий `_overlapping_bookings` (окно ±1 день на полночь, плейсхолдер-бокс исключён) + 409 бокс/мастер; availability и пикеров починились тем же механизмом. 2 старых теста кодировали баг (share/pick busy) — переписаны на новый контракт + добавлен 409-тест. Полная регрессия зелёная | fixed (test) |
| L-001 | долг линтеров погашен (ruff 398→53, конфиг) | `backend/pyproject.toml`: B008-игнор (Depends-канон), 85+ автофиксов (UP/I/UP017/F401), микрофиксы SIM/F841/RUF046/RUF059/B010/PLR0124, S110→debug-логи, BLE001→сужения+обоснованные noqa, LOG015→модульный логгер, FURB162, TRY004→noqa по контрактам. Остаток 53 — только DTZ (осознанный код, см. F-013) | done |
| F-013 | naive datetime (DTZ005/007/011/901) | осознанный код: naive = локальное стенное время (слоты/графики/отчёты); границы — `_now()` aware-UTC + `_as_utc()` (SQLite режет tz). Bulk-правка сломала бы слоты. Открыт вопрос W4-001 | осознанный код |
| F-018 | Decimal в int/float-поля схем (mypy arg-type 127→~86) | Частично: `_format_money` расширен до `int \| Decimal` (13 ошибок, поведение то же). Остальное — runtime-безопасная pydantic-коэрция (≤2dp точно); паттерн зачистки: money_int на границах. Риск дробных Decimal→int (500) не доказан — см. W4-002 | partial |
| W4-001 | часовой пояс сервера vs Europe/Moscow | Доказан на конфигах: TZ не стоит нигде, python:3.12-slim = UTC, а наивная логика — местная. Фикс на deploy-слое: TZ=Europe/Moscow (Dockerfile + tzdata, render.yaml, amvera.yml). Vercel-crons посчитаны в UTC и не тронуты | fixed |
| W4-002 | дробный Decimal в int-поле ответа → потенциальный 500 | Доказан частично: премия 100.50 читалась как 101 (money_int при чтении). Фикс: валидатор целых рублей на PayrollEntryCreateRequest (422 на копейки — политика whole-ruble учёта); тесты test_fractional_money.py 3/3 + регрессия payroll/finance/money 106 | fixed (test) |
| V-001b | telegram-linking 58% | generate/confirm покрыты (ротация кодов, неверный код → None, linked-флаг) в test_v1_gaps.py | done |
| V-001c | owner salary-detail (86 строк дыры) | 403 для worker / 200 + структура для owner, test_v1_gaps.py 8/8 | done |
| PARKED | main.py debt-hunks не закоммичены | Параллельный stdlib-shadow/format WIP в том же файле; страховка: `audit/.main-debt-parked.patch` (удалить после settle). Коммит 7569311 — всё остальное | pending |
| T-001 | vitest с нуля (`npm run test`, `validation.test.ts` 15/15) | Первые тесты фронта в истории репо (pure-utils). Следом: date.ts, api-контракты, затем jsdom-компоненты | done |
| W-001 | бюджет SQL (`test_wallet_query_budget.py`) | get_wallet: 19 запросов на сиде при бюджете 120 (N+1-радар; масштабируется строками — бюджет щедрый намеренно) | done |
| C-001 | CI расширен (`.github/workflows/ci.yml`, `.pre-commit-config.yaml`) | Backend: +pip-audit по пинам + coverage fail-under=70. Frontend: +vitest. Новый job contract: route_matrix + drift-гейт (exit 1 при дрейфе). tsc/eslint в гейт не заведены сознательно (216/155 — сначала погасить долг) | done |
| W3-001 | индексы (AUDIT-16 закрыт частично) | 19 индексов: модели `__table_args__` + миграция `add_performance_indexes.py` (эмпирика scratch: INDEXES PASS, EXPLAIN: SEARCH USING ix_bookings_status_deleted). Тест test_performance_wave3.py (индексы + EXPLAIN + offset) | fixed (test) |
| W3-002 | пагинация истории | `GET bookings-history`: +`offset` (limit был). Archive/money-flow/wallet — сознательно без ломки контракта: UI всегда шлёт периоды; полная keyset-пагинация требует UI-работы — следующим заходом | partial |
| W3-003 | бандл | React.lazy по ролям уже был; добавлен pin vendor-charts (553 КБ, только OwnerApp, on-demand). Замер честно: vendor-mui/react/radix/motion в entry-графе — их чанки дали стабы, откачены. OwnerApp-монолит 704 КБ — следующий кандидат (рефактор, не аудит) | partial |
