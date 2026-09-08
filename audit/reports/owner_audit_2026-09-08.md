# Аудит владельца (Owner) — полный, только отчет

> Дата: 2026-09-08. Scope: **полный минус Deposit/Google** (по решению заказчика).
> Исключено: `owner/DepositPanel.tsx` + `GET/PATCH/POST /api/owner/deposits*` + `settings/deposit`, `settings/integrations` (Google OAuth/credentials/sync/invites).
> Режим: read-only аудит + тесты/статика. Код не правился. Ручной UI-smoke с живым TG-ботом не выполнялся.

## 1. Карта scope (что проверялось)

Frontend: `frontend/src/app/components/owner/OwnerApp.tsx` (12 339 строк), `screens/OwnerWalletScreen.tsx` (254), `screens/OwnerPiggyBankScreen.tsx` (633), `screens/OwnerStockPage.tsx` (361), `screens/OwnerClientsScreen.tsx` (831), `context/AppContext.tsx` (2199), `api.ts` (348).
Backend: `backend/app/main.py` (24 612 строк, 141 роут) — в scope ~40 роутов owner + 6 смежных payroll/admin. `exports.py`, `models.py`, `finance.py` — чтением.

`OwnerPage x10`: dashboard, calendar, payroll, salary-detail, stock, reports, settings, piggy-bank, clients (псевдо), wallet.
`SettingsSection в scope x17`: company, schedule, boxes, services, employees, clients, notifications, security, finance, content, wallet, reports(дубликат), bookings-history, archive, money-flow, shift + null. Вне scope: deposit, integrations.

## 2. Доказательства (фактически запущено 08.09)

| Проверка | Команда | Результат (наблюдено) |
|---|---|---|
| Owner-ядро | `cd backend; python -m pytest tests/test_owner_masters.py tests/test_owner_salary_asvc_only.py tests/test_owner_export_stock_decimal.py -q` | **10 passed** (18.8s). Варнинги: `on_event deprecated`, `httpx/starlette` |
| Архив | `python -m pytest tests/test_archive.py -q` | **11 passed** (18.2s) |
| Деньги-сплит | `python -m pytest tests/test_money_flow.py tests/test_booking_money_split.py -q` | **32 passed** (70.3s) |
| Копилка/доходы/кошелек | `python -m pytest tests/test_piggy_bank_adjust.py tests/test_piggy_bank_withdraw_flex.py tests/test_piggy_idempotency_delete.py tests/test_income_endpoints.py tests/test_wallet_query_budget.py -q` | **39 passed, 1 skipped** (70.5s) |
| Смены/безопасность/гэпы | `python -m pytest tests/test_attendance_endpoints.py tests/test_security_hardening.py tests/test_v1_gaps.py -q` | **25 passed** (27.6s) |
| Проценты/вычеты/орфаны | `python -m pytest tests/test_payroll_date_migration.py tests/test_worker_percent_cap.py tests/test_subtract_fits_net.py tests/test_orphan_endpoints.py -q` | **14 passed** (19.6s) |
| Ruff app | `python -m ruff check app --statistics` (из `backend/`) | **103 errors**: DTZ005 18, DTZ007 17, UP017 17, DTZ011 15, BLE001 11, DTZ901 3, I001 3, S110 3, SIM103 3, RUF046 2, RUF059 2, SIM102 2, B010/F541/F841/PLR0124/PYI041/RUF100/UP012 по 1. DTZ — осознанный код (F-013), остальное — долг |
| Ruff весь backend | `python -m ruff check backend` | **295 errors**, в основном тесты: I001/PIE810/DTZ005/UP017 (копипаста `_set_staff_telegram_ids`, `datetime.now()` в тестах) |
| tsc | `cd frontend; npx tsc --noEmit` | **exit 2**, сотни ошибок. Owner-специфичных ~70+: см. §5. Vite/esbuild их не ловит — прод соберется, но типы врут |
| eslint owner | `npx eslint src/app/components/owner --ext .tsx` | **61 проблема (9 errors, 52 warnings)**: 4× `react-hooks/exhaustive-deps` (плагин не установлен), 2× `no-empty` (3137, 9817), 2× `no-irregular-whitespace` (8332), остальное `no-unused-vars` |
| route_matrix | `python audit/scripts/route_matrix.py` | `routes=141 open_suspects=16` → `audit/reports/route_matrix.md`. Owner-роуты все `session+owner/...`, OPEN только по дизайну (callback/webhook/health/contact/content) + cron за CRON_SECRET |
| api_drift | `python audit/scripts/check_api_drift.py` | `calls=109 routes=140 broken=0 method_mismatch=0 orphans=20 dynamic=8` → `audit/reports/api_drift.md`. Money-split: фронт PUT == бэк PUT — совпадает |
| git | `git status --short; git log --oneline -5` | Грязное дерево (не мое, не трогал): `M backend/app/complaints.py, M backend/app/security.py, ?? .pytest_full.err, _tmp_db_check.py, _tmp_worker_session_test.py, audit/.main-debt-parked.patch`. HEAD `5b44851` |

НЕ проверялось: живой UI-клик по каждой кнопке, TG-доставка экспортов/напоминаний, `database-reset/execute` на реальной БД, депозиты, Google. Это честно помечено ниже как NOT-VERIFIED.

## 3. Вердикты по функциям (имеет значение / работает / нет)

Легенда: OK — есть тесты/код сошелся; DEGRADED — работает, но с оговорками; BROKEN — доказанная поломка; DEAD — код/состояние никогда не используется; STATIC-STUB — захардкоженный текст вместо данных; NOT-VERIFIED — код прочитан, рантайм не гонялся.

### 3.1 Dashboard (`OwnerApp.tsx:4454-4702`)

| Функция | Вердикт | Доказательство |
|---|---|---|
| KPI-карточки + модалки детализации | OK (с оговоркой) | Код рендера цел, `byService` агрегации живые; но `boxLoadData:3984`, `workerEfficiencyData:3994` — объявлены и **нигде не используются** (tsc+eslint). Часть KPI может показывать `Нет данных:3950,4022,5571` при пустом периоде — штатно |
| Быстрые действия | OK | Все кнопки с хендлерами, пустых `onClick` нет |
| Экспорт/отчет/напоминания с дашборда | OK | Через `downloadOwnerExport/sendOwnerSummaryReport/dispatchOwnerReminders` → роуты `9431,9495,19661` существуют; drift broken=0 |

### 3.2 Calendar (`4178-4453`)

| Функция | Вердикт | Доказательство |
|---|---|---|
| Создание/редактирование/удаление брони владельцем | DEGRADED | Хендлеры есть, кап процентов >100% есть в UI (`11357,11401,11404`), бэк-кап доказан `test_worker_percent_cap 5/5`. НО: tsc-ошибки типов формы — `setBookingForm` без `plateType/referralSource/isRepeatVisit:3293,3324`, `isOutsource/outsourceAmount` нет в типе `bookingForm:3453-3460,9558-9573`, `BookingCreateInput` требует `services/additionalServices/materials/materialsWrittenOff:3439,3580` — рантайм это переживает (лишние/недостающие поля), но контракт фронт-бэк в этом месте врет |
| Выбор бокса/анти-даблбукинг | OK (логика) / DEGRADED (типы) | `ownerBookingBlocksBox:457` + `ownerPickDefaultBookingBox:468` корректны; бэк `_overlapping_bookings` + 409 доказан (R-001 fixed). Дубликат с admin (`bookingBlocksBox`) — риск рассинхрона, сейчас оба чинят одно и то же |
| Допуслуги в брони (add/subtract/аутсорс) | OK | `ownerAddServiceDraft/ownerEditAsvcDraft:1158-1165`, вычет ≤ net доказан `test_subtract_fits_net 4/4` |

### 3.3 Payroll + Salary-detail (`4703-5486`)

| Функция | Вердикт | Доказательство |
|---|---|---|
| Ведомость `GET/PUT /api/admin/workers/payroll` | DEGRADED | Бэк-тесты зеленые; фронт `payrollSummary.shiftPayTotal/shiftCount:4818-4819,5040` — **tsc TS2339: полей нет в `WorkerPayrollSummary`**. UI может показать undefined вместо «За смены». Рантайм не роняет (optional chain частично), но цифры смен под вопросом — проверить вручную |
| Детализация мастера `GET /api/owner/workers/{id}/salary-detail` | OK | `test_owner_salary_asvc_only 1/1` + `test_owner_masters 8/8` (10 passed выше) |
| Выплата мастеру `POST .../pay-salary` (идемпотентность) | OK | Ключ `salaryPayRequestId`, бэк идемпотентен; дабл-клик фикс в HEAD `282b4e2` |
| Доли владельцев `GET /api/owner/owners/salary-detail`, выплата `POST .../pay-salary`, тумблер `PATCH .../master-role` | OK | Покрыто `test_owner_masters`; `worksAsMaster` проверен |
| Бонусы/штрафы/списания `POST /api/payroll/entries`, правка/удаление `PUT/DELETE .../{id}`, override `PUT .../override-earned` | OK | `createPayrollEntry:3021,3051,3081,3108` живые; `test_money_fixes`-семейство зеленое в прошлых прогонах; текущий прогон money_flow+split 32 passed |
| Локальный интерфейс `SalaryDetailResponse.entries: PayrollEntry[]:85` | BROKEN (типы) | **tsc TS2304: `PayrollEntry` не импортирован в OwnerApp**. Сборка vite пройдет, но любой код, трогающий `entries` как тип, врет. Рантайм данных не ломает, типизацию — да |

### 3.4 Stock (`5487-5491` → `OwnerStockPage.tsx`)

| Функция | Вердикт | Доказательство |
|---|---|---|
| Дерево категорий,CRUD позиций, списание, история | OK | Экран презентер, методы контекста → `POST /api/stock-items/{id}/write-off`, `GET /api/stock/write-off-history`, категории CRUD. Decimal-экспорт доказан `test_owner_export_stock_decimal 1/1` |
| Деструктуризация `addStockItem/writeOffStock/getWriteOffHistory/deleteStockItem/addStockCategory/updateStockCategory/deleteStockCategory` в OwnerApp:688-695 | DEAD | eslint+tsc: объявлены, **ни разу не использованы в OwnerApp** (склад живет в `OwnerStockPage`). Не баг, но мусор в God-component |
| Фото смен `apiBlobUrl` | OK | Единственный прямой API в `OwnerStockPage:122`, путь приходит пропсом |

### 3.5 Reports (`5547-5943`, экспорт-мастер `2719-2830`, модалка `8600+`)

| Функция | Вердикт | Доказательство |
|---|---|---|
| Скачать `GET /api/owner/exports/{kind}` (report/pdf/piggy-bank), отправить `POST .../telegram`, сводка `POST /api/owner/reports/{period}/{segment}/telegram` | OK (бэк) / NOT-VERIFIED (открыть файл глазами) | Роуты есть, drift чист, Decimal-склад не роняет. Сам xlsx/pdf не открывал — в отчете честно |
| Мастер экспорта (segment/period/date) | OK | Состояния `exportModalKind/Step/Segment/Period` живые; `setReportDateFrom/To:826-827` — **DEAD** (setтеры нигде не вызываются), период берется из `exportModal*`/`reportDateFrom/To`-значений без сеттеров —via начальные значения. Не роняет, но код врет |
| `piggyBankExport` через тот же механизм | OK | `kind='piggy-bank'` резолвится |

### 3.6 Piggy-bank (`5516-5546` → `OwnerPiggyBankScreen.tsx`, загрузчики `1316-1500`)

| Функция | Вердикт | Доказательство |
|---|---|---|
| Баланс+транзакции `GET /api/owner/piggy-bank`, withdraw (`piggy|own`), adjust, delete ручной (системный `deposit_24percent` — запрет) | OK | **39 passed, 1 skipped** (adjust/withdraw/idempotency/income/wallet). Идемпотентность и запрет удаления системных доказаны тестами |
| Табы all/wash/detailing, сводки мойка/детейлинг, running-balance, «кто брал» | OK | Презентер читает пропсы, пустое `Нет операций:450` штатно |
| `piggyBank.archives:9020-9021` | BROKEN (типы) | **tsc TS2339: `archives` нет в `PiggyBankData`**. Ветка архивов в копилке никогда не отрендерится по типам (в JS `undefined` → просто скроется). Либо тип устарел, либо фича мертва |
| `washRevenue/detailingRevenue/washExpenses/...:1670-1685` | DEAD | 6 переменных посчитаны и нигде не показаны. Финансовая разбивка в коде есть, в UI нет |

### 3.7 Wallet (`5492-5515` → `OwnerWalletScreen.tsx`, `loadWallet:1333`) | OK |

| Доходы `POST /api/owner/incomes`, расходы `POST /api/expenses`, правки `PATCH`, архив недель | OK | Презентер без прямых API, все через пропсы; бэк `test_income_endpoints` + `test_wallet_query_budget` зеленые (в пачке 39 passed). Пустые `Нет доходов/расходов:138,173` штатно |
| Права accountant (доход — только owner) | OK (код) | `OwnerWalletScreen:74` + `route_matrix`: incomes `session+admin/owner`, expenses `session+accountant/owner`. Обход через deep-link невозможен на бэке |
| `editExpenseForm/editIncomeForm.resourceGroup:2630,2692`, wallet expense `resourceGroup:9249` | BROKEN (типы) | **tsc TS2353: `resourceGroup` нет в типах форм**. В рантайме поле уйдет в `undefined` → разрез wash/detailing для ручных операций может молча не сохраняться. Проверить вручную следующим шагом |

### 3.8 Clients (`7335-7366` → `OwnerClientsScreen.tsx`)

| Функция | Вердикт | Доказательство |
|---|---|---|
| Реестр+поиск phone/name/plate, карточка, история, создание/удаление/карточка через колбэки | OK (с оговоркой типов) | Прямых API нет, все через `addClient/deleteClient/updateClientCard`. `OwnerClientsScreen:386` **tsc: string → PlateType** + `glass`-проп `745` (см. ниже). Поиск по нормализованному телефону `630` жив |
| Черновики `clientCardDrafts`, `selectedSettingsClient*:4034-4082` | DEAD | ~8 переменных в OwnerApp посчитаны и не показаны (tsc+eslint). Карточка реально рисуется в `OwnerClientsScreen`, дубли в родителе — мертвый груз |
| Псевдо-вкладка `clients` в таб-баре | DUPLICATE | `8573-8576`: ведет в `settings+clients`. Имеет смысл для UX, но в коде два пути к одному экрану — зафиксировать как осознанный дубликат |

### 3.9 Settings-база: company/schedule/boxes/services (`7271-7551`)

| Функция | Вердикт | Доказательство |
|---|---|---|
| `saveOwnerCompany/saveSchedule/saveBoxes/saveServices` → `PUT /api/settings/*` | OK (код+роуты) / NOT-VERIFIED (клик) | Роуты в матрице `session+admin/owner`, дрейфа нет. Точечных тестов записи настроек в этом прогоне не гонял (есть `test_v1_gaps` частично — 25 passed) |
| Превью сплита `serviceMoneySummary/previewServiceSplit:510-621` | OK | Формула `materials→master→piggy→owners` одна на странице, pipeline-кастом жив |
| `ownerDefaultBoxForService:329`, `ownerPaymentLabel:623` | DEAD | Ни одного вызова (tsc+eslint). Мертвые хелперы |

### 3.10 Settings-люди: employees/shift (`7552-7675`, `6246-6393`)

| Функция | Вердикт | Доказательство |
|---|---|---|
| Найм/увольнение/сброс пароля/настройки `%`, `setOwnerMasterRole`, `changePassword` | OK | `hireWorker POST /api/workers`, `fireWorker DELETE`, `resetWorkerPassword`, бэк `test_owner_masters` зеленое |
| Открытие смены `POST /api/owner/shift-openings`, посещаемость `GET /api/owner/shift-attendance`, `GET .../{worker_id}/shift-attendance`, таблицы `AttendanceTable` | OK | **25 passed** (attendance+security+gaps). Фронт `AttendanceTable:47` дергает правильный роут. Орфан `GET .../{worker_id}/shift-attendance` без прямого вызывателя фронта — легитимен (адресный просмотр), не мертв |
| `newVehicleCar/newVehiclePlate:1077-1078`, `ownerNewBookingSelectableDates:3478` | DEAD | Нигде не читаются |

### 3.11 Settings-деньги: finance/money-flow/bookings-history/archive (`8298-8552`, `5944-6904`)

| Функция | Вердикт | Доказательство |
|---|---|---|
| `GET /api/owner/money-flow`, `GET .../bookings-history(+/totals)`, `GET .../archive`, детализация записи `6582-6904` | OK | **32 passed** (money_flow+split) + **11 passed** (archive) + **14 passed** (percent/subtract/orphan). Двойного учета нет (money-flow `in/allocation/out/move`), периоды/статусы/поиск живые |
| `GET+PUT /api/owner/bookings/{id}/money-split`, сброс к авто | OK | Фронт PUT == бэк PUT (`2440,2474` vs `21989`), дрейфа нет. Сохранение/сброс с тостами, `fetchBookingsHistory` после |
| `GET /api/owner/outsource/payroll` | DEAD (фронт) / OK (бэк) | Бэк считает верно (`test_orphan_endpoints 2/2`). Фронт: `outsourcePayroll/setOutsourcePayroll:922` **никогда не сеттится** — состояние всегда null, UI с ним не связан. Фича бэка без UI |
| Архивные таблицы `shiftPayTotal/shiftCount:6480-6481,7224` | DEGRADED | Те же отсутствующие поля типов, что в payroll. Цифры смен в архиве/истории под вопросом |
| `ArchiveAdditionalServiceItem.isOutsource/outsourceAmount:7105` | BROKEN (типы) | **tsc TS2339**: архивный рендер аутсорса обращается к полям, которых нет в типе. В JS даст undefined → `(аутсорс: 0 ₽)` вместо правды |

### 3.12 Settings-остальное: notifications/content/security/database-reset

| Функция | Вердикт | Доказательство |
|---|---|---|
| Уведомления `saveOwnerNotificationSettings`, контент `saveContent(ContentEditor)`, безопасность `saveOwnerSecurity/changePassword` | OK (код) / NOT-VERIFIED (клик) | Роуты owner-only в матрице, дрейфа нет |
| Сброс БД `POST /api/owner/database-reset/start|approve|execute` | OK (код) / NOT-VERIFIED (рантайм запрещен) | Прочитан `main.py:8391-8520`: пароль + TG-код 6 цифр + hash+HMAC + TTL + фраза + `finalizeAfter`-задержка + `requestId`-связка. Выглядит правильно. Исполнять нельзя — только на скретч-БД отдельной задачей |
| Пункт меню `reports` | DUPLICATE | `6228`: ведет в `page='reports'`, а не в секцию. Осознанный шорткат, зафиксировать |
| Описания меню | STATIC-STUB | `6207 'ATMOSFERA · ИП Иванов'` захардкожено (рядом `7281` плейсхолдер `ИП Иванов И.И.`), `6224 '2FA включена'` всегда включена, `6220 'Telegram, Email'` статично. Остальные desc живые (счетчики боксов/услуг/мастеров/клиентов) |
| SESS-001 комментарий `8284` | INFO | Мертвое напоминание, кода сессий рядом нет. Не баг |

## 4. Контракт фронт↔бэк (по данным route_matrix + api_drift от 08.09)

* Вызовов фронта 109, роутов 140: **broken=0, method_mismatch=0**. Все пути резолвятся.
* Орфаны без вызывателей фронта (20) — для owner значимы 3: `GET /api/owner/outsource/payroll` (бэк OK, фронта нет — см. DEAD выше), `GET /api/owner/workers/{id}/shift-attendance` (легитимен), `GET /api/owner/integrations/google/callback` (вне scope). Остальное — auth/cron/debug/health/uploads (по дизайну или за CRON_SECRET/owner-гейтом).
* Динамика (8): `piggy-bank`, `wallet`, `exports/{kind}`, `database-reset/*` собраны в переменные — проверены вручную выше, резолвятся.
* Auth: все owner-роуты `session+owner(/accountant/admin)`; явных OPEN в owner-зоне нет.

## 5. Типы/линт — что реально сломано (не чинилось, только зафиксировано)

* `npx tsc --noEmit` → exit 2. Критичные для владельца:
  1. `OwnerApp.tsx:85` — `PayrollEntry` без импорта (TS2304).
  2. `WorkerPayrollSummary.shiftPayTotal/shiftCount` — нет в типе (`4818,4819,5040,6480,7224`, TS2339).
  3. `BookingCreateInput` требует `services/additionalServices/materials/materialsWrittenOff` (`3439,3580`, + AdminApp/ClientApp аналогично, TS2345).
  4. `bookingForm.isOutsource/outsourceAmount` нет в типе формы (`3453,3460,9558-9573`, TS2339).
  5. `setBookingForm` без `plateType/referralSource/isRepeatVisit` (`3293,3324`, TS2345) + `PlateType` из string (`9444,11015`, `OwnerClientsScreen:386`).
  6. `ServiceSearchSelect glass` — пропа нет в пропсах, передается в 8 местах (`9481,10193,10565,11037` + AdminApp/ClientsScreen, TS2322/TS2345).
  7. `PiggyBankData.archives` (`9020`), `ArchiveAdditionalServiceItem.isOutsource` (`7105`), `googleSyncResult.lastSyncAt/errorDetails` (`7966-7971`, вне scope но в том же файле), `Expense/Income resourceGroup` (`2630,2692,9249`), `ownerSalary owners amount` — TS2339/TS2353.
  8. `AppContext.tsx:1480-1596` — bootstrap без `stockCategories` (6× TS2345).
* `eslint owner` → 9 errors: 4× `react-hooks/exhaustive-deps` (правило не найдено — плагин не установлен, эффекты непроверяемы), 2× `no-empty` (`3137,9817` — глотание ошибок), 2× `no-irregular-whitespace` (`8332`), + 52 warnings `no-unused-vars` (полный список в выводе команды).
* `ruff app` → 103: DTZ-пакет осознан (F-013), к рассмотрению при чинке: BLE001 ×11 (слепые except), SIM103/SIM102, S110 ×3, F841, PLR0124, RUF046/059, B010, F541.

## 6. Ценность: что удалить/объединить/оживить (без правок в этой задаче)

| Кандидат | Рекомендация | Почему |
|---|---|---|
| `outsourcePayroll` состояние + orphan UI | Оживить (прикрутить к `GET /api/owner/outsource/payroll`) или удалить состояние | Бэк готов и протестирован, фронта нет — деньги аутсорса невидимы |
| `boxLoadData`, `workerEfficiencyData`, `washRevenue/*`, `filteredSettingsClients*`, `selectedSettingsClient*`, `newVehicle*`, `ownerNewBookingSelectableDates`, `parentCategories`, `setReportDateFrom/To` | Удалить | Мертвый груз в God-component, вводит в заблуждение при чтении |
| `ownerDefaultBoxForService`, `ownerPaymentLabel`, `FIXED_MASTER_EARNED`, `isClientCardIncomplete`, `apiBlobUrl` (в OwnerApp), `ContentData/StockWriteOff` типы | Удалить импорты/хелперы или использовать | Импортировано, не используется |
| `clients`-псевдовкладка, `reports`-пункт меню | Оставить как осознанные шорткаты, пометить комментарием | UX-ценность есть, путаница для разработчиков — задокументировать |
| `desc` company/notifications/security | Оживить: company из `settings.ownerCompany`, security из факта 2FA, notifications из настроек | Сейчас врут (ИП Иванов, всегда включена) |
| Копии типов Wallet/Piggy в screens | Унифицировать в `AppContext` или `owner/types.ts` | Рассинхрон уже виден (`archives`) |
| `ServiceSearchSelect glass` | Унифицировать пропсы (добавить `glass` или убрать везде) | 8 мест передачи несуществующего пропа |
| `BookingCreateInput` vs фактические payload | Привести типы к реальности (опциональные `services/additionalServices/materials`) или слать полные объекты | Типы врут везде, не только у владельца |

## 7. Риски и что не покрыто

* Главный риск — **типы врут, сборка проходит**: vite/esbuild не тайпчекает, поэтому ~70 tsc-ошибок в owner-зоне не останавливают прод. Рантайм это переживает через `undefined`/лишние поля, но цифры смен (`shiftPayTotal`), архивы копилки (`archives`), аутсорс в архиве и `resourceGroup` ручных финансов могут молча врать.
* Монолит 12 339 строк + 264 `useState` + 0 `useMemo` + двойные формулы owner/admin — любое исправление типов/формул делать точечно с регрессией из §2.
* Не покрыто (честно): живой UI-проход, TG-доставка, `database-reset/execute`, депозиты, Google, открытие xlsx/pdf глазами, `test_payroll_date_migration` отдельно не выводился (шел в пачке 14 passed).
* Грязное дерево (`complaints.py`, `security.py`, `_tmp_*`, `.pytest_full.err`, `.main-debt-parked.patch`) — не мое, не трогал.

## 8. Следующие шаги для чинки (отдельной задачей)

1. Типы P0: `PayrollEntry` импорт, `WorkerPayrollSummary.shiftPayTotal/shiftCount`, `PiggyBankData.archives`, `ArchiveAdditionalServiceItem.isOutsource`, `bookingForm.isOutsource`, `Expense/Income resourceGroup`, `ServiceSearchSelect glass`, `AppContext stockCategories`. После каждого — `npx tsc --noEmit` + точечный pytest из §2.
2. Решение по `outsourcePayroll`: либо экран/блок, либо удалить состояние.
3. Оживить `desc` меню, удалить мертвые переменные (список §6), поставить `eslint-plugin-react-hooks`.
4. Ручной smoke по §3 (особенно wallet-`resourceGroup`, смены в payroll/архиве, архивы копилки) + открыть xlsx/pdf.
5. `database-reset/execute` — только на скретч-БД с бекапом `backend/data/crm.sqlite3`.

---
*Файл отчета: `audit/reports/owner_audit_2026-09-08.md`. Исправлений кода в рамках аудита не вносилось.*
