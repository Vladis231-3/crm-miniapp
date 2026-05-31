# План исправлений финансовых расчётов и экспорта

## Файл: `backend/app/exports.py`

### Fix 2: Добавить shift_pay_total в баланс работника (строка 881)

**Проблема:** Экспорт ownerId не считает оплату за смены (`shift_pay_total`), хотя worker-сводка в `main.py:1726` её считает.

**Решение:**
1. Добавить параметр `shift_pay_by_worker: dict[str, int] | None = None` в `build_owner_export` (строка 724) и `_build_export_data`
2. В строке 881, где считается `total_accrued`, добавить `+ shift_pay_by_worker.get(worker.id, 0)`
3. В `main.py:3361` — вычислить `shift_pay_by_worker` и передать в `build_owner_export`

```python
# exports.py строка 881 — ДО:
total_accrued = (
    earned
    + worker.salary_base
    + bonus_total
    + max(adjustment_total, 0)
)

# exports.py строка 881 — ПОСЛЕ:
total_accrued = (
    earned
    + worker.salary_base
    + shift_pay_by_worker.get(worker.id, 0)
    + bonus_total
    + max(adjustment_total, 0)
)
```

В `main.py:3361` перед вызовом `build_owner_export` вычислить:
```python
from datetime import date as _date
inspections = _admin_shift_inspections_state(db)
shift_pay_map = {}
for worker in workers:
    shift_count, _ = _compute_shift_attendance(inspections, worker.id, _date(2000, 1, 1), _date.today())
    shift_pay_map[worker.id] = shift_count * (getattr(worker, "salary_per_shift", 0) or 0)
```

---

### Fix 3: Использовать complaint-adjusted percent в summary export (строка 539)

**Проблема:** Summary export считает `earned = round(price * link.percent / 100)` без учёта жалоб.

**Решение:**
1. Добавить параметр `penalties: list[Penalty]` в `_build_owner_summary_export_data`
2. Построить `complaints_by_worker` (как в `_build_export_data` строка 840)
3. В строке 539 заменить `link.percent` на `adjusted_booking_percent(...)`

```python
# Строка 539 — ДО:
worker_row["earned"] += round(booking.price * link.percent / 100)

# Строка 539 — ПОСЛЕ:
worker_penalties = complaints_by_worker.get(worker_id, [])
percent = adjusted_booking_percent(
    link.percent, worker_penalties,
    date_value=booking.date, time_value=booking.time,
    fallback=booking.created_at,
)
worker_row["earned"] += round(booking.price * percent / 100)
```

---

### Fix 4: Рендерить income строки в Excel и PDF

**Проблема:** `income_rows` заполняются (строка 1000), но не рендерятся.

**Решение:**
1. В `_render_excel_report` (после строки 1069) добавить:
```python
_append_sheet(workbook, "Доп. доходы", ["Дата", "Источник", "Сумма", "Примечание"], data.income_rows, currency_cols={3})
```

2. В `_render_pdf_report` (после строки 1213) добавить:
```python
_pdf_section(story, section_style, font_name, "Доп. доходы", ["Дата", "Источник", "Сумма", "Примечание"], _format_rows(data.income_rows, currency_cols={3}))
```

---

### Fix 5: Добавить admin_review в rollups полного экспорта

**Проблема:** `admin_review` записи считаются в `total`, но не попадают ни в `completed`, ни в `active`, ни в `cancelled`.

**Решение:** Добавить ключ `"admin_review": 0` во все dict в `service_rollup` и `client_rollup`, и добавить elif:

В `service_rollup` (строка 808) — добавить `"admin_review": 0`
В `client_rollup` (строка 914) — добавить `"admin_review": 0`

После проверки `cancelled` (строка 826) добавить:
```python
elif booking.status == "admin_review":
    row["admin_review"] += 1
```

В `service_rows` (строка 830) и `client_rows` (строка 939) — добавить `row["admin_review"]` в вывод.

---

### Fix 6: Переименовать метрику summary export

**Проблема:** Summary «Начислено» ≠ full export «К выплате» — confusing.

**Решение:** Переименовать метрику в summary с `"Начислено"` на `"Заработано (% от услуг)"`, чтобы было понятно, что это не итоговая выплата.

---

### Fix 7: Учесть отрицательные балансы в total_payroll

**Проблема:** `total_payroll += max(0, balance)` — отрицательные балансы теряются.

**Решение:** Считать отдельно `total_positive` и `total_negative`, вывести обе метрики:
```python
if balance >= 0:
    total_payroll += balance
else:
    total_overpaid += abs(balance)
```
Добавить метрику `"К возврату (переплата)"` с `total_overpaid`.

---

## Файл: `main.py`

### Для Fix 2: Вычислить shift_pay_by_worker перед экспортом

В `_owner_export_file` (около строки 3361) перед вызовом `build_owner_export`:
```python
from datetime import date as _date
inspections = _admin_shift_inspections_state(db)
shift_pay_map = {}
for worker in workers:
    sc, _ = _compute_shift_attendance(inspections, worker.id, _date(2000, 1, 1), _date.today())
    shift_pay_map[worker.id] = sc * (getattr(worker, "salary_per_shift", 0) or 0)
```

И передать `shift_pay_by_worker=shift_pay_map` в `build_owner_export`.
