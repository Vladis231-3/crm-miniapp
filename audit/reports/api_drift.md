# API drift — фронт↔бэк (статика, эвристика)

Вызовов фронта: **107** (frontend + carwash; Showcase без API).
Роутов бэка: **138**.

## A. Вызовы без роута: 0

Чисто — все пути фронта резолвятся в роуты бэка.

## B. Метод не совпал: 0

Чисто.

## C. Роуты без вызывателей фронта: 20

(живут за счёт других клиентов/тестов либо мёртвые — см. B-002)

| Method | Path | Handler |
|---|---|---|
| GET | `/api/admin/shift-inspections/{id}/photo` | get_admin_shift_inspection_photo |
| GET | `/api/auth/sessions` | get_active_sessions |
| GET | `/api/cron/google-sync` | run_google_calendar_sync_cron |
| GET | `/api/cron/reminders` | run_reminders_cron |
| GET | `/api/cron/reports` | run_reports_cron |
| GET | `/api/debug/db` | debug_db |
| GET | `/api/debug/encoding` | debug_encoding |
| GET | `/api/debug/mojibake-scan` | debug_mojibake_scan |
| GET | `/api/health` | health |
| GET | `/api/owner/integrations/google/callback` | google_calendar_callback |
| GET | `/api/owner/outsource/payroll` | get_owner_outsource_payroll |
| GET | `/api/owner/workers/{id}/shift-attendance` | get_worker_shift_attendance |
| GET | `/api/uploads/{id}` | _upload_headers |
| POST | `/api/admin/shift-inspections/{id}/review` | review_admin_shift_inspection |
| POST | `/api/auth/staff/login` | staff_login |
| POST | `/api/auth/telegram` | staff_login |
| POST | `/api/auth/telegram-owner` | authenticate_primary_owner_via_telegram |
| POST | `/api/debug/mojibake-repair` | debug_mojibake_repair |
| POST | `/api/telegram/webhook/sync` | resync_telegram_webhook |
| POST | `/api/upload` | _upload_headers |

## D. Динамические URL (вне вердикта): 8

URL собран в переменную — проверить вручную.

| Path | Где |
|---|---|
| `/api/admin/shift-inspections` | frontend\src\app\context\AppContext.tsx:1874 |
| `/api/owner/database-reset/approve` | frontend\src\app\context\AppContext.tsx:1968 |
| `/api/owner/database-reset/start` | frontend\src\app\context\AppContext.tsx:1951 |
| `/api/owner/exports/{id}` | frontend\src\app\context\AppContext.tsx:1718 |
| `/api/owner/exports/{id}/telegram` | frontend\src\app\context\AppContext.tsx:1733 |
| `/api/owner/piggy-bank` | frontend\src\app\components\owner\OwnerApp.tsx:1285 |
| `/api/owner/wallet` | frontend\src\app\components\owner\OwnerApp.tsx:1302 |
| `/api/shift-checklists` | frontend\src\app\context\AppContext.tsx:1861 |
