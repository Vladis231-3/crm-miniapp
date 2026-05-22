# Design Document: finance-payroll-fixes

## Overview

Три точечных улучшения финансового модуля CRM (FastAPI + React):

1. **Поле даты в формах расхода/дохода** — пользователь может указать произвольную дату вместо жёстко зафиксированного `todayLabel`.
2. **Расходы и доходы во всех отчётах** — корректное отображение в Excel/PDF-отчёте, Telegram-сводке и панели «Финансы».
3. **Расчёт ЗП мастеров по всем записям** — учёт всех завершённых записей без ограничений по дате создания.

Все три изменения затрагивают существующий код без изменения схемы БД: модели `Expense` и `Income` уже хранят поле `date` (строка `DD.MM.YYYY`), а `BookingWorker` уже содержит `percent`. Задача — устранить места, где эти данные игнорируются или не передаются.

---

## Architecture

Система состоит из двух слоёв:

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + TypeScript)                          │
│  OwnerApp.tsx — формы, FinancePanel, отображение списков│
└────────────────────────┬────────────────────────────────┘
                         │ REST API (JSON)
┌────────────────────────▼────────────────────────────────┐
│  Backend (FastAPI + SQLAlchemy)                         │
│  main.py — эндпоинты                                    │
│  exports.py — генерация Excel/PDF/Telegram-отчётов      │
│  models.py — ORM-модели (Expense, Income, Booking, …)   │
└─────────────────────────────────────────────────────────┘
```

Все три фикса изолированы: они не меняют схему БД, не добавляют новых эндпоинтов и не затрагивают логику записей или клиентов.

---

## Components and Interfaces

### 1. Frontend — формы расхода и дохода (`OwnerApp.tsx`)

**Текущее состояние:**
```typescript
// expenseForm не содержит поля date
const [expenseForm, setExpenseForm] = useState({
  title: '', amount: '', category: EXPENSE_CATEGORIES[0], note: ''
});

// date жёстко зафиксирована как todayLabel
addExpense({ title, amount, category: expenseForm.category, date: todayLabel, note: expenseForm.note });

// incomeForm не содержит поля date
const [incomeForm, setIncomeForm] = useState({ amount: '', source: '', note: '' });
```

**После изменений:**
```typescript
// Добавляем date в оба стейта, инициализируем todayLabel
const [expenseForm, setExpenseForm] = useState({
  title: '', amount: '', category: EXPENSE_CATEGORIES[0], note: '', date: todayLabel
});
const [incomeForm, setIncomeForm] = useState({
  amount: '', source: '', note: '', date: todayLabel
});

// Передаём выбранную дату
addExpense({ title, amount, category: expenseForm.category, date: expenseForm.date, note: expenseForm.note });
addIncome({ amount, source: incomeForm.source, note: incomeForm.note, date: incomeForm.date });
```

В JSX обеих форм добавляется поле `<input type="text" placeholder="ДД.ММ.ГГГГ" ...>` с валидацией формата перед сабмитом. При открытии формы `date` сбрасывается в `todayLabel`.

### 2. Frontend — FinancePanel (`OwnerApp.tsx`)

**Текущее состояние:**
```typescript
// profit не учитывает incomes
const profit = totalRevenue - totalExpenses;

// В списке расходов дата уже отображается (e.date), но incomes не отображаются
```

**После изменений:**
```typescript
// profit учитывает incomes
const totalIncomes = incomes.reduce((s, i) => s + i.amount, 0);
const profit = totalRevenue + totalIncomes - totalExpenses;
```

В FinancePanel добавляется секция «ДОХОДЫ» с отображением `i.date`, `i.source`, `i.note` для каждого дохода.

### 3. Backend — Telegram-сводка (`main.py` → `exports.py`)

**Текущее состояние:**
```python
# _owner_summary_report в main.py загружает expenses и incomes, но...
expenses = db.scalars(select(Expense).order_by(Expense.created_at.desc())).all()
incomes = db.scalars(select(Income).order_by(Income.created_at.desc())).all()
return build_owner_summary_report(
    company_name=...,
    bookings=bookings,
    services=services,
    # expenses и incomes НЕ передаются!
    period=period,
    segment=segment,
)
```

**После изменений:**
```python
return build_owner_summary_report(
    company_name=...,
    bookings=bookings,
    services=services,
    expenses=list(expenses),   # добавлено
    incomes=list(incomes),     # добавлено
    period=period,
    segment=segment,
)
```

Функция `build_owner_summary_report` в `exports.py` уже содержит логику фильтрации по периоду и расчёта прибыли — она просто не вызывалась с данными.

### 4. Backend — расчёт ЗП мастеров (`main.py`)

**Текущее состояние:**
```python
completed_bookings = (
    db.scalars(
        select(Booking)
        .options(joinedload(Booking.worker_links))
        .join(Booking.worker_links)
        .where(
            Booking.status == "completed",
            BookingWorker.worker_id.in_(worker_ids),
        )
        .order_by(Booking.date.desc(), Booking.time.desc(), Booking.created_at.desc())
    )
    .unique()
    .all()
)
```

Запрос уже корректен — он не ограничивает записи по дате. Проблема может быть в том, что `bookingItems` обрезается до 12 элементов при формировании `WorkerPayrollSummaryPayload`:
```python
bookingItems=booking_items[:12],  # только 12 последних записей в UI
```

Расчёт `accrued_from_bookings` производится по полному списку `booking_items` до обрезки, поэтому сумма корректна. Если проблема воспроизводится — нужно проверить, не применяется ли дополнительная фильтрация на уровне запроса или в `adjusted_booking_percent`.

---

## Data Models

Изменений в схеме БД нет. Используемые поля:

| Модель | Поле | Тип | Описание |
|--------|------|-----|----------|
| `Expense` | `date` | `String(16)` | Дата в формате `DD.MM.YYYY` |
| `Income` | `date` | `String(16)` | Дата в формате `DD.MM.YYYY` |
| `Booking` | `status` | `String(32)` | `"completed"` для завершённых |
| `BookingWorker` | `percent` | `Integer` | Процент мастера (0–40) |
| `BookingWorker` | `worker_id` | `String(64)` | FK на `StaffUser` |

Формат даты `DD.MM.YYYY` используется единообразно во всей системе. Валидация на фронтенде использует `parseFlexibleDate` из `utils/date.ts`, на бэкенде — `datetime.strptime(value, "%d.%m.%Y")`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Дата формы передаётся в запись

*For any* valid `DD.MM.YYYY` date string entered in the ExpenseForm or IncomeForm, submitting the form should result in the created record having `date` equal to the entered value — not `todayLabel` or any other default.

**Validates: Requirements 1.2, 1.3, 2.2, 2.3**

---

### Property 2: Невалидная дата блокирует сабмит

*For any* string that is not a valid `DD.MM.YYYY` date (empty string, wrong format, impossible date like `32.13.2024`), submitting the ExpenseForm or IncomeForm should not call `addExpense`/`addIncome` and the form should remain open.

**Validates: Requirements 1.4, 2.4**

---

### Property 3: Метрики экспорта корректны для любых данных

*For any* combination of completed bookings, expense records, and income records, the generated ExportReport (Excel or PDF) must satisfy:
- `"Расходы"` metric = `sum(e.amount for e in expenses)`
- `"Доп. доходы"` metric = `sum(i.amount for i in incomes)`
- `"Прибыль"` metric = `revenue + sum(incomes) − sum(expenses)`
- Every expense appears in `expense_rows` with its `date`, `title`, `category`, `amount`, `note`
- Every income appears in `income_rows` with its `date`, `source`, `amount`, `note`

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

---

### Property 4: Сводный отчёт фильтрует расходы/доходы по периоду

*For any* report period (`daily` or `weekly`) and any set of expenses and incomes with varying dates, `build_owner_summary_report` must:
- Include in the message only expenses whose `date` falls within the period
- Include in the message only incomes whose `date` falls within the period
- When either list is non-empty, display profit = `period_revenue + period_incomes − period_expenses`

**Validates: Requirements 4.1, 4.2, 4.3**

---

### Property 5: ЗП мастера учитывает все завершённые записи

*For any* worker and *for any* set of completed bookings linked to that worker (regardless of booking creation date), the `PayrollSummary` must satisfy:
- `completedBookings` = total count of linked completed bookings
- `accrued_from_bookings` = `sum(round(b.price * link.percent / 100) for each link)`
- Bookings not linked to the worker must not appear in that worker's summary

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

---

### Property 6: FinancePanel отображает корректные агрегаты

*For any* set of completed bookings, expenses, and incomes, the FinancePanel must display:
- Total expenses = `sum(e.amount for e in expenses)` (без фильтрации по дате)
- Total incomes = `sum(i.amount for i in incomes)` (без фильтрации по дате)
- Profit = `revenue + total_incomes − total_expenses`
- Each expense item shows `date`, `title`, `category`
- Each income item shows `date`, `source`, `note`

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

---

## Error Handling

| Сценарий | Обработка |
|----------|-----------|
| Пустая дата в форме расхода/дохода | Кнопка «Добавить» остаётся задизейблена; форма не закрывается |
| Невалидный формат даты (не `DD.MM.YYYY`) | Показывается inline-ошибка под полем; `addExpense`/`addIncome` не вызывается |
| `build_owner_summary_report` вызван без `expenses`/`incomes` | Параметры имеют дефолт `None`, функция обрабатывает `None` как пустой список — поведение не ломается |
| Мастер без завершённых записей | `accrued_from_bookings = 0`, `completedBookings = 0` — корректное нулевое состояние |
| Запись с `percent = 0` | `earned = round(price * 0 / 100) = 0` — запись считается, вклад нулевой |

---

## Testing Strategy

### Подход

Используется двойная стратегия: **unit-тесты** для конкретных примеров и граничных случаев, **property-based тесты** для универсальных свойств.

Для property-based тестирования используется библиотека **Hypothesis** (Python, уже присутствует в экосистеме проекта через pytest). Каждый property-тест запускается минимум **100 итераций**.

### Unit-тесты (pytest, backend)

- `test_expense_date_default` — POST `/api/expenses` без поля `date` возвращает 422
- `test_income_date_default` — POST `/api/owner/incomes` без поля `date` возвращает 422
- `test_summary_report_includes_expenses_incomes` — вызов `_owner_summary_report` с расходами/доходами в БД возвращает строку с суммами
- `test_payroll_summary_zero_percent` — мастер с `percent=0` считается в `completedBookings`, но `accrued_from_bookings=0`

### Property-тесты (Hypothesis, backend)

Каждый тест помечен комментарием:
`# Feature: finance-payroll-fixes, Property N: <text>`

**Property 3 — метрики экспорта:**
```python
# Feature: finance-payroll-fixes, Property 3: export metrics correctness
@given(
    expenses=st.lists(expense_strategy(), max_size=20),
    incomes=st.lists(income_strategy(), max_size=20),
    bookings=st.lists(completed_booking_strategy(), max_size=20),
)
def test_export_metrics_correctness(expenses, incomes, bookings):
    data = _build_export_data(owner=..., expenses=expenses, incomes=incomes, bookings=bookings, ...)
    metrics = {m.label: m.value for m in data.metrics}
    expected_expenses = sum(e.amount for e in expenses)
    expected_incomes = sum(i.amount for i in incomes)
    expected_revenue = sum(b.price for b in bookings)
    expected_profit = expected_revenue + expected_incomes - expected_expenses
    assert metrics["Расходы"] == _format_money(expected_expenses)
    assert metrics["Доп. доходы"] == _format_money(expected_incomes)
    assert metrics["Прибыль"] == _format_money(expected_profit)
```

**Property 4 — фильтрация по периоду:**
```python
# Feature: finance-payroll-fixes, Property 4: summary report period filtering
@given(
    expenses=st.lists(expense_with_date_strategy(), max_size=30),
    incomes=st.lists(income_with_date_strategy(), max_size=30),
    period=st.sampled_from(["daily", "weekly"]),
)
def test_summary_report_period_filtering(expenses, incomes, period):
    report = build_owner_summary_report(
        company_name="Test", bookings=[], services=[],
        expenses=expenses, incomes=incomes, period=period, segment="wash",
    )
    period_start, period_end, _ = _summary_period_bounds(period, datetime.now())
    in_period_expenses = [e for e in expenses if _in_period(e.date, period_start, period_end)]
    in_period_incomes = [i for i in incomes if _in_period(i.date, period_start, period_end)]
    if in_period_expenses:
        assert _format_money(sum(e.amount for e in in_period_expenses)) in report.message
    if in_period_incomes:
        assert _format_money(sum(i.amount for i in in_period_incomes)) in report.message
```

**Property 5 — ЗП мастера:**
```python
# Feature: finance-payroll-fixes, Property 5: payroll includes all completed bookings
@given(
    bookings=st.lists(completed_booking_with_worker_strategy(), min_size=1, max_size=50),
)
def test_payroll_all_bookings(bookings):
    worker_id = bookings[0].worker_links[0].worker_id
    summary = _compute_payroll_summary(worker_id, bookings)
    expected_count = sum(1 for b in bookings if any(l.worker_id == worker_id for l in b.worker_links))
    expected_accrued = sum(
        round(b.price * l.percent / 100)
        for b in bookings
        for l in b.worker_links
        if l.worker_id == worker_id
    )
    assert summary.completedBookings == expected_count
    assert summary.accrued_from_bookings == expected_accrued
```

### Frontend-тесты (Vitest + React Testing Library)

- `expenseForm.date` инициализируется `todayLabel` при открытии формы
- При изменении поля даты `handleAddExpense` вызывает `addExpense` с новой датой
- При пустой дате кнопка задизейблена
- FinancePanel отображает `profit = revenue + incomes - expenses`
- Каждый элемент списка расходов содержит `e.date`
- Каждый элемент списка доходов содержит `i.date`, `i.source`
