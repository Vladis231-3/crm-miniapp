# План: Зарплатное меню владельца

## Концепция

Новая страница в OwnerApp — детальный вид зарплаты конкретного мастера с фильтрацией по периодам, историей работ и функцией выплаты с автосозданием расхода в бюджете.

---

## Backend

### 1. Новые Pydantic-схемы (`schemas.py`)

```python
class SalaryDetailRequest(BaseModel):
    period: Literal["day", "week", "month", "all"] = "month"
    segment: Literal["all", "wash", "detailing"] = "all"

class SalaryDetailResponse(BaseModel):
    workerId: str
    workerName: str
    salaryBase: int
    salaryPerShift: int
    defaultPercent: int
    active: bool
    # Агрегаты за период
    totalEarned: int          # сумма заработка от записей за период
    totalPaid: int            # сумма выплат за период
    balanceToPay: int         # остаток к выплате
    completedBookingsCount: int
    shiftCount: int
    # Записи за период
    bookings: list[SalaryBookingItem]
    # История выплат за период
    payouts: list[SalaryPayoutItem]

class SalaryBookingItem(BaseModel):
    id: str
    date: str
    time: str
    service: str
    box: str
    price: int
    earned: int               # round(price * percent / 100)
    percent: int
    resourceGroup: str        # wash / detailing

class SalaryPayoutItem(BaseModel):
    id: str
    amount: int
    note: str
    createdAt: datetime
    createdBy: str            # имя владельца

class PaySalaryRequest(BaseModel):
    period: Literal["day", "week", "month", "all"] = "month"
    dateFrom: str | None = None   # DD.MM.YYYY
    dateTo: str | None = None     # DD.MM.YYYY
    segment: Literal["all", "wash", "detailing"] = "all"
    amount: int = Field(ge=1, le=10_000_000)
    note: str = ""

class PaySalaryResponse(BaseModel):
    message: str
    payoutId: str
    newBalance: int
    expenseId: str
```

### 2. Новые API-эндпоинты (`main.py`)

#### `GET /api/owner/workers/{worker_id}/salary-detail`

Логика:
1. Проверка роли owner
2. Получение worker из StaffUser
3. Определение диапазона дат по `period`:
   - day → сегодня 00:00 — завтра 00:00
   - week → понедельник этой недели — следующий понедельник
   - month → 1 число текущего месяца — 1 число следующего месяца
   - all → от минимальной даты записей до現在
4. Получение завершённых записей worker_id, date в диапазоне
5. Фильтрация по segment (если не "all") — через service.resource_group
6. Расчёт earned для каждой записи с учётом жалоб
7. Получение PayrollEntry (payout) за период
8. Формирование SalaryDetailResponse

#### `POST /api/owner/workers/{worker_id}/pay-salary`

Логика:
1. Проверка роли owner
2. Валидация worker существует и role == "worker"
3. Создание PayrollEntry:
   - kind = "payout"
   - amount = payload.amount
   - note = payload.note или auto-generated
4. Создание Expense:
   - title = f"Зарплата: {worker.name}"
   - amount = payload.amount
   - category = "Зарплата"
   - date = сегодня DD.MM.YYYY
   - resource_group = определён по сегменту (wash / detailing)
5. commit
6. Ответ с обновлённым балансом

### 3. Определение resource_group для выплаты

Если `segment == "all"` → `resource_group = "wash"` (по умолчанию основной бюджет)
Если `segment == "wash"` → `resource_group = "wash"`
Если `segment == "detailing"` → `resource_group = "detailing"`

---

## Frontend

### Новая страница в OwnerApp.tsx

Добавить новое значение `page` — `'salary-detail'` и состояние `selectedWorkerId`.

#### Состояние:
```typescript
const [salaryDetail, setSalaryDetail] = useState<SalaryDetailResponse | null>(null);
const [salaryPeriod, setSalaryPeriod] = useState<'day' | 'week' | 'month' | 'all'>('month');
const [salarySegment, setSalarySegment] = useState<'all' | 'wash' | 'detailing'>('all');
const [payAmount, setPayAmount] = useState('');
const [payNote, setPayNote] = useState('');
const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
```

#### Загрузка данных:
```typescript
useEffect(() => {
  if (page === 'salary-detail' && selectedWorkerId) {
    apiRequest(`/api/owner/workers/${selectedWorkerId}/salary-detail?period=${salaryPeriod}&segment=${salarySegment}`)
      .then(setSalaryDetail);
  }
}, [page, selectedWorkerId, salaryPeriod, salarySegment]);
```

#### Обработчик выплаты:
```typescript
const handlePaySalary = async () => {
  if (!selectedWorkerId || !payAmount) return;
  const res = await apiRequest(`/api/owner/workers/${selectedWorkerId}/pay-salary`, {
    method: 'POST',
    body: {
      period: salaryPeriod,
      segment: salarySegment,
      amount: parseInt(payAmount),
      note: payNote || `Выплата за ${periodLabel}`,
    },
  });
  setSalaryDetail(prev => prev ? { ...prev, balanceToPay: res.newBalance, totalPaid: prev.totalPaid + parseInt(payAmount) } : null);
  setPayAmount('');
  setPayNote('');
};
```

#### UI-структура:

1. **Шапка**: ← Назад + Имя мастера + Оклад + % + Активен
2. **Переключатели периода**: День | Неделя | Месяц | Всё
3. **Переключатели сегмента**: Все | Мойка | Детейлинг
4. **Карточка-агрегат**: Итого / Выплачено / Остаток к выплате
5. **Таблица записей**: Дата | Услуга | Бокс | Стоимость | Заработал | Сегмент
6. **Форма выплаты**: Сумма | Примечание | Кнопка «Выплатить»
7. **История выплат**: Дата | Сумма | Примечание | Кто выплатил

---

## Изменения в навигации OwnerApp

В карточке мастера на странице «Зарплаты» кнопка «Открыть зарплату мастера» → `setPage('salary-detail'); setSelectedWorkerId(worker.id)`.

Кнопка ← Назад → `setPage('payroll')`.

---

## Файлы для изменения

| Файл | Объём изменений |
|------|----------------|
| `backend/app/schemas.py` | +50 строк (новые схемы) |
| `backend/app/main.py` | +120 строк (2 эндпоинта) |
| `frontend/src/app/components/owner/OwnerApp.tsx` | +300 строк (новая страница) |

---

## Тестирование

1. GET `/api/owner/workers/{id}/salary-detail?period=month` — вернуть записи и агрегаты
2. GET `?segment=wash` — фильтрация только мойка
3. POST `/api/owner/workers/{id}/pay-salary` — создать payout + expense
4. Проверить что Expense появляется в списке расходов с правильным resource_group
5. Проверить что баланс обновился
6. Frontend: переключение периодов корректно обновляет данные
