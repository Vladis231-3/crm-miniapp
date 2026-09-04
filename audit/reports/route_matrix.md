# Route × auth matrix — статика (эвристика)

Всего декораторов: **139**.
OPEN? — нет следов сессионной авторизации: проверить вручную первыми.

| Method | Path | Handler | Auth |
|---|---|---|---|
| GET | `/api/admin/shift-inspections` | list_admin_shift_inspections | session+admin/owner object-check? |
| POST | `/api/admin/shift-inspections` | submit_admin_shift_inspection | session+admin object-check? |
| GET | `/api/admin/shift-inspections/{inspection_id}/photo` | get_admin_shift_inspection_photo | session+admin/owner object-check? |
| POST | `/api/admin/shift-inspections/{inspection_id}/review` | review_admin_shift_inspection | session+owner object-check? |
| GET | `/api/admin/workers/payroll` | get_admin_workers_payroll | session+accountant/admin/owner |
| PUT | `/api/admin/workers/payroll` | save_admin_worker_payroll | session+accountant/admin |
| POST | `/api/auth/change-password` | change_password | session+?roles object-check? |
| POST | `/api/auth/client` | register_or_login_client | session+?roles object-check? |
| POST | `/api/auth/consent` | record_consent | session+?roles object-check? |
| GET | `/api/auth/consent/check` | check_consent | session+?roles object-check? |
| POST | `/api/auth/logout` | logout | session+?roles |
| GET | `/api/auth/role-preview` | get_role_preview | session+?roles |
| POST | `/api/auth/role-preview` | set_role_preview | session+?roles object-check? |
| GET | `/api/auth/session` | get_session_bootstrap | session+?roles |
| GET | `/api/auth/sessions` | get_active_sessions | session+?roles |
| POST | `/api/auth/staff/link` | link_staff_account | OPEN? 🔴 |
| POST | `/api/auth/staff/login` | staff_login | session+?roles object-check? |
| POST | `/api/auth/switch-role` | switch_role | session+?roles object-check? |
| POST | `/api/auth/telegram` | authenticate_via_telegram | OPEN? 🔴 |
| POST | `/api/auth/telegram-owner` | authenticate_primary_owner_via_telegram | OPEN? 🔴 |
| POST | `/api/bookings` | create_booking | session+?roles object-check? |
| GET | `/api/bookings/availability` | get_booking_availability | session+?roles object-check? |
| DELETE | `/api/bookings/{booking_id}` | delete_booking | session+?roles object-check? |
| PATCH | `/api/bookings/{booking_id}` | update_booking | session+accountant/admin/owner/worker object-check? |
| POST | `/api/bookings/{booking_id}/additional-services` | add_booking_additional_service | session+?roles object-check? |
| DELETE | `/api/bookings/{booking_id}/additional-services/{additional_service_id}` | remove_booking_additional_service | session+?roles object-check? |
| PATCH | `/api/bookings/{booking_id}/additional-services/{additional_service_id}` | update_booking_additional_service | session+?roles object-check? |
| POST | `/api/bookings/{booking_id}/services` | add_booking_service | session+?roles object-check? |
| POST | `/api/clients` | create_client | session+admin/owner |
| PATCH | `/api/clients/me` | update_client_me | session+client object-check? |
| DELETE | `/api/clients/{client_id}` | delete_client | session+admin/owner object-check? |
| PATCH | `/api/clients/{client_id}/card` | update_client_card | session+admin/owner |
| POST | `/api/contact` | submit_contact | OPEN? 🔴 |
| GET | `/api/content` | get_public_content | OPEN? 🔴 |
| PUT | `/api/content` | save_content | session+admin/owner |
| GET | `/api/cron/google-sync` | run_google_calendar_sync_cron | OPEN? 🔴 |
| GET | `/api/cron/reminders` | run_reminders_cron | OPEN? 🔴 |
| GET | `/api/cron/reports` | run_reports_cron | OPEN? 🔴 |
| GET | `/api/debug/db` | debug_db | OPEN? 🔴 |
| GET | `/api/debug/encoding` | debug_encoding | OPEN? 🔴 |
| POST | `/api/debug/mojibake-repair` | debug_mojibake_repair | OPEN? 🔴 |
| GET | `/api/debug/mojibake-scan` | debug_mojibake_scan | OPEN? 🔴 |
| POST | `/api/expenses` | create_expense | session+accountant/owner |
| PATCH | `/api/expenses/{expense_id}` | update_expense | session+accountant/owner |
| GET | `/api/health` | health | OPEN? 🔴 |
| POST | `/api/notifications` | create_notification | session+?roles object-check? |
| POST | `/api/notifications/read-all` | mark_all_notifications_read | session+?roles object-check? |
| PATCH | `/api/notifications/{notification_id}/read` | mark_notification_read | session+?roles object-check? |
| GET | `/api/owner/archive` | get_owner_archive | session+owner object-check? |
| GET | `/api/owner/bookings-history` | get_owner_bookings_history | session+owner |
| GET | `/api/owner/bookings-history/totals` | get_owner_bookings_history_totals | session+owner object-check? |
| GET | `/api/owner/bookings/{booking_id}/money-split` | get_owner_booking_money_split | session+owner |
| PUT | `/api/owner/bookings/{booking_id}/money-split` | update_owner_booking_money_split | session+owner object-check? |
| POST | `/api/owner/database-reset/approve` | approve_owner_database_reset | session+owner |
| POST | `/api/owner/database-reset/execute` | execute_owner_database_reset | session+owner |
| POST | `/api/owner/database-reset/start` | start_owner_database_reset | session+owner object-check? |
| GET | `/api/owner/deposits` | list_deposit_clients | session+accountant/admin/owner |
| GET | `/api/owner/deposits/export-all.xlsx` | deposit_export_all_excel | session+accountant/admin/owner |
| POST | `/api/owner/deposits/export-all.xlsx/telegram` | deposit_export_all_excel_telegram | session+admin/owner object-check? |
| GET | `/api/owner/deposits/{client_id}` | get_deposit_overview | session+accountant/admin/owner |
| PATCH | `/api/owner/deposits/{client_id}` | update_deposit_subscription | session+admin/owner |
| POST | `/api/owner/deposits/{client_id}/adjust` | deposit_adjust | session+admin/owner |
| GET | `/api/owner/deposits/{client_id}/export.xlsx` | deposit_export_excel | session+accountant/admin/owner |
| POST | `/api/owner/deposits/{client_id}/export.xlsx/telegram` | deposit_export_excel_telegram | session+admin/owner object-check? |
| POST | `/api/owner/deposits/{client_id}/settle-month` | deposit_settle_month | session+admin/owner |
| POST | `/api/owner/deposits/{client_id}/topup` | deposit_topup | session+accountant/admin/owner |
| POST | `/api/owner/deposits/{client_id}/washes` | deposit_record_wash | session+admin/owner object-check? |
| GET | `/api/owner/exports/{kind}` | download_owner_export | session+accountant/owner object-check? |
| POST | `/api/owner/exports/{kind}/telegram` | send_owner_export_to_telegram | session+accountant/owner object-check? |
| POST | `/api/owner/inactive-clients/remind-admin` | remind_admin_about_inactive_clients | session+admin/owner object-check? |
| GET | `/api/owner/incomes` | list_incomes | session+admin/owner |
| POST | `/api/owner/incomes` | create_income | session+admin/owner object-check? |
| PATCH | `/api/owner/incomes/{income_id}` | update_income | session+owner |
| GET | `/api/owner/integrations/google/auth-url` | get_google_calendar_auth_url | session+owner |
| GET | `/api/owner/integrations/google/callback` | google_calendar_callback | OPEN? 🔴 |
| DELETE | `/api/owner/integrations/google/connections/{connection_id}` | delete_google_calendar_connection | session+owner |
| DELETE | `/api/owner/integrations/google/credentials` | delete_google_calendar_credentials | session+owner |
| PUT | `/api/owner/integrations/google/credentials` | save_google_calendar_credentials | session+owner |
| POST | `/api/owner/integrations/google/disconnect` | disconnect_google_calendar | session+owner |
| POST | `/api/owner/integrations/google/invites` | create_google_calendar_invite | session+owner |
| GET | `/api/owner/integrations/google/status` | get_google_calendar_status | session+owner |
| POST | `/api/owner/integrations/google/sync` | sync_google_calendar_now | session+owner |
| GET | `/api/owner/money-flow` | get_owner_money_flow | session+owner object-check? |
| GET | `/api/owner/outsource/payroll` | get_owner_outsource_payroll | session+accountant/admin/owner |
| POST | `/api/owner/owners/pay-salary` | owner_pay_salary | session+admin/owner object-check? |
| GET | `/api/owner/owners/salary-detail` | owner_salary_detail | session+admin/owner object-check? |
| GET | `/api/owner/piggy-bank` | get_piggy_bank | session+accountant/owner object-check? |
| POST | `/api/owner/piggy-bank/adjust` | piggy_bank_adjust | session+accountant/owner |
| POST | `/api/owner/piggy-bank/withdraw` | piggy_bank_withdraw | session+accountant/owner object-check? |
| POST | `/api/owner/reminders/dispatch` | dispatch_owner_booking_reminders | session+admin/owner |
| POST | `/api/owner/reports/{period}/{segment}/telegram` | send_owner_summary_report_to_telegram | session+owner object-check? |
| GET | `/api/owner/shift-attendance` | get_all_workers_shift_attendance | session+admin/owner |
| POST | `/api/owner/shift-openings` | open_shift_for_masters | session+owner object-check? |
| GET | `/api/owner/wallet` | get_wallet | session+accountant/owner |
| POST | `/api/owner/workers/{worker_id}/pay-salary` | owner_worker_pay_salary | session+owner object-check? |
| GET | `/api/owner/workers/{worker_id}/salary-detail` | owner_worker_salary_detail | session+owner |
| GET | `/api/owner/workers/{worker_id}/shift-attendance` | get_worker_shift_attendance | session+admin/owner |
| PUT | `/api/payroll/booking-workers/{link_id}/override-earned` | update_booking_worker_override_earned | session+admin/owner |
| POST | `/api/payroll/entries` | create_payroll_entry | session+accountant/admin/owner object-check? |
| DELETE | `/api/payroll/entries/{entry_id}` | delete_payroll_entry | session+owner object-check? |
| PUT | `/api/payroll/entries/{entry_id}` | update_payroll_entry | session+owner object-check? |
| POST | `/api/penalties` | create_penalty | session+owner object-check? |
| POST | `/api/penalties/{penalty_id}/revoke` | revoke_penalty | session+owner object-check? |
| PUT | `/api/settings/admin/notifications` | save_admin_notifications | session+admin |
| PUT | `/api/settings/admin/profile` | save_admin_profile | session+admin object-check? |
| PUT | `/api/settings/boxes` | save_boxes | session+admin/owner |
| PUT | `/api/settings/owner/company` | save_owner_company | session+owner |
| PUT | `/api/settings/owner/integrations` | save_owner_integrations | session+owner |
| PUT | `/api/settings/owner/notifications` | save_owner_notifications | session+owner |
| PUT | `/api/settings/owner/security` | save_owner_security | session+owner object-check? |
| PUT | `/api/settings/schedule` | save_schedule | session+admin/owner |
| PUT | `/api/settings/services` | save_services | session+admin/owner |
| PUT | `/api/settings/workers/{worker_id}/notifications` | save_worker_notifications | session+?roles object-check? |
| PUT | `/api/settings/workers/{worker_id}/profile` | save_worker_profile | session+?roles object-check? |
| GET | `/api/shift-checklists` | list_shift_checklists | session+accountant/admin/owner/worker object-check? |
| POST | `/api/shift-checklists` | submit_shift_checklist | session+worker object-check? |
| GET | `/api/stock-categories` | list_stock_categories | session+accountant/admin/owner/worker |
| POST | `/api/stock-categories` | create_stock_category | session+accountant/admin/owner |
| DELETE | `/api/stock-categories/{category_id}` | delete_stock_category | session+accountant/admin/owner |
| PATCH | `/api/stock-categories/{category_id}` | update_stock_category | session+accountant/admin/owner |
| POST | `/api/stock-items` | create_stock_item | session+accountant/admin/owner |
| DELETE | `/api/stock-items/{item_id}` | delete_stock_item | session+accountant/admin/owner |
| PATCH | `/api/stock-items/{item_id}` | update_stock_item | session+accountant/admin/owner |
| POST | `/api/stock-items/{item_id}/write-off` | write_off_stock | session+accountant/admin/owner |
| GET | `/api/stock/write-off-history` | get_write_off_history | session+accountant/admin/owner |
| POST | `/api/telegram/link-code` | generate_telegram_link_code | session+accountant/admin/owner/worker object-check? |
| POST | `/api/telegram/webhook/sync` | resync_telegram_webhook | session+owner |
| POST | `/api/upload` | upload_file | session+admin/owner |
| GET | `/api/uploads/{filename}` | serve_upload | OPEN? 🔴 |
| GET | `/api/worker/calendar` | get_worker_calendar_bookings | session+?roles object-check? |
| GET | `/api/worker/cars/search` | search_worker_cars | session+?roles object-check? |
| GET | `/api/worker/salary-detail` | worker_my_salary_detail | session+worker object-check? |
| GET | `/api/worker/shift-attendance` | get_own_shift_attendance | session+?roles object-check? |
| POST | `/api/workers` | create_worker | session+owner object-check? |
| PUT | `/api/workers/settings` | save_worker_settings | session+accountant/owner object-check? |
| DELETE | `/api/workers/{worker_id}` | fire_worker | session+owner object-check? |
| POST | `/api/workers/{worker_id}/penalties/revoke-all` | revoke_all_worker_penalties | session+owner object-check? |
| POST | `/api/workers/{worker_id}/reset-password` | reset_worker_password | session+owner |
| POST | `?` | handle_telegram_webhook | OPEN? 🔴 |
