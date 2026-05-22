# Design Document: Edit Finance Entries

## Overview

Фича добавляет возможность редактирования существующих финансовых записей (расходов и доходов) в CRM-системе автомойки/детейлинга. Сейчас записи можно только создавать и просматривать — исправить ошибку в сумме, категории, дате или описании без удаления и повторного создания невозможно.

Решение состоит из двух частей:
1. **Backend**: два новых PATCH-эндпоинта — `PATCH /api/expenses/{id}` и `PATCH /api/owner/incomes/{id}` — с частичным обновлением (Partial Update) и полной валидацией.
2. **Frontend**: модальная форма редактирования в `OwnerApp.tsx`, предзаполненная текущими значениями, с обновлением локального состояния через `AppContext`.

---

## Architecture

```mermaid
graph TD
    subgraph Frontend [React / TypeScript]
        OA[OwnerApp.tsx]
        AC[AppContext.tsx]
        EF[EditFinanceModal]
    end

    subgraph Backend [FastAPI]
        EP[PATCH /api/expenses/{id}]
        IP[PATCH /api/owner/incomes/{id}]
        AUTH[_require_session / _ensure_staff_role]
        DB[(SQLite / PostgreSQL)]
    end

    OA -->|открывает| EF
    EF -->|updateExpense / updateIncome| AC
    AC -->|PATCH fetch| EP
    AC -->|PATCH fetch| IP
    EP --> AUTH
    IP --> AUTH
    AUTH --> DB
    EP -->|ExpensePayload| AC
    IP -->|IncomePayload| AC
    AC -->|setExpenses / setIncomes| OA
```

Архитектурный подход — минимальное расширение существующих слоёв без введения новых абстракций:
- Новые эндпоинты следуют тому же паттерну, что `PATCH /api/bookings/{booking_id}` и `PATCH /api/stock-items/{item_id}`.
- Новые функции `updateExpense` / `updateIncome` в `AppContext` следуют паттерну `addExpense` / `addIncome`.
- Модальная форма редактирования следует паттерну существующих модалей в `OwnerApp.tsx` (bottom sheet, `AnimatePresence`, `motion/react`).

---

## Components and Interfaces

### Backend

#### Новые Pydantic-схемы (`schemas.py`)

```python
class ExpenseUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    amount: int | None = Field(default=None, ge=1, le=10_000_000)
    category: str | None = Field(default=None, max_length=100)
    date: str | None = None          # DD.MM.YYYY
    note: str | None = Field(default=None, max_length=1000)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("title не может быть пустым или состоять только из пробелов")
        return stripped

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):
            raise ValueError("date должна быть в формате DD.MM.YYYY")
        return value

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> "ExpenseUpdateRequest":
        if all(v is None for v in [self.title, self.amount, self.category, self.date, self.note]):
            raise ValueError("Необходимо передать хотя бы одно поле для обновления")
        return self


class IncomeUpdateRequest(BaseModel):
    amount: int | None = Field(default=None, ge=1, le=10_000_000)
    source: str | None = Field(default=None, min_length=1, max_length=255)
    note: str | None = Field(default=None, max_length=1000)  # явный null очищает поле
    date: str | None = None          # DD.MM.YYYY

    @field_validator("source")
    @classmethod
    def validate_source(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("source не может быть пустым или состоять только из пробелов")
        return stripped

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):
            raise ValueError("date должна быть в формате DD.MM.YYYY")
        return value

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> "IncomeUpdateRequest":
        if all(v is None for v in [self.amount, self.source, self.note, self.date]):
            raise ValueError("Необходимо передать хотя бы одно поле для обновления")
        return self
```

> **Примечание по `note` в `IncomeUpdateRequest`**: поле `note` объявлено как `str | None`. Если клиент передаёт `"note": null` — поле очищается. Если поле не передаётся вовсе — оно не изменяется. Это различие реализуется через `model_fields_set` в обработчике эндпоинта.

#### Новые эндпоинты (`main.py`)

```python
@app.patch("/api/expenses/{expense_id}", response_model=ExpensePayload)
def update_expense(
    expense_id: str,
    payload: ExpenseUpdateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> ExpensePayload:
    _ensure_staff_role(session_data, {"owner", "accountant"})
    expense = db.get(Expense, expense_id)
    if expense is None:
        raise HTTPException(status_code=404, detail="Расход не найден")
    if payload.title is not None:
        expense.title = payload.title
    if payload.amount is not None:
        expense.amount = payload.amount
    if payload.category is not None:
        expense.category = payload.category
    if payload.date is not None:
        expense.date = payload.date
    if "note" in payload.model_fields_set:
        expense.note = payload.note
    db.commit()
    db.refresh(expense)
    return _expense_payload(expense)


@app.patch("/api/owner/incomes/{income_id}", response_model=IncomePayload)
def update_income(
    income_id: str,
    payload: IncomeUpdateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> IncomePayload:
    _ensure_staff_role(session_data, {"owner"})
    income = db.get(Income, income_id)
    if income is None:
        raise HTTPException(status_code=404, detail="Доход не найден")
    if payload.amount is not None:
        income.amount = payload.amount
    if payload.source is not None:
        income.source = payload.source
    if "note" in payload.model_fields_set:
        income.note = payload.note
    if payload.date is not None:
        income.date = payload.date
    db.commit()
    db.refresh(income)
    return IncomePayload(
        id=income.id,
        amount=income.amount,
        source=income.source,
        note=income.note,
        createdById=income.created_by_id,
        date=income.date,
        createdAt=income.created_at,
    )
```

### Frontend

#### Расширение `AppContext.tsx`

Добавить два новых метода в интерфейс контекста и их реализацию:

```typescript
// В интерфейс AppContextValue:
updateExpense: (id: string, patch: Partial<Omit<Expense, 'id'>>) => Promise<void>;
updateIncome: (id: string, patch: Partial<Omit<Income, 'id'>>) => Promise<void>;

// Реализация:
async function updateExpense(id: string, patch: Partial<Omit<Expense, 'id'>>) {
  const updated = await apiRequest<Expense>(`/api/expenses/${id}`, {
    method: 'PATCH',
    body: patch,
  });
  setExpenses((current) => current.map((e) => (e.id === id ? updated : e)));
}

async function updateIncome(id: string, patch: Partial<Omit<Income, 'id'>>) {
  const updated = await apiRequest<Income>(`/api/owner/incomes/${id}`, {
    method: 'PATCH',
    body: patch,
  });
  setIncomes((current) => current.map((i) => (i.id === id ? updated : i)));
}
```

#### Новый компонент `EditFinanceModal` в `OwnerApp.tsx`

Модальная форма реализуется как bottom sheet (аналогично `showAddExpense` / `showAddIncome`) с использованием `AnimatePresence` и `motion/react`. Состояние:

```typescript
// Новые state-переменные в OwnerApp:
const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
const [editingIncome, setEditingIncome]   = useState<Income | null>(null);
const [editFinanceLoading, setEditFinanceLoading] = useState(false);
const [editFinanceError, setEditFinanceError]     = useState<string | null>(null);
const [editExpenseForm, setEditExpenseForm] = useState({
  title: '', amount: '', category: '', date: '', note: '',
});
const [editIncomeForm, setEditIncomeForm] = useState({
  amount: '', source: '', note: '', date: '',
});
```

Открытие формы:
```typescript
function openEditExpense(expense: Expense) {
  setEditingExpense(expense);
  setEditExpenseForm({
    title: expense.title,
    amount: String(expense.amount),
    category: expense.category,
    date: expense.date,
    note: expense.note ?? '',
  });
  setEditFinanceError(null);
}

function openEditIncome(income: Income) {
  setEditingIncome(income);
  setEditIncomeForm({
    amount: String(income.amount),
    source: income.source,
    note: income.note ?? '',
    date: income.date,
  });
  setEditFinanceError(null);
}
```

Кнопка редактирования добавляется в карточки расходов и доходов в Finance Panel:
- Для `owner` и `accountant` — рядом с каждой записью Expense.
- Только для `owner` — рядом с каждой записью Income.

---

## Data Models

### Существующие модели (без изменений)

**`Expense`** (`expenses` table):
| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | `String(64)` | PK |
| `title` | `String(255)` | NOT NULL |
| `amount` | `Integer` | NOT NULL, ≥ 1 |
| `category` | `String(120)` | NOT NULL |
| `date` | `String(16)` | NOT NULL, формат DD.MM.YYYY |
| `note` | `Text` | nullable |
| `created_at` | `DateTime` | NOT NULL |

**`Income`** (`incomes` table):
| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | `String(64)` | PK |
| `amount` | `Integer` | NOT NULL, ≥ 1 |
| `source` | `String(255)` | NOT NULL |
| `note` | `Text` | nullable |
| `created_by_id` | `String(64)` | FK → staff_users.id |
| `date` | `String(16)` | NOT NULL, формат DD.MM.YYYY |
| `created_at` | `DateTime` | NOT NULL |

Миграции базы данных не требуются — схема таблиц не изменяется.

### Новые Pydantic-схемы

| Схема | Назначение |
|-------|-----------|
| `ExpenseUpdateRequest` | Тело PATCH /api/expenses/{id} |
| `IncomeUpdateRequest` | Тело PATCH /api/owner/incomes/{id} |

Ответы используют существующие `ExpensePayload` и `IncomePayload`.

### Расширение TypeScript-интерфейсов

Интерфейсы `Expense` и `Income` в `AppContext.tsx` не изменяются. Добавляются только два новых метода в контекст.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Partial Update сохраняет неизменённые поля Expense

*For any* записи Expense и любого непустого подмножества допустимых полей с валидными значениями, после успешного PATCH-запроса обновлённые поля должны содержать новые значения, а все остальные поля — сохранить исходные значения.

**Validates: Requirements 1.1, 1.7**

### Property 2: Partial Update сохраняет неизменённые поля Income

*For any* записи Income и любого непустого подмножества допустимых полей с валидными значениями, после успешного PATCH-запроса обновлённые поля должны содержать новые значения, а все остальные поля — сохранить исходные значения.

**Validates: Requirements 2.1, 2.6**

### Property 3: Невалидный amount отклоняется для обоих типов записей

*For any* значения `amount` вне диапазона [1, 10 000 000] (включая ноль, отрицательные числа и числа > 10 000 000), PATCH-запрос к `/api/expenses/{id}` или `/api/owner/incomes/{id}` должен возвращать статус 422, не изменяя запись в базе данных.

**Validates: Requirements 1.2, 2.2**

### Property 4: Невалидный формат date отклоняется

*For any* строки, не соответствующей формату `DD.MM.YYYY` (включая пустые строки, ISO-формат, произвольные строки), PATCH-запрос с таким значением `date` должен возвращать статус 422.

**Validates: Requirements 1.4**

### Property 5: Несуществующий ID возвращает 404

*For any* строки-идентификатора, которой нет в таблице `expenses` или `incomes`, PATCH-запрос должен возвращать статус 404.

**Validates: Requirements 1.5, 2.4**

### Property 6: Недопустимая роль возвращает 403

*For any* роли пользователя из множества `{client, worker, admin}` при запросе к `/api/expenses/{id}`, и *for any* роли из `{client, worker, admin, accountant}` при запросе к `/api/owner/incomes/{id}`, PATCH-запрос должен возвращать статус 403.

**Validates: Requirements 1.6, 2.5, 5.6**

### Property 7: Форма редактирования предзаполняется текущими значениями

*For any* записи Expense или Income, при открытии формы редактирования каждое поле формы должно содержать текущее значение соответствующего поля записи.

**Validates: Requirements 3.1, 3.2**

### Property 8: Успешное обновление синхронизирует локальный список

*For any* записи Expense или Income, успешно обновлённой через PATCH, соответствующая запись в локальном состоянии (`expenses` / `incomes` в AppContext) должна отражать новые значения всех обновлённых полей.

**Validates: Requirements 4.1, 4.2**

### Property 9: Ошибка API не изменяет локальный список

*For any* PATCH-запроса, завершившегося ошибкой (4xx или 5xx), локальный список записей в AppContext должен остаться идентичным состоянию до отправки запроса.

**Validates: Requirements 4.5**

### Property 10: Кнопка редактирования отображается только для авторизованных ролей

*For any* списка записей Expense, кнопка редактирования должна присутствовать в DOM тогда и только тогда, когда текущая роль пользователя — `owner` или `accountant`. *For any* списка записей Income, кнопка редактирования должна присутствовать в DOM тогда и только тогда, когда текущая роль — `owner`.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

---

## Error Handling

### Backend

| Ситуация | HTTP-статус | Описание |
|----------|-------------|----------|
| Отсутствует или невалидный Bearer-токен | 401 | `_require_session` выбрасывает исключение |
| Сессия отозвана или не найдена | 401 | `_require_session` выбрасывает исключение |
| Роль пользователя не имеет доступа | 403 | `_ensure_staff_role` выбрасывает исключение |
| Запись не найдена по ID | 404 | `db.get()` вернул `None` |
| Ошибка валидации полей | 422 | Pydantic автоматически формирует ответ с деталями |
| Пустое тело запроса | 422 | `model_validator` проверяет наличие хотя бы одного поля |

Формат ответа 422 от FastAPI/Pydantic:
```json
{
  "detail": [
    {
      "loc": ["body", "amount"],
      "msg": "Input should be greater than or equal to 1",
      "type": "greater_than_equal"
    }
  ]
}
```

### Frontend

Обработка ошибок в `EditFinanceModal`:

- **422 с полевыми ошибками**: парсить `detail` из ответа, сопоставлять `loc[1]` с именем поля формы, отображать ошибку рядом с полем. Если поле не идентифицировано — показывать общее сообщение.
- **404**: показывать общее сообщение «Запись не найдена. Возможно, она была удалена.»
- **500 и другие**: показывать общее сообщение «Не удалось сохранить изменения. Попробуйте ещё раз.»
- **Сетевая ошибка**: показывать «Нет соединения с сервером.»

Во всех случаях ошибки форма не закрывается, кнопка «Сохранить» разблокируется.

Клиентская валидация (до отправки запроса):
- `date`: проверка регулярным выражением `/^\d{2}\.\d{2}\.\d{4}$/` — аналогично существующей логике в `handleAddExpense`.
- `amount`: проверка что значение — число в диапазоне [1, 10 000 000].
- `title` / `source`: проверка что строка не пустая после trim.

---

## Testing Strategy

### Unit-тесты (pytest, backend)

Тесты размещаются в `backend/tests/test_finance_edit.py`. Используется существующий паттерн из `test_income_endpoints.py`.

**Примеры тестов:**
- `test_patch_expense_updates_only_provided_fields` — обновить только `amount`, проверить что `title`, `category`, `date`, `note` не изменились.
- `test_patch_expense_returns_404_for_unknown_id` — передать несуществующий ID.
- `test_patch_expense_returns_422_for_empty_body` — передать пустой JSON `{}`.
- `test_patch_expense_returns_403_for_worker_role` — выполнить запрос с токеном worker.
- `test_patch_income_returns_403_for_accountant_role` — accountant не может редактировать доходы.
- `test_patch_income_clears_note_when_null_passed` — передать `"note": null`, проверить что поле очищено.

### Property-тесты (Hypothesis, backend)

Используется библиотека [Hypothesis](https://hypothesis.readthedocs.io/) (уже присутствует в экосистеме Python). Каждый тест запускается минимум 100 итераций.

Тесты размещаются в `backend/tests/test_finance_edit_properties.py`.

```python
# Feature: edit-finance-entries, Property 1: Partial Update сохраняет неизменённые поля Expense
@given(
    title=st.text(min_size=1, max_size=255).filter(lambda s: s.strip()),
    amount=st.integers(min_value=1, max_value=10_000_000),
    category=st.text(min_size=1, max_size=100).filter(lambda s: s.strip()),
    date=st.dates().map(lambda d: d.strftime("%d.%m.%Y")),
    new_amount=st.integers(min_value=1, max_value=10_000_000),
)
@settings(max_examples=100)
def test_patch_expense_partial_update_preserves_other_fields(
    title, amount, category, date, new_amount
):
    # Создать Expense, обновить только amount, проверить остальные поля
    ...
```

```python
# Feature: edit-finance-entries, Property 3: Невалидный amount отклоняется
@given(amount=st.one_of(st.integers(max_value=0), st.integers(min_value=10_000_001)))
@settings(max_examples=100)
def test_patch_expense_invalid_amount_returns_422(amount):
    ...
```

```python
# Feature: edit-finance-entries, Property 4: Невалидный формат date отклоняется
@given(date=st.text().filter(lambda s: not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", s)))
@settings(max_examples=100)
def test_patch_expense_invalid_date_returns_422(date):
    ...
```

```python
# Feature: edit-finance-entries, Property 5: Несуществующий ID возвращает 404
@given(expense_id=st.uuids().map(str))
@settings(max_examples=100)
def test_patch_expense_nonexistent_id_returns_404(expense_id):
    # Убедиться что ID не существует в тестовой БД
    ...
```

```python
# Feature: edit-finance-entries, Property 6: Недопустимая роль возвращает 403
@given(role=st.sampled_from(["client", "worker", "admin"]))
@settings(max_examples=50)
def test_patch_expense_forbidden_roles_return_403(role):
    ...
```

### Frontend-тесты (Vitest + React Testing Library)

Тесты размещаются в `frontend/src/app/components/owner/__tests__/EditFinanceModal.test.tsx`.

**Примеры тестов:**
- Форма предзаполняется значениями переданной записи (Property 7).
- При успешном ответе список обновляется (Property 8).
- При ошибке список не изменяется (Property 9).
- Кнопка редактирования отображается/скрывается в зависимости от роли (Property 10).
- Клиентская валидация даты отклоняет невалидные форматы.
- Индикатор загрузки блокирует повторную отправку.

### Интеграционные тесты

Существующий тест `test_income_endpoints.py` расширяется сценариями для PATCH-эндпоинтов. Проверяется сквозной сценарий: создать запись → обновить через PATCH → получить через GET → убедиться что данные совпадают.
