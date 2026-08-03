# PROJECT_MAP — карта проекта

> Автосгенерировано 2026-08-03 08:47 UTC. **НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ.**

**Обновление:**

```
python scripts/generate_project_map.py            # один раз
scripts\watch-project-map.bat                    # фоновый вотчер (перезапускается при изменениях)
python scripts/generate_project_map.py --install-hook  # git pre-commit хук (обновляет карту при коммите)
```

## Статистика

- Файлов кода: **240**
- Строк кода: **69 902**
- По расширениям: `.js`: 1, `.mjs`: 3, `.py`: 35, `.ts`: 19, `.tsx`: 182

## Архитектура

```mermaid
graph TD
    BE["backend/ — FastAPI + SQLAlchemy"] --> DB[("SQLite: backend/data/crm.sqlite3")]
    BOT["backend/bot.py — Telegram polling-бот"] --> DB
    FE["frontend/ — CRM-минапп (React/Vite): admin/owner/worker/client"] -->|HTTP /api| BE
    CWS["carwash/ — лендинг автомойки (React)"] -->|HTTP| BE
    SHOW["Showcase/ — лендинг-витрина (React)"] -->|HTTP| BE
    API["api/ — Vercel serverless (api/index.py)"] --> BE
    EL["native/electron/ — Windows-десктоп (Electron)"] -->|HTTPS| BE
```

## Дерево каталогов

```
concept1.0/
├── api/
│   └── index.py
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── complaints.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── exports.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── security.py
│   │   ├── seed.py
│   │   └── telegram_linking.py
│   ├── migrations/
│   │   ├── add_materials_written_off.py
│   │   ├── add_pay_type_to_workers.py
│   │   ├── add_plate_type.py
│   │   ├── add_referral_source.py
│   │   ├── add_service_times.py
│   │   ├── add_stock_write_offs.py
│   │   ├── add_write_off_booking_fields.py
│   │   ├── change_int_to_float.py
│   │   ├── migrate_additional_services.py
│   │   └── sync_client_schema.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_attendance_endpoints.py
│   │   ├── test_booking_logic.py
│   │   ├── test_broadcast_edge_cases.py
│   │   ├── test_config.py
│   │   ├── test_finance_edit.py
│   │   ├── test_income_endpoints.py
│   │   └── test_worker_calendar.py
│   ├── .env.example
│   ├── bot.py
│   ├── requirements.txt
│   └── run.py
├── carwash/
│   ├── guidelines/
│   │   └── Guidelines.md
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── figma/
│   │   │   │   │   └── ImageWithFallback.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   └── (48 shadcn/ui-файлов — не индексируются)
│   │   │   │   ├── Contact.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Hero.tsx
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── Pricing.tsx
│   │   │   │   ├── Services.tsx
│   │   │   │   └── Testimonials.tsx
│   │   │   ├── App.tsx
│   │   │   └── useContent.ts
│   │   ├── styles/
│   │   │   ├── fonts.css
│   │   │   ├── globals.css
│   │   │   ├── index.css
│   │   │   ├── tailwind.css
│   │   │   └── theme.css
│   │   ├── api.ts
│   │   └── main.tsx
│   ├── .gitignore
│   ├── ATTRIBUTIONS.md
│   ├── default_shadcn_theme.css
│   ├── index.html
│   ├── package.json
│   ├── pnpm-workspace.yaml
│   ├── postcss.config.mjs
│   ├── README.md
│   └── vite.config.ts
├── desktop/
│   ├── atmosfera-backend.spec
│   └── run_frozen.py
├── frontend/
│   ├── guidelines/
│   │   └── Guidelines.md
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── admin/
│   │   │   │   │   ├── AdminApp.tsx
│   │   │   │   │   └── ContentEditor.tsx
│   │   │   │   ├── client/
│   │   │   │   │   └── ClientApp.tsx
│   │   │   │   ├── figma/
│   │   │   │   │   └── ImageWithFallback.tsx
│   │   │   │   ├── landing/
│   │   │   │   │   ├── Contact.tsx
│   │   │   │   │   ├── Footer.tsx
│   │   │   │   │   ├── Hero.tsx
│   │   │   │   │   ├── LandingPage.tsx
│   │   │   │   │   ├── Navbar.tsx
│   │   │   │   │   ├── Pricing.tsx
│   │   │   │   │   ├── Services.tsx
│   │   │   │   │   ├── StudioInfo.tsx
│   │   │   │   │   ├── Testimonials.tsx
│   │   │   │   │   ├── Works.tsx
│   │   │   │   │   └── WorksPage.tsx
│   │   │   │   ├── owner/
│   │   │   │   │   └── OwnerApp.tsx
│   │   │   │   ├── shared/
│   │   │   │   │   ├── AttendanceTable.tsx
│   │   │   │   │   └── ServiceSearchSelect.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   └── (48 shadcn/ui-файлов — не индексируются)
│   │   │   │   └── worker/
│   │   │   │       ├── WorkerApp.tsx
│   │   │   │       └── WorkerCalendar.tsx
│   │   │   ├── constants/
│   │   │   │   └── referralSources.ts
│   │   │   ├── context/
│   │   │   │   └── AppContext.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useTelegramBackButton.ts
│   │   │   │   └── useTelegramMainButton.ts
│   │   │   ├── utils/
│   │   │   │   ├── complaints.ts
│   │   │   │   ├── date.ts
│   │   │   │   ├── useVisualViewport.ts
│   │   │   │   └── validation.ts
│   │   │   ├── api.ts
│   │   │   └── App.tsx
│   │   ├── imports/
│   │   │   └── pasted_text/
│   │   │       └── telegram-webapp-design.txt
│   │   ├── styles/
│   │   │   ├── fonts.css
│   │   │   ├── index.css
│   │   │   ├── tailwind.css
│   │   │   └── theme.css
│   │   └── main.tsx
│   ├── .env.desktop
│   ├── .env.example
│   ├── ATTRIBUTIONS.md
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── README.md
│   └── vite.config.ts
├── native/
│   └── electron/
│       ├── src/
│       │   └── main.js
│       ├── install-run.bat
│       └── package.json
├── scripts/
│   ├── .project-map-watch.lock
│   ├── generate_project_map.py
│   ├── install-tunnel-watchdog-task.ps1
│   ├── run-backend-local.bat
│   ├── run-backend-local.ps1
│   ├── run-bot-polling.bat
│   ├── run-tunnel-watchdog.ps1
│   ├── start-project-map-watch.vbs
│   ├── start-tunnel-watchdog.bat
│   ├── start_localhostrun_tunnel.cmd
│   ├── start_pinggy_tunnel.cmd
│   └── watch-project-map.bat
├── Showcase/
│   ├── guidelines/
│   │   └── Guidelines.md
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── figma/
│   │   │   │   │   └── ImageWithFallback.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   └── (48 shadcn/ui-файлов — не индексируются)
│   │   │   │   ├── BookingSection.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── GallerySection.tsx
│   │   │   │   ├── HeroSection.tsx
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── PricingSection.tsx
│   │   │   │   ├── ServicesSection.tsx
│   │   │   │   └── TestimonialsSection.tsx
│   │   │   └── App.tsx
│   │   ├── styles/
│   │   │   ├── fonts.css
│   │   │   ├── globals.css
│   │   │   ├── index.css
│   │   │   ├── tailwind.css
│   │   │   └── theme.css
│   │   └── main.tsx
│   ├── ATTRIBUTIONS.md
│   ├── default_shadcn_theme.css
│   ├── index.html
│   ├── package.json
│   ├── pnpm-workspace.yaml
│   ├── postcss.config.mjs
│   ├── README.md
│   └── vite.config.ts
├── .dockerignore
├── .gitignore
├── .python-version
├── .vercelignore
├── AGENTS.md
├── amvera.yml
├── app.py
├── DEPLOY_AMVERA.md
├── DEPLOY_RENDER_SUPABASE.md
├── DEPLOY_VERCEL.md
├── Dockerfile
├── render.yaml
├── requirements.txt
├── start-native.bat
└── vercel.json
```

## Backend (Python)

### backend/app/__init__.py (1 строк)

### backend/app/complaints.py (98 строк)

Классы и функции (9):

- `class ComplaintStatus: active_count: int reduction_active: bool reduction_until: datetime | None effective_percent: floa` (стр. 16)
- `as_utcdef as_utc(value: datetime) -> datetime: if value.tzinfo is None: return value.replace(tzinfo=timezone.utc) return value.astimezone(timezone.utc)` (стр. 23)
- `clamp_worker_percentdef clamp_worker_percent(value: float) -> float: return max(0, min(float(value), WORKER_MAX_PERCENT))` (стр. 29)
- `complaint_active_untildef complaint_active_until(created_at: datetime) -> datetime: return as_utc(created_at) + timedelta(days=COMPLAINT_DURATION_DAYS)` (стр. 33)
- `complaint_end_atdef complaint_end_at(complaint: Any) -> datetime: revoked_at = getattr(complaint, "revoked_at", None) if revoked_at is not None: return as_utc(revoked_at) active_until = getattr(co` (стр. 37)
- `complaint_is_active_atdef complaint_is_active_at(complaint: Any, at: datetime | None = None) -> bool: current = as_utc(at or datetime.now(timezone.utc)) starts_at = as_utc(getattr(complaint, "created_at` (стр. 47)
- `complaint_status_for_percentdef complaint_status_for_percent( base_percent: float, complaints: Iterable[Any], *, at: datetime | None = None,` (стр. 54)
- `parse_booking_datetimedef parse_booking_datetime(date_value: str, time_value: str) -> datetime | None: try: parsed = datetime.strptime(f"{date_value} {time_value}", "%d.%m.%Y %H:%M") except ValueError: ` (стр. 80)
- `adjusted_booking_percentdef adjusted_booking_percent( assigned_percent: float, complaints: Iterable[Any], *, date_value: str, time_value: str, fallback: datetime | None = None,` (стр. 88)

### backend/app/config.py (126 строк)

Классы и функции (7):

- `class Settings: app_name: str environment: str is_production: bool app_secret: str telegram_bot_token: str | None webapp` (стр. 24)
- `_parse_booldef _parse_bool(raw: str | None, default: bool) -> bool: if raw is None: return default return raw.strip().lower() in {"1", "true", "yes", "on"}` (стр. 44)
- `_parse_telegram_delivery_modedef _parse_telegram_delivery_mode(raw: str | None) -> str: value = (raw or "polling").strip().lower() if value not in {"polling", "webhook"}: raise ValueError("TELEGRAM_DELIVERY_MO` (стр. 50)
- `_normalize_webhook_pathdef _normalize_webhook_path(raw: str | None) -> str: value = (raw or "/api/telegram/webhook").strip() or "/api/telegram/webhook" if not value.startswith("/"):` (стр. 57)
- `_normalize_database_urldef _normalize_database_url(raw: str) -> str: if raw.startswith("postgres://"):` (стр. 64)
- `_normalize_environmentdef _normalize_environment() -> tuple[str, bool]: raw = ( os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or os.getenv("VERCEL_ENV") or "development" ).strip().lower() aliases = {` (стр. 72)
- `get_settingsdef get_settings() -> Settings: PERSISTENT_DATA_DIR.mkdir(parents=True, exist_ok=True) environment, is_production = _normalize_environment() raw_origins = os.getenv("CORS_ORIGINS",` (стр. 89)

### backend/app/exports.py (2904 строк)

Классы и функции (39):

- `class ExportMetric: label: str value: str @dataclass(frozen=True)` (стр. 85)
- `class OwnerExportData: owner_name: str company_name: str generated_at: datetime period_from: str period_to: str …` (стр. 97)
- `class GeneratedExport: file_name: str media_type: str content: bytes telegram_caption: str ReportPeriod = Literal["daily` (стр. 135)
- `class OwnerSummaryReport: title: str message: str @dataclass(frozen=True)` (стр. 159)
- `class OwnerSummaryContext: company_name: str generated_at: datetime period: ReportPeriod segment: ReportSegment period_l` (стр. 171)
- `class OwnerSummaryExportData: owner_name: str company_name: str title: str generated_at: datetime period_label: str …` (стр. 195)
- `build_owner_summary_reportdef build_owner_summary_report( *, company_name: str, bookings: list[Booking], services: list[Service], expenses: list[Expense] | None = None, incomes: list[Income] | None = None, ` (стр. 233)
- `OwnerSummaryExportData._parse_ddmmyyyydef _parse_ddmmyyyy(value: str) -> datetime | None: try: return datetime.strptime(value.strip(), "%d.%m.%Y") except ValueError: return None` (стр. 305)
- `OwnerSummaryExportData._in_perioddef _in_period(date_str: str) -> bool: dt = _parse_ddmmyyyy(date_str) if dt is None: return False # Сравниваем без timezone (period_start/end могут быть aware) ps = period_start.re` (стр. 317)
- `build_owner_summary_exportdef build_owner_summary_export( *, owner: StaffUser, company_name: str, bookings: list[Booking], services: list[Service], penalties: list[Penalty] | None = None, piggy_transactions` (стр. 479)
- `_build_owner_summary_contextdef _build_owner_summary_context( *, company_name: str, bookings: list[Booking], services: list[Service], period: ReportPeriod, segment: ReportSegment, now: datetime | None = None,` (стр. 567)
- `_summary_headerdef _summary_header(context: OwnerSummaryContext) -> str: return f"{context.company_name}\n{context.title}\nПериод: {context.period_label}"` (стр. 651)
- `_build_owner_summary_export_datadef _build_owner_summary_export_data( *, owner_name: str, context: OwnerSummaryContext, penalties: list[Penalty] | None = None,` (стр. 659)
- `_summary_period_boundsdef _summary_period_bounds(period: ReportPeriod, current: datetime) -> tuple[datetime, datetime, str]: end_at = current.replace(hour=0, minute=0, second=0, microsecond=0) + timedel` (стр. 1477)
- `_summary_period_labeldef _summary_period_label(period_start: datetime, period_end: datetime) -> str: last_day = period_end - timedelta(days=1) if period_start.date() == last_day.date():` (стр. 1495)
- `_booking_matches_segmentdef _booking_matches_segment(booking: Booking, service: Service | None, segment: ReportSegment) -> bool: if service is not None and service.category: category = service.category.st` (стр. 1509)
- `build_owner_exportdef build_owner_export( *, kind: ExportKind, owner: StaffUser, company_name: str, bookings: list[Booking], expenses: list[Expense], penalties: list[Penalty], workers: list[StaffUse` (стр. 1535)
- `_build_export_datadef _build_export_data( *, owner: StaffUser, company_name: str, bookings: list[Booking], expenses: list[Expense], penalties: list[Penalty], workers: list[StaffUser], stock_items: l` (стр. 1623)
- `OwnerSummaryExportData._is_fixed_bookingdef _is_fixed_booking(booking: Booking) -> bool: # привязка строго по названию — "подготовка к полировке" всегда фиксированная if is_fixed_master_service(booking.service):` (стр. 1705)
- `_render_excel_reportdef _render_excel_report(data: OwnerExportData) -> bytes: workbook = Workbook() summary = workbook.active summary.title = "Сводка" summary.merge_cells("A1:D1") summary["A1"] = data` (стр. 2221)
- `_render_owner_summary_excel_reportdef _render_owner_summary_excel_report(data: OwnerSummaryExportData) -> bytes: workbook = Workbook() summary = workbook.active summary.title = "Сводка" summary.merge_cells("A1:D1")` (стр. 2289)
- `_append_sheetdef _append_sheet(workbook: Workbook, title: str, headers: list[str], rows: list[list[Any]], *, currency_cols: set[int] | None = None) -> None: sheet = workbook.create_sheet(title)` (стр. 2465)
- `_render_pdf_reportdef _render_pdf_report(data: OwnerExportData) -> bytes: buffer = io.BytesIO() font_name = _pdf_font_name() styles = getSampleStyleSheet() title_style = ParagraphStyle("OwnerTitle",` (стр. 2495)
- `_pdf_sectiondef _pdf_section(story: list[Any], section_style: ParagraphStyle, font_name: str, title: str, headers: list[str], rows: list[list[Any]]) -> None: story.append(Paragraph(title, sect` (стр. 2581)
- `_pdf_tabledef _pdf_table(rows: list[list[Any]], font_name: str, header_color: str = "#0E1624") -> LongTable: normalized = [[Paragraph(_escape(str(cell)), _pdf_cell_style(font_name)) for cell` (стр. 2597)
- `_format_rowsdef _format_rows(rows: list[list[Any]], *, currency_cols: set[int]) -> list[list[Any]]: formatted: list[list[Any]] = [] for row in rows: next_row = [] for index, value in enumerate` (стр. 2637)
- `_style_headingdef _style_heading(sheet, *cells: str) -> None: if cells: sheet[cells[0]].font = Font(size=16, bold=True, color="0B1226") for cell_name in cells[1:]: sheet[cell_name].font = Font(s` (стр. 2667)
- `_style_tabledef _style_table(sheet, header_row: int, start_row: int, end_row: int, end_col: int) -> None: header_fill = PatternFill(fill_type="solid", fgColor="0A84FF") header_font = Font(bold` (стр. 2681)
- `_apply_currencydef _apply_currency(cell) -> None: cell.number_format = '#,##0 "руб."' cell.alignment = Alignment(horizontal="right", vertical="center")` (стр. 2723)
- `_autosizedef _autosize(sheet) -> None: for column in sheet.columns: letter = get_column_letter(column[0].column) max_length = 0 for cell in column: max_length = max(max_length, len("" if ce` (стр. 2733)
- `_pdf_font_namedef _pdf_font_name() -> str: candidates = [ str(Path(__file__).resolve().parent / "assets" / "fonts" / "NotoSans-Regular.ttf"), os.getenv("OWNER_EXPORT_FONT_PATH", ""), "C:/Windows` (стр. 2753)
- `_pdf_cell_styledef _pdf_cell_style(font_name: str) -> ParagraphStyle: return ParagraphStyle("OwnerExportCell", fontName=font_name, fontSize=7.5, leading=9, textColor=colors.HexColor("#111827"))` (стр. 2803)
- `_booking_datetimedef _booking_datetime(booking: Booking) -> datetime | None: raw = f"{booking.date} {booking.time}".strip() for fmt in ("%d.%m.%Y %H:%M", "%Y-%m-%d %H:%M"):` (стр. 2811)
- `_booking_sort_keydef _booking_sort_key(booking: Booking) -> tuple[datetime, datetime]: local_now = datetime.now().astimezone() booking_dt = _booking_datetime(booking) primary = _as_local_datetime(b` (стр. 2831)
- `_as_local_datetimedef _as_local_datetime(value: datetime, reference: datetime) -> datetime: target_tz = reference.tzinfo if value.tzinfo is None: return value.replace(tzinfo=target_tz) return value.` (стр. 2847)
- `_parse_date_for_sortdef _parse_date_for_sort(value: str) -> datetime: for fmt in ("%d.%m.%Y", "%Y-%m-%d"):` (стр. 2861)
- `_format_datetimedef _format_datetime(value: datetime | None) -> str: if value is None: return "" return value.astimezone().strftime("%d.%m.%Y %H:%M") if value.tzinfo is not None else value.strftim` (стр. 2879)
- `_format_moneydef _format_money(value: int) -> str: return f"{value:,.0f}".replace(",", " ") + " руб."` (стр. 2891)
- `_escapedef _escape(value: str) -> str: return escape(value).replace("\n", "<br/>")` (стр. 2899)

### backend/app/main.py (17432 строк)

Роуты (82):

```
  `PATCH /api/clients/me` -> `update_client_me` (декоратор: стр. 8756)
  `PATCH /api/clients/{client_id}/card` -> `update_client_card` (декоратор: стр. 8812)
  `GET /api/health` -> `health` (декоратор: стр. 8900)
  `GET /api/content` -> `get_public_content` (декоратор: стр. 9016)
  `PUT /api/content` -> `save_content` (декоратор: стр. 9030)
  `POST /api/upload` -> `upload_file` (декоратор: стр. 9070)
  `GET /api/uploads/{filename}` -> `serve_upload` (декоратор: стр. 9110)
  `POST /api/contact` -> `submit_contact` (декоратор: стр. 9138)
  `POST settings.telegram_webhook_path` -> `handle_telegram_webhook` (декоратор: стр. 9188)
  `POST /api/telegram/webhook/sync` -> `resync_telegram_webhook` (декоратор: стр. 9238)
  `GET /api/stock-categories` -> `list_stock_categories` (декоратор: стр. 9279)
  `POST /api/stock-categories` -> `create_stock_category` (декоратор: стр. 9292)
  `PATCH /api/stock-categories/{category_id}` -> `update_stock_category` (декоратор: стр. 9310)
  `DELETE /api/stock-categories/{category_id}` -> `delete_stock_category` (декоратор: стр. 9329)
  `GET /api/shift-checklists` -> `get_booking_availability` (декоратор: стр. 9350)
  `POST /api/bookings` -> `create_booking` (декоратор: стр. 9396)
  `PATCH /api/bookings/{booking_id}` -> `update_booking` (декоратор: стр. 10428)
  `DELETE /api/bookings/{booking_id}` -> `delete_booking` (декоратор: стр. 11098)
  `POST /api/bookings/{booking_id}/services` -> `add_booking_service` (декоратор: стр. 11196)
  `POST /api/bookings/{booking_id}/additional-services` -> `add_booking_additional_service` (декоратор: стр. 11262)
  `DELETE /api/bookings/{booking_id}/additional-services/{additional_service_id}` -> `remove_booking_additional_service` (декоратор: стр. 11364)
  `POST /api/notifications` -> `create_notification` (декоратор: стр. 11438)
  `PATCH /api/notifications/{notification_id}/read` -> `mark_notification_read` (декоратор: стр. 11518)
  `POST /api/notifications/read-all` -> `mark_all_notifications_read` (декоратор: стр. 11596)
  `POST /api/stock-items` -> `create_stock_item` (декоратор: стр. 11662)
  `PATCH /api/stock-items/{item_id}` -> `update_stock_item` (декоратор: стр. 11698)
  `POST /api/stock-items/{item_id}/write-off` -> `write_off_stock` (декоратор: стр. 11746)
  `GET /api/stock/write-off-history` -> `get_write_off_history` (декоратор: стр. 11795)
  `DELETE /api/stock-items/{item_id}` -> `delete_stock_item` (декоратор: стр. 11826)
  `GET /api/shift-checklists` -> `list_shift_checklists` (декоратор: стр. 11862)
  `POST /api/shift-checklists` -> `submit_shift_checklist` (декоратор: стр. 11904)
  `GET /api/admin/shift-inspections` -> `list_admin_shift_inspections` (декоратор: стр. 12026)
  `GET /api/admin/shift-inspections/{inspection_id}/photo` -> `get_admin_shift_inspection_photo` (декоратор: стр. 12072)
  `POST /api/admin/shift-inspections` -> `submit_admin_shift_inspection` (декоратор: стр. 12154)
  `POST /api/admin/shift-inspections/{inspection_id}/review` -> `review_admin_shift_inspection` (декоратор: стр. 12310)
  `POST /api/expenses` -> `create_expense` (декоратор: стр. 12350)
  `PATCH /api/expenses/{expense_id}` -> `update_expense` (декоратор: стр. 12424)
  `GET /api/owner/incomes` -> `list_incomes` (декоратор: стр. 12480)
  `POST /api/owner/incomes` -> `create_income` (декоратор: стр. 12528)
  `PATCH /api/owner/incomes/{income_id}` -> `update_income` (декоратор: стр. 12592)
  `GET /api/owner/piggy-bank` -> `get_piggy_bank` (декоратор: стр. 12672)
  `POST /api/owner/piggy-bank/withdraw` -> `piggy_bank_withdraw` (декоратор: стр. 13161)
  `GET /api/owner/wallet` -> `get_wallet` (декоратор: стр. 13337)
  `GET /api/owner/workers/{worker_id}/shift-attendance` -> `get_worker_shift_attendance` (декоратор: стр. 13530)
  `GET /api/owner/shift-attendance` -> `get_all_workers_shift_attendance` (декоратор: стр. 13626)
  `GET /api/worker/shift-attendance` -> `get_own_shift_attendance` (декоратор: стр. 13706)
  `GET /api/worker/calendar` -> `get_worker_calendar_bookings` (декоратор: стр. 13774)
  `POST /api/penalties` -> `create_penalty` (декоратор: стр. 13883)
  `POST /api/penalties/{penalty_id}/revoke` -> `revoke_penalty` (декоратор: стр. 14033)
  `POST /api/workers/{worker_id}/penalties/revoke-all` -> `revoke_all_worker_penalties` (декоратор: стр. 14175)
  `POST /api/telegram/link-code` -> `generate_telegram_link_code` (декоратор: стр. 14321)
  `PUT /api/settings/services` -> `save_services` (декоратор: стр. 14375)
  `PUT /api/settings/boxes` -> `save_boxes` (декоратор: стр. 14459)
  `PUT /api/settings/schedule` -> `save_schedule` (декоратор: стр. 14517)
  `PUT /api/settings/admin/profile` -> `save_admin_profile` (декоратор: стр. 14565)
  `PUT /api/settings/admin/notifications` -> `save_admin_notifications` (декоратор: стр. 14639)
  `PUT /api/settings/workers/{worker_id}/profile` -> `save_worker_profile` (декоратор: стр. 14663)
  `PUT /api/settings/workers/{worker_id}/notifications` -> `save_worker_notifications` (декоратор: стр. 14723)
  `PUT /api/settings/owner/company` -> `save_owner_company` (декоратор: стр. 14765)
  `PUT /api/settings/owner/notifications` -> `save_owner_notifications` (декоратор: стр. 14789)
  `PUT /api/settings/owner/integrations` -> `save_owner_integrations` (декоратор: стр. 14813)
  `PUT /api/settings/owner/security` -> `save_owner_security` (декоратор: стр. 14837)
  `PUT /api/workers/settings` -> `save_worker_settings` (декоратор: стр. 14873)
  `GET /api/admin/workers/payroll` -> `get_admin_workers_payroll` (декоратор: стр. 14976)
  `PUT /api/admin/workers/payroll` -> `save_admin_worker_payroll` (декоратор: стр. 15057)
  `POST /api/payroll/entries` -> `create_payroll_entry` (декоратор: стр. 15129)
  `PUT /api/payroll/entries/{entry_id}` -> `update_payroll_entry` (декоратор: стр. 15336)
  `PUT /api/payroll/booking-workers/{link_id}/override-earned` -> `update_booking_worker_override_earned` (декоратор: стр. 15432)
  `GET /api/owner/workers/{worker_id}/salary-detail` -> `owner_worker_salary_detail` (декоратор: стр. 15558)
  `GET /api/worker/salary-detail` -> `worker_my_salary_detail` (декоратор: стр. 15948)
  `POST /api/owner/workers/{worker_id}/pay-salary` -> `owner_worker_pay_salary` (декоратор: стр. 16325)
  `GET /api/owner/owners/salary-detail` -> `owner_salary_detail` (декоратор: стр. 16495)
  `POST /api/owner/owners/pay-salary` -> `owner_pay_salary` (декоратор: стр. 16715)
  `POST /api/workers` -> `create_worker` (декоратор: стр. 16925)
  `POST /api/workers/{worker_id}/reset-password` -> `reset_worker_password` (декоратор: стр. 17061)
  `DELETE /api/workers/{worker_id}` -> `fire_worker` (декоратор: стр. 17121)
  `GET /api/auth/session` -> `get_session_bootstrap` (декоратор: стр. 17315)
  `GET /api/auth/consent/check` -> `check_consent` (декоратор: стр. 17323)
  `POST /api/auth/consent` -> `record_consent` (декоратор: стр. 17335)
  `GET /api/auth/sessions` -> `get_active_sessions` (декоратор: стр. 17359)
  `POST /api/auth/logout` -> `logout` (декоратор: стр. 17367)
  `POST /api/auth/change-password` -> `change_password` (декоратор: стр. 17375)
```

Классы и функции (185):

- `_resolve_frontend_distdef _resolve_frontend_dist() -> Path: """Каталог собранного React-фронтенда. В обычном режиме — <project>/frontend/dist (родитель каталога app/). В frozen-режиме (PyInstaller bundl` (стр. 445)
- `_check_rate_limitdef _check_rate_limit(ip: str) -> None: global _last_rate_limit_cleanup now = time_module.time() window_start = now - _LOGIN_RATE_LIMIT_WINDOW # Periodic cleanup of stale entries t` (стр. 657)
- `serve_single_page_appasync def serve_single_page_app(request: Request, call_next): path = request.url.path index_file = frontend_dist / "index.html" if request.method not in {"GET", "HEAD"}: return awa` (стр. 741)
- `on_startupdef on_startup() -> None: global bot_thread Base.metadata.create_all(bind=engine) _apply_runtime_migrations() db = next(get_db()) try: seed_database(db, include_demo_staff=settings` (стр. 793)
- `_nowdef _now() -> datetime: return datetime.now(timezone.utc)` (стр. 877)
- `_as_utcdef _as_utc(value: datetime) -> datetime: if value.tzinfo is None: return value.replace(tzinfo=timezone.utc) return value.astimezone(timezone.utc)` (стр. 885)
- `_format_moscow_dtdef _format_moscow_dt(dt: datetime | None) -> str: if dt is None: return "" msk = dt.astimezone(timezone(timedelta(hours=3))) return msk.strftime("%H:%M %d.%m.%Y")` (стр. 894)
- `_request_ipdef _request_ip(request: Request) -> str: # For rate limiting, prefer direct client IP to prevent X-Forwarded-For spoofing if request.client is not None and request.client.host: re` (стр. 905)
- `_safe_textdef _safe_text(value: Any) -> str: return value if isinstance(value, str) else ""` (стр. 925)
- `_client_by_phonedef _client_by_phone(db: Session, phone: str) -> Client | None: if not phone.strip():` (стр. 933)
- `_owner_querydef _owner_query(): return ( select(StaffUser) .where(StaffUser.role == "owner") .order_by(StaffUser.created_at.asc(), StaffUser.id.asc()) )` (стр. 971)
- `_primary_ownerdef _primary_owner(db: Session) -> StaffUser | None: return db.scalar( select(StaffUser) .where(StaffUser.role == "owner", StaffUser.is_primary_owner.is_(True)) .order_by(StaffUser` (стр. 987)
- `_ensure_permanent_telegram_ownersdef _ensure_permanent_telegram_owners(db: Session) -> None: """Гарантирует, что владельцы с зашитыми Telegram ID существуют и активны. На каждом старте бэка: * снимает chat_id с лю` (стр. 1003)
- `_ensure_owner_accountsdef _ensure_owner_accounts(db: Session) -> None: owners = db.scalars(_owner_query()).all() primary_owner = next((owner for owner in owners if owner.is_primary_owner), None) if prim` (стр. 1121)
- `_device_labeldef _device_label(user_agent: str) -> str: if "Telegram-Android" in user_agent: return "Telegram Android" if "Telegram-iOS" in user_agent: return "Telegram iPhone" if "iPhone" in u` (стр. 1249)
- `_apply_runtime_migrationsdef _apply_runtime_migrations() -> None: from sqlalchemy import text def boolean_default_sql(value: bool) -> str:` (стр. 1285)
- `boolean_default_sqldef boolean_default_sql(value: bool) -> str: if engine.dialect.name == "postgresql": return "TRUE" if value else "FALSE" return "1" if value else "0"` (стр. 1289)
- `ensure_postgres_varchar_lengthdef ensure_postgres_varchar_length( table_name: str, column_name: str, minimum_length: int` (стр. 1299)
- `ensure_postgres_text_columndef ensure_postgres_text_column(table_name: str, column_name: str) -> None: if engine.dialect.name != "postgresql": return column = next( ( item for item in inspect(engine).get_col` (стр. 1345)
- `_repair_text_valuedef _repair_text_value(value: str) -> str: if not value or not any(ord(char) > 127 for char in value):` (стр. 2145)
- `_repair_nested_textdef _repair_nested_text(value): if isinstance(value, str):` (стр. 2165)
- `_repair_model_text_fieldsdef _repair_model_text_fields(db: Session, model, fields: tuple[str, ...]) -> bool: changed = False for item in db.scalars(select(model)).all():` (стр. 2185)
- `_sanitize_notification_messagedef _sanitize_notification_message(message: str) -> str: fixed = _repair_text_value(message).strip() for source, target in { "вЂў": "•", "в€¢": "•", "вВў": "•", "â€¢": "•", "вЂ”": ` (стр. 2213)
- `_repair_text_datadef _repair_text_data(db: Session) -> None: changed = False changed |= _repair_model_text_fields( db, StaffUser, ("name", "city", "experience", "specialty", "about"), ) changed |= ` (стр. 2247)
- `_settingdef _setting(db: Session, key: str, default: dict) -> dict: row = db.get(AppSetting, key) if row: return row.value row = AppSetting(key=key, value=default) db.add(row) db.flush() r` (стр. 2393)
- `_merge_setting_dictdef _merge_setting_dict(value: Any, default: dict[str, Any]) -> dict[str, Any]: if not isinstance(value, dict):` (стр. 2413)
- `_normalize_client_vehiclesdef _normalize_client_vehicles( vehicles: list[ClientVehiclePayload] | list[dict[str, Any]] | None, *, fallback_car: str = "", fallback_plate: str = "",` (стр. 2437)
- `_client_vehicles_mapdef _client_vehicles_map(db: Session) -> dict[str, Any]: return _setting(db, "client_vehicles", {})` (стр. 2531)
- `_client_vehicles_payloaddef _client_vehicles_payload(db: Session, client: Client) -> list[ClientVehiclePayload]: raw = _client_vehicles_map(db).get(client.id, []) return _normalize_client_vehicles( raw, f` (стр. 2539)
- `_save_client_vehiclesdef _save_client_vehicles( db: Session, client_id: str, vehicles: list[ClientVehiclePayload]` (стр. 2553)
- `_client_phone_verifications_mapdef _client_phone_verifications_map(db: Session) -> dict[str, Any]: value = _setting(db, CLIENT_PHONE_VERIFICATIONS_KEY, {}) return value if isinstance(value, dict) else {}` (стр. 2573)
- `_client_verified_phone_digitsdef _client_verified_phone_digits(db: Session, telegram_id: str | None) -> str | None: if not telegram_id: return None entry = _client_phone_verifications_map(db).get(str(telegram_` (стр. 2583)
- `_client_phone_is_verifieddef _client_phone_is_verified(db: Session, telegram_id: str | None, phone: str) -> bool: if not phone.strip():` (стр. 2603)
- `_require_client_phone_verificationdef _require_client_phone_verification( db: Session, telegram_id: str | None, phone: str` (стр. 2629)
- `_client_payloaddef _client_payload(client: Client | None) -> ClientProfilePayload | None: if client is None: return None with Session(engine) as vehicles_db: vehicles = _client_vehicles_payload(v` (стр. 2651)
- `_client_summary_payloaddef _client_summary_payload( client: Client, db: Session | None = None` (стр. 2691)
- `_booking_status_labeldef _booking_status_label(status_value: str) -> str: return { "new": "Новая заявка", "confirmed": "Подтверждена", "scheduled": "Запланирована", "in_progress": "В работе", "complete` (стр. 2740)
- `_booking_status_short_labeldef _booking_status_short_label(status_value: str) -> str: return { "new": "Новая", "confirmed": "Подтв.", "scheduled": "Запл.", "in_progress": "В работе", "completed": "Завершена"` (стр. 2766)
- `_format_local_datetimedef _format_local_datetime(value: datetime) -> str: return _as_utc(value).astimezone().strftime("%d.%m.%Y %H:%M")` (стр. 2792)
- `_parse_booking_datetimedef _parse_booking_datetime(date_value: str, time_value: str) -> datetime | None: raw = f"{date_value.strip()} {time_value.strip()}" for fmt in ("%d.%m.%Y %H:%M", "%Y-%m-%d %H:%M")` (стр. 2800)
- `_py_weekday_to_schedule_indexdef _py_weekday_to_schedule_index(py_weekday: int) -> int: return (py_weekday + 2) % 7` (стр. 2820)
- `_parse_time_to_minutesdef _parse_time_to_minutes(time_value: str) -> int | None: raw = time_value.strip() if len(raw) != 5 or raw[2] != ":": return None try: hours = int(raw[:2]) minutes = int(raw[3:]) ` (стр. 2828)
- `_today_labeldef _today_label() -> str: return datetime.now().strftime("%d.%m.%Y")` (стр. 2856)
- `_build_schedule_slotsdef _build_schedule_slots( open_minutes: int, close_minutes: int, step_minutes: int = 30` (стр. 2864)
- `_booking_requires_scheduled_slotdef _booking_requires_scheduled_slot(status_value: str) -> bool: return status_value in BOOKING_ACTIVE_STATUSES` (стр. 2888)
- `_booking_slot_fields_changeddef _booking_slot_fields_changed(booking: Booking, updates: dict) -> bool: if "date" in updates and (updates.get("date") or "").strip() != (booking.date or "").strip():` (стр. 2896)
- `_booking_time_rangedef _booking_time_range( date_value: str, time_value: str, duration: int` (стр. 2916)
- `_time_ranges_overlapdef _time_ranges_overlap( start_at: datetime, end_at: datetime, other_start_at: datetime, other_end_at: datetime,` (стр. 2934)
- `_ensure_booking_datetime_not_in_pastdef _ensure_booking_datetime_not_in_past(date_value: str, time_value: str, role: str) -> None: if role in {"admin", "owner"}: return scheduled_at = _parse_booking_datetime(date_val` (стр. 2952)
- `_ensure_booking_within_scheduledef _ensure_booking_within_schedule( db: Session, date_value: str, time_value: str, duration: int` (стр. 2986)
- `_box_is_availabledef _box_is_available( db: Session, *, booking_id: str | None, date_value: str, time_value: str, duration: int, box: str,` (стр. 3060)
- `_pick_available_boxdef _pick_available_box( db: Session, *, booking_id: str | None, date_value: str, time_value: str, duration: int, resource_group: str | None = None, preferred_box: str | None = Non` (стр. 3130)
- `_booking_slot_availabilitydef _booking_slot_availability( db: Session, *, date_value: str, duration: int, service_id: str | None = None, resource_group: str | None = None,` (стр. 3192)
- `_ensure_booking_has_no_conflictsdef _ensure_booking_has_no_conflicts( db: Session, *, booking_id: str | None, date_value: str, time_value: str, duration: int, box: str, worker_ids: set[str], …` (стр. 3344)
- `_load_penaltiesdef _load_penalties( db: Session, *, worker_ids: set[str] | None = None` (стр. 3508)
- `_complaints_by_workerdef _complaints_by_worker(penalties: list[Penalty]) -> dict[str, list[Penalty]]: grouped: dict[str, list[Penalty]] = {} for penalty in penalties: grouped.setdefault(penalty.worker_` (стр. 3534)
- `_normalize_worker_rulesdef _normalize_worker_rules(db: Session) -> None: changed = False workers = db.scalars(select(StaffUser).where(StaffUser.role == "worker")).all() for worker in workers: capped_perc` (стр. 3548)
- `_worker_payloaddef _worker_payload(worker: StaffUser) -> WorkerPayload: return WorkerPayload( id=worker.id, role=worker.role, # type: ignore[arg-type] name=worker.name, experience=worker.experien` (стр. 3602)
- `_payroll_entry_payloaddef _payroll_entry_payload(entry: PayrollEntry, actor_name: str) -> PayrollEntryPayload: return PayrollEntryPayload( id=entry.id, workerId=entry.worker_id, kind=entry.kind, # type:` (стр. 3642)
- `_worker_payroll_summariesdef _worker_payroll_summaries( db: Session, workers: list[StaffUser], complaints_by_worker: dict[str, list[Penalty]],` (стр. 3668)
- `_worker_payroll_summaries_from_datadef _worker_payroll_summaries_from_data( db: Session, workers: list[StaffUser], completed_bookings: list[Booking], entries: list[PayrollEntry], complaints_by_worker: dict[str, list` (стр. 3707)
- `_worker_payload_with_payrolldef _worker_payload_with_payroll( worker: StaffUser, payroll_summaries: dict[str, WorkerPayrollSummaryPayload] | None = None,` (стр. 3839)
- `_booking_payloaddef _booking_payload( booking: Booking, complaints_by_worker: dict[str, list[Penalty]] | None = None` (стр. 3863)
- `_notification_payloaddef _notification_payload(notification: Notification) -> NotificationPayload: return NotificationPayload( id=notification.id, recipientRole=notification.recipient_role, # type: ign` (стр. 4024)
- `_stock_payloaddef _stock_payload(item: StockItem) -> StockItemPayload: return StockItemPayload( id=item.id, name=item.name, qty=item.qty, unit=item.unit, unitPrice=item.unit_price, category=item` (стр. 4046)
- `_expense_payloaddef _expense_payload(expense: Expense) -> ExpensePayload: return ExpensePayload( id=expense.id, title=expense.title, amount=expense.amount, category=expense.category, date=expense.` (стр. 4062)
- `_penalty_payloaddef _penalty_payload(penalty: Penalty) -> PenaltyPayload: worker_name = penalty.worker.name if penalty.worker else "" return PenaltyPayload( id=penalty.id, workerId=penalty.worker_` (стр. 4086)
- `_service_payloaddef _service_payload(service: Service) -> ServicePayload: return ServicePayload( id=service.id, name=service.name, category=service.category, price=service.price, duration=service.` (стр. 4116)
- `_box_payloaddef _box_payload(box: Box) -> BoxPayload: return BoxPayload( id=box.id, name=box.name, resourceGroup=(box.resource_group or DEFAULT_RESOURCE_GROUP).strip() or DEFAULT_RESOURCE_GROU` (стр. 4160)
- `_visible_boxesdef _visible_boxes(db: Session) -> list[Box]: boxes = db.scalars(select(Box).order_by(Box.name.asc())).all() wash_order_map = {name: index for index, name in enumerate(WASH_BOX_NAM` (стр. 4184)
- `box_orderdef box_order(box: Box) -> tuple[int, int, str, str]: resource_group = _resource_group_key( box.resource_group or _default_box_resource_group(box) ) if resource_group == DETAILING_` (стр. 4194)
- `_schedule_payloaddef _schedule_payload(entry: ScheduleEntry) -> SchedulePayload: return SchedulePayload( dayIndex=entry.day_index, day=entry.day_label, open=entry.open_time, close=entry.close_time,` (стр. 4230)
- `_settings_payloaddef _settings_payload(db: Session) -> SettingsBundlePayload: admin_profile_default = { "name": "Администратор", "email": "", "phone": "", "telegramChatId": "", } admin_notification` (стр. 4250)
- `_empty_settings_payloaddef _empty_settings_payload() -> SettingsBundlePayload: return SettingsBundlePayload( adminProfile=AdminProfilePayload( name="", email="", phone="", telegramChatId="" ), adminNotif` (стр. 4470)
- `_scoped_settings_payloaddef _scoped_settings_payload( db: Session, role: str, actor_id: str` (стр. 4550)
- `_session_payloaddef _session_payload(session_data: dict) -> SessionPayload: return SessionPayload( role=session_data["role"], actorId=session_data["actorId"], sessionId=session_data.get("sessionId` (стр. 4636)
- `_mark_overdue_bookings_for_admin_reviewdef _mark_overdue_bookings_for_admin_review(db: Session) -> None: now_local = datetime.now().replace(second=0, microsecond=0) changed = False for booking in db.scalars( select(Book` (стр. 4656)
- `_build_bootstrapdef _build_bootstrap(db: Session, session_data: dict) -> BootstrapPayload: role = session_data["role"] actor_id = session_data["actorId"] _mark_overdue_bookings_for_admin_review(db` (стр. 4700)
- `_resolve_user_from_init_datadef _resolve_user_from_init_data(authorization: str, db: Session) -> dict | None: try: validated = validate_telegram_init_data(authorization, settings.telegram_bot_token) except Va` (стр. 5014)
- `_require_sessiondef _require_session( authorization: str | None = Header(default=None), db: Session = Depends(get_db),` (стр. 5108)
- `_ensure_staff_roledef _ensure_staff_role(session_data: dict, allowed: set[str]) -> None: if session_data["role"] not in allowed: raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Fo` (стр. 5142)
- `_validated_booking_workersdef _validated_booking_workers( db: Session, workers: list[BookingWorkerPayload]` (стр. 5152)
- `_booking_payload_for_responsedef _booking_payload_for_response(db: Session, booking: Booking) -> BookingPayload: worker_ids = {link.worker_id for link in booking.worker_links} penalties = _load_penalties(db, w` (стр. 5248)
- `_sync_booking_workersdef _sync_booking_workers( db: Session, booking: Booking, workers: list[BookingWorkerPayload]` (стр. 5260)
- `_sync_booking_materialsdef _sync_booking_materials( db: Session, booking: Booking, materials: list[BookingMaterialPayload]` (стр. 5290)
- `_send_telegram_safedef _send_telegram_safe(chat_id: str | None, text: str) -> None: if not chat_id: return try: send_telegram_message(chat_id, text) except Exception: pass` (стр. 5309)
- `_telegram_display_namedef _telegram_display_name(telegram_user: dict, fallback: str) -> str: first_name = str(telegram_user.get("first_name") or "").strip() last_name = str(telegram_user.get("last_name"` (стр. 5327)
- `_owner_two_factor_recipientdef _owner_two_factor_recipient(db: Session) -> StaffUser: owner = _primary_owner(db) if owner is None: raise HTTPException( status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail` (стр. 5343)
- `_all_active_ownersdef _all_active_owners(db: Session) -> list[StaffUser]: """Возвращает всех активных владельцев, отсортированных по created_at asc.""" return list( db.scalars( select(StaffUser) .wh` (стр. 5373)
- `_all_owner_telegram_recipientsdef _all_owner_telegram_recipients(db: Session) -> list[StaffUser]: """Возвращает всех владельцев с непустым telegram_chat_id, отсортированных по created_at asc.""" return list( db` (стр. 5395)
- `_booking_reminder_target_datedef _booking_reminder_target_date(days_ahead: int = 1) -> str: return (datetime.now() + timedelta(days=days_ahead)).strftime("%d.%m.%Y")` (стр. 5423)
- `_worker_notification_settings_mapdef _worker_notification_settings_map(db: Session) -> dict[str, dict[str, Any]]: return _setting(db, "worker_notification_settings", {})` (стр. 5431)
- `_booking_reminder_statedef _booking_reminder_state(db: Session) -> dict[str, Any]: return _setting(db, BOOKING_REMINDER_STATE_KEY, {"deliveries": {}})` (стр. 5439)
- `_return_reminder_statedef _return_reminder_state(db: Session) -> dict[str, Any]: return _setting(db, RETURN_REMINDER_STATE_KEY, {"deliveries": {}})` (стр. 5447)
- `_shift_checklists_statedef _shift_checklists_state(db: Session) -> list[dict[str, Any]]: value = _setting(db, SHIFT_CHECKLISTS_KEY, []) return value if isinstance(value, list) else []` (стр. 5455)
- `_admin_shift_inspections_statedef _admin_shift_inspections_state(db: Session) -> list[dict[str, Any]]: value = _setting(db, ADMIN_SHIFT_INSPECTIONS_KEY, []) return value if isinstance(value, list) else []` (стр. 5465)
- `_compute_shift_attendancedef _compute_shift_attendance( inspections: list[dict], worker_id: str, date_from: date, date_to: date,` (стр. 5475)
- `_period_to_date_rangedef _period_to_date_range(period: str) -> tuple[date, date]: """ Преобразует строковый период в диапазон дат (date_from, date_to). - ``week`` → последние 7 дней - ``month`` → после` (стр. 5605)
- `_admin_shift_owner_bot_statedef _admin_shift_owner_bot_state(db: Session) -> dict[str, Any]: value = _setting(db, ADMIN_SHIFT_OWNER_BOT_STATE_KEY, {"pendingIssueByChat": {}}) return value if isinstance(value,` (стр. 5651)
- `_cleanup_booking_reminder_deliveriesdef _cleanup_booking_reminder_deliveries(deliveries: dict[str, Any]) -> dict[str, str]: threshold = _now() - timedelta(days=14) cleaned: dict[str, str] = {} for key, value in deliv` (стр. 5661)
- `_cleanup_return_reminder_deliveriesdef _cleanup_return_reminder_deliveries(deliveries: dict[str, Any]) -> dict[str, str]: threshold = _now() - timedelta(days=30) cleaned: dict[str, str] = {} for key, value in delive` (стр. 5681)
- `_booking_client_reminder_messagedef _booking_client_reminder_message(booking: Booking) -> str: return ( "Напоминание о записи\n" f"Услуга: {booking.service}\n" f"Дата: {booking.date} {booking.time}\n" f"Бокс: {bo` (стр. 5701)
- `_booking_worker_reminder_messagedef _booking_worker_reminder_message(booking: Booking, worker_name: str) -> str: return ( f"Напоминание мастеру {worker_name}\n" f"Клиент: {booking.client_name}\n" f"Услуга: {booki` (стр. 5721)
- `_dispatch_booking_remindersdef _dispatch_booking_reminders( db: Session, *, target_date: str | None = None, force: bool = False,` (стр. 5741)
- `_dispatch_return_visit_remindersdef _dispatch_return_visit_reminders(db: Session) -> int: reminder_state = _return_reminder_state(db) deliveries = reminder_state.get("deliveries") if not isinstance(deliveries, di` (стр. 6003)
- `_shift_checklist_payloaddef _shift_checklist_payload(entry: dict[str, Any]) -> ShiftChecklistPayload: return ShiftChecklistPayload( id=str(entry.get("id") or ""), workerId=str(entry.get("workerId") or "")` (стр. 6113)
- `_chemistry_stock_itemsdef _chemistry_stock_items(db: Session) -> list[StockItem]: return db.scalars( select(StockItem) .where(StockItem.category == "Химия") .order_by(StockItem.name.asc()) ).all()` (стр. 6167)
- `_latest_shift_checklist_entrydef _latest_shift_checklist_entry( entries: list[dict[str, Any]], worker_id: str, phase: str` (стр. 6183)
- `_clean_data_url_prefixdef _clean_data_url_prefix(data_url: str) -> str: return data_url.split(",", 1)[1] if "," in data_url else data_url` (стр. 6205)
- `_decode_data_url_imagedef _decode_data_url_image(data_url: str) -> tuple[str, bytes]: raw = data_url.strip() if not raw.startswith("data:image/"):` (стр. 6213)
- `_admin_shift_inspection_suppliesdef _admin_shift_inspection_supplies(db: Session) -> list[dict[str, Any]]: items = db.scalars( select(StockItem) .where(StockItem.category.in_(("Химия", "Расходники"))) .order_by(S` (стр. 6279)
- `_admin_shift_inspection_payloaddef _admin_shift_inspection_payload( entry: dict[str, Any],` (стр. 6337)
- `_admin_shift_captiondef _admin_shift_caption(entry: dict[str, Any]) -> str: checked_supplies = [ item.get("name") for item in entry.get("supplies", []) if isinstance(item, dict) and item.get("checked"` (стр. 6426)
- `_admin_shift_owner_inline_keyboarddef _admin_shift_owner_inline_keyboard(inspection_id: str) -> dict[str, Any]: return { "inline_keyboard": [ [ { "text": "Подтвердить", "callback_data": f"shiftapprove:{inspection_i` (стр. 6478)
- `_notify_owner_about_admin_shiftdef _notify_owner_about_admin_shift(db: Session, entry: dict[str, Any]) -> None: caption = _admin_shift_caption(entry) mime_type, photo_bytes = _decode_data_url_image( str(entry.ge` (стр. 6506)
- `_apply_admin_shift_reviewdef _apply_admin_shift_review( db: Session, inspection_id: str, *, action: str, issue_note: str, owner_actor_id: str,` (стр. 6576)
- `_serialize_state_datetimedef _serialize_state_datetime(value: datetime | None) -> str | None: if value is None: return None return _as_utc(value).isoformat()` (стр. 6696)
- `_parse_state_datetimedef _parse_state_datetime(value: Any) -> datetime | None: if not value: return None if not isinstance(value, str):` (стр. 6708)
- `_owner_database_reset_statedef _owner_database_reset_state(db: Session) -> dict[str, Any] | None: row = db.get(AppSetting, OWNER_DATABASE_RESET_SETTING_KEY) if row is None or not isinstance(row.value, dict):` (стр. 6730)
- `_save_owner_database_reset_statedef _save_owner_database_reset_state( db: Session, value: dict[str, Any]` (стр. 6744)
- `_clear_owner_database_reset_statedef _clear_owner_database_reset_state(db: Session) -> None: row = db.get(AppSetting, OWNER_DATABASE_RESET_SETTING_KEY) if row is not None: db.delete(row) db.flush()` (стр. 6756)
- `_normalize_database_reset_phrasedef _normalize_database_reset_phrase(value: str) -> str: normalized = " ".join(value.replace("\n", " ").split()).strip().upper() return normalized.replace("Ё", "Е")` (стр. 6770)
- `_owner_database_reset_previewdef _owner_database_reset_preview( db: Session,` (стр. 6780)
- `_owner_database_reset_warningsdef _owner_database_reset_warnings( preview: OwnerDatabaseResetPreviewPayload,` (стр. 6834)
- `_perform_owner_database_resetdef _perform_owner_database_reset(db: Session) -> None: db.execute(sa_delete(TelegramLinkCode)) db.execute(sa_delete(Notification)) db.execute(sa_delete(BookingWorker)) db.execute(` (стр. 6874)
- `_parse_datedef _parse_date(s: str) -> date | None: if "." in s: parts = s.split(".") try: return date(int(parts[2]), int(parts[1]), int(parts[0])) except (ValueError, IndexError):` (стр. 6938)
- `_owner_export_filedef _owner_export_file( db: Session, actor_id: str, kind: str, segment: str = "all", date_from: str | None = None, date_to: str | None = None,` (стр. 6964)
- `_in_rangedef _in_range(d: str | None) -> bool: if not d: return True parsed = _parse_date(d) if not parsed: return True if parsed_from and parsed < parsed_from: return False if parsed_to an` (стр. 7108)
- `_download_responsedef _download_response(export_file: GeneratedExport) -> Response: return Response( content=export_file.content, media_type=export_file.media_type, headers={ "Content-Disposition": ` (стр. 7186)
- `class _PartialBroadcastError(Exception):` (стр. 7206)
- `_PartialBroadcastError.__init__def __init__(self, payload: TelegramBroadcastPayload) -> None: super().__init__("partial broadcast failure") self.payload = payload` (стр. 7212)
- `_send_export_to_telegramdef _send_export_to_telegram( db: Session, actor_id: str, export_file: GeneratedExport` (стр. 7222)
- `_owner_summary_reportdef _owner_summary_report( db: Session, actor_id: str, period: str, segment: str` (стр. 7342)
- `_owner_summary_export_filedef _owner_summary_export_file( db: Session, actor_id: str, period: str, segment: str` (стр. 7460)
- `_send_owner_summary_reportdef _send_owner_summary_report( db: Session, actor_id: str, report: OwnerSummaryReport, export_file: GeneratedExport,` (стр. 7576)
- `_booking_car_labeldef _booking_car_label(car: str | None, plate: str | None) -> str: car_value = (car or "").strip() or "Авто не указано" plate_value = (plate or "").strip() return f"{car_value}, {p` (стр. 7712)
- `_admin_booking_notification_titledef _admin_booking_notification_title( client_name: str, car: str | None, plate: str | None` (стр. 7724)
- `_booking_datetime_labeldef _booking_datetime_label(date: str | None, time: str | None) -> str: if not (date or "").strip():` (стр. 7736)
- `_admin_booking_notification_textdef _admin_booking_notification_text( client_name: str, car: str | None, plate: str | None, date: str | None, time: str | None,` (стр. 7752)
- `_notify_admins_about_bookingdef _notify_admins_about_booking(db: Session, booking: Booking) -> None: admins = db.scalars( select(StaffUser).where(StaffUser.role == "admin", StaffUser.active.is_(True)) ).all()` (стр. 7772)
- `_notify_owners_about_bookingdef _notify_owners_about_booking(db: Session, booking: Booking) -> None: owners = _all_owner_telegram_recipients(db) text = ( "Новая запись\n" f"Клиент: {booking.client_name}\n" f"` (стр. 7804)
- `_service_category_keydef _service_category_key(value: str | None) -> str: return (value or "").strip().lower()` (стр. 7832)
- `_resource_group_keydef _resource_group_key(value: str | None) -> str: return (value or "").strip().lower() or DEFAULT_RESOURCE_GROUP` (стр. 7840)
- `_normalized_textdef _normalized_text(value: str | None) -> str: return (value or "").strip()` (стр. 7848)
- `_default_service_resource_groupdef _default_service_resource_group(service: Service | None) -> str: if service is None: return DEFAULT_RESOURCE_GROUP return _resource_group_for_service_category(service.category)` (стр. 7856)
- `_default_box_resource_groupdef _default_box_resource_group(box: Box | None) -> str: if box is None: return DEFAULT_RESOURCE_GROUP name_key = (box.name or "").strip().lower() description_key = (box.descriptio` (стр. 7868)
- `_service_resource_groupdef _service_resource_group(service: Service | None) -> str: if service is None: return DEFAULT_RESOURCE_GROUP return _resource_group_key( service.resource_group or _default_servic` (стр. 7888)
- `_compatible_box_namesdef _compatible_box_names(db: Session, resource_group: str | None) -> list[str]: target_group = _resource_group_key(resource_group) return [ box.name for box in db.scalars( select(` (стр. 7904)
- `_is_box_rental_servicedef _is_box_rental_service(service: Service | None) -> bool: return ( service is not None and _service_category_key(service.category) == "аренда бокса" )` (стр. 7930)
- `_is_detailing_servicedef _is_detailing_service(service: Service | None) -> bool: return ( service is not None and _service_category_key(service.category) == "детейлинг" )` (стр. 7944)
- `_resource_group_for_service_categorydef _resource_group_for_service_category(category: str | None) -> str: category_key = _service_category_key(category) if category_key == "детейлинг": return DETAILING_RESOURCE_GROU` (стр. 7956)
- `_box_by_namedef _box_by_name(db: Session, box_name: str) -> Box | None: return db.scalar(select(Box).where(Box.name == box_name))` (стр. 7970)
- `_normalize_service_and_box_resourcesdef _normalize_service_and_box_resources(db: Session) -> None: changed = False services = db.scalars(select(Service)).all() for service in services: expected_group = _default_servi` (стр. 7978)
- `_box_hourly_pricedef _box_hourly_price(db: Session, box_name: str, fallback_price: int) -> int: box = _box_by_name(db, box_name) if box is not None and box.price_per_hour > 0: return box.price_per_` (стр. 8200)
- `_payment_type_labeldef _payment_type_label(payment_type: str) -> str: return { "cash": "Наличные", "transfer": "Перевод", "invoice": "По счёту", }.get(payment_type, payment_type)` (стр. 8214)
- `_booking_payment_labeldef _booking_payment_label(booking: Booking) -> str: if not booking.payment_settled: return "Не оплачено" return _payment_type_label(booking.payment_type)` (стр. 8230)
- `_notify_ownersdef _notify_owners(db: Session, text: str) -> None: db.add( Notification( id=f"n-{uuid4()}", recipient_role="owner", recipient_id=None, message=text, read=False, created_at=_now(),` (стр. 8242)
- `_booking_receipt_textdef _booking_receipt_text(booking: Booking, *, worker_name: str | None = None) -> str: worker_line = f"\nМастер: {worker_name}" if worker_name else "" return ( "Чек по записи\n" f"` (стр. 8278)
- `_notify_booking_completion_receiptdef _notify_booking_completion_receipt( db: Session, booking: Booking, *, worker_name: str | None = None` (стр. 8308)
- `_notify_owner_about_worker_booking_eventdef _notify_owner_about_worker_booking_event( db: Session, booking: Booking, *, worker_name: str, event_label: str` (стр. 8380)
- `_notify_workers_about_assignmentdef _notify_workers_about_assignment( db: Session, booking: Booking, worker_ids: set[str]` (стр. 8421)
- `_notify_workers_about_notedef _notify_workers_about_note( db: Session, booking: Booking, worker_ids: set[str]` (стр. 8507)
- `_notify_workers_about_rescheduledef _notify_workers_about_reschedule( db: Session, booking: Booking, worker_ids: set[str], previous_date: str, previous_time: str, previous_box: str,` (стр. 8577)
- `_payroll_entry_labeldef _payroll_entry_label(kind: str) -> str: return { "bonus": "премия", "advance": "аванс", "deduction": "удержание", "payout": "выплата", "adjustment": "корректировка", }.get(kind` (стр. 8665)
- `_notify_worker_about_payroll_entrydef _notify_worker_about_payroll_entry( db: Session, worker: StaffUser, *, actor_role: str, actor_id: str, kind: str, amount: int, note: str, …` (стр. 8685)
- `_default_contentdef _default_content() -> ContentPayload: return ContentPayload( hero=ContentHeroPayload(), about=ContentAboutPayload( text=( "<b>\u2728 \u041e \u0441\u0442\u0443\u0434\u0438\u0438` (стр. 8916)
- `_get_or_create_contentdef _get_or_create_content(db: Session) -> ContentPayload: row = db.get(AppSetting, "content") if row is None or not isinstance(row.value, dict):` (стр. 8996)
- `_write_off_booking_materialsdef _write_off_booking_materials(db: Session, booking: Booking) -> None: if booking.materials_written_off: print(f"[WRITE_OFF] skip booking {booking.id[:8]} — already written off")` (стр. 9911)
- `_booking_materials_costdef _booking_materials_cost(db: Session, booking: Booking) -> int: """Фактическая стоимость материалов по записи; fallback — материалы услуги со склада.""" materials_cost = 0 for b` (стр. 9997)
- `_booking_money_splitdef _booking_money_split( db: Session, booking: Booking, complaints_by_worker: dict[str, list] | None = None,` (стр. 10016)
- `_PartialBroadcastError._compute_masterdef _compute_master(base: int) -> tuple[dict[str, int], int]: """Доля мастеров: явные суммы (override/fixed) + сервисный режим/проценты профиля от base.""" master_by_worker: dict[s` (стр. 10045)
- `_PartialBroadcastError._compute_piggydef _compute_piggy(base: int) -> int: if piggy_pay_type == "fixed": return piggy_pay_value if piggy_pay_type == "percent": return round(base * piggy_pay_value / 100) if piggy_pay_t` (стр. 10122)
- `_PartialBroadcastError._allocate_ownersdef _allocate_owners(claimed: int, limit: int) -> tuple[int, dict[str, int]]: owner_by_owner: dict[str, int] = {} if claimed <= 0 or not owner_split_enabled: return 0, owner_by_own` (стр. 10133)
- `_process_piggy_bank_for_bookingdef _process_piggy_bank_for_booking(db: Session, booking: Booking) -> None: """Auto-deposit 24% into piggy bank for detailing bookings and repay material withdrawals for any servic` (стр. 10204)
- `_process_owner_profit_sharedef _process_owner_profit_share(db: Session, booking: Booking) -> None: """Расчёт доли владельцев: цена → материалы → мастера → копилка → остаток владельцам (50/50).""" split = _bo` (стр. 10360)
- `_PartialBroadcastError._parse_date_strdef _parse_date_str(s: str) -> date | None: try: if "." in s: parts = s.split(".") return date(int(parts[2]), int(parts[1]), int(parts[0])) return date.fromisoformat(s) except (Val` (стр. 12694)
- `_PartialBroadcastError._in_rangedef _in_range(d: str | None) -> bool: if not d: return True parsed = _parse_date_str(d) if not parsed: return True if parsed_from and parsed < parsed_from: return False if parsed_t` (стр. 12718)
- `_week_boundsdef _week_bounds() -> tuple[date, date]: today = date.today() saturday = today - timedelta(days=(today.weekday() - 5) % 7) friday = saturday + timedelta(days=6) return saturday, fr` (стр. 13313)
- `_dmydef _dmy(d: date) -> str: return f"{d.day:02d}.{d.month:02d}.{d.year}"` (стр. 13324)
- `_dmy_to_datedef _dmy_to_date(s: str) -> date: return datetime.strptime(s.strip(), "%d.%m.%Y").date()` (стр. 13329)
- `_upsert_settingdef _upsert_setting(db: Session, key: str, value: dict) -> dict: row = db.get(AppSetting, key) if row is None: row = AppSetting(key=key, value=value) db.add(row) else: row.value = ` (стр. 14353)
- `_salary_date_rangedef _salary_date_range(period: str, ref: date | None = None, custom_from: str | None = None, custom_to: str | None = None) -> tuple[str, str]: """Возвращает (date_from, date_to) в ` (стр. 15472)
- `is_fixed_master_servicedef is_fixed_master_service(name: str | None) -> bool: return bool(name) and name.strip().lower() == FIXED_MASTER_SERVICE_NAME` (стр. 15528)
- `_is_fixed_master_service_dbdef _is_fixed_master_service_db(db: Session, service_id: str | None, service_name: str | None) -> bool: """Определяет, оплачивается ли услуга мастеру фиксированно. Привязка СТРОГО ` (стр. 15533)
- `_resource_group_for_servicedef _resource_group_for_service(db: Session, service_id: str) -> str: svc = db.get(Service, service_id) return svc.resource_group if svc else "wash"` (стр. 15548)

### backend/app/models.py (524 строк)

Классы и функции (26):

- `utc_nowdef utc_now() -> datetime: return datetime.now(timezone.utc)` (стр. 15)
- `class Client(Base):` (стр. 19)
- `class StaffUser(Base):` (стр. 50)
- `class Service(Base):` (стр. 99)
- `class Box(Base):` (стр. 125)
- `class ScheduleEntry(Base):` (стр. 136)
- `class Booking(Base):` (стр. 147)
- `class BookingWorker(Base):` (стр. 194)
- `class BookingAdditionalService(Base):` (стр. 210)
- `class BookingMaterial(Base):` (стр. 231)
- `class AdditionalServiceWorker(Base):` (стр. 253)
- `class Notification(Base):` (стр. 270)
- `class StockCategory(Base):` (стр. 283)
- `class StockItem(Base):` (стр. 305)
- `class Expense(Base):` (стр. 325)
- `class StockWriteOff(Base):` (стр. 340)
- `class Penalty(Base):` (стр. 364)
- `class PayrollEntry(Base):` (стр. 391)
- `class TelegramLinkCode(Base):` (стр. 413)
- `class AppSetting(Base):` (стр. 428)
- `class UploadedFile(Base):` (стр. 435)
- `class DataConsent(Base):` (стр. 445)
- `class Income(Base):` (стр. 453)
- `class WeeklyArchive(Base):` (стр. 472)
- `class PiggyBankTransaction(Base):` (стр. 490)
- `class OwnerProfitShare(Base):` (стр. 509)

### backend/app/schemas.py (1562 строк)

Классы и функции (161):

- `normalize_person_namedef normalize_person_name(value: str) -> str: normalized = re.sub(r"\s+", " ", value).strip() if len(normalized) < 1: raise ValueError("Введите настоящее имя") if not NAME_PATTERN.` (стр. 50)
- `normalize_phone_digitsdef normalize_phone_digits(value: str) -> str: digits = re.sub(r"\D", "", value) if len(digits) == 10: digits = f"7{digits}" elif len(digits) == 11 and digits[0] in {"7", "8"}: dig` (стр. 59)
- `normalize_phonedef normalize_phone(value: str) -> str: digits = normalize_phone_digits(value) return f"+7 ({digits[1:4]}) {digits[4:7]}-{digits[7:9]}-{digits[9:11]}"` (стр. 72)
- `normalize_vehicle_namedef normalize_vehicle_name(value: str) -> str: normalized = re.sub(r"\s+", " ", value).strip() letters_only = "".join(char for char in normalized if char.isalpha()) if not normaliz` (стр. 77)
- `normalize_platedef normalize_plate(value: str, plate_type: str = "russian") -> str: if plate_type == "foreign": normalized = re.sub(r"[^A-Za-z0-9]", "", value).lower() if not normalized: raise Va` (стр. 93)
- `class ClientVehiclePayload(BaseModel):` (стр. 156)
- `ClientVehiclePayload.validate_vehicledef validate_vehicle(self) -> "ClientVehiclePayload": if self.car.strip():` (стр. 163)
- `class ClientProfilePayload(BaseModel):` (стр. 171)
- `class ClientProfileInput(BaseModel):` (стр. 182)
- `ClientProfileInput.validate_namedef validate_name(cls, value: str) -> str: return normalize_person_name(value)` (стр. 193)
- `ClientProfileInput.validate_phonedef validate_phone(cls, value: str) -> str: if not value.strip():` (стр. 198)
- `ClientProfileInput.validate_vehicledef validate_vehicle(self) -> "ClientProfileInput": if self.plate.strip():` (стр. 204)
- `class ClientSummaryPayload(BaseModel):` (стр. 210)
- `class ClientCreateRequest(BaseModel):` (стр. 226)
- `ClientCreateRequest.validate_namedef validate_name(cls, value: str) -> str: return normalize_person_name(value)` (стр. 237)
- `ClientCreateRequest.validate_phonedef validate_phone(cls, value: str) -> str: if not value.strip():` (стр. 242)
- `ClientCreateRequest.validate_vehicledef validate_vehicle(self) -> "ClientCreateRequest": if self.car.strip():` (стр. 248)
- `class WorkerPayload(BaseModel):` (стр. 256)
- `class PayrollEntryPayload(BaseModel):` (стр. 275)
- `class WorkerPayrollBookingPayload(BaseModel):` (стр. 286)
- `class WorkerPayrollSummaryPayload(BaseModel):` (стр. 299)
- `class SalaryBookingItem(BaseModel):` (стр. 324)
- `class SalaryPayoutItem(BaseModel):` (стр. 344)
- `class SalaryDetailResponse(BaseModel):` (стр. 352)
- `class PaySalaryRequest(BaseModel):` (стр. 369)
- `class PaySalaryResponse(BaseModel):` (стр. 378)
- `class BookingWorkerPayload(BaseModel):` (стр. 385)
- `class BookingServiceItem(BaseModel):` (стр. 393)
- `class AdditionalServiceWorkerPayload(BaseModel):` (стр. 400)
- `class AdditionalServicePayload(BaseModel):` (стр. 408)
- `class AddAdditionalServiceRequest(BaseModel):` (стр. 419)
- `class BookingPayload(BaseModel):` (стр. 427)
- `class WorkerCalendarBookingPayload(BaseModel):` (стр. 456)
- `class BookingAvailabilitySlotPayload(BaseModel):` (стр. 471)
- `class BookingAvailabilityPayload(BaseModel):` (стр. 478)
- `class NotificationPayload(BaseModel):` (стр. 484)
- `class StockCategoryPayload(BaseModel):` (стр. 493)
- `class StockItemPayload(BaseModel):` (стр. 499)
- `class BookingMaterialPayload(BaseModel):` (стр. 509)
- `class ShiftChecklistItemPayload(BaseModel):` (стр. 518)
- `class ShiftChecklistPayload(BaseModel):` (стр. 527)
- `class ShiftChecklistSubmitItem(BaseModel):` (стр. 537)
- `class ShiftChecklistSubmitRequest(BaseModel):` (стр. 542)
- `class AdminShiftInspectionSupplyPayload(BaseModel):` (стр. 548)
- `class AdminShiftInspectionMasterPayload(BaseModel):` (стр. 557)
- `class AdminShiftInspectionPayload(BaseModel):` (стр. 563)
- `class AdminShiftInspectionSubmitSupply(BaseModel):` (стр. 580)
- `class AdminShiftInspectionSubmitMaster(BaseModel):` (стр. 585)
- `class AdminShiftInspectionSubmitRequest(BaseModel):` (стр. 590)
- `class AdminShiftInspectionReviewRequest(BaseModel):` (стр. 598)
- `class ExpensePayload(BaseModel):` (стр. 603)
- `class PenaltyPayload(BaseModel):` (стр. 613)
- `class TelegramLinkCodePayload(BaseModel):` (стр. 625)
- `class ServicePayload(BaseModel):` (стр. 631)
- `class DetailingRequestCreateRequest(BaseModel):` (стр. 655)
- `DetailingRequestCreateRequest.validate_cardef validate_car(cls, value: str | None) -> str | None: if value is None: return None return normalize_vehicle_name(value)` (стр. 664)
- `DetailingRequestCreateRequest.validate_plate_fielddef validate_plate_field(self) -> "DetailingRequestCreateRequest": if self.plate is not None: if not self.plate.strip():` (стр. 670)
- `class BoxPayload(BaseModel):` (стр. 679)
- `class SchedulePayload(BaseModel):` (стр. 688)
- `class AdminNotificationSettings(BaseModel):` (стр. 696)
- `class AdminProfilePayload(BaseModel):` (стр. 704)
- `class WorkerNotificationSettings(BaseModel):` (стр. 711)
- `class WorkerProfilePayload(BaseModel):` (стр. 719)
- `class OperatingMode(str, Enum):` (стр. 730)
- `class OwnerCompanyPayload(BaseModel):` (стр. 735)
- `class OwnerNotificationSettings(BaseModel):` (стр. 745)
- `class OwnerIntegrationsPayload(BaseModel):` (стр. 755)
- `class OwnerSecurityPayload(BaseModel):` (стр. 762)
- `class AuthSessionPayload(BaseModel):` (стр. 766)
- `class EmployeeSettingPayload(BaseModel):` (стр. 775)
- `class WorkerCreateRequest(BaseModel):` (стр. 786)
- `class PayrollEntryCreateRequest(BaseModel):` (стр. 798)
- `PayrollEntryCreateRequest.validate_notedef validate_note(cls, value: str) -> str: return value.strip()` (стр. 806)
- `class PayrollEntryUpdateRequest(BaseModel):` (стр. 810)
- `PayrollEntryUpdateRequest.validate_notedef validate_note(cls, value: str) -> str: return value.strip()` (стр. 816)
- `class SettingsBundlePayload(BaseModel):` (стр. 820)
- `class SessionPayload(BaseModel):` (стр. 830)
- `class BootstrapPayload(BaseModel):` (стр. 838)
- `class ClientRegisterRequest(BaseModel):` (стр. 856)
- `ClientRegisterRequest.validate_namedef validate_name(cls, value: str) -> str: if not value.strip():` (стр. 865)
- `ClientRegisterRequest.validate_phonedef validate_phone(cls, value: str) -> str: return normalize_phone(value)` (стр. 872)
- `ClientRegisterRequest.validate_vehicledef validate_vehicle(self) -> "ClientRegisterRequest": if self.plate.strip():` (стр. 876)
- `class ConsentRecordPayload(BaseModel):` (стр. 882)
- `class ConsentCheckResponse(BaseModel):` (стр. 887)
- `class StaffLinkRequest(BaseModel):` (стр. 891)
- `class SwitchRoleRequest(BaseModel):` (стр. 896)
- `class BookingCreateRequest(BaseModel):` (стр. 900)
- `BookingCreateRequest.validate_client_namedef validate_client_name(cls, value: str) -> str: if not value.strip():` (стр. 925)
- `BookingCreateRequest.validate_client_phonedef validate_client_phone(cls, value: str) -> str: if not value.strip():` (стр. 932)
- `BookingCreateRequest.validate_vehicledef validate_vehicle(self) -> "BookingCreateRequest": if self.car is not None and self.car.strip():` (стр. 938)
- `class AddBookingServiceRequest(BaseModel):` (стр. 946)
- `class BookingUpdateRequest(BaseModel):` (стр. 953)
- `BookingUpdateRequest.validate_client_namedef validate_client_name(cls, value: str | None) -> str | None: if value is None: return None return normalize_person_name(value)` (стр. 977)
- `BookingUpdateRequest.validate_client_phonedef validate_client_phone(cls, value: str | None) -> str | None: if value is None: return None return normalize_phone(value)` (стр. 984)
- `BookingUpdateRequest.validate_vehicledef validate_vehicle(self) -> "BookingUpdateRequest": if self.car is not None and not self.car.strip():` (стр. 990)
- `class ClientCardUpdateRequest(BaseModel):` (стр. 1003)
- `ClientCardUpdateRequest.validate_namedef validate_name(cls, value: str | None) -> str | None: if value is None: return None return normalize_person_name(value)` (стр. 1018)
- `ClientCardUpdateRequest.validate_phonedef validate_phone(cls, value: str | None) -> str | None: if value is None or not value.strip():` (стр. 1025)
- `ClientCardUpdateRequest.validate_vehicledef validate_vehicle(self) -> "ClientCardUpdateRequest": if self.car is not None and not self.car.strip():` (стр. 1031)
- `class NotificationCreateRequest(BaseModel):` (стр. 1044)
- `class ReadAllNotificationsRequest(BaseModel):` (стр. 1051)
- `class StockItemCreateRequest(BaseModel):` (стр. 1055)
- `class StockItemUpdateRequest(BaseModel):` (стр. 1064)
- `class StockCategoryCreateRequest(BaseModel):` (стр. 1073)
- `class StockCategoryUpdateRequest(BaseModel):` (стр. 1078)
- `class StockWriteOffRequest(BaseModel):` (стр. 1083)
- `class StockWriteOffPayload(BaseModel):` (стр. 1087)
- `class IncomeCreateRequest(BaseModel):` (стр. 1105)
- `IncomeCreateRequest.validate_sourcedef validate_source(cls, value: str) -> str: stripped = value.strip() if not stripped: raise ValueError("source не может быть пустым или состоять только из пробелов") return stripp` (стр. 1114)
- `IncomeCreateRequest.validate_datedef validate_date(cls, value: str) -> str: if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value.strip()):` (стр. 1122)
- `class IncomePayload(BaseModel):` (стр. 1128)
- `class ExpenseCreateRequest(BaseModel):` (стр. 1139)
- `ExpenseCreateRequest.validate_datedef validate_date(cls, value: str) -> str: if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value.strip()):` (стр. 1149)
- `class PenaltyCreateRequest(BaseModel):` (стр. 1155)
- `class OwnerReminderDispatchRequest(BaseModel):` (стр. 1161)
- `class OwnerReminderDispatchPayload(BaseModel):` (стр. 1166)
- `class ChangePasswordRequest(BaseModel):` (стр. 1174)
- `class OwnerDatabaseResetPreviewPayload(BaseModel):` (стр. 1179)
- `class OwnerDatabaseResetStartRequest(BaseModel):` (стр. 1194)
- `class OwnerDatabaseResetApproveRequest(BaseModel):` (стр. 1198)
- `class OwnerDatabaseResetExecuteRequest(BaseModel):` (стр. 1204)
- `class OwnerDatabaseResetStartPayload(BaseModel):` (стр. 1208)
- `class OwnerDatabaseResetApprovePayload(BaseModel):` (стр. 1217)
- `class OwnerDatabaseResetExecutePayload(BaseModel):` (стр. 1225)
- `class ContentAboutPayload(BaseModel):` (стр. 1230)
- `class ContentServicePayload(BaseModel):` (стр. 1236)
- `class ContentWorksPayload(BaseModel):` (стр. 1247)
- `class ContentStatsPayload(BaseModel):` (стр. 1253)
- `class ContentTitlePayload(BaseModel):` (стр. 1258)
- `ContentTitlePayload.to_full_titledef to_full_title(self) -> str: return f"{self.before}{self.highlight}{self.after}"` (стр. 1263)
- `class ContentHeroPayload(BaseModel):` (стр. 1267)
- `class ContentPayload(BaseModel):` (стр. 1283)
- `class ContactPayload(BaseModel):` (стр. 1290)
- `class ResetPasswordRequest(BaseModel):` (стр. 1297)
- `class GenericMessage(BaseModel):` (стр. 1301)
- `class TelegramDeliveryResult(BaseModel):` (стр. 1305)
- `class TelegramBroadcastPayload(BaseModel):` (стр. 1311)
- `class OwnerExportDeliveryPayload(BaseModel):` (стр. 1317)
- `class ShiftAttendancePayload(BaseModel):` (стр. 1324)
- `class ExpenseUpdateRequest(BaseModel):` (стр. 1335)
- `ExpenseUpdateRequest.validate_titledef validate_title(cls, value: str | None) -> str | None: if value is None: return None stripped = value.strip() if not stripped: raise ValueError("title не может быть пустым или с` (стр. 1345)
- `ExpenseUpdateRequest.validate_datedef validate_date(cls, value: str | None) -> str | None: if value is None: return None if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):` (стр. 1355)
- `ExpenseUpdateRequest.require_at_least_one_fielddef require_at_least_one_field(self) -> "ExpenseUpdateRequest": if all(v is None for v in [self.title, self.amount, self.category, self.date, self.note]):` (стр. 1363)
- `class IncomeUpdateRequest(BaseModel):` (стр. 1369)
- `IncomeUpdateRequest.validate_sourcedef validate_source(cls, value: str | None) -> str | None: if value is None: return None stripped = value.strip() if not stripped: raise ValueError("source не может быть пустым или` (стр. 1378)
- `IncomeUpdateRequest.validate_datedef validate_date(cls, value: str | None) -> str | None: if value is None: return None if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):` (стр. 1388)
- `IncomeUpdateRequest.require_at_least_one_fielddef require_at_least_one_field(self) -> "IncomeUpdateRequest": # Use model_fields_set to detect explicitly provided fields (including null). # This allows {"note": null} to pass as` (стр. 1396)
- `class PiggyBankTransactionPayload(BaseModel):` (стр. 1404)
- `class PiggyBankWithdrawRequest(BaseModel):` (стр. 1426)
- `PiggyBankWithdrawRequest.validate_datedef validate_date(cls, value: str) -> str: if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value.strip()):` (стр. 1435)
- `class PiggyBankWashBreakdown(BaseModel):` (стр. 1441)
- `class PiggyBankDetailingBreakdown(BaseModel):` (стр. 1454)
- `class PiggyBankResponse(BaseModel):` (стр. 1465)
- `class WeeklyArchivePayload(BaseModel):` (стр. 1484)
- `class WalletResponse(BaseModel):` (стр. 1498)
- `class OwnerProfitShareItem(BaseModel):` (стр. 1515)
- `class OwnerProfitShareSummary(BaseModel):` (стр. 1532)
- `class OwnerSalaryDetailResponse(BaseModel):` (стр. 1541)
- `class PayOwnerSalaryRequest(BaseModel):` (стр. 1548)
- `class PayOwnerSalaryResponse(BaseModel):` (стр. 1554)
- `class OverrideEarnedRequest(BaseModel):` (стр. 1561)

### backend/app/security.py (84 строк)

Классы и функции (5):

- `hash_passworddef hash_password(password: str) -> str: salt = secrets.token_hex(16) digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), PASSWORD_ITERATIONS) ret` (стр. 17)
- `verify_passworddef verify_password(password: str, password_hash: str) -> bool: try: iterations_raw, salt, digest = password_hash.split("$", 2) iterations = int(iterations_raw) except ValueError: ` (стр. 23)
- `hash_one_time_codedef hash_one_time_code(code: str, secret: str) -> str: return hmac.new(secret.encode("utf-8"), code.encode("utf-8"), hashlib.sha256).hexdigest()` (стр. 33)
- `verify_one_time_codedef verify_one_time_code(code: str, expected_hash: str, secret: str) -> bool: calculated = hash_one_time_code(code, secret) return hmac.compare_digest(calculated, expected_hash)` (стр. 37)
- `validate_telegram_init_datadef validate_telegram_init_data( init_data: str, bot_token: str | None, *, skip_validation: bool = False` (стр. 42)

### backend/app/seed.py (182 строк)

Классы и функции (1):

- `seed_databasedef seed_database(db: Session, *, include_demo_staff: bool = True, is_production: bool = False) -> None: if is_production: # Never seed demo data in production include_demo_staff =` (стр. 10)

### backend/app/telegram_linking.py (94 строк)

Классы и функции (6):

- `_nowdef _now() -> datetime: return datetime.now(timezone.utc)` (стр. 13)
- `_as_utcdef _as_utc(value: datetime) -> datetime: if value.tzinfo is None: return value.replace(tzinfo=timezone.utc) return value.astimezone(timezone.utc)` (стр. 17)
- `_check_link_code_rate_limitdef _check_link_code_rate_limit(chat_id: str) -> None: now = time_module.time() window_start = now - _LINK_CODE_RATE_LIMIT_WINDOW key = str(chat_id) if key in _link_code_attempts: ` (стр. 29)
- `create_link_codedef create_link_code(db: Session, staff_id: str, lifetime_minutes: int = 10) -> TelegramLinkCode: db.execute(delete(TelegramLinkCode).where(TelegramLinkCode.staff_id == staff_id)) ` (стр. 42)
- `ensure_staff_chat_id_availabledef ensure_staff_chat_id_available( db: Session, chat_id: str | int, *, exclude_staff_id: str | None = None,` (стр. 62)
- `confirm_link_codedef confirm_link_code(db: Session, code: str, chat_id: int) -> StaffUser | None: _check_link_code_rate_limit(str(chat_id)) item = db.scalar(select(TelegramLinkCode).where(TelegramL` (стр. 80)

### backend/bot.py (662 строк)

Классы и функции (37):

- `class BotRuntime: token: str webapp_url: str api_base: str ADMIN_SHIFT_INSPECTIONS_KEY = "admin_shift_inspections" ADMIN` (стр. 28)
- `_build_runtimedef _build_runtime() -> BotRuntime: settings = get_settings() if not settings.telegram_bot_token: raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured") if not settings.webapp_` (стр. 39)
- `telegram_webhook_secretdef telegram_webhook_secret() -> str: settings = get_settings() if not settings.telegram_bot_token: raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured") raw_secret = f"{setti` (стр. 52)
- `telegram_webhook_urldef telegram_webhook_url() -> str: settings = get_settings() if not settings.webapp_url: raise RuntimeError("WEBAPP_URL is not configured") return f"{settings.webapp_url.rstrip('/'` (стр. 60)
- `_parse_retry_afterdef _parse_retry_after(details: str) -> int | None: try: parsed = json.loads(details) except json.JSONDecodeError: return None parameters = parsed.get("parameters") if not isinstan` (стр. 67)
- `_telegram_calldef _telegram_call( runtime: BotRuntime, method: str, payload: dict[str, Any] | None = None, *, max_attempts: int = 3,` (стр. 81)
- `_telegram_multipart_calldef _telegram_multipart_call( runtime: BotRuntime, method: str, fields: dict[str, Any], files: dict[str, tuple[str, str, bytes]],` (стр. 113)
- `_welcome_reply_markupdef _welcome_reply_markup(webapp_url: str) -> dict[str, Any]: return { "inline_keyboard": [ [ {"text": "✨ О нас", "web_app": {"url": f"{webapp_url}/about"}}, {"text": "📸 Наши работ` (стр. 156)
- `_configure_bot_metadatadef _configure_bot_metadata(runtime: BotRuntime) -> str | None: me = _telegram_call(runtime, "getMe") _telegram_call( runtime, "setMyCommands", { "commands": [ {"command": "start",` (стр. 170)
- `disable_telegram_webhookdef disable_telegram_webhook(*, drop_pending_updates: bool = False) -> str | None: runtime = _build_runtime() username = _configure_bot_metadata(runtime) _telegram_call(runtime, "d` (стр. 197)
- `sync_telegram_webhookdef sync_telegram_webhook(*, drop_pending_updates: bool = False) -> str | None: runtime = _build_runtime() username = _configure_bot_metadata(runtime) target_url = telegram_webhook` (стр. 204)
- `_send_text_messagedef _send_text_message( runtime: BotRuntime, chat_id: int, text: str, *, reply_markup: dict[str, Any] | None = None, parse_mode: str | None = None,` (стр. 233)
- `_send_start_messagedef _send_start_message(runtime: BotRuntime, chat_id: int) -> None: markup = _welcome_reply_markup(runtime.webapp_url) try: req = request.Request(WELCOME_PHOTO_URL) with request.ur` (стр. 264)
- `_send_about_messagedef _send_about_message(runtime: BotRuntime, chat_id: int) -> None: with session_scope() as db: row = db.get(AppSetting, "content") if row and isinstance(row.value, dict):` (стр. 300)
- `_send_works_messagedef _send_works_message(runtime: BotRuntime, chat_id: int) -> None: with session_scope() as db: row = db.get(AppSetting, "content") works = (row.value or {}).get("works", []) if ro` (стр. 313)
- `send_telegram_messagedef send_telegram_message(chat_id: str | int, text: str) -> None: runtime = _build_runtime() _send_text_message(runtime, int(chat_id), text)` (стр. 335)
- `send_telegram_documentdef send_telegram_document( chat_id: str | int, *, file_name: str, content: bytes, caption: str | None = None, mime_type: str = "application/octet-stream",` (стр. 340)
- `send_telegram_photodef send_telegram_photo( chat_id: str | int, *, file_name: str, content: bytes, caption: str | None = None, parse_mode: str | None = None, mime_type: str = "image/jpeg", reply_mark` (стр. 360)
- `_setting_dictdef _setting_dict(db, key: str, default: dict[str, Any]) -> dict[str, Any]: row = db.get(AppSetting, key) if row is None or not isinstance(row.value, dict):` (стр. 386)
- `_setting_listdef _setting_list(db, key: str) -> list[dict[str, Any]]: row = db.get(AppSetting, key) if row is None or not isinstance(row.value, list):` (стр. 393)
- `_upsert_settingdef _upsert_setting(db, key: str, value: Any) -> None: row = db.get(AppSetting, key) if row is None: row = AppSetting(key=key, value=value) db.add(row) else: row.value = value` (стр. 400)
- `_serialize_nowdef _serialize_now() -> str: return datetime.now(timezone.utc).isoformat()` (стр. 409)
- `_owner_by_chat_iddef _owner_by_chat_id(db, chat_id: int) -> StaffUser | None: return db.query(StaffUser).filter(StaffUser.role == "owner", StaffUser.telegram_chat_id == str(chat_id)).first()` (стр. 413)
- `_apply_shift_review_from_botdef _apply_shift_review_from_bot(chat_id: int, inspection_id: str, action: str, issue_note: str = "") -> str: with session_scope() as db: owner = _owner_by_chat_id(db, chat_id) if ` (стр. 417)
- `_remember_pending_issuedef _remember_pending_issue(chat_id: int, inspection_id: str) -> None: with session_scope() as db: state = _setting_dict(db, ADMIN_SHIFT_OWNER_BOT_STATE_KEY, {"pendingIssueByChat":` (стр. 457)
- `_pop_pending_issuedef _pop_pending_issue(chat_id: int) -> str | None: with session_scope() as db: state = _setting_dict(db, ADMIN_SHIFT_OWNER_BOT_STATE_KEY, {"pendingIssueByChat": {}}) pending = sta` (стр. 468)
- `_extract_contact_phonedef _extract_contact_phone(update: dict[str, Any], chat_id: int) -> str | None: message = update.get("message") or {} contact = message.get("contact") or {} phone_number = contact.` (стр. 480)
- `_store_client_phone_verificationdef _store_client_phone_verification(chat_id: int, phone_digits: str) -> None: with session_scope() as db: current = _setting_dict(db, CLIENT_PHONE_VERIFICATIONS_KEY, {}) current[s` (стр. 495)
- `_extract_chat_iddef _extract_chat_id(update: dict[str, Any]) -> int | None: callback = update.get("callback_query") or {} callback_message = callback.get("message") or {} callback_chat = callback_` (стр. 505)
- `_extract_textdef _extract_text(update: dict[str, Any]) -> str: message = update.get("message") or {} text = message.get("text") return text.strip() if isinstance(text, str) else ""` (стр. 518)
- `_extract_callbackdef _extract_callback(update: dict[str, Any]) -> tuple[str, str] | None: callback = update.get("callback_query") or {} callback_id = callback.get("id") data = callback.get("data") ` (стр. 524)
- `_answer_callback_querydef _answer_callback_query(runtime: BotRuntime, callback_id: str, text: str) -> None: _telegram_call(runtime, "answerCallbackQuery", {"callback_query_id": callback_id, "text": text` (стр. 533)
- `_handle_link_commanddef _handle_link_command(chat_id: int, text: str) -> str: parts = text.split(maxsplit=1) code = parts[1].strip() if len(parts) == 2 else "" if not code.isdigit():` (стр. 537)
- `_handle_plain_codedef _handle_plain_code(chat_id: int, text: str) -> str: code = text.strip() if not (code.isdigit() and len(code) == 6):` (стр. 558)
- `_process_telegram_updatedef _process_telegram_update(runtime: BotRuntime, update: dict[str, Any]) -> None: text = _extract_text(update) chat_id = _extract_chat_id(update) if chat_id is None: return contac` (стр. 578)
- `process_telegram_updatedef process_telegram_update(update: dict[str, Any]) -> None: runtime = _build_runtime() _process_telegram_update(runtime, update)` (стр. 624)
- `run_pollingdef run_polling() -> None: logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s") runtime = _build_runtime() username = disable_telegram_webhook(dr` (стр. 629)

### backend/migrations/add_materials_written_off.py (31 строк)

Классы и функции (2):

- `upgradedef upgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS materials_written_off BOOLEAN NOT NULL DEFAULT FALSE")) conn.commit()` (стр. 16)
- `downgradedef downgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE bookings DROP COLUMN IF EXISTS materials_written_off")) conn.commit() print("Downgrade complete: remo` (стр. 23)

### backend/migrations/add_pay_type_to_workers.py (39 строк)

### backend/migrations/add_plate_type.py (33 строк)

Классы и функции (2):

- `upgradedef upgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS plate_type VARCHAR(16) NOT NULL DEFAULT 'russian'")) conn.execute(text` (стр. 16)
- `downgradedef downgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE clients DROP COLUMN IF EXISTS plate_type")) conn.execute(text("ALTER TABLE bookings DROP COLUMN IF EX` (стр. 24)

### backend/migrations/add_referral_source.py (40 строк)

Классы и функции (2):

- `add_referral_source_columndef add_referral_source_column(db_path: Path) -> None: try: conn = sqlite3.connect(str(db_path)) cursor = conn.cursor() cursor.execute("PRAGMA table_info(clients)") columns = {row[` (стр. 13)
- `maindef main() -> None: print("Adding referral_source column to client databases...") for db_file in sorted(DB_FILES):` (стр. 32)

### backend/migrations/add_service_times.py (33 строк)

Классы и функции (2):

- `upgradedef upgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS started_at TIMESTAMP")) conn.execute(text("ALTER TABLE bookings ADD C` (стр. 16)
- `downgradedef downgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE bookings DROP COLUMN IF EXISTS started_at")) conn.execute(text("ALTER TABLE bookings DROP COLUMN IF E` (стр. 24)

### backend/migrations/add_stock_write_offs.py (46 строк)

Классы и функции (2):

- `upgradedef upgrade(): with engine.connect() as conn: conn.execute(text(""" CREATE TABLE IF NOT EXISTS stock_write_offs ( id VARCHAR(64) PRIMARY KEY, stock_item_id VARCHAR(64) REFERENCES s` (стр. 16)
- `downgradedef downgrade(): with engine.connect() as conn: conn.execute(text("DROP TABLE IF EXISTS stock_write_offs")) conn.commit() print("Downgrade complete: dropped stock_write_offs table"` (стр. 38)

### backend/migrations/add_write_off_booking_fields.py (35 строк)

Классы и функции (2):

- `upgradedef upgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE stock_write_offs ADD COLUMN IF NOT EXISTS booking_client_name VARCHAR(120)")) conn.execute(text("ALTER ` (стр. 16)
- `downgradedef downgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE stock_write_offs DROP COLUMN IF EXISTS booking_client_name")) conn.execute(text("ALTER TABLE stock_wr` (стр. 25)

### backend/migrations/change_int_to_float.py (50 строк)

Классы и функции (2):

- `upgradedef upgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE stock_items ALTER COLUMN qty TYPE DOUBLE PRECISION")) conn.execute(text("ALTER TABLE stock_items ALTER ` (стр. 17)
- `downgradedef downgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE stock_items ALTER COLUMN qty TYPE INTEGER")) conn.execute(text("ALTER TABLE stock_items ALTER COLUMN ` (стр. 33)

### backend/migrations/migrate_additional_services.py (79 строк)

Классы и функции (2):

- `migrate_additional_servicesdef migrate_additional_services(db_path: Path) -> None: try: conn = sqlite3.connect(str(db_path)) cursor = conn.cursor() # Проверить, существует ли новая таблица cursor.execute("SE` (стр. 15)
- `maindef main() -> None: print("Migrating additional services from Booking.services JSON to booking_additional_services table...") for db_file in sorted(DB_FILES):` (стр. 71)

### backend/migrations/sync_client_schema.py (49 строк)

Классы и функции (2):

- `sync_client_schemadef sync_client_schema(db_path: Path) -> None: try: conn = sqlite3.connect(str(db_path)) cursor = conn.cursor() cursor.execute("PRAGMA table_info(clients)") columns = {row[1] for r` (стр. 21)
- `maindef main() -> None: print("Syncing client table schema...") for db_file in sorted(DB_FILES):` (стр. 41)

### backend/run.py (10 строк)

### backend/tests/__init__.py (0 строк)

### backend/tests/test_attendance_endpoints.py (155 строк)

Классы и функции (10):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 21)
- `class AttendanceEndpointTests(unittest.TestCase):` (стр. 33)
- `AttendanceEndpointTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 36)
- `AttendanceEndpointTests.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 63)
- `AttendanceEndpointTests._login_staffdef _login_staff(self, login: str, password: str) -> str: response = self.client.post( "/api/auth/staff/login", json={"login": login, "password": password}, ) self.assertEqual(resp` (стр. 80)
- `AttendanceEndpointTests._disable_owner_two_factordef _disable_owner_two_factor(self) -> None: from app.database import SessionLocal from app.models import AppSetting with SessionLocal() as db: setting = db.get(AppSetting, "owner_` (стр. 88)
- `AttendanceEndpointTests._get_worker_iddef _get_worker_id(self, login: str) -> str: """Return the staff user id for the given login.""" from app.database import SessionLocal from app.models import StaffUser from sqlalch` (стр. 98)
- `AttendanceEndpointTests._auth_headersdef _auth_headers(token: str) -> dict[str, str]: return {"Authorization": f"Bearer {token}"}` (стр. 113)
- `AttendanceEndpointTests.test_get_all_workers_attendance_with_invalid_period_returns_422def test_get_all_workers_attendance_with_invalid_period_returns_422(self) -> None: """GET /api/owner/shift-attendance?period=invalid returns 422. Requirements: 3.4 """ response = s` (стр. 120)
- `AttendanceEndpointTests.test_worker_requesting_another_workers_attendance_via_owner_endpoint_returns_403def test_worker_requesting_another_workers_attendance_via_owner_endpoint_returns_403( self,` (стр. 132)

### backend/tests/test_booking_logic.py (4087 строк)

Классы и функции (141):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 21)
- `class BookingLogicTests(unittest.TestCase):` (стр. 33)
- `BookingLogicTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 34)
- `BookingLogicTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 53)
- `BookingLogicTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 59)
- `BookingLogicTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 68)
- `BookingLogicTests.login_clientdef login_client(self, *, name: str, phone: str, car: str = "Lada Vesta", plate: str = "A123BC") -> tuple[str, str]: response = self.client.post("/api/auth/client", json=self.clien` (стр. 77)
- `BookingLogicTests.client_auth_payloaddef client_auth_payload( self, *, name: str, phone: str, car: str = "Lada Vesta", plate: str = "A123BC", telegram_id: str | None = None,` (стр. 83)
- `BookingLogicTests.make_init_datadef make_init_data( self, telegram_id: str, *, first_name: str = "Alice", username: str | None = None, auth_date: int | None = None,` (стр. 105)
- `BookingLogicTests.telegram_webhook_secretdef telegram_webhook_secret(self) -> str: raw = f"{os.environ['APP_SECRET']}:{os.environ['TELEGRAM_BOT_TOKEN']}".encode("utf-8") return hashlib.sha256(raw).hexdigest()` (стр. 126)
- `BookingLogicTests.test_telegram_webhook_acknowledges_processing_errorsdef test_telegram_webhook_acknowledges_processing_errors(self) -> None: with patch("app.main.process_telegram_update", side_effect=RuntimeError("telegram send failed")):` (стр. 130)
- `BookingLogicTests.login_staffdef login_staff(self, login: str, password: str) -> str: response = self.client.post( "/api/auth/staff/login", json={"login": login, "password": password}, ) self.assertEqual(respo` (стр. 141)
- `BookingLogicTests.get_staffdef get_staff(self, *, login: str | None = None, staff_id: str | None = None) -> dict[str, object]: from app.database import SessionLocal from app.models import StaffUser if login ` (стр. 149)
- `BookingLogicTests.get_clientdef get_client(self, client_id: str) -> dict[str, object]: from app.database import SessionLocal from app.models import Client with SessionLocal() as db: client = db.get(Client, cl` (стр. 167)
- `BookingLogicTests.count_clientsdef count_clients(self) -> int: from app.database import SessionLocal from app.models import Client with SessionLocal() as db: return len(db.scalars(select(Client)).all())` (стр. 184)
- `BookingLogicTests.count_client_notificationsdef count_client_notifications(self, client_id: str) -> int: from app.database import SessionLocal from app.models import Notification with SessionLocal() as db: return len( db.sca` (стр. 191)
- `BookingLogicTests.test_session_schema_supports_prefixed_ids_and_long_mobile_user_agentsdef test_session_schema_supports_prefixed_ids_and_long_mobile_user_agents(self) -> None: from app.models import Booking, BookingWorker, Client, Expense, Notification, Penalty, Staf` (стр. 205)
- `BookingLogicTests.count_worker_notificationsdef count_worker_notifications(self, worker_id: str) -> int: from app.database import SessionLocal from app.models import Notification with SessionLocal() as db: return len( db.sca` (стр. 239)
- `BookingLogicTests.disable_owner_two_factordef disable_owner_two_factor(self) -> None: from app.database import SessionLocal from app.models import AppSetting with SessionLocal() as db: setting = db.get(AppSetting, "owner_s` (стр. 253)
- `BookingLogicTests.test_secondary_owner_can_login_without_primary_owner_telegram_when_2fa_cannot_rundef test_secondary_owner_can_login_without_primary_owner_telegram_when_2fa_cannot_run(self) -> None: response = self.client.post( "/api/auth/staff/login", json={"login": "owner", "` (стр. 264)
- `BookingLogicTests.set_primary_owner_telegramdef set_primary_owner_telegram(self, chat_id: str = "974738256") -> None: from app.database import SessionLocal from app.models import StaffUser with SessionLocal() as db: owner = ` (стр. 274)
- `BookingLogicTests.set_staff_telegramdef set_staff_telegram(self, login: str, chat_id: str) -> None: from app.database import SessionLocal from app.models import StaffUser with SessionLocal() as db: staff = db.scalar(` (стр. 285)
- `BookingLogicTests.verify_client_phonedef verify_client_phone(self, telegram_id: str, phone: str) -> None: from bot import _store_client_phone_verification from app.schemas import normalize_phone_digits _store_client_p` (стр. 296)
- `BookingLogicTests.test_cron_requires_configured_secretdef test_cron_requires_configured_secret(self) -> None: self.shutdown_app() os.environ.pop("CRON_SECRET", None) self.restart_app() response = self.client.get("/api/cron/reminders")` (стр. 302)
- `BookingLogicTests.test_production_requires_non_default_app_secretdef test_production_requires_non_default_app_secret(self) -> None: self.shutdown_app() os.environ["APP_ENV"] = "production" os.environ["APP_SECRET"] = "change-me" with self.assertR` (стр. 310)
- `BookingLogicTests.test_production_does_not_seed_demo_password_accountsdef test_production_does_not_seed_demo_password_accounts(self) -> None: self.shutdown_app() if self.db_path.exists():` (стр. 322)
- `BookingLogicTests.test_staff_login_is_rate_limited_after_repeated_failuresdef test_staff_login_is_rate_limited_after_repeated_failures(self) -> None: for attempt in range(4):` (стр. 354)
- `BookingLogicTests.extract_owner_reset_codedef extract_owner_reset_code(message: str) -> str: prefixes = ["Код подтверждения: ", "Код подтверждения: "] for line in message.splitlines():` (стр. 375)
- `BookingLogicTests.force_owner_reset_readydef force_owner_reset_ready(self) -> None: from app.database import SessionLocal from app.models import AppSetting with SessionLocal() as db: setting = db.get(AppSetting, "owner_da` (стр. 383)
- `BookingLogicTests.auth_headersdef auth_headers(token: str) -> dict[str, str]: return {"Authorization": f"Bearer {token}"}` (стр. 397)
- `BookingLogicTests.next_active_datedef next_active_date() -> str: candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 401)
- `BookingLogicTests.test_client_booking_uses_session_client_and_forces_new_statusdef test_client_booking_uses_session_client_and_forces_new_status(self) -> None: token, actor_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") response = self.clien` (стр. 409)
- `BookingLogicTests.test_owner_can_update_client_card_notes_and_debtdef test_owner_can_update_client_card_notes_and_debt(self) -> None: _client_token, client_id = self.login_client(name="Alice", phone="+7 (999) 222-33-44") self.disable_owner_two_fa` (стр. 442)
- `BookingLogicTests.test_owner_dispatches_booking_reminders_once_per_bookingdef test_owner_dispatches_booking_reminders_once_per_booking(self) -> None: self.verify_client_phone("555111222", "+7 (999) 555-44-33") auth_response = self.client.post( "/api/auth` (стр. 467)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 528)
- `BookingLogicTests.test_client_login_tolerates_legacy_partial_settingsdef test_client_login_tolerates_legacy_partial_settings(self) -> None: from app.database import SessionLocal from app.models import AppSetting with SessionLocal() as db: owner_noti` (стр. 570)
- `BookingLogicTests.test_client_booking_uses_other_active_box_when_first_is_busydef test_client_booking_uses_other_active_box_when_first_is_busy(self) -> None: admin_token = self.login_staff("admin", "admin") booking_date = self.next_active_date() admin_respon` (стр. 608)
- `BookingLogicTests.test_detailing_booking_uses_detailing_room_and_keeps_slots_separatedef test_detailing_booking_uses_detailing_room_and_keeps_slots_separate(self) -> None: admin_token = self.login_staff("admin", "admin") booking_date = self.next_active_date() wash_` (стр. 660)
- `BookingLogicTests.test_booking_rejects_box_time_overlapdef test_booking_rejects_box_time_overlap(self) -> None: token, _ = self.login_client(name="Alice", phone="+7 (999) 111-22-33") common = { "clientId": "", "clientName": "Alice", "c` (стр. 726)
- `BookingLogicTests.test_admin_can_edit_and_complete_existing_booking_on_inactive_daydef test_admin_can_edit_and_complete_existing_booking_on_inactive_day(self) -> None: from app.database import SessionLocal from app.models import Booking, Client admin_token = self` (стр. 761)
- `BookingLogicTests.test_admin_booking_without_box_picks_available_wash_boxdef test_admin_booking_without_box_picks_available_wash_box(self) -> None: admin_token = self.login_staff("admin", "admin") booking_date = self.next_active_date() first_response = ` (стр. 817)
- `BookingLogicTests.test_admin_can_start_booking_that_ends_exactly_at_closing_timedef test_admin_can_start_booking_that_ends_exactly_at_closing_time(self) -> None: from app.database import SessionLocal from app.models import ScheduleEntry admin_token = self.logi` (стр. 867)
- `BookingLogicTests.test_admin_can_change_booking_status_without_revalidating_unchanged_slotdef test_admin_can_change_booking_status_without_revalidating_unchanged_slot(self) -> None: from app.database import SessionLocal from app.models import Booking, ScheduleEntry admi` (стр. 923)
- `BookingLogicTests.test_booking_must_fit_schedule_windowdef test_booking_must_fit_schedule_window(self) -> None: token, _ = self.login_client(name="Alice", phone="+7 (999) 111-22-33") response = self.client.post( "/api/bookings", header` (стр. 988)
- `BookingLogicTests.test_worker_cannot_update_foreign_bookingdef test_worker_cannot_update_foreign_booking(self) -> None: admin_token = self.login_staff("admin", "admin") create_response = self.client.post( "/api/bookings", headers=self.auth` (стр. 1013)
- `BookingLogicTests.test_owner_can_revoke_all_worker_complaintsdef test_owner_can_revoke_all_worker_complaints(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") worker = self.get_staff(login="ivan"` (стр. 1047)
- `BookingLogicTests.test_owner_summary_report_sends_detailed_excel_documentdef test_owner_summary_report_sends_detailed_excel_document(self) -> None: from app.database import SessionLocal from app.models import Booking, BookingWorker self.disable_owner_tw` (стр. 1076)
- `BookingLogicTests.fake_send_documentdef fake_send_document(chat_id: str | int, *, file_name: str, content: bytes, caption: str | None = None, mime_type: str = "application/octet-stream") -> None: sent_documents.appen` (стр. 1140)
- `BookingLogicTests.test_admin_create_booking_can_assign_workers_and_notify_themdef test_admin_create_booking_can_assign_workers_and_notify_them(self) -> None: from app.database import SessionLocal from app.models import Notification, StaffUser admin_token = s` (стр. 1186)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 1200)
- `BookingLogicTests.test_admin_can_create_booking_without_platedef test_admin_can_create_booking_without_plate(self) -> None: admin_token = self.login_staff("admin", "admin") response = self.client.post( "/api/bookings", headers=self.auth_head` (стр. 1251)
- `BookingLogicTests.test_admin_can_create_admin_review_booking_with_empty_optional_fieldsdef test_admin_can_create_admin_review_booking_with_empty_optional_fields(self) -> None: admin_token = self.login_staff("admin", "admin") response = self.client.post( "/api/booking` (стр. 1281)
- `BookingLogicTests.test_owner_can_create_client_and_past_booking_visible_on_first_client_logindef test_owner_can_create_client_and_past_booking_visible_on_first_client_login(self) -> None: owner_token = self.login_staff("owner", "owner") client_response = self.client.post( ` (стр. 1319)
- `BookingLogicTests.test_service_resource_group_syncs_from_service_type_on_savedef test_service_resource_group_syncs_from_service_type_on_save(self) -> None: owner_token = self.login_staff("owner", "owner") bootstrap = self.client.get("/api/auth/session", hea` (стр. 1372)
- `BookingLogicTests.test_fired_worker_loses_access_and_future_assignmentsdef test_fired_worker_loses_access_and_future_assignments(self) -> None: admin_token = self.login_staff("admin", "admin") self.disable_owner_two_factor() owner_token = self.login_s` (стр. 1389)
- `BookingLogicTests.test_same_telegram_client_reuses_existing_accountdef test_same_telegram_client_reuses_existing_account(self) -> None: self.verify_client_phone("1001", "+7 (999) 111-22-33") first = self.client.post( "/api/auth/client", json=self.` (стр. 1449)
- `BookingLogicTests.test_generic_telegram_auth_logs_in_linked_clientdef test_generic_telegram_auth_logs_in_linked_client(self) -> None: self.verify_client_phone("1001", "+7 (999) 111-22-33") first = self.client.post( "/api/auth/client", json=self.c` (стр. 1479)
- `BookingLogicTests.test_generic_telegram_auth_tolerates_legacy_client_profile_datadef test_generic_telegram_auth_tolerates_legacy_client_profile_data(self) -> None: from app.database import SessionLocal from app.models import Client self.verify_client_phone("100` (стр. 1496)
- `BookingLogicTests.test_generic_telegram_auth_prefers_linked_staff_windowdef test_generic_telegram_auth_prefers_linked_staff_window(self) -> None: self.set_staff_telegram("ivan", "7001") self.verify_client_phone("7001", "+7 (999) 111-22-33") client = se` (стр. 1526)
- `BookingLogicTests.test_generic_telegram_auth_does_not_claim_primary_ownerdef test_generic_telegram_auth_does_not_claim_primary_owner(self) -> None: self.set_primary_owner_telegram("") response = self.client.post("/api/auth/telegram", json={"initData": s` (стр. 1543)
- `BookingLogicTests.test_primary_owner_telegram_route_rejects_unlinked_ownerdef test_primary_owner_telegram_route_rejects_unlinked_owner(self) -> None: self.set_primary_owner_telegram("") response = self.client.post( "/api/auth/telegram-owner", json={"init` (стр. 1550)
- `BookingLogicTests.test_nullable_text_values_are_treated_as_empty_stringsdef test_nullable_text_values_are_treated_as_empty_strings(self) -> None: from app.main import _safe_text self.assertEqual(_safe_text(None), "") self.assertEqual(_safe_text(" 9001 ` (стр. 1562)
- `BookingLogicTests.test_primary_owner_can_log_in_via_dedicated_telegram_routedef test_primary_owner_can_log_in_via_dedicated_telegram_route(self) -> None: self.set_primary_owner_telegram("9001") response = self.client.post( "/api/auth/telegram-owner", json=` (стр. 1568)
- `BookingLogicTests.test_generic_telegram_auth_rejects_expired_init_datadef test_generic_telegram_auth_rejects_expired_init_data(self) -> None: self.set_staff_telegram("ivan", "7002") response = self.client.post( "/api/auth/telegram", json={"initData":` (стр. 1585)
- `BookingLogicTests.test_generic_telegram_auth_rejects_duplicate_staff_bindingsdef test_generic_telegram_auth_rejects_duplicate_staff_bindings(self) -> None: self.set_staff_telegram("ivan", "7007") self.set_staff_telegram("oleg", "7007") response = self.clien` (стр. 1595)
- `BookingLogicTests.test_client_registration_rejects_same_phone_for_different_telegram_idsdef test_client_registration_rejects_same_phone_for_different_telegram_ids(self) -> None: self.verify_client_phone("1001", "+7 (999) 111-22-33") first = self.client.post( "/api/aut` (стр. 1603)
- `BookingLogicTests.test_client_profile_cannot_take_phone_of_another_clientdef test_client_profile_cannot_take_phone_of_another_client(self) -> None: first_token, first_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") second_token, _ = sel` (стр. 1618)
- `BookingLogicTests.test_client_booking_creates_notification_for_same_client_iddef test_client_booking_creates_notification_for_same_client_id(self) -> None: token, actor_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") response = self.client.` (стр. 1637)
- `BookingLogicTests.test_client_cannot_mark_other_clients_notification_as_readdef test_client_cannot_mark_other_clients_notification_as_read(self) -> None: admin_token = self.login_staff("admin", "admin") first_token, first_id = self.login_client(name="Alice` (стр. 1668)
- `BookingLogicTests.test_client_login_rejects_foreign_telegram_id_for_existing_phonedef test_client_login_rejects_foreign_telegram_id_for_existing_phone(self) -> None: self.verify_client_phone("1001", "+7 (999) 111-22-33") first = self.client.post( "/api/auth/clie` (стр. 1697)
- `BookingLogicTests.test_client_read_all_marks_only_own_notificationsdef test_client_read_all_marks_only_own_notifications(self) -> None: admin_token = self.login_staff("admin", "admin") first_token, first_id = self.login_client(name="Alice", phone=` (стр. 1718)
- `BookingLogicTests.test_client_read_all_rejects_foreign_role_payloaddef test_client_read_all_rejects_foreign_role_payload(self) -> None: token, _ = self.login_client(name="Alice", phone="+7 (999) 111-22-33") response = self.client.post( "/api/notif` (стр. 1760)
- `BookingLogicTests.test_deleting_client_removes_client_sessions_and_notificationsdef test_deleting_client_removes_client_sessions_and_notifications(self) -> None: admin_token = self.login_staff("admin", "admin") client_token, client_id = self.login_client(name=` (стр. 1769)
- `BookingLogicTests.test_client_cancel_booking_creates_client_and_admin_notificationsdef test_client_cancel_booking_creates_client_and_admin_notifications(self) -> None: token, actor_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") create_response =` (стр. 1797)
- `BookingLogicTests.test_deleted_client_can_register_again_with_same_phone_and_telegramdef test_deleted_client_can_register_again_with_same_phone_and_telegram(self) -> None: admin_token = self.login_staff("admin", "admin") self.verify_client_phone("1001", "+7 (999) 1` (стр. 1838)
- `BookingLogicTests.test_secure_client_auth_requires_valid_init_datadef test_secure_client_auth_requires_valid_init_data(self) -> None: self.shutdown_app() os.environ["ALLOW_INSECURE_CLIENT_AUTH"] = "false" self.restart_app() missing = self.client.` (стр. 1862)
- `BookingLogicTests.test_admin_reschedule_creates_client_notificationdef test_admin_reschedule_creates_client_notification(self) -> None: admin_token = self.login_staff("admin", "admin") client_token, actor_id = self.login_client(name="Alice", phone` (стр. 1893)
- `BookingLogicTests.test_admin_completion_creates_client_notificationdef test_admin_completion_creates_client_notification(self) -> None: admin_token = self.login_staff("admin", "admin") client_token, actor_id = self.login_client(name="Alice", phone` (стр. 1931)
- `BookingLogicTests.test_admin_booking_reuses_existing_client_by_normalized_phonedef test_admin_booking_reuses_existing_client_by_normalized_phone(self) -> None: admin_token = self.login_staff("admin", "admin") _, client_id = self.login_client(name="Alice", pho` (стр. 1975)
- `BookingLogicTests.test_admin_cannot_create_booking_with_conflicting_client_and_phonedef test_admin_cannot_create_booking_with_conflicting_client_and_phone(self) -> None: admin_token = self.login_staff("admin", "admin") _, first_client_id = self.login_client(name="` (стр. 2009)
- `BookingLogicTests.test_admin_can_save_profile_and_notification_settingsdef test_admin_can_save_profile_and_notification_settings(self) -> None: admin_token = self.login_staff("admin", "admin") profile_response = self.client.put( "/api/settings/admin/p` (стр. 2037)
- `BookingLogicTests.test_owner_can_create_admin_like_worker_and_update_telegram_idsdef test_owner_can_create_admin_like_worker_and_update_telegram_ids(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") create_admin = s` (стр. 2073)
- `BookingLogicTests.test_owner_can_create_and_login_accountantdef test_owner_can_create_and_login_accountant(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") create_accountant = self.client.post(` (стр. 2155)
- `BookingLogicTests.test_owner_can_rehire_employee_with_same_telegram_after_dismissaldef test_owner_can_rehire_employee_with_same_telegram_after_dismissal(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") create_worker ` (стр. 2194)
- `BookingLogicTests.test_admin_can_manage_master_payroll_and_private_client_ratingdef test_admin_can_manage_master_payroll_and_private_client_rating(self) -> None: admin_token = self.login_staff("admin", "admin") _, client_id = self.login_client(name="Alice", ph` (стр. 2245)
- `BookingLogicTests.test_owner_and_admin_can_see_detailed_worker_payroll_summarydef test_owner_and_admin_can_see_detailed_worker_payroll_summary(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") admin_token = self.` (стр. 2287)
- `BookingLogicTests.test_payroll_entry_notifies_worker_and_updates_summarydef test_payroll_entry_notifies_worker_and_updates_summary(self) -> None: from app.database import SessionLocal from app.models import Notification, StaffUser self.disable_owner_tw` (стр. 2380)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 2395)
- `BookingLogicTests.test_admin_cannot_issue_advance_before_worker_earns_1000def test_admin_cannot_issue_advance_before_worker_earns_1000(self) -> None: admin_token = self.login_staff("admin", "admin") response = self.client.post( "/api/payroll/entries", he` (стр. 2421)
- `BookingLogicTests.test_owner_pdf_export_returns_pdf_filedef test_owner_pdf_export_returns_pdf_file(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") response = self.client.get("/api/owner/ex` (стр. 2437)
- `BookingLogicTests.test_owner_can_create_booking_with_assigned_master_without_platedef test_owner_can_create_booking_with_assigned_master_without_plate(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") response = self` (стр. 2446)
- `BookingLogicTests.test_admin_reschedule_notifies_assigned_workerdef test_admin_reschedule_notifies_assigned_worker(self) -> None: from app.database import SessionLocal from app.models import Notification, StaffUser admin_token = self.login_staf` (стр. 2475)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 2514)
- `BookingLogicTests.test_worker_start_and_completion_notify_owner_and_send_receiptdef test_worker_start_and_completion_notify_owner_and_send_receipt(self) -> None: from app.database import SessionLocal from app.models import Client, Notification self.disable_own` (стр. 2542)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 2587)
- `BookingLogicTests.test_client_can_store_multiple_vehiclesdef test_client_can_store_multiple_vehicles(self) -> None: token, client_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") response = self.client.patch( "/api/client` (стр. 2633)
- `BookingLogicTests.test_owner_can_notify_admin_about_inactive_clientsdef test_owner_can_notify_admin_about_inactive_clients(self) -> None: from app.database import SessionLocal from app.models import Booking, Notification self.disable_owner_two_fact` (стр. 2670)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 2705)
- `BookingLogicTests.test_owner_dispatches_return_visit_reminders_to_clientsdef test_owner_dispatches_return_visit_reminders_to_clients(self) -> None: from app.database import SessionLocal from app.models import Booking, Notification self.disable_owner_two` (стр. 2725)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 2769)
- `BookingLogicTests.test_worker_can_submit_shift_checklists_and_owner_can_review_themdef test_worker_can_submit_shift_checklists_and_owner_can_review_them(self) -> None: from app.database import SessionLocal from app.models import Notification self.disable_owner_tw` (стр. 2799)
- `BookingLogicTests.test_admin_shift_inspection_sends_owner_photo_and_can_be_approveddef test_admin_shift_inspection_sends_owner_photo_and_can_be_approved(self) -> None: from app.database import SessionLocal from app.models import Notification self.disable_owner_tw` (стр. 2868)
- `BookingLogicTests.fake_send_photodef fake_send_photo(chat_id: str | int, **kwargs) -> None: sent_photos.append({"chat_id": chat_id, **kwargs})` (стр. 2888)
- `BookingLogicTests.test_admin_shift_inspection_list_uses_photo_endpointdef test_admin_shift_inspection_list_uses_photo_endpoint(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") admin_token = self.login_st` (стр. 2924)
- `BookingLogicTests.test_bot_can_reject_admin_shift_with_issue_notedef test_bot_can_reject_admin_shift_with_issue_note(self) -> None: from bot import BotRuntime, process_telegram_update from app.database import SessionLocal from app.models import ` (стр. 2967)
- `BookingLogicTests.fake_telegram_calldef fake_telegram_call(_runtime, method: str, payload: dict[str, object] | None = None, **_kwargs): telegram_calls.append((method, payload or {})) return {}` (стр. 3002)
- `BookingLogicTests.test_admin_mark_read_all_affects_only_admin_notificationsdef test_admin_mark_read_all_affects_only_admin_notifications(self) -> None: admin_token = self.login_staff("admin", "admin") owner_token = self.login_staff("owner", "owner") if Fa` (стр. 3034)
- `BookingLogicTests.test_admin_cannot_access_owner_only_endpointsdef test_admin_cannot_access_owner_only_endpoints(self) -> None: admin_token = self.login_staff("admin", "admin") create_worker = self.client.post( "/api/workers", headers=self.aut` (стр. 3077)
- `BookingLogicTests.test_worker_can_update_only_own_assigned_booking_status_and_notesdef test_worker_can_update_only_own_assigned_booking_status_and_notes(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "maste` (стр. 3123)
- `BookingLogicTests.test_worker_completion_creates_admin_notification_with_amount_client_and_servicedef test_worker_completion_creates_admin_notification_with_amount_client_and_service(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff` (стр. 3169)
- `BookingLogicTests.test_worker_cannot_change_time_or_workers_even_on_own_bookingdef test_worker_cannot_change_time_or_workers_even_on_own_booking(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master") ` (стр. 3209)
- `BookingLogicTests.test_worker_must_specify_payment_state_when_completing_bookingdef test_worker_must_specify_payment_state_when_completing_booking(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master")` (стр. 3251)
- `BookingLogicTests.test_worker_can_save_only_own_profiledef test_worker_can_save_only_own_profile(self) -> None: worker_token = self.login_staff("ivan", "master") worker = self.get_staff(login="ivan") other_worker = self.get_staff(login` (стр. 3304)
- `BookingLogicTests.test_worker_can_save_only_own_notification_settingsdef test_worker_can_save_only_own_notification_settings(self) -> None: worker_token = self.login_staff("ivan", "master") worker = self.get_staff(login="ivan") other_worker = self.g` (стр. 3342)
- `BookingLogicTests.test_worker_mark_read_all_affects_only_own_notificationsdef test_worker_mark_read_all_affects_only_own_notifications(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") worker_token = self.log` (стр. 3375)
- `BookingLogicTests.test_worker_cannot_create_penaltiesdef test_worker_cannot_create_penalties(self) -> None: worker_token = self.login_staff("ivan", "master") other_worker = self.get_staff(login="oleg") response = self.client.post( "/` (стр. 3408)
- `BookingLogicTests.test_worker_cannot_create_notifications_for_other_rolesdef test_worker_cannot_create_notifications_for_other_roles(self) -> None: worker_token = self.login_staff("ivan", "master") _, client_id = self.login_client(name="Alice", phone="+` (стр. 3418)
- `BookingLogicTests.test_worker_can_create_notification_for_assigned_clientdef test_worker_can_create_notification_for_assigned_client(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master") worker` (стр. 3433)
- `BookingLogicTests.test_worker_can_generate_telegram_link_codedef test_worker_can_generate_telegram_link_code(self) -> None: worker_token = self.login_staff("ivan", "master") response = self.client.post( "/api/telegram/link-code", headers=sel` (стр. 3474)
- `BookingLogicTests.test_telegram_webhook_rejects_invalid_secretdef test_telegram_webhook_rejects_invalid_secret(self) -> None: os.environ["WEBAPP_URL"] = "https://crm.example" os.environ["TELEGRAM_DELIVERY_MODE"] = "webhook" self.restart_app()` (стр. 3485)
- `BookingLogicTests.test_telegram_webhook_processes_update_with_valid_secretdef test_telegram_webhook_processes_update_with_valid_secret(self) -> None: os.environ["WEBAPP_URL"] = "https://crm.example" os.environ["TELEGRAM_DELIVERY_MODE"] = "webhook" self.r` (стр. 3497)
- `BookingLogicTests.test_client_bootstrap_contains_only_own_bookings_and_no_worker_directorydef test_client_bootstrap_contains_only_own_bookings_and_no_worker_directory(self) -> None: admin_token = self.login_staff("admin", "admin") first_token, first_id = self.login_clie` (стр. 3512)
- `BookingLogicTests.test_worker_bootstrap_contains_only_assigned_bookingsdef test_worker_bootstrap_contains_only_assigned_bookings(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master") first_wo` (стр. 3572)
- `BookingLogicTests.test_admin_can_update_booking_alias_fields_and_service_canonical_datadef test_admin_can_update_booking_alias_fields_and_service_canonical_data(self) -> None: admin_token = self.login_staff("admin", "admin") create_response = self.client.post( "/api/` (стр. 3632)
- `BookingLogicTests.test_owner_stock_write_off_rejects_negative_qtydef test_owner_stock_write_off_rejects_negative_qty(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") create_response = self.client.po` (стр. 3683)
- `BookingLogicTests.test_admin_can_read_targeted_admin_notificationsdef test_admin_can_read_targeted_admin_notifications(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") admin_token = self.login_staff(` (стр. 3712)
- `BookingLogicTests.test_deleting_client_removes_related_bookings_and_sessionsdef test_deleting_client_removes_related_bookings_and_sessions(self) -> None: admin_token = self.login_staff("admin", "admin") client_token, client_id = self.login_client(name="Ali` (стр. 3765)
- `BookingLogicTests.test_worker_cannot_message_client_from_only_completed_bookingdef test_worker_cannot_message_client_from_only_completed_booking(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master") ` (стр. 3802)
- `BookingLogicTests.test_owner_database_reset_execute_requires_delay_after_approvaldef test_owner_database_reset_execute_requires_delay_after_approval(self) -> None: self.disable_owner_two_factor() self.set_primary_owner_telegram() owner_token = self.login_staff(` (стр. 3849)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 3855)
- `BookingLogicTests.test_owner_database_reset_clears_operational_data_and_preserves_ownersdef test_owner_database_reset_clears_operational_data_and_preserves_owners(self) -> None: from app.database import SessionLocal from app.models import ( AppSetting, Booking, Box, C` (стр. 3889)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 3960)
- `BookingLogicTests.test_normalize_service_and_box_resources_handles_legacy_null_box_fieldsdef test_normalize_service_and_box_resources_handles_legacy_null_box_fields(self) -> None: from app.main import DETAILING_BOX_NAME, WASH_BOX_NAMES, _normalize_service_and_box_resou` (стр. 4024)
- `class FakeScalarResult: def __init__(self, items: list[object]) -> None: self._items = items def all(self) -> list[objec` (стр. 4028)
- `FakeScalarResult.__init__def __init__(self, items: list[object]) -> None: self._items = items` (стр. 4029)
- `FakeScalarResult.alldef all(self) -> list[object]: return self._items` (стр. 4032)
- `class FakeSession: def __init__(self, services: list[Service], boxes: list[Box]) -> None: self.services = services self.` (стр. 4035)
- `FakeSession.__init__def __init__(self, services: list[Service], boxes: list[Box]) -> None: self.services = services self.boxes = boxes self.flushed = False` (стр. 4036)
- `FakeSession.scalarsdef scalars(self, statement): entity = statement.column_descriptions[0]["entity"] if entity is Service: return FakeScalarResult(self.services) if entity is Box: return FakeScalarRe` (стр. 4041)
- `FakeSession.adddef add(self, _item: object) -> None: return None` (стр. 4049)
- `FakeSession.flushdef flush(self) -> None: self.flushed = True` (стр. 4052)

### backend/tests/test_broadcast_edge_cases.py (178 строк)

Классы и функции (12):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 18)
- `class BroadcastEdgeCaseTests(unittest.TestCase):` (стр. 30)
- `BroadcastEdgeCaseTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 33)
- `BroadcastEdgeCaseTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 52)
- `BroadcastEdgeCaseTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 58)
- `BroadcastEdgeCaseTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 67)
- `BroadcastEdgeCaseTests.login_staffdef login_staff(self, login: str, password: str) -> str: response = self.client.post( "/api/auth/staff/login", json={"login": login, "password": password}, ) self.assertEqual(respo` (стр. 76)
- `BroadcastEdgeCaseTests.disable_owner_two_factordef disable_owner_two_factor(self) -> None: from app.database import SessionLocal from app.models import AppSetting with SessionLocal() as db: setting = db.get(AppSetting, "owner_s` (стр. 84)
- `BroadcastEdgeCaseTests.clear_all_owner_telegram_chat_idsdef clear_all_owner_telegram_chat_ids(self) -> None: """Remove telegram_chat_id from all owners so no one is eligible for broadcast.""" from app.database import SessionLocal from a` (стр. 95)
- `BroadcastEdgeCaseTests.auth_headersdef auth_headers(token: str) -> dict[str, str]: return {"Authorization": f"Bearer {token}"}` (стр. 109)
- `BroadcastEdgeCaseTests.test_export_broadcast_returns_503_when_no_owners_have_telegram_chat_iddef test_export_broadcast_returns_503_when_no_owners_have_telegram_chat_id( self,` (стр. 116)
- `BroadcastEdgeCaseTests.test_report_broadcast_returns_503_when_no_owners_have_telegram_chat_iddef test_report_broadcast_returns_503_when_no_owners_have_telegram_chat_id( self,` (стр. 146)

### backend/tests/test_config.py (20 строк)

Классы и функции (3):

- `test_normalize_database_url_converts_legacy_postgres_schemedef test_normalize_database_url_converts_legacy_postgres_scheme() -> None: raw_url = "postgres://user:pass@example.com:5432/appdb" assert _normalize_database_url(raw_url) == "postg` (стр. 6)
- `test_normalize_database_url_uses_psycopg_for_postgresql_schemedef test_normalize_database_url_uses_psycopg_for_postgresql_scheme() -> None: raw_url = "postgresql://user:pass@example.com:5432/appdb" assert _normalize_database_url(raw_url) == "` (стр. 12)
- `test_normalize_database_url_keeps_explicit_driver_and_sqlitedef test_normalize_database_url_keeps_explicit_driver_and_sqlite() -> None: assert _normalize_database_url("postgresql+psycopg://user:pass@example.com/appdb") == "postgresql+psycop` (стр. 18)

### backend/tests/test_finance_edit.py (393 строк)

Классы и функции (31):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 21)
- `class FinanceEditTestBase(unittest.TestCase):` (стр. 33)
- `FinanceEditTestBase.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 36)
- `FinanceEditTestBase.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 62)
- `FinanceEditTestBase._login_staffdef _login_staff(self, login: str, password: str) -> str: response = self.client.post( "/api/auth/staff/login", json={"login": login, "password": password}, ) self.assertEqual(resp` (стр. 79)
- `FinanceEditTestBase._disable_owner_two_factordef _disable_owner_two_factor(self) -> None: from app.database import SessionLocal from app.models import AppSetting with SessionLocal() as db: setting = db.get(AppSetting, "owner_` (стр. 87)
- `FinanceEditTestBase._auth_headersdef _auth_headers(token: str) -> dict[str, str]: return {"Authorization": f"Bearer {token}"}` (стр. 98)
- `FinanceEditTestBase._login_clientdef _login_client(self, name: str = "Алиса Иванова", phone: str = "+7 (999) 111-22-33") -> str: response = self.client.post( "/api/auth/client", json={ "profile": { "name": name, "` (стр. 101)
- `FinanceEditTestBase._create_worker_and_logindef _create_worker_and_login( self, login: str = "testworker", password: str = "workerpass", role: str = "worker",` (стр. 116)
- `FinanceEditTestBase._valid_expense_payloaddef _valid_expense_payload(self, **overrides) -> dict: payload = { "title": "Аренда помещения", "amount": 15000, "category": "Аренда", "date": "10.01.2025", "note": "Январь 2025", ` (стр. 138)
- `FinanceEditTestBase._create_expensedef _create_expense(self, **overrides) -> dict: """Create an expense via POST and return the created record.""" payload = self._valid_expense_payload(**overrides) response = self.c` (стр. 149)
- `FinanceEditTestBase._valid_income_payloaddef _valid_income_payload(self, **overrides) -> dict: payload = { "amount": 5000, "source": "Аренда помещения", "note": "Январь 2025", "date": "15.01.2025", } payload.update(overri` (стр. 160)
- `FinanceEditTestBase._create_incomedef _create_income(self, **overrides) -> dict: """Create an income via POST and return the created record.""" payload = self._valid_income_payload(**overrides) response = self.clie` (стр. 170)
- `class PatchExpenseTests(FinanceEditTestBase):` (стр. 186)
- `PatchExpenseTests.test_patch_expense_updates_only_provided_fieldsdef test_patch_expense_updates_only_provided_fields(self) -> None: """PATCH with only amount updates amount; title, category, date, note stay unchanged.""" expense = self._create_e` (стр. 189)
- `PatchExpenseTests.test_patch_expense_returns_404_for_unknown_iddef test_patch_expense_returns_404_for_unknown_id(self) -> None: """PATCH with a non-existent expense ID returns 404.""" response = self.client.patch( "/api/expenses/nonexistent-id` (стр. 211)
- `PatchExpenseTests.test_patch_expense_returns_422_for_empty_bodydef test_patch_expense_returns_422_for_empty_body(self) -> None: """PATCH with an empty JSON body {} returns 422 (no fields to update).""" expense = self._create_expense() response` (стр. 220)
- `PatchExpenseTests.test_patch_expense_returns_422_for_negative_amountdef test_patch_expense_returns_422_for_negative_amount(self) -> None: """PATCH with a negative amount returns 422.""" expense = self._create_expense() response = self.client.patch(` (стр. 230)
- `PatchExpenseTests.test_patch_expense_returns_422_for_invalid_date_formatdef test_patch_expense_returns_422_for_invalid_date_format(self) -> None: """PATCH with a date not matching DD.MM.YYYY returns 422.""" expense = self._create_expense() response = s` (стр. 240)
- `PatchExpenseTests.test_patch_expense_returns_422_for_whitespace_titledef test_patch_expense_returns_422_for_whitespace_title(self) -> None: """PATCH with a whitespace-only title returns 422.""" expense = self._create_expense() response = self.client` (стр. 250)
- `PatchExpenseTests.test_patch_expense_returns_403_for_worker_roledef test_patch_expense_returns_403_for_worker_role(self) -> None: """PATCH by a worker returns 403.""" expense = self._create_expense() worker_token = self._create_worker_and_login` (стр. 260)
- `PatchExpenseTests.test_patch_expense_returns_403_for_client_roledef test_patch_expense_returns_403_for_client_role(self) -> None: """PATCH by a client returns 403.""" expense = self._create_expense() client_token = self._login_client() response` (стр. 273)
- `class PatchIncomeTests(FinanceEditTestBase):` (стр. 289)
- `PatchIncomeTests.test_patch_income_updates_only_provided_fieldsdef test_patch_income_updates_only_provided_fields(self) -> None: """PATCH with only amount updates amount; source, note, date stay unchanged.""" income = self._create_income() ori` (стр. 292)
- `PatchIncomeTests.test_patch_income_returns_404_for_unknown_iddef test_patch_income_returns_404_for_unknown_id(self) -> None: """PATCH with a non-existent income ID returns 404.""" response = self.client.patch( "/api/owner/incomes/nonexistent` (стр. 312)
- `PatchIncomeTests.test_patch_income_returns_422_for_empty_bodydef test_patch_income_returns_422_for_empty_body(self) -> None: """PATCH with an empty JSON body {} returns 422 (no fields to update).""" income = self._create_income() response = ` (стр. 321)
- `PatchIncomeTests.test_patch_income_returns_422_for_negative_amountdef test_patch_income_returns_422_for_negative_amount(self) -> None: """PATCH with a negative amount returns 422.""" income = self._create_income() response = self.client.patch( f"` (стр. 331)
- `PatchIncomeTests.test_patch_income_returns_422_for_whitespace_sourcedef test_patch_income_returns_422_for_whitespace_source(self) -> None: """PATCH with a whitespace-only source returns 422.""" income = self._create_income() response = self.client.` (стр. 341)
- `PatchIncomeTests.test_patch_income_clears_note_when_null_passeddef test_patch_income_clears_note_when_null_passed(self) -> None: """PATCH with note=null explicitly clears the note field.""" income = self._create_income(note="Важная заметка") s` (стр. 351)
- `PatchIncomeTests.test_patch_income_returns_403_for_accountant_roledef test_patch_income_returns_403_for_accountant_role(self) -> None: """PATCH by an accountant returns 403 (only owner can edit incomes).""" income = self._create_income() accounta` (стр. 365)
- `PatchIncomeTests.test_patch_income_returns_403_for_worker_roledef test_patch_income_returns_403_for_worker_role(self) -> None: """PATCH by a worker returns 403.""" income = self._create_income() worker_token = self._create_worker_and_login( l` (стр. 378)

### backend/tests/test_income_endpoints.py (242 строк)

Классы и функции (16):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 23)
- `class IncomeEndpointTests(unittest.TestCase):` (стр. 35)
- `IncomeEndpointTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 38)
- `IncomeEndpointTests.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 65)
- `IncomeEndpointTests._login_staffdef _login_staff(self, login: str, password: str) -> str: response = self.client.post( "/api/auth/staff/login", json={"login": login, "password": password}, ) self.assertEqual(resp` (стр. 82)
- `IncomeEndpointTests._disable_owner_two_factordef _disable_owner_two_factor(self) -> None: from app.database import SessionLocal from app.models import AppSetting with SessionLocal() as db: setting = db.get(AppSetting, "owner_` (стр. 90)
- `IncomeEndpointTests._auth_headersdef _auth_headers(token: str) -> dict[str, str]: return {"Authorization": f"Bearer {token}"}` (стр. 101)
- `IncomeEndpointTests._valid_income_payloaddef _valid_income_payload(self, **overrides) -> dict: payload = { "amount": 5000, "source": "Аренда помещения", "note": "Январь 2025", "date": "15.01.2025", } payload.update(overri` (стр. 104)
- `IncomeEndpointTests.test_get_incomes_returns_200_with_empty_list_when_no_recordsdef test_get_incomes_returns_200_with_empty_list_when_no_records(self) -> None: """GET /api/owner/incomes returns 200 and an empty list when no incomes exist. Requirements: 1.6 """` (стр. 118)
- `IncomeEndpointTests.test_post_income_with_valid_data_returns_201def test_post_income_with_valid_data_returns_201(self) -> None: """POST /api/owner/incomes with valid data returns 201 and the created record. Requirements: 1.3, 1.7 """ payload = ` (стр. 132)
- `IncomeEndpointTests.test_post_income_with_amount_zero_returns_422def test_post_income_with_amount_zero_returns_422(self) -> None: """POST /api/owner/incomes with amount=0 returns 422. Requirements: 1.4 """ payload = self._valid_income_payload(am` (стр. 153)
- `IncomeEndpointTests.test_post_income_with_empty_source_returns_422def test_post_income_with_empty_source_returns_422(self) -> None: """POST /api/owner/incomes with source="" returns 422. Requirements: 1.5 """ payload = self._valid_income_payload(` (стр. 166)
- `IncomeEndpointTests.test_post_income_with_whitespace_only_source_returns_422def test_post_income_with_whitespace_only_source_returns_422(self) -> None: """POST /api/owner/incomes with source containing only spaces returns 422. Requirements: 1.5 """ payload` (стр. 179)
- `IncomeEndpointTests.test_created_income_appears_in_listdef test_created_income_appears_in_list(self) -> None: """After POST, the new income record appears in GET /api/owner/incomes. Requirements: 1.6, 1.7 """ payload = self._valid_inco` (стр. 192)
- `IncomeEndpointTests.test_post_income_with_negative_amount_returns_422def test_post_income_with_negative_amount_returns_422(self) -> None: """POST /api/owner/incomes with a negative amount returns 422. Requirements: 1.4 """ payload = self._valid_inco` (стр. 214)
- `IncomeEndpointTests.test_post_income_with_amount_exceeding_max_returns_422def test_post_income_with_amount_exceeding_max_returns_422(self) -> None: """POST /api/owner/incomes with amount > 10_000_000 returns 422. Requirements: 1.4 """ payload = self._val` (стр. 227)

### backend/tests/test_worker_calendar.py (226 строк)

Классы и функции (15):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 24)
- `build_init_datadef build_init_data(telegram_id: str) -> str: """Build Telegram init data that passes insecure validation (no HMAC).""" return urllib.parse.urlencode({"user": json.dumps({"id": tel` (стр. 36)
- `class WorkerCalendarTests(unittest.TestCase):` (стр. 41)
- `WorkerCalendarTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 47)
- `WorkerCalendarTests.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 74)
- `WorkerCalendarTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select with SessionLocal() as db: ivan = db` (стр. 91)
- `WorkerCalendarTests._auth_headersdef _auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 106)
- `WorkerCalendarTests._next_active_datedef _next_active_date() -> str: candidate = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 110)
- `WorkerCalendarTests._create_clientdef _create_client(self) -> tuple[str, str]: from app.database import SessionLocal from app.models import Client client_id = f"c-{uuid4().hex[:12]}" phone = f"+7 (999) 000-{str(uui` (стр. 118)
- `WorkerCalendarTests._create_bookingdef _create_booking(self, *, worker_id: str = "w2", status: str = "new", time: str = "10:00") -> str: client_id, client_phone = self._create_client() response = self.client.post( "` (стр. 137)
- `WorkerCalendarTests.test_worker_sees_bookings_of_other_workersdef test_worker_sees_bookings_of_other_workers(self) -> None: booking_id = self._create_booking(worker_id="w2") response = self.client.get( "/api/worker/calendar", headers=self._au` (стр. 168)
- `WorkerCalendarTests.test_worker_calendar_omits_sensitive_fieldsdef test_worker_calendar_omits_sensitive_fields(self) -> None: self._create_booking(worker_id="w2") response = self.client.get( "/api/worker/calendar", headers=self._auth_headers(s` (стр. 181)
- `WorkerCalendarTests.test_worker_calendar_excludes_cancelled_bookingsdef test_worker_calendar_excludes_cancelled_bookings(self) -> None: active_id = self._create_booking(worker_id="w2") cancel_response = self.client.patch( f"/api/bookings/{active_id` (стр. 194)
- `WorkerCalendarTests.test_worker_calendar_forbidden_for_ownerdef test_worker_calendar_forbidden_for_owner(self) -> None: response = self.client.get( "/api/worker/calendar", headers=self._auth_headers(self.owner_token), ) self.assertEqual(res` (стр. 213)
- `WorkerCalendarTests.test_worker_calendar_forbidden_without_authdef test_worker_calendar_forbidden_without_auth(self) -> None: response = self.client.get("/api/worker/calendar") self.assertEqual(response.status_code, 401, response.text)` (стр. 220)

## Frontend — CRM-минапп (frontend/src)

### frontend/src/app/api.ts (186 строк)

- `API_BASE_URL` (стр. 1) — локальный
- `getInitData` (стр. 55) — локальный
- `getErrorDetail` (стр. 59) — локальный
- `payload` (стр. 62) — локальный
- `messages` (стр. 66) — локальный
- `field` (стр. 67) — локальный
- `msg` (стр. 68) — локальный
- `getDownloadFileName` (стр. 78) — локальный
- `disposition` (стр. 79) — локальный
- `utf8Match` (стр. 80) — локальный
- `plainMatch` (стр. 84) — локальный
- `getTelegramWebApp` (стр. 91)
- `getTelegramInitData` (стр. 95)
- `apiRequest` (стр. 99)
- `initData` (стр. 106) — локальный
- `response` (стр. 111) — локальный
- `apiDownload` (стр. 124)
- `initData` (стр. 126) — локальный
- `response` (стр. 131) — локальный
- `fileName` (стр. 140) — локальный
- `blob` (стр. 141) — локальный
- `objectUrl` (стр. 142) — локальный
- `anchor` (стр. 143) — локальный
- `apiUploadFile` (стр. 153)
- `initData` (стр. 154) — локальный
- `formData` (стр. 155) — локальный
- `response` (стр. 157) — локальный
- `apiBlobUrl` (стр. 168)
- `initData` (стр. 170) — локальный
- `response` (стр. 175) — локальный
- `blob` (стр. 184) — локальный

### frontend/src/app/App.tsx (725 строк)

- `NOOP` (стр. 49) — локальный
- `ConsentDialog` (стр. 51) — локальный
- `primary` (стр. 56) — локальный
- `sub` (стр. 57) — локальный
- `bg` (стр. 58) — локальный
- `text` (стр. 59) — локальный
- `handleAgree` (стр. 61) — локальный
- `WelcomeScreen` (стр. 285) — локальный
- `bg` (стр. 305) — локальный
- `text` (стр. 306) — локальный
- `sub` (стр. 307) — локальный
- `primary` (стр. 308) — локальный
- `glass` (стр. 309) — локальный
- `inputCls` (стр. 312) — локальный
- `validate` (стр. 314) — локальный
- `nameError` (стр. 316) — локальный
- `carError` (стр. 317) — локальный
- `plateError` (стр. 318) — локальный
- `handleClientSubmit` (стр. 327) — локальный
- `message` (стр. 338) — локальный
- `handleStaffLink` (стр. 343) — локальный
- `message` (стр. 349) — локальный
- `navRef` (стр. 354) — локальный
- `handleBack` (стр. 357) — локальный
- `AppContent` (стр. 631) — локальный
- `usePath` (стр. 691) — локальный
- `onPopState` (стр. 694) — локальный
- `LandingWrapper` (стр. 701) — локальный
- `App` (стр. 709)
- `path` (стр. 710) — локальный

### frontend/src/app/components/admin/AdminApp.tsx (4204 строк)

- `SERVICE_TYPE_OPTIONS` (стр. 65) — локальный
- `adminServiceResourceGroupForCategory` (стр. 71) — локальный
- `DEFAULT_SHIFT_SUPPLIES` (стр. 83) — локальный
- `SHIFT_PHOTO_CATEGORIES` (стр. 89) — локальный
- `SHIFT_PHOTO_MAX_DIMENSION` (стр. 106) — локальный
- `SHIFT_PHOTO_TARGET_BYTES` (стр. 107) — локальный
- `SHIFT_PHOTO_MIN_QUALITY` (стр. 108) — локальный
- `STOCK_UNITS` (стр. 123) — локальный
- `isDetailingService` (стр. 124) — локальный
- `serviceResourceGroup` (стр. 128) — локальный
- `hasManualScheduling` (стр. 132) — локальный
- `bookingBoxesForService` (стр. 136) — локальный
- `bookingLocationLabel` (стр. 144) — локальный
- `parseBookingMinutes` (стр. 148) — локальный
- `match` (стр. 149) — локальный
- `hours` (стр. 151) — локальный
- `minutes` (стр. 152) — локальный
- `bookingBlocksBox` (стр. 157) — локальный
- `nextStart` (стр. 160) — локальный
- `existingStart` (стр. 161) — локальный
- `nextEnd` (стр. 163) — локальный
- `existingEnd` (стр. 164) — локальный
- `pickDefaultBookingBox` (стр. 168) — локальный
- `resourceGroup` (стр. 177) — локальный
- `preferred` (стр. 178) — локальный
- `fallback` (стр. 179) — локальный
- `candidates` (стр. 180) — локальный
- `paymentLabel` (стр. 185) — локальный
- `normalizePhoneSearchValue` (стр. 194) — локальный
- `bookingStatusRequiresScheduledSlot` (стр. 198) — локальный
- `numberInputValue` (стр. 202) — локальный
- `numberFromInput` (стр. 206) — локальный
- `toISODate` (стр. 210) — локальный
- `parsed` (стр. 211) — локальный
- `y` (стр. 213) — локальный
- `m` (стр. 214) — локальный
- `d` (стр. 215) — локальный
- `TIME_SLOTS` (стр. 219) — локальный
- `h` (стр. 220) — локальный
- `m` (стр. 221) — локальный
- `dataUrlApproxBytes` (стр. 225) — локальный
- `padding` (стр. 227) — локальный
- `loadImage` (стр. 231) — локальный
- `image` (стр. 233) — локальный
- `compressShiftPhoto` (стр. 240) — локальный
- `objectUrl` (стр. 241) — локальный
- `image` (стр. 243) — локальный
- `scale` (стр. 244) — локальный
- `width` (стр. 245) — локальный
- `height` (стр. 246) — локальный
- `canvas` (стр. 247) — локальный
- `context` (стр. 250) — локальный
- `AdminApp` (стр. 268)
- `parentCategories` (стр. 344) — локальный
- `selectableBookingDates` (стр. 415) — локальный
- `masterWorkers` (стр. 421) — локальный
- `selectedClient` (стр. 422) — локальный
- `normalizedClientSearchQuery` (стр. 423) — локальный
- `filteredClients` (стр. 426) — локальный
- `plates` (стр. 431) — локальный
- `selectedClientBookings` (стр. 439) — локальный
- `leftDate` (стр. 443) — локальный
- `rightDate` (стр. 444) — локальный
- `selectedClientFilteredBookings` (стр. 449) — локальный
- `svc` (стр. 451) — локальный
- `selectedClientVehicles` (стр. 455) — локальный
- `selectedClientSpent` (стр. 459) — локальный
- `selectedClientCompletedCount` (стр. 462) — локальный
- `selectedClientUpcoming` (стр. 463) — локальный
- `selectedClientLastVisit` (стр. 464) — локальный
- `shiftSupplies` (стр. 465) — локальный
- `uploadedShiftPhotos` (стр. 470) — локальный
- `selectedService` (стр. 483) — локальный
- `defaultBoxForService` (стр. 501) — локальный
- `settingsBoxes` (стр. 513) — локальный
- `bookingFormBoxes` (стр. 514) — локальный
- `editBookingBoxes` (стр. 515) — локальный
- `newBookingLocationLabel` (стр. 518) — локальный
- `editBookingLocationLabel` (стр. 519) — локальный
- `modalMaxHeight` (стр. 571) — локальный
- `vv` (стр. 575) — локальный
- `handler` (стр. 577) — локальный
- `el` (стр. 578) — локальный
- `staffRoleTitle` (стр. 591) — локальный
- `staffNotificationsRole` (стр. 592) — локальный
- `adminNotifications` (стр. 593) — локальный
- `unreadCount` (стр. 598) — локальный
- `todayBookings` (стр. 599) — локальный
- `completedAll` (стр. 600) — локальный
- `totalRevenue` (стр. 601) — локальный
- `glass` (стр. 603) — локальный
- `bg` (стр. 604) — локальный
- `text` (стр. 605) — локальный
- `sub` (стр. 606) — локальный
- `primary` (стр. 607) — локальный
- `accent` (стр. 608) — локальный
- `surface` (стр. 609) — локальный
- `inputCls` (стр. 610) — локальный
- `selectCls` (стр. 611) — локальный
- `timeToMinutes` (стр. 612) — локальный
- `match` (стр. 613) — локальный
- `hours` (стр. 615) — локальный
- `minutes` (стр. 616) — локальный
- `byService` (стр. 622) — локальный
- `byStatus` (стр. 628) — локальный
- `byPayment` (стр. 639) — локальный
- `workerStats` (стр. 646) — локальный
- `bw` (стр. 650) — локальный
- `avgCheck` (стр. 657) — локальный
- `conversionRate` (стр. 658) — локальный
- `scheduleSummary` (стр. 659) — локальный
- `revenueData` (стр. 660) — локальный
- `formatted` (стр. 661) — локальный
- `hourData` (стр. 667) — локальный
- `handleStatusChange` (стр. 671) — локальный
- `handleDeleteClient` (стр. 676) — локальный
- `confirmed` (стр. 677) — локальный
- `handleCreateClient` (стр. 682) — локальный
- `nameError` (стр. 684) — локальный
- `phoneError` (стр. 688) — локальный
- `carError` (стр. 692) — локальный
- `plateError` (стр. 696) — локальный
- `created` (стр. 704) — локальный
- `handleSaveClientCard` (стр. 726) — локальный
- `draft` (стр. 727) — локальный
- `handleShiftPhotoChange` (стр. 741) — локальный
- `file` (стр. 742) — локальный
- `dataUrl` (стр. 746) — локальный
- `handleSubmitShiftInspection` (стр. 758) — локальный
- `primaryPhoto` (стр. 762) — локальный
- `uploadedCategoriesLabel` (стр. 769) — локальный
- `composedNote` (стр. 770) — локальный
- `saved` (стр. 774) — локальный
- `validateClientName` (стр. 791) — локальный
- `validateClientPhone` (стр. 795) — локальный
- `validateBookingDate` (стр. 799) — локальный
- `parsedDate` (стр. 801) — локальный
- `scheduleDay` (стр. 806) — локальный
- `normalizedTime` (стр. 811) — локальный
- `slotStart` (стр. 812) — локальный
- `openMinutes` (стр. 821) — локальный
- `closeMinutes` (стр. 822) — локальный
- `slotEnd` (стр. 823) — локальный
- `validateBookingDateForEdit` (стр. 833) — локальный
- `parsedDate` (стр. 835) — локальный
- `scheduleDay` (стр. 840) — локальный
- `normalizedTime` (стр. 845) — локальный
- `slotStart` (стр. 846) — локальный
- `openMinutes` (стр. 852) — локальный
- `closeMinutes` (стр. 853) — локальный
- `slotEnd` (стр. 854) — локальный
- `validateBookingDateTimeFormat` (стр. 864) — локальный
- `parsedDate` (стр. 866) — локальный
- `validateNewBookingForm` (стр. 879) — локальный
- `selectedService` (стр. 881) — локальный
- `nameError` (стр. 883) — локальный
- `phoneError` (стр. 887) — локальный
- `carError` (стр. 891) — локальный
- `plateError` (стр. 895) — локальный
- `hasDate` (стр. 898) — локальный
- `hasTime` (стр. 899) — локальный
- `requiresScheduledSlot` (стр. 900) — локальный
- `validation` (стр. 910) — локальный
- `validation` (стр. 926) — локальный
- `resetNewBookingDraft` (стр. 938) — локальный
- `openNewBookingModal` (стр. 966) — локальный
- `openAdditionalServiceModal` (стр. 971) — локальный
- `openNewBookingForClient` (стр. 980) — локальный
- `historyDate` (стр. 982) — локальный
- `closeNewBookingModal` (стр. 998) — локальный
- `handleAddService` (стр. 1003) — локальный
- `svc` (стр. 1012) — локальный
- `workersList` (стр. 1013) — локальный
- `worker` (стр. 1014) — локальный
- `updatedBooking` (стр. 1017) — локальный
- `handleRemoveService` (стр. 1034) — локальный
- `closeAddServiceModal` (стр. 1038) — локальный
- `openEditModal` (стр. 1044) — локальный
- `handleSaveEditedBooking` (стр. 1066) — локальный
- `editServiceId` (стр. 1068) — локальный
- `detailingBooking` (стр. 1069) — локальный
- `requiresScheduledSlot` (стр. 1070) — локальный
- `dateChanged` (стр. 1072) — локальный
- `timeChanged` (стр. 1073) — локальный
- `validationErrors` (стр. 1075) — локальный
- `handleDeleteBooking` (стр. 1129) — локальный
- `name` (стр. 1131) — локальный
- `handleAssignWorkers` (стр. 1138) — локальный
- `updatedWorkers` (стр. 1140) — локальный
- `w` (стр. 1141) — локальный
- `handleSaveNewBooking` (стр. 1149) — локальный
- `effectiveStatus` (стр. 1152) — локальный
- `svc` (стр. 1159) — локальный
- `normalizedClientName` (стр. 1160) — локальный
- `normalizedCar` (стр. 1161) — локальный
- `normalizedPlate` (стр. 1162) — локальный
- `hasDateTime` (стр. 1163) — локальный
- `parsedDate` (стр. 1164) — локальный
- `clientLabel` (стр. 1169) — локальный
- `carLabel` (стр. 1170) — локальный

### frontend/src/app/components/admin/ContentEditor.tsx (418 строк)

- `API_BASE` (стр. 21) — локальный
- `ImageUploader` (стр. 23) — локальный
- `inputRef` (стр. 25) — локальный
- `handleFile` (стр. 27) — локальный
- `file` (стр. 28) — локальный
- `result` (стр. 32) — локальный
- `src` (стр. 42) — локальный
- `ContentEditor` (стр. 90)
- `handleSave` (стр. 101) — локальный
- `updateHero` (стр. 115) — локальный
- `updateStat` (стр. 119) — локальный
- `updateAbout` (стр. 126) — локальный
- `updateService` (стр. 130) — локальный
- `addService` (стр. 137) — локальный
- `removeService` (стр. 141) — локальный
- `addFeature` (стр. 145) — локальный
- `updateFeature` (стр. 152) — локальный
- `removeFeature` (стр. 159) — локальный
- `updateWork` (стр. 166) — локальный
- `addWork` (стр. 173) — локальный
- `removeWork` (стр. 177) — локальный
- `before` (стр. 219) — локальный
- `after` (стр. 220) — локальный
- `hl` (стр. 227) — локальный
- `parts` (стр. 228) — локальный
- `next` (стр. 300) — локальный

### frontend/src/app/components/client/ClientApp.tsx (1281 строк)

- `NOOP` (стр. 20) — локальный
- `UPCOMING_STATUSES` (стр. 44) — локальный
- `HISTORY_STATUSES` (стр. 45) — локальный
- `CANCELLABLE_STATUSES` (стр. 46) — локальный
- `isBoxRentalService` (стр. 49) — локальный
- `isDetailingService` (стр. 53) — локальный
- `serviceResourceGroup` (стр. 57) — локальный
- `bookingBoxesForService` (стр. 61) — локальный
- `isManualSchedulingBooking` (стр. 67) — локальный
- `ClientApp` (стр. 71)
- `todayStart` (стр. 109) — локальный
- `parsedSelectedDate` (стр. 120) — локальный
- `nextAvailableDate` (стр. 122) — локальный
- `parsedDate` (стр. 123) — локальный
- `parsedSelectedDate` (стр. 147) — локальный
- `loadAvailability` (стр. 155) — локальный
- `durationMinutes` (стр. 158) — локальный
- `nextSlots` (стр. 161) — локальный
- `raw` (стр. 183) — локальный
- `hasMain` (стр. 186) — локальный
- `vehicles` (стр. 187) — локальный
- `activeServices` (стр. 202) — локальный
- `categories` (стр. 203) — локальный
- `clientBookings` (стр. 204) — локальный
- `upcomingBookings` (стр. 205) — локальный
- `pastBookings` (стр. 206) — локальный
- `completedBookings` (стр. 207) — локальный
- `totalSpent` (стр. 208) — локальный
- `favoriteService` (стр. 209) — локальный
- `myNotifications` (стр. 215) — локальный
- `unreadCount` (стр. 216) — локальный
- `filteredServices` (стр. 218) — локальный
- `compatibleBoxes` (стр. 221) — локальный
- `defaultBoxName` (стр. 222) — локальный
- `selectedServiceIsBoxRental` (стр. 224) — локальный
- `selectedServiceIsDetailing` (стр. 225) — локальный
- `selectedDuration` (стр. 226) — локальный
- `selectedPrice` (стр. 231) — локальный
- `selectedDayDate` (стр. 236) — локальный
- `selectedDaySchedule` (стр. 237) — локальный
- `selectedDayWorkingHours` (стр. 240) — локальный
- `profileVehicles` (стр. 246) — локальный
- `primaryProfileVehicle` (стр. 249) — локальный
- `bookingVehicles` (стр. 250) — локальный
- `visibleProfileVehicles` (стр. 253) — локальный
- `selectedBookingVehicle` (стр. 254) — локальный
- `glass` (стр. 256) — локальный
- `bg` (стр. 260) — локальный
- `text` (стр. 261) — локальный
- `sub` (стр. 262) — локальный
- `primary` (стр. 263) — локальный
- `primaryBtn` (стр. 264) — локальный
- `secondaryBtn` (стр. 265) — локальный
- `slotCards` (стр. 266) — локальный
- `availableSlotCards` (стр. 267) — локальный
- `occupiedSlotCards` (стр. 268) — локальный
- `slotAvailabilityLoadingLabel` (стр. 269) — локальный
- `slotAvailabilityEmptyLabel` (стр. 270) — локальный
- `handleAddToCalendar` (стр. 272) — локальный
- `handleConfirmBooking` (стр. 280) — локальный
- `nextAvailableDate` (стр. 286) — локальный
- `parsedDate` (стр. 287) — локальный
- `primaryVehicle` (стр. 294) — локальный
- `booking` (стр. 295) — локальный
- `handleSaveProfile` (стр. 319) — локальный
- `nameError` (стр. 321) — локальный
- `primaryVehicle` (стр. 322) — локальный
- `carError` (стр. 323) — локальный
- `plateError` (стр. 324) — локальный
- `normalizedVehicles` (стр. 331) — локальный
- `normalizedProfile` (стр. 341) — локальный
- `handleCancelBooking` (стр. 360) — локальный
- `mainBtnState` (стр. 364) — локальный
- `navRef` (стр. 383) — локальный
- `handleBack` (стр. 386) — локальный
- `selected` (стр. 597) — локальный
- `selected` (стр. 683) — локальный
- `selected` (стр. 728) — локальный
- `slotClass` (стр. 729) — локальный
- `nextCar` (стр. 1003) — локальный
- `baseVehicles` (стр. 1005) — локальный
- `nextPlate` (стр. 1020) — локальный
- `baseVehicles` (стр. 1022) — локальный
- `nextCar` (стр. 1060) — локальный
- `baseVehicles` (стр. 1062) — локальный
- `nextPlate` (стр. 1077) — локальный
- `baseVehicles` (стр. 1079) — локальный
- `baseVehicles` (стр. 1092) — локальный
- `BookingCard` (стр. 1233) — локальный
- `manualScheduling` (стр. 1243) — локальный

### frontend/src/app/components/figma/ImageWithFallback.tsx (27 строк)

- `ImageWithFallback` (стр. 6)
- `handleError` (стр. 9) — локальный

### frontend/src/app/components/landing/Contact.tsx (126 строк)

- `Contact` (стр. 9)
- `handleSubmit` (стр. 19) — локальный

### frontend/src/app/components/landing/Footer.tsx (64 строк)

- `Footer` (стр. 3)
- `year` (стр. 4) — локальный

### frontend/src/app/components/landing/Hero.tsx (117 строк)

- `API_BASE` (стр. 4) — локальный
- `resolveImageUrl` (стр. 6) — локальный
- `STAT_ICONS` (стр. 30) — локальный
- `scrollToSection` (стр. 32) — локальный
- `id` (стр. 33) — локальный
- `Hero` (стр. 37)
- `h` (стр. 38) — локальный
- `bg` (стр. 39) — локальный
- `stats` (стр. 40) — локальный
- `titleParts` (стр. 42) — локальный
- `Icon` (стр. 93) — локальный

### frontend/src/app/components/landing/LandingPage.tsx (45 строк)

- `LandingPage` (стр. 13)
- `contactRef` (стр. 16) — локальный
- `handleBook` (стр. 24) — локальный

### frontend/src/app/components/landing/Navbar.tsx (91 строк)

- `navLinks` (стр. 4) — локальный
- `Navbar` (стр. 12)
- `onScroll` (стр. 17) — локальный
- `handleNav` (стр. 22) — локальный
- `el` (стр. 28) — локальный

### frontend/src/app/components/landing/Pricing.tsx (65 строк)

- `FALLBACK_PLANS` (стр. 4) — локальный
- `Pricing` (стр. 10)
- `plans` (стр. 11) — локальный

### frontend/src/app/components/landing/Services.tsx (65 строк)

- `Services` (стр. 13)
- `services` (стр. 14) — локальный
- `ServiceCard` (стр. 35) — локальный

### frontend/src/app/components/landing/StudioInfo.tsx (56 строк)

- `API_BASE` (стр. 3) — локальный
- `resolveImageUrl` (стр. 5) — локальный
- `StudioInfo` (стр. 12)
- `imgSrc` (стр. 15) — локальный

### frontend/src/app/components/landing/Testimonials.tsx (46 строк)

- `reviews` (стр. 3) — локальный
- `Testimonials` (стр. 10)

### frontend/src/app/components/landing/Works.tsx (100 строк)

- `API_BASE` (стр. 6) — локальный
- `resolveImageUrl` (стр. 8) — локальный
- `Works` (стр. 24)
- `items` (стр. 26) — локальный

### frontend/src/app/components/landing/WorksPage.tsx (39 строк)

- `WorksPage` (стр. 8)

### frontend/src/app/components/owner/OwnerApp.tsx (9574 строк)

- `EXPENSE_CATEGORIES` (стр. 125) — локальный
- `STOCK_UNITS` (стр. 126) — локальный
- `SERVICE_TYPE_OPTIONS` (стр. 127) — локальный
- `ownerBookingStatusRequiresScheduledSlot` (стр. 138) — локальный
- `employeeRoleLabel` (стр. 141) — локальный
- `ownerServiceResourceGroup` (стр. 147) — локальный
- `ownerDefaultBoxForService` (стр. 151) — локальный
- `rg` (стр. 152) — локальный
- `match` (стр. 153) — локальный
- `ownerBookingBoxes` (стр. 157) — локальный
- `ownerLocationLabel` (стр. 165) — локальный
- `parseOwnerBookingMinutes` (стр. 169) — локальный
- `match` (стр. 170) — локальный
- `hours` (стр. 172) — локальный
- `minutes` (стр. 173) — локальный
- `OWNER_CALENDAR_WEEKDAYS` (стр. 178) — локальный
- `OWNER_CALENDAR_MONTHS` (стр. 179) — локальный
- `OWNER_CALENDAR_DEFAULT_OPEN` (стр. 183) — локальный
- `OWNER_CALENDAR_DEFAULT_CLOSE` (стр. 184) — локальный
- `ownerScheduleTimeToMinutes` (стр. 186) — локальный
- `ownerMonthTitle` (стр. 190) — локальный
- `ownerBuildMonthCells` (стр. 194) — локальный
- `year` (стр. 195) — локальный
- `month` (стр. 196) — локальный
- `first` (стр. 197) — локальный
- `offset` (стр. 198) — локальный
- `daysInMonth` (стр. 199) — локальный
- `date` (стр. 205) — локальный
- `ownerCalendarDayHours` (стр. 214) — локальный
- `parsedDate` (стр. 215) — локальный
- `daySchedule` (стр. 219) — локальный
- `open` (стр. 223) — локальный
- `close` (стр. 224) — локальный
- `OWNER_CALENDAR_LOAD_COLORS` (стр. 228) — локальный
- `ownerCalendarLoadTone` (стр. 234) — локальный
- `ratio` (стр. 236) — локальный
- `ownerGroupBookingsByHour` (стр. 246) — локальный
- `timed` (стр. 251) — локальный
- `hourLabel` (стр. 254) — локальный
- `slotEnd` (стр. 255) — локальный
- `slotBookings` (стр. 256) — локальный
- `start` (стр. 258) — локальный
- `ownerOpenBookingDetail` (стр. 270) — локальный
- `ownerBookingBlocksBox` (стр. 279) — локальный
- `nextStart` (стр. 282) — локальный
- `existingStart` (стр. 283) — локальный
- `nextEnd` (стр. 285) — локальный
- `existingEnd` (стр. 286) — локальный
- `ownerPickDefaultBookingBox` (стр. 290) — локальный
- `resourceGroup` (стр. 299) — локальный
- `preferred` (стр. 300) — локальный
- `fallback` (стр. 301) — локальный
- `candidates` (стр. 302) — локальный
- `serviceResourceGroupForCategory` (стр. 307) — локальный
- `numberInputValue` (стр. 311) — локальный
- `ORDER_STEPS` (стр. 325) — локальный
- `serviceMoneySummary` (стр. 332) — локальный
- `piggyTargetLabel` (стр. 333) — локальный
- `master` (стр. 337) — локальный
- `piggy` (стр. 342) — локальный
- `owners` (стр. 349) — локальный
- `previewServiceSplit` (стр. 357) — локальный
- `materials` (стр. 362) — локальный
- `net` (стр. 363) — локальный
- `order` (стр. 364) — локальный
- `pipeline` (стр. 365) — локальный
- `piggyType` (стр. 366) — локальный
- `computeMaster` (стр. 373) — локальный
- `computePiggy` (стр. 382) — локальный
- `m` (стр. 389) — локальный
- `p` (стр. 391) — локальный
- `afterMasterPiggy` (стр. 393) — локальный
- `m` (стр. 412) — локальный
- `p` (стр. 416) — локальный
- `isLast` (стр. 420) — локальный
- `claimed` (стр. 421) — локальный
- `ownerPaymentLabel` (стр. 440) — локальный
- `normalizeOwnerPhoneSearchValue` (стр. 447) — локальный
- `numberFromInput` (стр. 453) — локальный
- `toISODate` (стр. 457) — локальный
- `parsed` (стр. 458) — локальный
- `y` (стр. 460) — локальный
- `m` (стр. 461) — локальный
- `d` (стр. 462) — локальный
- `TIME_SLOTS` (стр. 466) — локальный
- `h` (стр. 467) — локальный
- `m` (стр. 468) — локальный
- `OwnerApp` (стр. 475)
- `isAccountant` (стр. 551) — локальный
- `modalMaxHeight` (стр. 552) — локальный
- `financeRoleTitle` (стр. 553) — локальный
- `financeNotificationRole` (стр. 554) — локальный
- `__nowRpt` (стр. 619) — локальный
- `__dowRpt` (стр. 620) — локальный
- `__monRpt` (стр. 621) — локальный
- `__sunRpt` (стр. 622) — локальный
- `parentCategories` (стр. 643) — локальный
- `today` (стр. 741) — локальный
- `adminShiftPhotoUrlsRef` (стр. 766) — локальный
- `clearOwnerResetFlow` (стр. 846) — локальный
- `nextBoxes` (стр. 869) — локальный
- `params` (стр. 903) — локальный
- `handlePayOwnerSalary` (стр. 924) — локальный
- `amount` (стр. 925) — локальный
- `res` (стр. 929) — локальный
- `updated` (стр. 938) — локальный
- `loadPiggyBank` (стр. 946) — локальный
- `params` (стр. 950) — локальный
- `qs` (стр. 953) — локальный
- `data` (стр. 955) — локальный
- `loadWallet` (стр. 963) — локальный
- `data` (стр. 966) — локальный
- `handlePiggyWithdraw` (стр. 972) — локальный
- `f` (стр. 973) — локальный
- `syncCountdown` (стр. 1039) — локальный
- `diffMs` (стр. 1040) — локальный
- `intervalId` (стр. 1045) — локальный
- `ownerNotifications` (стр. 1070) — локальный
- `unreadCount` (стр. 1071) — локальный
- `completedBookings` (стр. 1072) — локальный
- `todayBookings` (стр. 1073) — локальный
- `latestShiftChecklists` (стр. 1074) — локальный
- `latestAdminShiftInspections` (стр. 1075) — локальный
- `latestAdminShiftInspectionKey` (стр. 1076) — локальный
- `activeIds` (стр. 1092) — локальный
- `currentPhotoUrls` (стр. 1105) — локальный
- `missing` (стр. 1106) — локальный
- `next` (стр. 1118) — локальный
- `vv` (стр. 1140) — локальный
- `handler` (стр. 1142) — локальный
- `el` (стр. 1143) — локальный
- `bookingFormBoxes` (стр. 1155) — локальный
- `bookingFormLocationLabel` (стр. 1156) — локальный
- `editBookingLocationLabel` (стр. 1157) — локальный
- `todayRevenue` (стр. 1158) — локальный
- `now` (стр. 1161) — локальный
- `dayOfWeek` (стр. 1162) — локальный
- `diffToSaturday` (стр. 1163) — локальный
- `weekSaturday` (стр. 1164) — локальный
- `weekFriday` (стр. 1167) — локальный
- `isDateInWeek` (стр. 1170) — локальный
- `d` (стр. 1171) — локальный
- `weeklyCompletedBookings` (стр. 1174) — локальный
- `weeklyBookings` (стр. 1175) — локальный
- `weeklyExpenses` (стр. 1176) — локальный
- `weeklyIncomes` (стр. 1177) — локальный
- `totalRevenue` (стр. 1178) — локальный
- `totalExpenses` (стр. 1179) — локальный
- `totalIncomes` (стр. 1180) — локальный
- `profit` (стр. 1181) — локальный
- `averageCheck` (стр. 1182) — локальный
- `activeBookings` (стр. 1183) — локальный
- `pipelineCounts` (стр. 1184) — локальный
- `totalStockValue` (стр. 1191) — локальный
- `washRevenue` (стр. 1194) — локальный
- `detailingRevenue` (стр. 1197) — локальный
- `washExpenses` (стр. 1200) — локальный
- `detailingExpenses` (стр. 1203) — локальный
- `washIncomes` (стр. 1206) — локальный
- `detailingIncomes` (стр. 1209) — локальный
- `resourceGroupLabel` (стр. 1213) — локальный
- `payrollRows` (стр. 1218) — локальный
- `workerPenalties` (стр. 1219) — локальный
- `complaintState` (стр. 1220) — локальный
- `payrollTotal` (стр. 1228) — локальный
- `formatComplaintDate` (стр. 1229) — локальный
- `resetPreviewRows` (стр. 1230) — локальный
- `resetExecuteLocked` (стр. 1244) — локальный
- `glass` (стр. 1246) — локальный
- `bg` (стр. 1247) — локальный
- `text` (стр. 1248) — локальный
- `sub` (стр. 1249) — локальный
- `primary` (стр. 1250) — локальный
- `accent` (стр. 1251) — локальный
- `surface` (стр. 1252) — локальный
- `inputCls` (стр. 1253) — локальный
- `selectCls` (стр. 1254) — локальный
- `tooltipStyle` (стр. 1255) — локальный
- `createDraftId` (стр. 1256) — локальный
- `handleAddBoxDraft` (стр. 1258) — локальный
- `handleRemoveBoxDraft` (стр. 1272) — локальный
- `handleAddServiceDraft` (стр. 1276) — локальный
- `handleRemoveServiceDraft` (стр. 1305) — локальный
- `handleHireWorker` (стр. 1309) — локальный
- `name` (стр. 1310) — локальный
- `login` (стр. 1311) — локальный
- `password` (стр. 1312) — локальный
- `employeeLabel` (стр. 1313) — локальный
- `handleSaveSettings` (стр. 1356) — локальный
- `wantsPasswordChange` (стр. 1358) — локальный
- `handleStartOwnerReset` (стр. 1407) — локальный
- `response` (стр. 1417) — локальный
- `handleApproveOwnerReset` (стр. 1436) — локальный
- `response` (стр. 1454) — локальный
- `handleExecuteOwnerReset` (стр. 1469) — локальный
- `response` (стр. 1478) — локальный
- `handleAddExpense` (стр. 1489) — локальный
- `dateValid` (стр. 1491) — локальный
- `title` (стр. 1493) — локальный
- `amount` (стр. 1494) — локальный

### frontend/src/app/components/shared/AttendanceTable.tsx (199 строк)

- `AttendanceTable` (стр. 34)
- `fetchData` (стр. 41) — локальный
- `result` (стр. 52) — локальный
- `result` (стр. 56) — локальный

### frontend/src/app/components/shared/ServiceSearchSelect.tsx (130 строк)

- `ServiceSearchSelect` (стр. 19)
- `containerRef` (стр. 34) — локальный
- `inputRef` (стр. 35) — локальный
- `selectedService` (стр. 37) — локальный
- `filtered` (стр. 39) — локальный
- `handleClickOutside` (стр. 44) — локальный
- `handleSelect` (стр. 53) — локальный
- `handleInputChange` (стр. 59) — локальный
- `handleInputFocus` (стр. 64) — локальный
- `CheckIcon` (стр. 124) — локальный

### frontend/src/app/components/worker/WorkerApp.tsx (1560 строк)

- `workerStatusLabel` (стр. 21) — локальный
- `workerStatusBadge` (стр. 44) — локальный
- `DAY_NAMES` (стр. 73) — локальный
- `MONTH_NAMES` (стр. 74) — локальный
- `groupBookingsByDate` (стр. 76) — локальный
- `WorkerEarningsCalendar` (стр. 87) — локальный
- `now` (стр. 109) — локальный
- `calYear` (стр. 110) — локальный
- `calMonth` (стр. 111) — локальный
- `datesWithBookings` (стр. 113) — локальный
- `firstDay` (стр. 115) — локальный
- `lastDay` (стр. 116) — локальный
- `startPad` (стр. 117) — локальный
- `totalDays` (стр. 118) — локальный
- `selectedDayBookings` (стр. 124) — локальный
- `formatDateKey` (стр. 128) — локальный
- `mm` (стр. 129) — локальный
- `dd` (стр. 130) — локальный
- `dateKey` (стр. 160) — локальный
- `hasBooking` (стр. 161) — локальный
- `isSelected` (стр. 162) — локальный
- `isToday` (стр. 163) — локальный
- `WorkerApp` (стр. 211)
- `workerId` (стр. 241) — локальный
- `params` (стр. 337) — локальный
- `loadCalendar` (стр. 348) — локальный
- `myNotifications` (стр. 361) — локальный
- `unreadCount` (стр. 362) — локальный
- `allTasks` (стр. 364) — локальный
- `todayTasks` (стр. 367) — локальный
- `myEarnings` (стр. 369) — локальный
- `w` (стр. 372) — локальный
- `earned` (стр. 373) — локальный
- `totalEarned` (стр. 380) — локальный
- `payrollSummary` (стр. 381) — локальный
- `earnedForDisplay` (стр. 382) — локальный
- `myPenalties` (стр. 383) — локальный
- `complaintState` (стр. 384) — локальный
- `payoutAfterPenalties` (стр. 385) — локальный
- `allMyTasks` (стр. 387) — локальный
- `completedCount` (стр. 388) — локальный
- `avgCheck` (стр. 389) — локальный
- `chemistryItems` (стр. 390) — локальный
- `formatTimer` (стр. 398) — локальный
- `glass` (стр. 400) — локальный
- `bg` (стр. 401) — локальный
- `text` (стр. 402) — локальный
- `sub` (стр. 403) — локальный
- `primary` (стр. 404) — локальный
- `accent` (стр. 405) — локальный
- `surface` (стр. 406) — локальный
- `inputCls` (стр. 407) — локальный
- `formatComplaintDate` (стр. 408) — локальный
- `handleStartTask` (стр. 410) — локальный
- `openFinishModal` (стр. 417) — локальный
- `handleFinish` (стр. 426) — локальный
- `nextNote` (стр. 432) — локальный
- `handleSaveProfile` (стр. 470) — локальный
- `handleSubmitShiftChecklist` (стр. 476) — локальный
- `saved` (стр. 479) — локальный
- `handleSavePass` (стр. 494) — локальный
- `handleGenerateTelegramCode` (стр. 521) — локальный
- `handleSaveNotifications` (стр. 525) — локальный
- `headerTitle` (стр. 531) — локальный
- `isMyService` (стр. 596) — локальный
- `dayTasks` (стр. 695) — локальный
- `shiftPay` (стр. 826) — локальный
- `bonuses` (стр. 827) — локальный
- `advances` (стр. 828) — локальный
- `deductions` (стр. 829) — локальный
- `adjustments` (стр. 830) — локальный
- `totalAccrued` (стр. 831) — локальный
- `totalDeducted` (стр. 832) — локальный
- `w` (стр. 1216) — локальный
- `earned` (стр. 1217) — локальный
- `paymentLabel` (стр. 1220) — локальный

### frontend/src/app/components/worker/WorkerCalendar.tsx (599 строк)

- `WORKER_CALENDAR_WEEKDAYS` (стр. 22) — локальный
- `WORKER_CALENDAR_MONTHS` (стр. 23) — локальный
- `WORKER_CALENDAR_DEFAULT_OPEN` (стр. 27) — локальный
- `WORKER_CALENDAR_DEFAULT_CLOSE` (стр. 28) — локальный
- `WORKER_CALENDAR_LOAD_COLORS` (стр. 30) — локальный
- `workerParseBookingMinutes` (стр. 36) — локальный
- `match` (стр. 37) — локальный
- `hours` (стр. 39) — локальный
- `minutes` (стр. 40) — локальный
- `workerScheduleTimeToMinutes` (стр. 45) — локальный
- `workerMonthTitle` (стр. 49) — локальный
- `workerBuildMonthCells` (стр. 53) — локальный
- `year` (стр. 54) — локальный
- `month` (стр. 55) — локальный
- `first` (стр. 56) — локальный
- `offset` (стр. 57) — локальный
- `daysInMonth` (стр. 58) — локальный
- `date` (стр. 64) — локальный
- `workerCalendarDayHours` (стр. 73) — локальный
- `parsedDate` (стр. 74) — локальный
- `daySchedule` (стр. 78) — локальный
- `open` (стр. 82) — локальный
- `close` (стр. 83) — локальный
- `workerCalendarLoadTone` (стр. 87) — локальный
- `ratio` (стр. 89) — локальный
- `workerGroupBookingsByHour` (стр. 99) — локальный
- `timed` (стр. 104) — локальный
- `hourLabel` (стр. 107) — локальный
- `slotEnd` (стр. 108) — локальный
- `slotBookings` (стр. 109) — локальный
- `start` (стр. 111) — локальный
- `workerCalendarStatusLabel` (стр. 123) — локальный
- `workerCalendarStatusBadge` (стр. 144) — локальный
- `WorkerCalendar` (стр. 178)
- `now` (стр. 194) — локальный
- `relevantBookings` (стр. 199) — локальный
- `bookingsByDate` (стр. 200) — локальный
- `dateLabel` (стр. 201) — локальный
- `monthCells` (стр. 209) — локальный
- `monthLabel` (стр. 210) — локальный
- `monthLoads` (стр. 211) — локальный
- `monthMaxLoad` (стр. 214) — локальный
- `dayBookings` (стр. 216) — локальный
- `dayHours` (стр. 217) — локальный
- `hourSlots` (стр. 218) — локальный
- `untimedBookings` (стр. 219) — локальный
- `dayTitle` (стр. 220) — локальный
- `activeMasters` (стр. 226) — локальный
- `timeSlots` (стр. 227) — локальный
- `workerGrid` (стр. 228) — локальный
- `isMine` (стр. 237) — локальный
- `statusLine` (стр. 239) — локальный
- `workerNames` (стр. 240) — локальный
- `today` (стр. 284) — локальный
- `dayItems` (стр. 304) — локальный
- `loadTone` (стр. 305) — локальный
- `loadWidth` (стр. 306) — локальный
- `isToday` (стр. 309) — локальный
- `today` (стр. 384) — локальный
- `workerItems` (стр. 555) — локальный

### frontend/src/app/constants/referralSources.ts (8 строк)

- `REFERRAL_SOURCES` (стр. 1)

### frontend/src/app/context/AppContext.tsx (1735 строк)

- `EMPTY_CONTENT` (стр. 737)
- `timeToMinutes` (стр. 760) — локальный
- `minutesToTime` (стр. 767) — локальный
- `hours` (стр. 768) — локальный
- `minutes` (стр. 769) — локальный
- `buildTimeSlots` (стр. 773) — локальный
- `timeRangesOverlap` (стр. 781) — локальный
- `AppContext` (стр. 785) — локальный
- `normalizeWorker` (стр. 787) — локальный
- `normalizeBootstrap` (стр. 801) — локальный
- `AppProvider` (стр. 825)
- `upcomingDates` (стр. 849) — локальный
- `todayLabel` (стр. 850) — локальный
- `tomorrowLabel` (стр. 851) — локальный
- `applyBootstrap` (стр. 853) — локальный
- `normalized` (стр. 854) — локальный
- `refreshBootstrap` (стр. 882) — локальный
- `bootstrap` (стр. 883) — локальный
- `handleError` (стр. 887) — локальный
- `message` (стр. 888) — локальный
- `restoreSession` (стр. 893) — локальный
- `bootstrap` (стр. 895) — локальный
- `refreshActiveSessions` (стр. 904) — локальный
- `applyTelegramTheme` (стр. 908) — локальный
- `root` (стр. 910) — локальный
- `theme` (стр. 911) — локальный
- `cssVar` (стр. 914) — локальный
- `tg` (стр. 921) — локальный
- `logout` (стр. 938) — локальный
- `loginClient` (стр. 962) — локальный
- `bootstrap` (стр. 966) — локальный
- `linkStaff` (стр. 980) — локальный
- `bootstrap` (стр. 984) — локальный
- `switchRole` (стр. 998) — локальный
- `bootstrap` (стр. 1002) — локальный
- `updateClientProfile` (стр. 1016) — локальный
- `payload` (стр. 1017) — локальный
- `saved` (стр. 1018) — локальный
- `remindAdminAboutInactiveClients` (стр. 1022) — локальный
- `response` (стр. 1023) — локальный
- `addClient` (стр. 1027) — локальный
- `created` (стр. 1028) — локальный
- `normalized` (стр. 1029) — локальный
- `updateClientCard` (стр. 1034) — локальный
- `saved` (стр. 1035) — локальный
- `normalized` (стр. 1036) — локальный
- `deleteClient` (стр. 1040) — локальный
- `addBooking` (стр. 1045) — локальный
- `created` (стр. 1046) — локальный
- `existingClient` (стр. 1066) — локальный
- `nextClient` (стр. 1067) — локальный
- `updateBooking` (стр. 1091) — локальный
- `updated` (стр. 1092) — локальный
- `deleteBooking` (стр. 1118) — локальный
- `addBookingService` (стр. 1123) — локальный
- `updated` (стр. 1124) — локальный
- `addBookingAdditionalService` (стр. 1144) — локальный
- `updated` (стр. 1145) — локальный
- `removeBookingAdditionalService` (стр. 1165) — локальный
- `updated` (стр. 1166) — локальный
- `addNotification` (стр. 1186) — локальный
- `created` (стр. 1187) — локальный
- `markNotificationRead` (стр. 1206) — локальный
- `markAllNotificationsRead` (стр. 1211) — локальный
- `addStockItem` (стр. 1225) — локальный
- `created` (стр. 1226) — локальный
- `updateStockItem` (стр. 1230) — локальный
- `updated` (стр. 1231) — локальный
- `writeOffStock` (стр. 1235) — локальный
- `updated` (стр. 1236) — локальный
- `getWriteOffHistory` (стр. 1240) — локальный
- `deleteStockItem` (стр. 1244) — локальный
- `addStockCategory` (стр. 1249) — локальный
- `created` (стр. 1250) — локальный
- `updateStockCategory` (стр. 1254) — локальный
- `updated` (стр. 1255) — локальный
- `deleteStockCategory` (стр. 1259) — локальный
- `addExpense` (стр. 1268) — локальный
- `created` (стр. 1269) — локальный
- `addIncome` (стр. 1273) — локальный
- `created` (стр. 1274) — локальный
- `updateExpense` (стр. 1278) — локальный
- `updated` (стр. 1279) — локальный
- `updateIncome` (стр. 1283) — локальный
- `updated` (стр. 1284) — локальный
- `addPenalty` (стр. 1288) — локальный
- `revokePenalty` (стр. 1293) — локальный
- `revokeAllPenalties` (стр. 1298) — локальный
- `createTelegramLinkCode` (стр. 1303) — локальный
- `created` (стр. 1304) — локальный
- `downloadOwnerExport` (стр. 1308) — локальный
- `fallback` (стр. 1309) — локальный
- `qs` (стр. 1312) — локальный
- `qstr` (стр. 1316) — локальный
- `sendOwnerExportToTelegram` (стр. 1322) — локальный
- `qs` (стр. 1325) — локальный
- `qstr` (стр. 1329) — локальный
- `sendOwnerSummaryReport` (стр. 1335) — локальный
- `response` (стр. 1336) — локальный
- `dispatchOwnerReminders` (стр. 1340) — локальный
- `saveServices` (стр. 1350) — локальный
- `saveBoxes` (стр. 1355) — локальный
- `saveSchedule` (стр. 1359) — локальный
- `saveAdminProfile` (стр. 1363) — локальный
- `saved` (стр. 1364) — локальный
- `saveAdminNotificationSettings` (стр. 1368) — локальный
- `saved` (стр. 1369) — локальный
- `saveWorkerProfile` (стр. 1373) — локальный
- `saved` (стр. 1374) — локальный
- `normalized` (стр. 1375) — локальный
- `saveWorkerNotificationSettings` (стр. 1382) — локальный
- `saved` (стр. 1383) — локальный
- `saveOwnerCompany` (стр. 1390) — локальный
- `saved` (стр. 1391) — локальный
- `saveOwnerNotificationSettings` (стр. 1395) — локальный
- `saved` (стр. 1396) — локальный
- `saveOwnerIntegrations` (стр. 1400) — локальный
- `saved` (стр. 1401) — локальный
- `saveOwnerSecurity` (стр. 1405) — локальный
- `saved` (стр. 1406) — локальный
- `saveWorkerSettings` (стр. 1410) — локальный
- `saved` (стр. 1411) — локальный
- `saveAdminWorkerPayroll` (стр. 1415) — локальный
- `saved` (стр. 1416) — локальный
- `normalized` (стр. 1417) — локальный
- `nextWorker` (стр. 1419) — локальный
- `saveContent` (стр. 1424) — локальный
- `saved` (стр. 1425) — локальный
- `createPayrollEntry` (стр. 1429) — локальный
- `checkConsent` (стр. 1434) — локальный
- `response` (стр. 1436) — локальный
- `submitConsent` (стр. 1443) — локальный
- `listShiftChecklists` (стр. 1447) — локальный
- `entries` (стр. 1448) — локальный
- `submitShiftChecklist` (стр. 1452) — локальный
- `entry` (стр. 1453) — локальный
- `listAdminShiftInspections` (стр. 1460) — локальный
- `entries` (стр. 1461) — локальный
- `submitAdminShiftInspection` (стр. 1469) — локальный
- `entry` (стр. 1476) — локальный
- `hireWorker` (стр. 1487) — локальный
- `created` (стр. 1488) — локальный
- `normalized` (стр. 1489) — локальный
- `fireWorker` (стр. 1499) — локальный
- `resetWorkerPassword` (стр. 1504) — локальный
- `changePassword` (стр. 1511) — локальный
- `requestOwnerDatabaseReset` (стр. 1518) — локальный
- `response` (стр. 1519) — локальный
- `approveOwnerDatabaseReset` (стр. 1536) — локальный
- `response` (стр. 1537) — локальный
- `executeOwnerDatabaseReset` (стр. 1553) — локальный
- `response` (стр. 1554) — локальный
- `getTimeSlotsForDate` (стр. 1562) — локальный
- `parsedDate` (стр. 1563) — локальный
- `day` (стр. 1565) — локальный
- `openMinutes` (стр. 1568) — локальный
- `closeMinutes` (стр. 1569) — локальный
- `durationMinutes` (стр. 1572) — локальный
- `scheduleSlots` (стр. 1573) — локальный
- `candidateBoxes` (стр. 1574) — локальный
- `boxNames` (стр. 1579) — локальный
- `slotStart` (стр. 1581) — локальный
- `slotEnd` (стр. 1583) — локальный
- `bookingStart` (стр. 1590) — локальный
- `getBookingAvailabilityForDate` (стр. 1597) — локальный
- `durationMinutes` (стр. 1598) — локальный
- `params` (стр. 1600) — локальный
- `response` (стр. 1610) — локальный
- `useApp` (стр. 1727)
- `ctx` (стр. 1728) — локальный
- `getWorkerNotificationSettings` (стр. 1733)

### frontend/src/app/hooks/useTelegramBackButton.ts (23 строк)

- `useTelegramBackButton` (стр. 4)
- `tg` (стр. 6) — локальный
- `btn` (стр. 7) — локальный

### frontend/src/app/hooks/useTelegramMainButton.ts (34 строк)

- `useTelegramMainButton` (стр. 4)
- `tg` (стр. 11) — локальный
- `btn` (стр. 12) — локальный

### frontend/src/app/utils/complaints.ts (44 строк)

- `MAX_WORKER_PERCENT` (стр. 3)
- `COMPLAINT_THRESHOLD` (стр. 4)
- `COMPLAINT_PERCENT_DEDUCTION` (стр. 5)
- `clampPercent` (стр. 9) — локальный
- `complaintEndAt` (стр. 13) — локальный
- `isComplaintActive` (стр. 20)
- `getComplaintPenaltyState` (стр. 24)
- `activeComplaints` (стр. 25) — локальный
- `endTimes` (стр. 26) — локальный
- `reductionActive` (стр. 29) — локальный
- `reductionUntil` (стр. 30) — локальный
- `normalizedBasePercent` (стр. 31) — локальный
- `effectivePercent` (стр. 32) — локальный

### frontend/src/app/utils/date.ts (73 строк)

- `formatDate` (стр. 1)
- `day` (стр. 2) — локальный
- `month` (стр. 3) — локальный
- `year` (стр. 4) — локальный
- `parseDate` (стр. 8)
- `parseFlexibleDate` (стр. 13)
- `parsed` (стр. 18) — локальный
- `parsed` (стр. 24) — локальный
- `combineDateTime` (стр. 30)
- `baseDate` (стр. 31) — локальный
- `next` (стр. 35) — локальный
- `isPastTimeSlot` (стр. 40)
- `bookingDate` (стр. 41) — локальный
- `current` (стр. 43) — локальный
- `getUpcomingDates` (стр. 48)
- `date` (стр. 50) — локальный
- `getScheduleDayIndex` (стр. 57)
- `startOfDay` (стр. 61)
- `next` (стр. 62) — локальный
- `getLastNDates` (стр. 67)
- `date` (стр. 69) — локальный

### frontend/src/app/utils/useVisualViewport.ts (46 строк)

- `useVisualViewport` (стр. 13)
- `vv` (стр. 15) — локальный
- `vv` (стр. 23) — локальный
- `handler` (стр. 26) — локальный
- `computeModalMaxHeight` (стр. 41)

### frontend/src/app/utils/validation.ts (162 строк)

- `NAME_PATTERN` (стр. 3) — локальный
- `REPEATED_LETTERS_PATTERN` (стр. 4) — локальный
- `VEHICLE_PATTERN` (стр. 5) — локальный
- `REPEATED_VEHICLE_PATTERN` (стр. 6) — локальный
- `PLATE_ALLOWED_LETTERS` (стр. 7) — локальный
- `PLATE_PATTERN` (стр. 36) — локальный
- `MOTORCYCLE_PLATE_PATTERN` (стр. 37) — локальный
- `normalizePersonName` (стр. 39)
- `validatePersonName` (стр. 43)
- `normalized` (стр. 44) — локальный
- `validatePhoneValue` (стр. 50)
- `digits` (стр. 51) — локальный
- `normalized` (стр. 53) — локальный
- `normalizeVehicleInput` (стр. 60)
- `validateVehicleName` (стр. 64)
- `normalized` (стр. 65) — локальный
- `lettersOnly` (стр. 66) — локальный
- `plateExpectedAtPosition` (стр. 75) — локальный
- `normalizePlateInput` (стр. 85)
- `expected` (стр. 95) — локальный
- `mapped` (стр. 97) — локальный
- `validatePlateValue` (стр. 114)
- `normalized` (стр. 116) — локальный
- `normalized` (стр. 124) — локальный
- `hasEmptyVehicles` (стр. 134) — локальный
- `isClientCardIncomplete` (стр. 139)
- `weekAgo` (стр. 149) — локальный
- `created` (стр. 150) — локальный

### frontend/src/main.tsx (7 строк)

## Carwash — лендинг (carwash/src)

### carwash/src/api.ts (42 строк)

- `API_BASE` (стр. 1) — локальный
- `fetchContent` (стр. 31)
- `res` (стр. 39) — локальный

### carwash/src/app/App.tsx (46 строк)

- `App` (стр. 13)
- `contactRef` (стр. 16) — локальный
- `handleBook` (стр. 18) — локальный

### carwash/src/app/components/Contact.tsx (283 строк)

- `Contact` (стр. 9)
- `handleSubmit` (стр. 28) — локальный

### carwash/src/app/components/figma/ImageWithFallback.tsx (27 строк)

- `ImageWithFallback` (стр. 6)
- `handleError` (стр. 9) — локальный

### carwash/src/app/components/Footer.tsx (95 строк)

- `Footer` (стр. 3)
- `year` (стр. 4) — локальный

### carwash/src/app/components/Hero.tsx (112 строк)

- `stats` (стр. 6) — локальный
- `Hero` (стр. 12)
- `scrollToServices` (стр. 13) — локальный

### carwash/src/app/components/Navbar.tsx (114 строк)

- `navLinks` (стр. 4) — локальный
- `Navbar` (стр. 12)
- `onScroll` (стр. 17) — локальный
- `handleNav` (стр. 22) — локальный
- `el` (стр. 24) — локальный

### carwash/src/app/components/Pricing.tsx (175 строк)

- `FALLBACK_PLANS` (стр. 4) — локальный
- `Pricing` (стр. 56)
- `plans` (стр. 57) — локальный

### carwash/src/app/components/Services.tsx (183 строк)

- `Services` (стр. 57)
- `services` (стр. 58) — локальный
- `ServiceCard` (стр. 100) — локальный

### carwash/src/app/components/Testimonials.tsx (134 строк)

- `reviews` (стр. 3) — локальный
- `Testimonials` (стр. 42)

### carwash/src/app/useContent.ts (16 строк)

- `useContent` (стр. 4)

### carwash/src/main.tsx (7 строк)

## Showcase — лендинг (Showcase/src)

### Showcase/src/app/App.tsx (23 строк)

- `App` (стр. 10)

### Showcase/src/app/components/BookingSection.tsx (171 строк)

- `services` (стр. 5) — локальный
- `vehicles` (стр. 14) — локальный
- `BookingSection` (стр. 16)
- `handleChange` (стр. 20) — локальный
- `handleSubmit` (стр. 24) — локальный

### Showcase/src/app/components/figma/ImageWithFallback.tsx (27 строк)

- `ImageWithFallback` (стр. 6)
- `handleError` (стр. 9) — локальный

### Showcase/src/app/components/Footer.tsx (91 строк)

- `Footer` (стр. 3)

### Showcase/src/app/components/GallerySection.tsx (155 строк)

- `photos` (стр. 5) — локальный
- `GallerySection` (стр. 43)

### Showcase/src/app/components/HeroSection.tsx (85 строк)

- `HeroSection` (стр. 4)

### Showcase/src/app/components/Navbar.tsx (87 строк)

- `Navbar` (стр. 4)
- `onScroll` (стр. 9) — локальный
- `links` (стр. 14) — локальный

### Showcase/src/app/components/PricingSection.tsx (153 строк)

- `plans` (стр. 4) — локальный
- `PricingSection` (стр. 56)

### Showcase/src/app/components/ServicesSection.tsx (120 строк)

- `services` (стр. 4) — локальный
- `ServicesSection` (стр. 58)
- `Icon` (стр. 85) — локальный
- `colorCls` (стр. 86) — локальный

### Showcase/src/app/components/TestimonialsSection.tsx (111 строк)

- `testimonials` (стр. 4) — локальный
- `TestimonialsSection` (стр. 49)

### Showcase/src/main.tsx (7 строк)

## API (Vercel serverless)

### api/index.py (1 строк)

## Native (Electron)

### native/electron/src/main.js (179 строк)

- `path` (стр. 3) — локальный
- `net` (стр. 4) — локальный
- `PORT` (стр. 6) — локальный
- `BACKEND_URL` (стр. 7) — локальный
- `resolveBackendDir` (стр. 16) — локальный
- `projectRoot` (стр. 21) — локальный
- `backendExeName` (стр. 25) — локальный
- `waitForPort` (стр. 29) — локальный
- `start` (стр. 31) — локальный
- `check` (стр. 32) — локальный
- `sock` (стр. 37) — локальный
- `killBackendTree` (стр. 54) — локальный
- `startBackend` (стр. 79) — локальный
- `backendDir` (стр. 80) — локальный
- `exe` (стр. 81) — локальный
- `createWindow` (стр. 107) — локальный

## Скрипты и корневые файлы

- `scripts/generate_project_map.py`
- `app.py`

## Недавно изменённые файлы

- `frontend/src/app/components/admin/AdminApp.tsx` (2026-08-03 11:47)
- `frontend/src/app/components/owner/OwnerApp.tsx` (2026-08-03 11:46)
- `scripts/.project-map-watch.lock` (2026-08-03 10:27)
- `backend/tests/test_worker_calendar.py` (2026-08-01 22:48)
- `backend/app/main.py` (2026-08-01 22:38)
- `frontend/src/app/components/worker/WorkerApp.tsx` (2026-08-01 22:23)
- `frontend/src/app/components/worker/WorkerCalendar.tsx` (2026-08-01 22:23)
- `backend/app/schemas.py` (2026-08-01 22:21)
- `backend/app/models.py` (2026-08-01 15:35)
- `frontend/src/app/context/AppContext.tsx` (2026-08-01 13:14)
- `AGENTS.md` (2026-08-01 12:53)
- `scripts/generate_project_map.py` (2026-08-01 12:50)
- `.gitignore` (2026-08-01 12:49)
- `scripts/start-project-map-watch.vbs` (2026-08-01 12:49)
- `backend/app/security.py` (2026-08-01 12:45)
