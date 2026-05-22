# Implementation Plan: finance-payroll-fixes

## Overview

Три точечных фикса финансового модуля CRM (FastAPI + React). Изменения не затрагивают схему БД — только логику фронтенда (`OwnerApp.tsx`), бэкенд-эндпоинты (`main.py`) и генерацию отчётов (`exports.py`).

## Tasks

- [x] 1. Поле даты в форме расхода (фронтенд)
  - [x] 1.1 Добавить поле `date` в стейт `expenseForm` и JSX-форму
    - Добавить `date: todayLabel` в начальный стейт `expenseForm`
    - Добавить `<input type="text" placeholder="ДД.ММ.ГГГГ">` в JSX модального окна расхода
    - Сбрасывать `date` в `todayLabel` при открытии формы
    - Передавать `expenseForm.date` в вызов `addExpense(...)` вместо жёстко заданного `todayLabel`
    - Добавить валидацию формата `DD.MM.YYYY` перед сабмитом; при невалидной дате блокировать кнопку «Добавить»
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 1.2 Написать property-тест: дата формы передаётся в запись (Property 1)
    - **Property 1: Дата формы передаётся в запись**
    - Для любой валидной строки `DD.MM.YYYY` сабмит формы должен вызывать `addExpense` с этой датой, а не `todayLabel`
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 1.3 Написать property-тест: невалидная дата блокирует сабмит (Property 2)
    - **Property 2: Невалидная дата блокирует сабмит**
    - Для любой строки, не являющейся валидной `DD.MM.YYYY`, `addExpense` не должен вызываться
    - **Validates: Requirements 1.4**

  - [ ]* 1.4 Написать unit-тесты для формы расхода (Vitest + React Testing Library)
    - `expenseForm.date` инициализируется `todayLabel` при открытии формы
    - При изменении поля даты `handleAddExpense` вызывает `addExpense` с новой датой
    - При пустой дате кнопка «Добавить» задизейблена
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Поле даты в форме дохода (фронтенд)
  - [x] 2.1 Добавить поле `date` в стейт `incomeForm` и JSX-форму
    - Добавить `date: todayLabel` в начальный стейт `incomeForm`
    - Добавить `<input type="text" placeholder="ДД.ММ.ГГГГ">` в JSX модального окна дохода
    - Сбрасывать `date` в `todayLabel` при открытии формы
    - Передавать `incomeForm.date` в вызов `addIncome(...)` вместо жёстко заданного `todayLabel`
    - Добавить валидацию формата `DD.MM.YYYY` перед сабмитом; при невалидной дате блокировать кнопку «Добавить»
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 2.2 Написать unit-тесты для формы дохода (Vitest + React Testing Library)
    - `incomeForm.date` инициализируется `todayLabel` при открытии формы
    - При изменении поля даты `handleAddIncome` вызывает `addIncome` с новой датой
    - При пустой дате кнопка «Добавить» задизейблена
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [~] 3. Checkpoint — убедиться, что тесты форм проходят
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. FinancePanel: отображение доходов и корректный расчёт прибыли (фронтенд)
  - [x] 4.1 Добавить секцию «ДОХОДЫ» в FinancePanel и исправить расчёт прибыли
    - Вычислять `totalIncomes = incomes.reduce((s, i) => s + i.amount, 0)`
    - Изменить формулу прибыли: `profit = totalRevenue + totalIncomes - totalExpenses`
    - Добавить секцию «ДОХОДЫ» в JSX FinancePanel с отображением `i.date`, `i.source`, `i.note` для каждого дохода
    - Убедиться, что в списке расходов отображается `e.date`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 4.2 Написать property-тест: FinancePanel отображает корректные агрегаты (Property 6)
    - **Property 6: FinancePanel отображает корректные агрегаты**
    - Для любого набора bookings, expenses, incomes: `profit = revenue + totalIncomes - totalExpenses`
    - Каждый элемент расходов содержит `date`, `title`, `category`; каждый элемент доходов — `date`, `source`, `note`
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

  - [ ]* 4.3 Написать unit-тесты для FinancePanel (Vitest + React Testing Library)
    - FinancePanel отображает `profit = revenue + incomes - expenses`
    - Каждый элемент списка расходов содержит `e.date`
    - Каждый элемент списка доходов содержит `i.date`, `i.source`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5. Расходы и доходы в Excel/PDF-отчёте (бэкенд)
  - [x] 5.1 Исправить функцию `build_owner_export` в `exports.py`
    - Убедиться, что метрика `"Расходы"` = `sum(e.amount for e in expenses)`
    - Убедиться, что метрика `"Доп. доходы"` = `sum(i.amount for i in incomes)`
    - Исправить расчёт прибыли: `revenue + sum(incomes) − sum(expenses)`
    - Убедиться, что `expense_rows` содержит все записи с полями `title`, `amount`, `category`, `date`, `note`
    - Убедиться, что `income_rows` содержит все записи с полями `source`, `amount`, `date`, `note`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 5.2 Написать property-тест: метрики экспорта корректны (Property 3)
    - **Property 3: Метрики экспорта корректны для любых данных**
    - `# Feature: finance-payroll-fixes, Property 3: export metrics correctness`
    - Для любой комбинации bookings, expenses, incomes проверить все три метрики и полноту строк
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

  - [ ]* 5.3 Написать unit-тест `test_expense_date_default` и `test_income_date_default` (pytest)
    - POST `/api/expenses` без поля `date` возвращает 422
    - POST `/api/owner/incomes` без поля `date` возвращает 422
    - _Requirements: 1.3, 2.3_

- [x] 6. Расходы и доходы в Telegram-сводке (бэкенд)
  - [x] 6.1 Передать `expenses` и `incomes` в вызов `build_owner_summary_report` в `main.py`
    - В функции `_owner_summary_report` добавить `expenses=list(expenses)` и `incomes=list(incomes)` в вызов `build_owner_summary_report`
    - Убедиться, что `build_owner_summary_report` в `exports.py` принимает эти параметры (добавить дефолт `None` если отсутствует)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 6.2 Написать property-тест: сводный отчёт фильтрует по периоду (Property 4)
    - **Property 4: Сводный отчёт фильтрует расходы/доходы по периоду**
    - `# Feature: finance-payroll-fixes, Property 4: summary report period filtering`
    - Для любого периода (`daily`/`weekly`) и любого набора expenses/incomes с разными датами — в сообщении только записи внутри периода
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [ ]* 6.3 Написать unit-тест `test_summary_report_includes_expenses_incomes` (pytest)
    - Вызов `_owner_summary_report` с расходами/доходами в БД возвращает строку с суммами
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [~] 7. Checkpoint — убедиться, что тесты отчётов проходят
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Расчёт ЗП мастеров по всем завершённым записям (бэкенд)
  - [x] 8.1 Проверить и при необходимости исправить запрос расчёта ЗП в `main.py`
    - Убедиться, что запрос `completed_bookings` не содержит фильтрации по дате создания записи
    - Убедиться, что `accrued_from_bookings` вычисляется по полному списку `booking_items` до обрезки `[:12]`
    - Убедиться, что `round(booking.price * percent / 100)` применяется для каждой ссылки `BookingWorker`
    - Убедиться, что записи с `percent = 0` учитываются в `completedBookings`, но вносят 0 в `accrued_from_bookings`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 8.2 Написать property-тест: ЗП учитывает все завершённые записи (Property 5)
    - **Property 5: ЗП мастера учитывает все завершённые записи**
    - `# Feature: finance-payroll-fixes, Property 5: payroll includes all completed bookings`
    - Для любого набора completed bookings: `completedBookings` и `accrued_from_bookings` совпадают с ожидаемыми
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

  - [ ]* 8.3 Написать unit-тест `test_payroll_summary_zero_percent` (pytest)
    - Мастер с `percent=0` считается в `completedBookings`, но `accrued_from_bookings = 0`
    - _Requirements: 5.3, 5.4_

- [~] 9. Final checkpoint — все тесты проходят
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Задачи, помеченные `*`, являются опциональными и могут быть пропущены для быстрого MVP
- Изменений в схеме БД нет — все поля (`Expense.date`, `Income.date`, `BookingWorker.percent`) уже существуют
- Property-тесты используют библиотеку **Hypothesis** (Python, бэкенд) и **Vitest** (TypeScript, фронтенд)
- Каждый property-тест помечен комментарием `# Feature: finance-payroll-fixes, Property N: <text>`
- Валидация даты на фронтенде использует `parseFlexibleDate` из `utils/date.ts`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "2.2", "4.1", "5.1", "6.1", "8.1"] },
    { "id": 2, "tasks": ["4.2", "4.3", "5.2", "5.3", "6.2", "6.3", "8.2", "8.3"] }
  ]
}
```
