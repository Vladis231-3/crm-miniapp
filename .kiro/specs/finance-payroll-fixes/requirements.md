# Requirements Document

## Introduction

Три улучшения финансового модуля CRM-приложения (FastAPI + React):

1. **Дата в формах расходов/доходов** — добавить поле выбора даты в модальные окна добавления расхода и дохода. Сейчас дата жёстко фиксируется как «сегодня» (`todayLabel`). Выбранная дата должна отображаться в списках и учитываться в отчётах.

2. **Расходы/доходы во всех отчётах** — суммы расходов и доходов должны корректно отображаться и учитываться в PDF-отчёте, Excel-отчёте и Telegram-сообщении (сводный отчёт). Сейчас в некоторых местах расходы/доходы не попадают в итоговые метрики.

3. **ЗП мастеров из прошлых записей** — расчёт зарплаты мастеров должен корректно учитывать все завершённые записи, включая старые. Также все доходы и расходы должны отображаться у владельца в общем финансовом фонде (панель «Финансы»).

## Glossary

- **System**: CRM-приложение (FastAPI бэкенд + React фронтенд)
- **Owner**: Пользователь с ролью `owner` или `accountant`
- **Worker**: Сотрудник с ролью `worker`
- **Expense**: Запись о расходе (модель `Expense`, таблица `expenses`)
- **Income**: Запись о дополнительном доходе (модель `Income`, таблица `incomes`)
- **Booking**: Запись на услугу (модель `Booking`, таблица `bookings`)
- **PayrollSummary**: Сводка по зарплате мастера (`WorkerPayrollSummaryPayload`)
- **FinancePanel**: Модальная панель «Финансы» в интерфейсе владельца
- **ExpenseForm**: Модальное окно «Добавить расход»
- **IncomeForm**: Модальное окно «Добавить доход»
- **ExportReport**: Отчёт в формате Excel или PDF, генерируемый функцией `build_owner_export`
- **SummaryReport**: Сводный отчёт (Telegram/Excel), генерируемый функцией `build_owner_summary_report` / `build_owner_summary_export`
- **DD.MM.YYYY**: Формат даты, используемый в системе для хранения дат расходов и доходов

---

## Requirements

### Requirement 1: Поле выбора даты в форме расхода

**User Story:** As an Owner, I want to select a custom date when adding an expense, so that I can record expenses that occurred on a date other than today.

#### Acceptance Criteria

1. WHEN the Owner opens the ExpenseForm, THE System SHALL display a date input field pre-filled with today's date in DD.MM.YYYY format.
2. WHEN the Owner changes the date in the ExpenseForm, THE System SHALL use the selected date (not today's date) when creating the Expense record.
3. WHEN the Owner submits the ExpenseForm with a valid date, THE System SHALL create the Expense with the date field set to the value entered by the Owner.
4. IF the Owner submits the ExpenseForm with an empty or invalid date, THEN THE System SHALL prevent submission and keep the form open.
5. WHEN an Expense is displayed in the FinancePanel expense list, THE System SHALL show the Expense's stored date value.

---

### Requirement 2: Поле выбора даты в форме дохода

**User Story:** As an Owner, I want to select a custom date when adding an income, so that I can record incomes that occurred on a date other than today.

#### Acceptance Criteria

1. WHEN the Owner opens the IncomeForm, THE System SHALL display a date input field pre-filled with today's date in DD.MM.YYYY format.
2. WHEN the Owner changes the date in the IncomeForm, THE System SHALL use the selected date (not today's date) when creating the Income record.
3. WHEN the Owner submits the IncomeForm with a valid date, THE System SHALL create the Income with the date field set to the value entered by the Owner.
4. IF the Owner submits the IncomeForm with an empty or invalid date, THEN THE System SHALL prevent submission and keep the form open.
5. WHEN an Income is displayed in the FinancePanel income list, THE System SHALL show the Income's stored date value.

---

### Requirement 3: Расходы и доходы в Excel/PDF-отчёте

**User Story:** As an Owner, I want expenses and incomes to appear correctly in the full Excel and PDF reports, so that I can see the complete financial picture.

#### Acceptance Criteria

1. WHEN the Owner generates an ExportReport (Excel or PDF), THE System SHALL include the total sum of all Expenses in the financial metrics section.
2. WHEN the Owner generates an ExportReport (Excel or PDF), THE System SHALL include the total sum of all Incomes in the financial metrics section.
3. WHEN the Owner generates an ExportReport (Excel or PDF), THE System SHALL calculate profit as: revenue from completed bookings + total incomes − total expenses.
4. WHEN the ExportReport contains an expense_rows section, THE System SHALL include all Expense records with their title, amount, category, date, and note.
5. WHEN the ExportReport contains an income_rows section, THE System SHALL include all Income records with their source, amount, date, and note.

---

### Requirement 4: Расходы и доходы в Telegram-сводке

**User Story:** As an Owner, I want expenses and incomes to appear in the Telegram summary report, so that I receive accurate financial data in notifications.

#### Acceptance Criteria

1. WHEN the System generates a SummaryReport for a given period, THE System SHALL filter Expenses by the same period as the bookings and include their total in the report message.
2. WHEN the System generates a SummaryReport for a given period, THE System SHALL filter Incomes by the same period as the bookings and include their total in the report message.
3. WHEN the System generates a SummaryReport and there are period Expenses or Incomes, THE System SHALL calculate and display profit as: period revenue + period incomes − period expenses.
4. WHEN the Owner sends a SummaryReport to Telegram, THE System SHALL pass the current Expenses and Incomes lists to the `build_owner_summary_report` function.

---

### Requirement 5: Корректный расчёт ЗП мастеров по всем записям

**User Story:** As an Owner, I want the payroll calculation to include all completed bookings (including old ones), so that workers receive accurate salary summaries.

#### Acceptance Criteria

1. WHEN the System calculates a Worker's PayrollSummary, THE System SHALL include all completed Bookings linked to that Worker, regardless of when the Booking was created.
2. WHEN a completed Booking has a BookingWorker link with a non-zero percent, THE System SHALL calculate the Worker's earned amount as `round(booking.price * percent / 100)`.
3. WHEN a completed Booking has a BookingWorker link with percent = 0, THE System SHALL include the Booking in the count but contribute 0 to the earned amount.
4. WHEN the System calculates a Worker's PayrollSummary, THE System SHALL sum `accrued_from_bookings` across all completed Bookings linked to that Worker.
5. IF a completed Booking has no BookingWorker link for a given Worker, THEN THE System SHALL NOT include that Booking in that Worker's PayrollSummary.

---

### Requirement 6: Отображение всех доходов и расходов в финансовом фонде владельца

**User Story:** As an Owner, I want to see all incomes and expenses in the FinancePanel, so that I have a complete view of the financial fund.

#### Acceptance Criteria

1. WHEN the Owner opens the FinancePanel, THE System SHALL display the total sum of all Expenses (not filtered by date).
2. WHEN the Owner opens the FinancePanel, THE System SHALL display the total sum of all Incomes (not filtered by date).
3. WHEN the Owner opens the FinancePanel, THE System SHALL display profit calculated as: total revenue from completed bookings + total incomes − total expenses.
4. WHEN the FinancePanel displays the recent expenses list, THE System SHALL show each Expense's date alongside its title and category.
5. WHEN the FinancePanel displays the recent incomes list, THE System SHALL show each Income's date alongside its source and note.
