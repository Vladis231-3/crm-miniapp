# Implementation Plan: Edit Finance Entries

## Overview

Реализация фичи редактирования финансовых записей: два PATCH-эндпоинта на бэкенде, расширение AppContext двумя методами и модальные формы редактирования в OwnerApp. Миграции БД не требуются — схема таблиц не меняется.

## Tasks

- [x] 1. Добавить Pydantic-схемы в `schemas.py`
  - [x] 1.1 Реализовать `ExpenseUpdateRequest` с валидаторами
    - Добавить класс `ExpenseUpdateRequest` в `backend/app/schemas.py`
    - Поля: `title` (опц., 1–255 символов), `amount` (опц., 1–10 000 000), `category` (опц., макс. 100), `date` (опц., DD.MM.YYYY), `note` (опц., макс. 1000)
    - `@field_validator("title")` — strip + проверка на пустую строку
    - `@field_validator("date")` — `re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value)`
    - `@model_validator(mode="after")` — хотя бы одно поле не `None`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 1.8_

  - [x] 1.2 Реализовать `IncomeUpdateRequest` с валидаторами
    - Добавить класс `IncomeUpdateRequest` в `backend/app/schemas.py`
    - Поля: `amount` (опц., 1–10 000 000), `source` (опц., 1–255 символов), `note` (опц., макс. 1000; `null` очищает поле), `date` (опц., DD.MM.YYYY)
    - `@field_validator("source")` — strip + проверка на пустую строку
    - `@field_validator("date")` — аналогично `ExpenseUpdateRequest`
    - `@model_validator(mode="after")` — хотя бы одно поле не `None`
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7_

- [x] 2. Добавить PATCH-эндпоинты в `main.py`
  - [x] 2.1 Реализовать `PATCH /api/expenses/{expense_id}`
    - Добавить эндпоинт в `backend/app/main.py`, следуя паттерну `PATCH /api/bookings/{booking_id}`
    - Зависимости: `_require_session`, `_ensure_staff_role({"owner", "accountant"})`, `get_db`
    - `db.get(Expense, expense_id)` → 404 если `None`
    - Обновлять только поля из `payload.model_fields_set`; для `note` использовать `"note" in payload.model_fields_set`
    - `response_model=ExpensePayload`, вернуть `_expense_payload(expense)` после `db.commit()` + `db.refresh()`
    - _Requirements: 1.1, 1.5, 1.6_

  - [x] 2.2 Реализовать `PATCH /api/owner/incomes/{income_id}`
    - Добавить эндпоинт в `backend/app/main.py`
    - Зависимости: `_require_session`, `_ensure_staff_role({"owner"})`, `get_db`
    - `db.get(Income, income_id)` → 404 если `None`
    - Обновлять только поля из `payload.model_fields_set`; для `note` использовать `"note" in payload.model_fields_set`
    - `response_model=IncomePayload`, вернуть `IncomePayload(...)` после `db.commit()` + `db.refresh()`
    - _Requirements: 2.1, 2.4, 2.5_

- [x] 3. Checkpoint — убедиться что бэкенд запускается без ошибок
  - Убедиться что все тесты проходят, спросить пользователя если возникнут вопросы.

- [x] 4. Расширить `AppContext.tsx` методами обновления
  - [x] 4.1 Добавить `updateExpense` и `updateIncome` в контекст
    - Добавить типы `updateExpense` и `updateIncome` в интерфейс `AppContextValue` в `frontend/src/app/AppContext.tsx`
    - Реализовать `updateExpense(id, patch)`: `apiRequest<Expense>` с `method: 'PATCH'`, затем `setExpenses(current => current.map(...))`
    - Реализовать `updateIncome(id, patch)`: `apiRequest<Income>` с `method: 'PATCH'`, затем `setIncomes(current => current.map(...))`
    - Пробросить оба метода в `value` провайдера
    - _Requirements: 4.1, 4.2, 4.5_

- [x] 5. Реализовать форму редактирования расходов в `OwnerApp.tsx`
  - [x] 5.1 Добавить state и хелперы для редактирования Expense
    - Добавить state-переменные: `editingExpense`, `editExpenseForm`, `editFinanceLoading`, `editFinanceError` в `frontend/src/app/OwnerApp.tsx`
    - Реализовать `openEditExpense(expense)` — предзаполнить форму текущими значениями, сбросить ошибку
    - Реализовать `handleSaveExpense()` — клиентская валидация (date regex, amount range, title trim), вызов `updateExpense`, обработка ошибок 422/404/500/network
    - При успехе: закрыть форму, показать toast «Расход обновлён»
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.3_

  - [x] 5.2 Добавить кнопку редактирования в карточки Expense
    - В секции Finance Panel найти рендер списка расходов в `OwnerApp.tsx`
    - Добавить кнопку редактирования (иконка карандаша) рядом с каждой записью Expense
    - Кнопка рендерится только если роль пользователя `owner` или `accountant`
    - `onClick` → `openEditExpense(expense)`
    - _Requirements: 5.1, 5.2_

  - [x] 5.3 Добавить модальную форму редактирования Expense
    - Добавить bottom sheet внутри `AnimatePresence` в `OwnerApp.tsx` (аналогично `showAddExpense`)
    - Поля: `title`, `amount`, `category`, `date`, `note` — предзаполнены из `editExpenseForm`
    - Кнопки «Сохранить» (disabled + spinner при `editFinanceLoading`) и «Отмена»
    - Отображать полевые ошибки рядом с полями и общее сообщение при неидентифицированной ошибке
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 6. Реализовать форму редактирования доходов в `OwnerApp.tsx`
  - [x] 6.1 Добавить state и хелперы для редактирования Income
    - Добавить state-переменные: `editingIncome`, `editIncomeForm` в `frontend/src/app/OwnerApp.tsx`
    - Реализовать `openEditIncome(income)` — предзаполнить форму текущими значениями, сбросить ошибку
    - Реализовать `handleSaveIncome()` — клиентская валидация (date regex, amount range, source trim), вызов `updateIncome`, обработка ошибок 422/404/500/network
    - При успехе: закрыть форму, показать toast «Доход обновлён»
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.4_

  - [x] 6.2 Добавить кнопку редактирования в карточки Income
    - В секции Finance Panel найти рендер списка доходов в `OwnerApp.tsx`
    - Добавить кнопку редактирования рядом с каждой записью Income
    - Кнопка рендерится только если роль пользователя `owner`
    - `onClick` → `openEditIncome(income)`
    - _Requirements: 5.3, 5.4_

  - [x] 6.3 Добавить модальную форму редактирования Income
    - Добавить bottom sheet внутри `AnimatePresence` в `OwnerApp.tsx` (аналогично `showAddIncome`)
    - Поля: `amount`, `source`, `note`, `date` — предзаполнены из `editIncomeForm`
    - Кнопки «Сохранить» (disabled + spinner при `editFinanceLoading`) и «Отмена»
    - Отображать полевые ошибки рядом с полями и общее сообщение при неидентифицированной ошибке
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 7. Checkpoint — убедиться что фронтенд собирается без ошибок TypeScript
  - Убедиться что все тесты проходят, спросить пользователя если возникнут вопросы.

- [x] 8. Написать backend unit-тесты
  - [x] 8.1 Создать `test_finance_edit.py` с unit-тестами для PATCH /api/expenses/{id}
    - Создать `backend/tests/test_finance_edit.py` по паттерну `test_income_endpoints.py`
    - `test_patch_expense_updates_only_provided_fields` — обновить только `amount`, проверить что `title`, `category`, `date`, `note` не изменились
    - `test_patch_expense_returns_404_for_unknown_id`
    - `test_patch_expense_returns_422_for_empty_body`
    - `test_patch_expense_returns_422_for_negative_amount`
    - `test_patch_expense_returns_422_for_invalid_date_format`
    - `test_patch_expense_returns_422_for_whitespace_title`
    - `test_patch_expense_returns_403_for_worker_role`
    - `test_patch_expense_returns_403_for_client_role`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [x] 8.2 Добавить unit-тесты для PATCH /api/owner/incomes/{id} в тот же файл
    - `test_patch_income_updates_only_provided_fields` — обновить только `amount`, проверить остальные поля
    - `test_patch_income_returns_404_for_unknown_id`
    - `test_patch_income_returns_422_for_empty_body`
    - `test_patch_income_returns_422_for_negative_amount`
    - `test_patch_income_returns_422_for_whitespace_source`
    - `test_patch_income_clears_note_when_null_passed`
    - `test_patch_income_returns_403_for_accountant_role`
    - `test_patch_income_returns_403_for_worker_role`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 8.3 Написать property-тест Property 1: Partial Update сохраняет неизменённые поля Expense
    - Создать `backend/tests/test_finance_edit_properties.py`
    - Использовать `hypothesis` (`@given`, `@settings(max_examples=100)`)
    - Генерировать случайные валидные Expense + случайное подмножество полей для обновления
    - Проверить что непереданные поля не изменились
    - **Property 1: Partial Update сохраняет неизменённые поля Expense**
    - **Validates: Requirements 1.1, 1.7**

  - [ ]* 8.4 Написать property-тест Property 2: Partial Update сохраняет неизменённые поля Income
    - Добавить в `backend/tests/test_finance_edit_properties.py`
    - Генерировать случайные валидные Income + случайное подмножество полей для обновления
    - Проверить что непереданные поля не изменились
    - **Property 2: Partial Update сохраняет неизменённые поля Income**
    - **Validates: Requirements 2.1, 2.6**

  - [ ]* 8.5 Написать property-тест Property 3: Невалидный amount отклоняется
    - Добавить в `backend/tests/test_finance_edit_properties.py`
    - `@given(amount=st.one_of(st.integers(max_value=0), st.integers(min_value=10_000_001)))`
    - Проверить 422 для обоих эндпоинтов, запись в БД не изменяется
    - **Property 3: Невалидный amount отклоняется для обоих типов записей**
    - **Validates: Requirements 1.2, 2.2**

  - [ ]* 8.6 Написать property-тест Property 4: Невалидный формат date отклоняется
    - Добавить в `backend/tests/test_finance_edit_properties.py`
    - `@given(date=st.text().filter(lambda s: not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", s)))`
    - Проверить 422 для `PATCH /api/expenses/{id}`
    - **Property 4: Невалидный формат date отклоняется**
    - **Validates: Requirements 1.4**

  - [ ]* 8.7 Написать property-тест Property 5: Несуществующий ID возвращает 404
    - Добавить в `backend/tests/test_finance_edit_properties.py`
    - `@given(expense_id=st.uuids().map(str))` — убедиться что ID не существует в тестовой БД
    - Проверить 404 для обоих эндпоинтов
    - **Property 5: Несуществующий ID возвращает 404**
    - **Validates: Requirements 1.5, 2.4**

  - [ ]* 8.8 Написать property-тест Property 6: Недопустимая роль возвращает 403
    - Добавить в `backend/tests/test_finance_edit_properties.py`
    - `@given(role=st.sampled_from(["client", "worker", "admin"]))` для `/api/expenses/{id}`
    - `@given(role=st.sampled_from(["client", "worker", "admin", "accountant"]))` для `/api/owner/incomes/{id}`
    - **Property 6: Недопустимая роль возвращает 403**
    - **Validates: Requirements 1.6, 2.5, 5.6**

- [x] 9. Финальный checkpoint — все тесты проходят
  - Убедиться что все тесты проходят, спросить пользователя если возникнут вопросы.

- [x] 10. Git push
  - Создать новую ветку `feature/edit-finance-entries`
  - Добавить в коммит только изменённые файлы: `backend/app/schemas.py`, `backend/app/main.py`, `backend/tests/test_finance_edit.py`, `backend/tests/test_finance_edit_properties.py`, `frontend/src/app/AppContext.tsx`, `frontend/src/app/OwnerApp.tsx`
  - Сообщение коммита: `feat: add PATCH endpoints and edit forms for expenses and incomes`
  - Запустить `git push -u origin feature/edit-finance-entries`

## Notes

- Задачи с `*` опциональны и могут быть пропущены для быстрого MVP
- Каждая задача ссылается на конкретные требования для трассируемости
- Миграции БД не нужны — схема таблиц не изменяется
- Для `note` в Income используется `model_fields_set` чтобы различать «не передано» и «передан null»
- Property-тесты используют библиотеку `hypothesis` (уже есть в Python-экосистеме)
- Фронтенд-тесты (Vitest + RTL) не включены в этот план — добавить отдельно при необходимости

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["4.1"] },
    { "id": 3, "tasks": ["5.1", "6.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.2", "6.3"] },
    { "id": 5, "tasks": ["8.1", "8.2"] },
    { "id": 6, "tasks": ["8.3", "8.4", "8.5", "8.6", "8.7", "8.8"] }
  ]
}
```
