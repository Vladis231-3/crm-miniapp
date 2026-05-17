# Implementation Plan: Owner Finance & Booking Improvements

## Overview

All changes are in `frontend/src/app/components/owner/OwnerApp.tsx` and `frontend/src/app/context/AppContext.tsx`. The backend already supports all required operations. Tasks are ordered to build incrementally.

## Tasks

- [ ] 1. Add `serviceCategory` field to Expense and Income types in AppContext
  - Extend `Expense` interface with optional `serviceCategory?: string`
  - Extend `Income` interface with optional `serviceCategory?: string`
  - Update `addExpense` signature to accept `serviceCategory`
  - Update `addIncome` signature to accept `serviceCategory`
  - _Requirements: 2.7, 2.8_

- [ ] 2. Add `serviceCategory` field to expense and income forms in OwnerApp
  - [ ] 2.1 Add `serviceCategory` field to `expenseForm` state (default `''`)
    - Update `expenseForm` initial state and reset to include `serviceCategory: ''`
    - Add "Категория услуги" select in the expense form UI: options Общее / Автомойка / Детейлинг
    - Pass `serviceCategory` to `addExpense()` call in `handleAddExpense`
    - _Requirements: 2.5, 2.7_
  - [ ] 2.2 Add `serviceCategory` field to `incomeForm` state (rename `segment` → `serviceCategory`)
    - Rename `segment` field in `incomeForm` state to `serviceCategory`
    - Update the "Раздел" select label to "Категория услуги"
    - Map option values: `general` → `''`, `wash` → `'wash'`, `detailing` → `'detailing'`
    - Pass `serviceCategory` to `addIncome()` call
    - _Requirements: 2.6, 2.8_

- [ ] 3. Implement detailed Finance section in owner settings
  - [ ] 3.1 Add computed finance breakdown variables in OwnerApp
    - Compute `washRevenue`, `detailingRevenue` from completed bookings filtered by service `resourceGroup`
    - Compute `washExpenses`, `detailingExpenses` from expenses filtered by `serviceCategory`
    - Compute `washIncomes`, `detailingIncomes` from incomes filtered by `serviceCategory`
    - _Requirements: 1.4, 1.5, 1.6_
  - [ ] 3.2 Render the Finance settings section (`settingsSection === 'finance'`)
    - Add `{page === 'settings' && settingsSection === 'finance' && ...}` block
    - Show total summary: выручка, расходы, доходы, прибыль (with abs value + убыток label)
    - Show Автомойка block: washRevenue, washExpenses, washIncomes
    - Show Детейлинг block: detailingRevenue, detailingExpenses, detailingIncomes
    - Show list of recent expenses and incomes with `serviceCategory` label
    - _Requirements: 1.1, 1.2, 1.3, 1.8_

- [ ] 4. Fix profit display to use absolute value with red color when negative
  - [ ] 4.1 Fix profit display in FinancePanel (Wallet button sheet)
    - Profit value already uses `Math.abs(profit)` and `(убыток)` — verify and ensure color is `#FF6B6B` when negative, `accent` when non-negative
    - _Requirements: 4.1, 4.3, 4.5_
  - [ ] 4.2 Fix profit display in reports page (ФИНАНСОВЫЙ ИТОГ section)
    - Update the profit row in the reports page financial summary to use `Math.abs(profit)` and red color when negative
    - Add `(убыток)` suffix when `profit < 0`
    - _Requirements: 4.2, 4.4, 4.6_
  - [ ] 4.3 Fix profit display in KPI cards (dashboard)
    - The KPI card for profit already uses `Math.abs(profit)` — verify label shows `(убыток)` when negative
    - _Requirements: 4.1, 4.7_

- [ ] 5. Implement owner booking edit in BookingDetailModal
  - [ ] 5.1 Add edit buttons to BookingDetailModal
    - Add edit buttons for: статус, цена, мастера, дата и время
    - Each button sets `ownerBookingEditMode` to the corresponding mode and initializes draft state from `selectedBooking`
    - _Requirements: 3.1_
  - [ ] 5.2 Implement inline edit panels for each mode
    - Status mode: show select with all `OWNER_BOOKING_STATUS_OPTIONS`
    - Price mode: show number input
    - Workers mode: show worker list with percent inputs (same pattern as new booking form)
    - Datetime mode: show date picker + time select
    - Each panel has Save and Cancel buttons
    - _Requirements: 3.2, 3.3, 3.4, 3.5_
  - [ ] 5.3 Implement `handleSaveOwnerBookingEdit` function
    - Build patch object based on `ownerBookingEditMode`
    - Call `updateBooking(selectedBooking.id, patch)`
    - On success: update `selectedBooking` state, reset `ownerBookingEditMode` to null, clear error
    - On error: set `ownerBookingEditError`
    - _Requirements: 3.6, 3.7, 3.8, 3.9_

- [ ] 6. Checkpoint — verify all changes compile and work end-to-end
  - Ensure all tests pass, ask the user if questions arise.
