# Непокрытые роуты — Фаза 0.2 (2026-09-03)

> Метод: 139 декораторов `@app.*` в `backend/app/main.py` → 109 уникальных `/api/`-путей.
> Нормализованные шаблоны (`{param}` → `{id}`, query отрезаны, числовые сегменты → `{id}`)
> сверены с 125 уникальными `/api/`-строками в `backend/tests/test_*.py` (только литералы
> в двойных кавычках; f-строки/конкатенация могли не попасть — эвристика, возможны ложные
> срабатывания; проверять точечно перед написанием тестов).
> Итог: **53 роута без прямых обращений из тестов**.

## Auth / сессии
- `/api/auth/change-password`
- `/api/auth/consent`
- `/api/auth/consent/check`
- `/api/auth/logout`
- `/api/auth/role-preview`
- `/api/auth/sessions`
- `/api/auth/staff/link`
- `/api/auth/switch-role`

## Брони / клиенты
- `/api/bookings/{id}`
- `/api/bookings/{id}/services`
- `/api/clients/{id}`
- `/api/clients/{id}/card`
- `/api/contact`

## Cron / отладка / загрузки
- `/api/cron/google-sync`
- `/api/cron/reports`
- `/api/debug/encoding`
- `/api/upload`
- `/api/uploads/{id}`
- `/api/telegram/webhook/sync`
- `/api/health`

## Владелец: депозиты / выплаты / отчёты
- `/api/owner/bookings/{id}/money-split`
- `/api/owner/deposits/{id}`
- `/api/owner/deposits/{id}/adjust`
- `/api/owner/deposits/{id}/export.xlsx`
- `/api/owner/deposits/{id}/export.xlsx/telegram`
- `/api/owner/deposits/{id}/settle-month`
- `/api/owner/deposits/{id}/topup`
- `/api/owner/deposits/{id}/washes`
- `/api/owner/exports/{id}`
- `/api/owner/exports/{id}/telegram`
- `/api/owner/incomes/{id}`
- `/api/owner/integrations/google/connections/{id}`
- `/api/owner/outsource/payroll`
- `/api/owner/reports/{id}/{id}/telegram`

## Админ / персонал / склад / настройки
- `/api/admin/shift-inspections/{id}/photo`
- `/api/payroll/booking-workers/{id}/override-earned`
- `/api/payroll/entries/{id}`
- `/api/penalties/{id}/revoke`
- `/api/expenses/{id}`
- `/api/settings/boxes`
- `/api/settings/owner/company`
- `/api/settings/owner/integrations`
- `/api/settings/owner/notifications`
- `/api/settings/owner/security`
- `/api/settings/schedule`
- `/api/settings/workers/{id}/profile`
- `/api/stock/write-off-history`
- `/api/stock-categories`
- `/api/stock-categories/{id}`
- `/api/stock-items/{id}`
- `/api/stock-items/{id}/write-off`
- `/api/workers/{id}`
- `/api/workers/{id}/reset-password`

## Приоритет для Фазы 2 (деньги и деструктив первыми)
1. `/api/owner/bookings/{id}/money-split`, `/api/owner/deposits/{id}/*`, `/api/owner/outsource/payroll`
2. `/api/payroll/entries/{id}`, `/api/payroll/booking-workers/{id}/override-earned`, `/api/expenses/{id}`
3. `/api/bookings/{id}`, `/api/clients/{id}`, `/api/workers/{id}/reset-password`
