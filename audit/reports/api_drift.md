# API drift — фронт↔бэк (статика, эвристика)

Вызовов фронта: **122** (frontend + carwash; Showcase без API).
Роутов бэка: **155**.

## A. Вызовы без роута: 0

Чисто — все пути фронта резолвятся в роуты бэка.

## B. Метод не совпал: 0

Чисто.

## C. Роуты без вызывателей фронта: 22

(живут за счёт других клиентов/тестов либо мёртвые — см. B-002)

| Method | Path | Handler |
|---|---|---|
| GET | `/api/admin/shift-inspections/{id}/photo` | get_admin_shift_inspection_photo |
| GET | `/api/auth/sessions` | get_active_sessions |
| GET | `/api/cron/google-sync` | run_google_calendar_sync_cron |
| GET | `/api/cron/outbox` | run_outbox_cron |
| GET | `/api/cron/reminders` | run_reminders_cron |
| GET | `/api/cron/reports` | run_reports_cron |
| GET | `/api/debug/db` | debug_db |
| GET | `/api/debug/mojibake-scan` | debug_mojibake_scan |
| GET | `/api/health` | health |
| GET | `/api/owner/audit-log` | list_audit_log |
| GET | `/api/owner/integrations/google/callback` | google_calendar_callback |
| GET | `/api/owner/workers/{id}/shift-attendance` | get_worker_shift_attendance |
| GET | `/api/uploads/{id}` | _upload_headers |
| POST | `/api/admin/shift-inspections/{id}/review` | review_admin_shift_inspection |
| POST | `/api/auth/staff/login` | staff_login |
| POST | `/api/auth/telegram` | staff_login |
| POST | `/api/auth/telegram-owner` | authenticate_primary_owner_via_telegram |
| POST | `/api/debug/mojibake-repair` | debug_mojibake_repair |
| POST | `/api/notifications/{id}/complete` | complete_notification_task |
| POST | `/api/notifications/{id}/take-to-work` | take_notification_to_work |
| POST | `/api/telegram/webhook/sync` | resync_telegram_webhook |
| POST | `/api/upload` | _upload_headers |

## D. Динамические URL (вне вердикта): 8

URL собран в переменную — проверить вручную.

| Path | Где |
|---|---|
| `/api/admin/shift-inspections` | frontend\src\app\context\AppContext.tsx:1944 |
| `/api/owner/database-reset/approve` | frontend\src\app\context\AppContext.tsx:2038 |
| `/api/owner/database-reset/start` | frontend\src\app\context\AppContext.tsx:2021 |
| `/api/owner/exports/{id}` | frontend\src\app\context\AppContext.tsx:1777 |
| `/api/owner/exports/{id}/telegram` | frontend\src\app\context\AppContext.tsx:1792 |
| `/api/owner/piggy-bank` | frontend\src\app\components\owner\OwnerApp.tsx:1489 |
| `/api/owner/wallet` | frontend\src\app\components\owner\OwnerApp.tsx:1506 |
| `/api/shift-checklists` | frontend\src\app\context\AppContext.tsx:1931 |
