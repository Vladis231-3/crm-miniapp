# PROJECT_MAP — карта проекта

> Автосгенерировано 2026-08-07 13:50 UTC. **НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ.**

**Обновление:**

```
python scripts/generate_project_map.py            # один раз
scripts\watch-project-map.bat                    # фоновый вотчер (перезапускается при изменениях)
python scripts/generate_project_map.py --install-hook  # git pre-commit хук (обновляет карту при коммите)
```

## Статистика

- Файлов кода: **246**
- Строк кода: **78 516**
- По расширениям: `.js`: 1, `.mjs`: 3, `.py`: 40, `.ts`: 19, `.tsx`: 183

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
│   │   ├── test_archive.py
│   │   ├── test_attendance_endpoints.py
│   │   ├── test_booking_logic.py
│   │   ├── test_booking_money_split.py
│   │   ├── test_broadcast_edge_cases.py
│   │   ├── test_config.py
│   │   ├── test_content.py
│   │   ├── test_deposit.py
│   │   ├── test_finance_edit.py
│   │   ├── test_income_endpoints.py
│   │   ├── test_worker_calendar.py
│   │   └── test_worker_car_search.py
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
│   │   │   │   │   ├── DepositPanel.tsx
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

### backend/app/exports.py (3099 строк)

Классы и функции (42):

- `class ExportMetric: label: str value: str @dataclass(frozen=True)` (стр. 87)
- `class OwnerExportData: owner_name: str company_name: str generated_at: datetime period_from: str period_to: str …` (стр. 99)
- `class GeneratedExport: file_name: str media_type: str content: bytes telegram_caption: str ReportPeriod = Literal["daily` (стр. 137)
- `class OwnerSummaryReport: title: str message: str @dataclass(frozen=True)` (стр. 161)
- `class OwnerSummaryContext: company_name: str generated_at: datetime period: ReportPeriod segment: ReportSegment period_l` (стр. 173)
- `class OwnerSummaryExportData: owner_name: str company_name: str title: str generated_at: datetime period_label: str …` (стр. 197)
- `build_owner_summary_reportdef build_owner_summary_report( *, company_name: str, bookings: list[Booking], services: list[Service], expenses: list[Expense] | None = None, incomes: list[Income] | None = None, ` (стр. 235)
- `OwnerSummaryExportData._parse_ddmmyyyydef _parse_ddmmyyyy(value: str) -> datetime | None: try: return datetime.strptime(value.strip(), "%d.%m.%Y") except ValueError: return None` (стр. 307)
- `OwnerSummaryExportData._in_perioddef _in_period(date_str: str) -> bool: dt = _parse_ddmmyyyy(date_str) if dt is None: return False # Сравниваем без timezone (period_start/end могут быть aware) ps = period_start.re` (стр. 319)
- `build_owner_summary_exportdef build_owner_summary_export( *, owner: StaffUser, company_name: str, bookings: list[Booking], services: list[Service], penalties: list[Penalty] | None = None, piggy_transactions` (стр. 481)
- `_build_owner_summary_contextdef _build_owner_summary_context( *, company_name: str, bookings: list[Booking], services: list[Service], period: ReportPeriod, segment: ReportSegment, now: datetime | None = None,` (стр. 569)
- `_summary_headerdef _summary_header(context: OwnerSummaryContext) -> str: return f"{context.company_name}\n{context.title}\nПериод: {context.period_label}"` (стр. 653)
- `_build_owner_summary_export_datadef _build_owner_summary_export_data( *, owner_name: str, context: OwnerSummaryContext, penalties: list[Penalty] | None = None,` (стр. 661)
- `_summary_period_boundsdef _summary_period_bounds(period: ReportPeriod, current: datetime) -> tuple[datetime, datetime, str]: end_at = current.replace(hour=0, minute=0, second=0, microsecond=0) + timedel` (стр. 1479)
- `_summary_period_labeldef _summary_period_label(period_start: datetime, period_end: datetime) -> str: last_day = period_end - timedelta(days=1) if period_start.date() == last_day.date():` (стр. 1497)
- `_booking_matches_segmentdef _booking_matches_segment(booking: Booking, service: Service | None, segment: ReportSegment) -> bool: if service is not None and service.category: category = service.category.st` (стр. 1511)
- `build_owner_exportdef build_owner_export( *, kind: ExportKind, owner: StaffUser, company_name: str, bookings: list[Booking], expenses: list[Expense], penalties: list[Penalty], workers: list[StaffUse` (стр. 1537)
- `_build_export_datadef _build_export_data( *, owner: StaffUser, company_name: str, bookings: list[Booking], expenses: list[Expense], penalties: list[Penalty], workers: list[StaffUser], stock_items: l` (стр. 1625)
- `OwnerSummaryExportData._is_fixed_bookingdef _is_fixed_booking(booking: Booking) -> bool: # привязка строго по названию — "подготовка к полировке" всегда фиксированная if is_fixed_master_service(booking.service):` (стр. 1707)
- `_render_excel_reportdef _render_excel_report(data: OwnerExportData) -> bytes: workbook = Workbook() summary = workbook.active summary.title = "Сводка" summary.merge_cells("A1:D1") summary["A1"] = data` (стр. 2223)
- `_render_owner_summary_excel_reportdef _render_owner_summary_excel_report(data: OwnerSummaryExportData) -> bytes: workbook = Workbook() summary = workbook.active summary.title = "Сводка" summary.merge_cells("A1:D1")` (стр. 2291)
- `_append_sheetdef _append_sheet(workbook: Workbook, title: str, headers: list[str], rows: list[list[Any]], *, currency_cols: set[int] | None = None) -> None: sheet = workbook.create_sheet(title)` (стр. 2467)
- `_render_pdf_reportdef _render_pdf_report(data: OwnerExportData) -> bytes: buffer = io.BytesIO() font_name = _pdf_font_name() styles = getSampleStyleSheet() title_style = ParagraphStyle("OwnerTitle",` (стр. 2497)
- `_pdf_sectiondef _pdf_section(story: list[Any], section_style: ParagraphStyle, font_name: str, title: str, headers: list[str], rows: list[list[Any]]) -> None: story.append(Paragraph(title, sect` (стр. 2583)
- `_pdf_tabledef _pdf_table(rows: list[list[Any]], font_name: str, header_color: str = "#0E1624") -> LongTable: normalized = [[Paragraph(_escape(str(cell)), _pdf_cell_style(font_name)) for cell` (стр. 2599)
- `_format_rowsdef _format_rows(rows: list[list[Any]], *, currency_cols: set[int]) -> list[list[Any]]: formatted: list[list[Any]] = [] for row in rows: next_row = [] for index, value in enumerate` (стр. 2639)
- `_style_headingdef _style_heading(sheet, *cells: str) -> None: if cells: sheet[cells[0]].font = Font(size=16, bold=True, color="0B1226") for cell_name in cells[1:]: sheet[cell_name].font = Font(s` (стр. 2669)
- `_style_tabledef _style_table(sheet, header_row: int, start_row: int, end_row: int, end_col: int) -> None: header_fill = PatternFill(fill_type="solid", fgColor="0A84FF") header_font = Font(bold` (стр. 2683)
- `_apply_currencydef _apply_currency(cell) -> None: cell.number_format = '#,##0 "руб."' cell.alignment = Alignment(horizontal="right", vertical="center")` (стр. 2725)
- `_autosizedef _autosize(sheet) -> None: for column in sheet.columns: letter = get_column_letter(column[0].column) max_length = 0 for cell in column: max_length = max(max_length, len("" if ce` (стр. 2735)
- `_pdf_font_namedef _pdf_font_name() -> str: candidates = [ str(Path(__file__).resolve().parent / "assets" / "fonts" / "NotoSans-Regular.ttf"), os.getenv("OWNER_EXPORT_FONT_PATH", ""), "C:/Windows` (стр. 2755)
- `_pdf_cell_styledef _pdf_cell_style(font_name: str) -> ParagraphStyle: return ParagraphStyle("OwnerExportCell", fontName=font_name, fontSize=7.5, leading=9, textColor=colors.HexColor("#111827"))` (стр. 2805)
- `_booking_datetimedef _booking_datetime(booking: Booking) -> datetime | None: raw = f"{booking.date} {booking.time}".strip() for fmt in ("%d.%m.%Y %H:%M", "%Y-%m-%d %H:%M"):` (стр. 2813)
- `_booking_sort_keydef _booking_sort_key(booking: Booking) -> tuple[datetime, datetime]: local_now = datetime.now().astimezone() booking_dt = _booking_datetime(booking) primary = _as_local_datetime(b` (стр. 2833)
- `_as_local_datetimedef _as_local_datetime(value: datetime, reference: datetime) -> datetime: target_tz = reference.tzinfo if value.tzinfo is None: return value.replace(tzinfo=target_tz) return value.` (стр. 2849)
- `_parse_date_for_sortdef _parse_date_for_sort(value: str) -> datetime: for fmt in ("%d.%m.%Y", "%Y-%m-%d"):` (стр. 2863)
- `_format_datetimedef _format_datetime(value: datetime | None) -> str: if value is None: return "" return value.astimezone().strftime("%d.%m.%Y %H:%M") if value.tzinfo is not None else value.strftim` (стр. 2881)
- `_format_moneydef _format_money(value: int) -> str: return f"{value:,.0f}".replace(",", " ") + " руб."` (стр. 2893)
- `_escapedef _escape(value: str) -> str: return escape(value).replace("\n", "<br/>")` (стр. 2901)
- `build_deposit_exportdef build_deposit_export( db: Any, client: Client, overview: Any,` (стр. 2914)
- `OwnerSummaryExportData.moneydef money(value: float) -> str: return f"{float(value):,.0f} ₽".replace(",", " ")` (стр. 2929)
- `build_deposit_export_alldef build_deposit_export_all( db: Any, *, date_from: str | None = None, date_to: str | None = None,` (стр. 3013)

### backend/app/main.py (19509 строк)

Роуты (104):

```
  `GET /api/owner/exports/{kind}` -> `download_owner_export` (декоратор: стр. 7793)
  `POST /api/owner/exports/{kind}/telegram` -> `send_owner_export_to_telegram` (декоратор: стр. 7814)
  `POST /api/owner/reports/{period}/{segment}/telegram` -> `send_owner_summary_report_to_telegram` (декоратор: стр. 7835)
  `PATCH /api/clients/me` -> `update_client_me` (декоратор: стр. 8897)
  `PATCH /api/clients/{client_id}/card` -> `update_client_card` (декоратор: стр. 8953)
  `POST /api/clients` -> `create_client` (декоратор: стр. 9053)
  `GET /api/health` -> `health` (декоратор: стр. 9110)
  `GET /api/content` -> `get_public_content` (декоратор: стр. 9267)
  `PUT /api/content` -> `save_content` (декоратор: стр. 9281)
  `POST /api/upload` -> `upload_file` (декоратор: стр. 9321)
  `GET /api/uploads/{filename}` -> `serve_upload` (декоратор: стр. 9361)
  `POST /api/contact` -> `submit_contact` (декоратор: стр. 9389)
  `POST settings.telegram_webhook_path` -> `handle_telegram_webhook` (декоратор: стр. 9439)
  `POST /api/telegram/webhook/sync` -> `resync_telegram_webhook` (декоратор: стр. 9489)
  `GET /api/stock-categories` -> `list_stock_categories` (декоратор: стр. 9530)
  `POST /api/stock-categories` -> `create_stock_category` (декоратор: стр. 9543)
  `PATCH /api/stock-categories/{category_id}` -> `update_stock_category` (декоратор: стр. 9561)
  `DELETE /api/stock-categories/{category_id}` -> `delete_stock_category` (декоратор: стр. 9580)
  `GET /api/shift-checklists` -> `get_booking_availability` (декоратор: стр. 9601)
  `POST /api/bookings` -> `create_booking` (декоратор: стр. 9647)
  `PATCH /api/bookings/{booking_id}` -> `update_booking` (декоратор: стр. 10780)
  `DELETE /api/bookings/{booking_id}` -> `delete_booking` (декоратор: стр. 11438)
  `POST /api/bookings/{booking_id}/services` -> `add_booking_service` (декоратор: стр. 11536)
  `POST /api/bookings/{booking_id}/additional-services` -> `add_booking_additional_service` (декоратор: стр. 11602)
  `DELETE /api/bookings/{booking_id}/additional-services/{additional_service_id}` -> `remove_booking_additional_service` (декоратор: стр. 11707)
  `PATCH /api/bookings/{booking_id}/additional-services/{additional_service_id}` -> `update_booking_additional_service` (декоратор: стр. 11779)
  `POST /api/notifications` -> `create_notification` (декоратор: стр. 11848)
  `PATCH /api/notifications/{notification_id}/read` -> `mark_notification_read` (декоратор: стр. 11928)
  `POST /api/notifications/read-all` -> `mark_all_notifications_read` (декоратор: стр. 12006)
  `POST /api/stock-items` -> `create_stock_item` (декоратор: стр. 12072)
  `PATCH /api/stock-items/{item_id}` -> `update_stock_item` (декоратор: стр. 12108)
  `POST /api/stock-items/{item_id}/write-off` -> `write_off_stock` (декоратор: стр. 12156)
  `GET /api/stock/write-off-history` -> `get_write_off_history` (декоратор: стр. 12205)
  `DELETE /api/stock-items/{item_id}` -> `delete_stock_item` (декоратор: стр. 12236)
  `GET /api/shift-checklists` -> `list_shift_checklists` (декоратор: стр. 12272)
  `POST /api/shift-checklists` -> `submit_shift_checklist` (декоратор: стр. 12314)
  `GET /api/admin/shift-inspections` -> `list_admin_shift_inspections` (декоратор: стр. 12436)
  `GET /api/admin/shift-inspections/{inspection_id}/photo` -> `get_admin_shift_inspection_photo` (декоратор: стр. 12482)
  `POST /api/admin/shift-inspections` -> `submit_admin_shift_inspection` (декоратор: стр. 12564)
  `POST /api/admin/shift-inspections/{inspection_id}/review` -> `review_admin_shift_inspection` (декоратор: стр. 12720)
  `POST /api/expenses` -> `create_expense` (декоратор: стр. 12760)
  `PATCH /api/expenses/{expense_id}` -> `update_expense` (декоратор: стр. 12834)
  `GET /api/owner/incomes` -> `list_incomes` (декоратор: стр. 12890)
  `POST /api/owner/incomes` -> `create_income` (декоратор: стр. 12938)
  `PATCH /api/owner/incomes/{income_id}` -> `update_income` (декоратор: стр. 13002)
  `GET /api/owner/piggy-bank` -> `get_piggy_bank` (декоратор: стр. 13082)
  `POST /api/owner/piggy-bank/withdraw` -> `piggy_bank_withdraw` (декоратор: стр. 13571)
  `GET /api/owner/deposits` -> `list_deposit_clients` (декоратор: стр. 14035)
  `PATCH /api/owner/deposits/{client_id}` -> `update_deposit_subscription` (декоратор: стр. 14079)
  `POST /api/owner/deposits/{client_id}/topup` -> `deposit_topup` (декоратор: стр. 14114)
  `POST /api/owner/deposits/{client_id}/adjust` -> `deposit_adjust` (декоратор: стр. 14141)
  `GET /api/owner/deposits/export-all.xlsx` -> `deposit_export_all_excel` (декоратор: стр. 14167)
  `POST /api/owner/deposits/export-all.xlsx/telegram` -> `deposit_export_all_excel_telegram` (декоратор: стр. 14185)
  `POST /api/owner/deposits/{client_id}/export.xlsx/telegram` -> `deposit_export_excel_telegram` (декоратор: стр. 14197)
  `GET /api/owner/deposits/{client_id}` -> `get_deposit_overview` (декоратор: стр. 14215)
  `POST /api/owner/deposits/{client_id}/washes` -> `deposit_record_wash` (декоратор: стр. 14228)
  `POST /api/owner/deposits/{client_id}/settle-month` -> `deposit_settle_month` (декоратор: стр. 14306)
  `GET /api/owner/deposits/{client_id}/export.xlsx` -> `deposit_export_excel` (декоратор: стр. 14391)
  `GET /api/owner/wallet` -> `get_wallet` (декоратор: стр. 14443)
  `GET /api/owner/workers/{worker_id}/shift-attendance` -> `get_worker_shift_attendance` (декоратор: стр. 14642)
  `GET /api/owner/shift-attendance` -> `get_all_workers_shift_attendance` (декоратор: стр. 14738)
  `GET /api/worker/shift-attendance` -> `get_own_shift_attendance` (декоратор: стр. 14818)
  `GET /api/worker/calendar` -> `get_worker_calendar_bookings` (декоратор: стр. 14886)
  `GET /api/worker/cars/search` -> `search_worker_cars` (декоратор: стр. 15019)
  `POST /api/penalties` -> `create_penalty` (декоратор: стр. 15099)
  `POST /api/penalties/{penalty_id}/revoke` -> `revoke_penalty` (декоратор: стр. 15249)
  `POST /api/workers/{worker_id}/penalties/revoke-all` -> `revoke_all_worker_penalties` (декоратор: стр. 15391)
  `POST /api/telegram/link-code` -> `generate_telegram_link_code` (декоратор: стр. 15537)
  `PUT /api/settings/services` -> `save_services` (декоратор: стр. 15591)
  `PUT /api/settings/boxes` -> `save_boxes` (декоратор: стр. 15675)
  `PUT /api/settings/schedule` -> `save_schedule` (декоратор: стр. 15733)
  `PUT /api/settings/admin/profile` -> `save_admin_profile` (декоратор: стр. 15781)
  `PUT /api/settings/admin/notifications` -> `save_admin_notifications` (декоратор: стр. 15855)
  `PUT /api/settings/workers/{worker_id}/profile` -> `save_worker_profile` (декоратор: стр. 15879)
  `PUT /api/settings/workers/{worker_id}/notifications` -> `save_worker_notifications` (декоратор: стр. 15939)
  `PUT /api/settings/owner/company` -> `save_owner_company` (декоратор: стр. 15981)
  `PUT /api/settings/owner/notifications` -> `save_owner_notifications` (декоратор: стр. 16005)
  `PUT /api/settings/owner/integrations` -> `save_owner_integrations` (декоратор: стр. 16029)
  `PUT /api/settings/owner/security` -> `save_owner_security` (декоратор: стр. 16053)
  `PUT /api/workers/settings` -> `save_worker_settings` (декоратор: стр. 16089)
  `GET /api/admin/workers/payroll` -> `get_admin_workers_payroll` (декоратор: стр. 16192)
  `PUT /api/admin/workers/payroll` -> `save_admin_worker_payroll` (декоратор: стр. 16273)
  `POST /api/payroll/entries` -> `create_payroll_entry` (декоратор: стр. 16345)
  `PUT /api/payroll/entries/{entry_id}` -> `update_payroll_entry` (декоратор: стр. 16552)
  `PUT /api/payroll/booking-workers/{link_id}/override-earned` -> `update_booking_worker_override_earned` (декоратор: стр. 16648)
  `GET /api/owner/bookings-history` -> `get_owner_bookings_history` (декоратор: стр. 16870)
  `GET /api/owner/bookings-history/totals` -> `get_owner_bookings_history_totals` (декоратор: стр. 16938)
  `GET /api/owner/archive` -> `get_owner_archive` (декоратор: стр. 17095)
  `GET /api/owner/bookings/{booking_id}/money-split` -> `get_owner_booking_money_split` (декоратор: стр. 17392)
  `PUT /api/owner/bookings/{booking_id}/money-split` -> `update_owner_booking_money_split` (декоратор: стр. 17406)
  `GET /api/owner/workers/{worker_id}/salary-detail` -> `owner_worker_salary_detail` (декоратор: стр. 17617)
  `GET /api/worker/salary-detail` -> `worker_my_salary_detail` (декоратор: стр. 18007)
  `POST /api/owner/workers/{worker_id}/pay-salary` -> `owner_worker_pay_salary` (декоратор: стр. 18384)
  `GET /api/owner/owners/salary-detail` -> `owner_salary_detail` (декоратор: стр. 18554)
  `POST /api/owner/owners/pay-salary` -> `owner_pay_salary` (декоратор: стр. 18792)
  `POST /api/workers` -> `create_worker` (декоратор: стр. 19002)
  `POST /api/workers/{worker_id}/reset-password` -> `reset_worker_password` (декоратор: стр. 19138)
  `DELETE /api/workers/{worker_id}` -> `fire_worker` (декоратор: стр. 19198)
  `GET /api/auth/session` -> `get_session_bootstrap` (декоратор: стр. 19392)
  `GET /api/auth/consent/check` -> `check_consent` (декоратор: стр. 19400)
  `POST /api/auth/consent` -> `record_consent` (декоратор: стр. 19412)
  `GET /api/auth/sessions` -> `get_active_sessions` (декоратор: стр. 19436)
  `POST /api/auth/logout` -> `logout` (декоратор: стр. 19444)
  `POST /api/auth/change-password` -> `change_password` (декоратор: стр. 19452)
```

Классы и функции (209):

- `_resolve_frontend_distdef _resolve_frontend_dist() -> Path: """Каталог собранного React-фронтенда. В обычном режиме — <project>/frontend/dist (родитель каталога app/). В frozen-режиме (PyInstaller bundl` (стр. 515)
- `_check_rate_limitdef _check_rate_limit(ip: str) -> None: global _last_rate_limit_cleanup now = time_module.time() window_start = now - _LOGIN_RATE_LIMIT_WINDOW # Periodic cleanup of stale entries t` (стр. 727)
- `serve_single_page_appasync def serve_single_page_app(request: Request, call_next): path = request.url.path index_file = frontend_dist / "index.html" if request.method not in {"GET", "HEAD"}: return awa` (стр. 811)
- `on_startupdef on_startup() -> None: global bot_thread Base.metadata.create_all(bind=engine) _apply_runtime_migrations() db = next(get_db()) try: seed_database(db, include_demo_staff=settings` (стр. 863)
- `_nowdef _now() -> datetime: return datetime.now(timezone.utc)` (стр. 947)
- `_as_utcdef _as_utc(value: datetime) -> datetime: if value.tzinfo is None: return value.replace(tzinfo=timezone.utc) return value.astimezone(timezone.utc)` (стр. 955)
- `_format_moscow_dtdef _format_moscow_dt(dt: datetime | None) -> str: if dt is None: return "" msk = dt.astimezone(timezone(timedelta(hours=3))) return msk.strftime("%H:%M %d.%m.%Y")` (стр. 964)
- `_request_ipdef _request_ip(request: Request) -> str: # For rate limiting, prefer direct client IP to prevent X-Forwarded-For spoofing if request.client is not None and request.client.host: re` (стр. 975)
- `_safe_textdef _safe_text(value: Any) -> str: return value if isinstance(value, str) else ""` (стр. 995)
- `_client_by_phonedef _client_by_phone(db: Session, phone: str) -> Client | None: if not phone.strip():` (стр. 1003)
- `_owner_querydef _owner_query(): return ( select(StaffUser) .where(StaffUser.role == "owner") .order_by(StaffUser.created_at.asc(), StaffUser.id.asc()) )` (стр. 1041)
- `_primary_ownerdef _primary_owner(db: Session) -> StaffUser | None: return db.scalar( select(StaffUser) .where(StaffUser.role == "owner", StaffUser.is_primary_owner.is_(True)) .order_by(StaffUser` (стр. 1057)
- `_ensure_permanent_telegram_ownersdef _ensure_permanent_telegram_owners(db: Session) -> None: """Гарантирует, что владельцы с зашитыми Telegram ID существуют и активны. На каждом старте бэка: * снимает chat_id с лю` (стр. 1073)
- `_ensure_owner_accountsdef _ensure_owner_accounts(db: Session) -> None: owners = db.scalars(_owner_query()).all() primary_owner = next((owner for owner in owners if owner.is_primary_owner), None) if prim` (стр. 1191)
- `_device_labeldef _device_label(user_agent: str) -> str: if "Telegram-Android" in user_agent: return "Telegram Android" if "Telegram-iOS" in user_agent: return "Telegram iPhone" if "iPhone" in u` (стр. 1319)
- `_apply_runtime_migrationsdef _apply_runtime_migrations() -> None: from sqlalchemy import text def boolean_default_sql(value: bool) -> str:` (стр. 1355)
- `boolean_default_sqldef boolean_default_sql(value: bool) -> str: if engine.dialect.name == "postgresql": return "TRUE" if value else "FALSE" return "1" if value else "0"` (стр. 1359)
- `ensure_postgres_varchar_lengthdef ensure_postgres_varchar_length( table_name: str, column_name: str, minimum_length: int` (стр. 1369)
- `ensure_postgres_text_columndef ensure_postgres_text_column(table_name: str, column_name: str) -> None: if engine.dialect.name != "postgresql": return column = next( ( item for item in inspect(engine).get_col` (стр. 1415)
- `_repair_text_valuedef _repair_text_value(value: str) -> str: if not value or not any(ord(char) > 127 for char in value):` (стр. 2382)
- `_repair_nested_textdef _repair_nested_text(value): if isinstance(value, str):` (стр. 2402)
- `_repair_model_text_fieldsdef _repair_model_text_fields(db: Session, model, fields: tuple[str, ...]) -> bool: changed = False for item in db.scalars(select(model)).all():` (стр. 2422)
- `_sanitize_notification_messagedef _sanitize_notification_message(message: str) -> str: fixed = _repair_text_value(message).strip() for source, target in { "вЂў": "•", "в€¢": "•", "вВў": "•", "â€¢": "•", "вЂ”": ` (стр. 2450)
- `_repair_text_datadef _repair_text_data(db: Session) -> None: changed = False changed |= _repair_model_text_fields( db, StaffUser, ("name", "city", "experience", "specialty", "about"), ) changed |= ` (стр. 2484)
- `_settingdef _setting(db: Session, key: str, default: dict) -> dict: row = db.get(AppSetting, key) if row: return row.value row = AppSetting(key=key, value=default) db.add(row) db.flush() r` (стр. 2630)
- `_merge_setting_dictdef _merge_setting_dict(value: Any, default: dict[str, Any]) -> dict[str, Any]: if not isinstance(value, dict):` (стр. 2650)
- `_normalize_client_vehiclesdef _normalize_client_vehicles( vehicles: list[ClientVehiclePayload] | list[dict[str, Any]] | None, *, fallback_car: str = "", fallback_plate: str = "",` (стр. 2674)
- `_client_vehicles_mapdef _client_vehicles_map(db: Session) -> dict[str, Any]: return _setting(db, "client_vehicles", {})` (стр. 2768)
- `_client_vehicles_payloaddef _client_vehicles_payload(db: Session, client: Client) -> list[ClientVehiclePayload]: raw = _client_vehicles_map(db).get(client.id, []) return _normalize_client_vehicles( raw, f` (стр. 2776)
- `_save_client_vehiclesdef _save_client_vehicles( db: Session, client_id: str, vehicles: list[ClientVehiclePayload]` (стр. 2790)
- `_client_phone_verifications_mapdef _client_phone_verifications_map(db: Session) -> dict[str, Any]: value = _setting(db, CLIENT_PHONE_VERIFICATIONS_KEY, {}) return value if isinstance(value, dict) else {}` (стр. 2810)
- `_client_verified_phone_digitsdef _client_verified_phone_digits(db: Session, telegram_id: str | None) -> str | None: if not telegram_id: return None entry = _client_phone_verifications_map(db).get(str(telegram_` (стр. 2820)
- `_client_phone_is_verifieddef _client_phone_is_verified(db: Session, telegram_id: str | None, phone: str) -> bool: if not phone.strip():` (стр. 2840)
- `_require_client_phone_verificationdef _require_client_phone_verification( db: Session, telegram_id: str | None, phone: str` (стр. 2866)
- `_client_payloaddef _client_payload(client: Client | None) -> ClientProfilePayload | None: if client is None: return None with Session(engine) as vehicles_db: vehicles = _client_vehicles_payload(v` (стр. 2888)
- `_client_summary_payloaddef _client_summary_payload( client: Client, db: Session | None = None` (стр. 2928)
- `_booking_status_labeldef _booking_status_label(status_value: str) -> str: return { "new": "Новая заявка", "confirmed": "Подтверждена", "scheduled": "Запланирована", "in_progress": "В работе", "complete` (стр. 2986)
- `_booking_status_short_labeldef _booking_status_short_label(status_value: str) -> str: return { "new": "Новая", "confirmed": "Подтв.", "scheduled": "Запл.", "in_progress": "В работе", "completed": "Завершена"` (стр. 3012)
- `_format_local_datetimedef _format_local_datetime(value: datetime) -> str: return _as_utc(value).astimezone().strftime("%d.%m.%Y %H:%M")` (стр. 3038)
- `_parse_booking_datetimedef _parse_booking_datetime(date_value: str, time_value: str) -> datetime | None: raw = f"{date_value.strip()} {time_value.strip()}" for fmt in ("%d.%m.%Y %H:%M", "%Y-%m-%d %H:%M")` (стр. 3046)
- `_py_weekday_to_schedule_indexdef _py_weekday_to_schedule_index(py_weekday: int) -> int: return (py_weekday + 2) % 7` (стр. 3066)
- `_parse_time_to_minutesdef _parse_time_to_minutes(time_value: str) -> int | None: raw = time_value.strip() if len(raw) != 5 or raw[2] != ":": return None try: hours = int(raw[:2]) minutes = int(raw[3:]) ` (стр. 3074)
- `_today_labeldef _today_label() -> str: return datetime.now().strftime("%d.%m.%Y")` (стр. 3102)
- `_build_schedule_slotsdef _build_schedule_slots( open_minutes: int, close_minutes: int, step_minutes: int = 30` (стр. 3110)
- `_booking_requires_scheduled_slotdef _booking_requires_scheduled_slot(status_value: str) -> bool: return status_value in BOOKING_ACTIVE_STATUSES` (стр. 3134)
- `_booking_slot_fields_changeddef _booking_slot_fields_changed(booking: Booking, updates: dict) -> bool: if "date" in updates and (updates.get("date") or "").strip() != (booking.date or "").strip():` (стр. 3142)
- `_booking_time_rangedef _booking_time_range( date_value: str, time_value: str, duration: int` (стр. 3162)
- `_time_ranges_overlapdef _time_ranges_overlap( start_at: datetime, end_at: datetime, other_start_at: datetime, other_end_at: datetime,` (стр. 3180)
- `_ensure_booking_datetime_not_in_pastdef _ensure_booking_datetime_not_in_past(date_value: str, time_value: str, role: str) -> None: if role in {"admin", "owner"}: return scheduled_at = _parse_booking_datetime(date_val` (стр. 3198)
- `_ensure_booking_within_scheduledef _ensure_booking_within_schedule( db: Session, date_value: str, time_value: str, duration: int` (стр. 3232)
- `_box_is_availabledef _box_is_available( db: Session, *, booking_id: str | None, date_value: str, time_value: str, duration: int, box: str,` (стр. 3306)
- `_pick_available_boxdef _pick_available_box( db: Session, *, booking_id: str | None, date_value: str, time_value: str, duration: int, resource_group: str | None = None, preferred_box: str | None = Non` (стр. 3330)
- `_booking_slot_availabilitydef _booking_slot_availability( db: Session, *, date_value: str, duration: int, service_id: str | None = None, resource_group: str | None = None,` (стр. 3392)
- `_ensure_booking_has_no_conflictsdef _ensure_booking_has_no_conflicts( db: Session, *, booking_id: str | None, date_value: str, time_value: str, duration: int, box: str, worker_ids: set[str], …` (стр. 3544)
- `_load_penaltiesdef _load_penalties( db: Session, *, worker_ids: set[str] | None = None` (стр. 3588)
- `_complaints_by_workerdef _complaints_by_worker(penalties: list[Penalty]) -> dict[str, list[Penalty]]: grouped: dict[str, list[Penalty]] = {} for penalty in penalties: grouped.setdefault(penalty.worker_` (стр. 3614)
- `_normalize_worker_rulesdef _normalize_worker_rules(db: Session) -> None: changed = False workers = db.scalars(select(StaffUser).where(StaffUser.role == "worker")).all() for worker in workers: capped_perc` (стр. 3628)
- `_worker_payloaddef _worker_payload(worker: StaffUser) -> WorkerPayload: return WorkerPayload( id=worker.id, role=worker.role, # type: ignore[arg-type] name=worker.name, experience=worker.experien` (стр. 3682)
- `_payroll_entry_payloaddef _payroll_entry_payload(entry: PayrollEntry, actor_name: str) -> PayrollEntryPayload: return PayrollEntryPayload( id=entry.id, workerId=entry.worker_id, kind=entry.kind, # type:` (стр. 3722)
- `_worker_payroll_summariesdef _worker_payroll_summaries( db: Session, workers: list[StaffUser], complaints_by_worker: dict[str, list[Penalty]],` (стр. 3748)
- `_worker_payroll_summaries_from_datadef _worker_payroll_summaries_from_data( db: Session, workers: list[StaffUser], completed_bookings: list[Booking], entries: list[PayrollEntry], complaints_by_worker: dict[str, list` (стр. 3787)
- `_worker_payload_with_payrolldef _worker_payload_with_payroll( worker: StaffUser, payroll_summaries: dict[str, WorkerPayrollSummaryPayload] | None = None,` (стр. 3919)
- `_booking_payloaddef _booking_payload( booking: Booking, complaints_by_worker: dict[str, list[Penalty]] | None = None` (стр. 3943)
- `_notification_payloaddef _notification_payload(notification: Notification) -> NotificationPayload: return NotificationPayload( id=notification.id, recipientRole=notification.recipient_role, # type: ign` (стр. 4106)
- `_stock_payloaddef _stock_payload(item: StockItem) -> StockItemPayload: return StockItemPayload( id=item.id, name=item.name, qty=item.qty, unit=item.unit, unitPrice=item.unit_price, category=item` (стр. 4128)
- `_expense_payloaddef _expense_payload(expense: Expense) -> ExpensePayload: return ExpensePayload( id=expense.id, title=expense.title, amount=expense.amount, category=expense.category, date=expense.` (стр. 4144)
- `_penalty_payloaddef _penalty_payload(penalty: Penalty) -> PenaltyPayload: worker_name = penalty.worker.name if penalty.worker else "" return PenaltyPayload( id=penalty.id, workerId=penalty.worker_` (стр. 4168)
- `_service_payloaddef _service_payload(service: Service) -> ServicePayload: return ServicePayload( id=service.id, name=service.name, category=service.category, price=service.price, duration=service.` (стр. 4198)
- `_box_payloaddef _box_payload(box: Box) -> BoxPayload: return BoxPayload( id=box.id, name=box.name, resourceGroup=(box.resource_group or DEFAULT_RESOURCE_GROUP).strip() or DEFAULT_RESOURCE_GROU` (стр. 4242)
- `_visible_boxesdef _visible_boxes(db: Session) -> list[Box]: boxes = db.scalars(select(Box).order_by(Box.name.asc())).all() wash_order_map = {name: index for index, name in enumerate(WASH_BOX_NAM` (стр. 4266)
- `box_orderdef box_order(box: Box) -> tuple[int, int, str, str]: resource_group = _resource_group_key( box.resource_group or _default_box_resource_group(box) ) if resource_group == DETAILING_` (стр. 4276)
- `_schedule_payloaddef _schedule_payload(entry: ScheduleEntry) -> SchedulePayload: return SchedulePayload( dayIndex=entry.day_index, day=entry.day_label, open=entry.open_time, close=entry.close_time,` (стр. 4312)
- `_settings_payloaddef _settings_payload(db: Session) -> SettingsBundlePayload: admin_profile_default = { "name": "Администратор", "email": "", "phone": "", "telegramChatId": "", } admin_notification` (стр. 4332)
- `_empty_settings_payloaddef _empty_settings_payload() -> SettingsBundlePayload: return SettingsBundlePayload( adminProfile=AdminProfilePayload( name="", email="", phone="", telegramChatId="" ), adminNotif` (стр. 4552)
- `_scoped_settings_payloaddef _scoped_settings_payload( db: Session, role: str, actor_id: str` (стр. 4632)
- `_session_payloaddef _session_payload(session_data: dict) -> SessionPayload: return SessionPayload( role=session_data["role"], actorId=session_data["actorId"], sessionId=session_data.get("sessionId` (стр. 4718)
- `_mark_overdue_bookings_for_admin_reviewdef _mark_overdue_bookings_for_admin_review(db: Session) -> None: now_local = datetime.now().replace(second=0, microsecond=0) changed = False for booking in db.scalars( select(Book` (стр. 4738)
- `_build_bootstrapdef _build_bootstrap(db: Session, session_data: dict) -> BootstrapPayload: role = session_data["role"] actor_id = session_data["actorId"] _mark_overdue_bookings_for_admin_review(db` (стр. 4782)
- `_resolve_user_from_init_datadef _resolve_user_from_init_data(authorization: str, db: Session) -> dict | None: try: validated = validate_telegram_init_data(authorization, settings.telegram_bot_token) except Va` (стр. 5096)
- `_require_sessiondef _require_session( authorization: str | None = Header(default=None), db: Session = Depends(get_db),` (стр. 5190)
- `_ensure_staff_roledef _ensure_staff_role(session_data: dict, allowed: set[str]) -> None: if session_data["role"] not in allowed: raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Fo` (стр. 5224)
- `_validated_booking_workersdef _validated_booking_workers( db: Session, workers: list[BookingWorkerPayload]` (стр. 5234)
- `_booking_payload_for_responsedef _booking_payload_for_response(db: Session, booking: Booking) -> BookingPayload: worker_ids = {link.worker_id for link in booking.worker_links} penalties = _load_penalties(db, w` (стр. 5330)
- `_sync_booking_workersdef _sync_booking_workers( db: Session, booking: Booking, workers: list[BookingWorkerPayload]` (стр. 5342)
- `_sync_booking_materialsdef _sync_booking_materials( db: Session, booking: Booking, materials: list[BookingMaterialPayload]` (стр. 5372)
- `_send_telegram_safedef _send_telegram_safe(chat_id: str | None, text: str) -> None: if not chat_id: logger.warning("Пропущена отправка Telegram-уведомления: у получателя нет chat_id") return try: sen` (стр. 5391)
- `_telegram_display_namedef _telegram_display_name(telegram_user: dict, fallback: str) -> str: first_name = str(telegram_user.get("first_name") or "").strip() last_name = str(telegram_user.get("last_name"` (стр. 5411)
- `_owner_two_factor_recipientdef _owner_two_factor_recipient(db: Session) -> StaffUser: owner = _primary_owner(db) if owner is None: raise HTTPException( status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail` (стр. 5427)
- `_all_active_ownersdef _all_active_owners(db: Session) -> list[StaffUser]: """Возвращает всех активных владельцев, отсортированных по created_at asc.""" return list( db.scalars( select(StaffUser) .wh` (стр. 5457)
- `_all_owner_telegram_recipientsdef _all_owner_telegram_recipients(db: Session) -> list[StaffUser]: """Возвращает всех владельцев с непустым telegram_chat_id, отсортированных по created_at asc.""" return list( db` (стр. 5479)
- `_booking_reminder_target_datedef _booking_reminder_target_date(days_ahead: int = 1) -> str: return (datetime.now() + timedelta(days=days_ahead)).strftime("%d.%m.%Y")` (стр. 5507)
- `_worker_notification_settings_mapdef _worker_notification_settings_map(db: Session) -> dict[str, dict[str, Any]]: return _setting(db, "worker_notification_settings", {})` (стр. 5515)
- `_booking_reminder_statedef _booking_reminder_state(db: Session) -> dict[str, Any]: return _setting(db, BOOKING_REMINDER_STATE_KEY, {"deliveries": {}})` (стр. 5523)
- `_return_reminder_statedef _return_reminder_state(db: Session) -> dict[str, Any]: return _setting(db, RETURN_REMINDER_STATE_KEY, {"deliveries": {}})` (стр. 5531)
- `_shift_checklists_statedef _shift_checklists_state(db: Session) -> list[dict[str, Any]]: value = _setting(db, SHIFT_CHECKLISTS_KEY, []) return value if isinstance(value, list) else []` (стр. 5539)
- `_admin_shift_inspections_statedef _admin_shift_inspections_state(db: Session) -> list[dict[str, Any]]: value = _setting(db, ADMIN_SHIFT_INSPECTIONS_KEY, []) return value if isinstance(value, list) else []` (стр. 5549)
- `_compute_shift_attendancedef _compute_shift_attendance( inspections: list[dict], worker_id: str, date_from: date, date_to: date,` (стр. 5559)
- `_period_to_date_rangedef _period_to_date_range(period: str) -> tuple[date, date]: """ Преобразует строковый период в диапазон дат (date_from, date_to). - ``week`` → последние 7 дней - ``month`` → после` (стр. 5689)
- `_admin_shift_owner_bot_statedef _admin_shift_owner_bot_state(db: Session) -> dict[str, Any]: value = _setting(db, ADMIN_SHIFT_OWNER_BOT_STATE_KEY, {"pendingIssueByChat": {}}) return value if isinstance(value,` (стр. 5735)
- `_cleanup_booking_reminder_deliveriesdef _cleanup_booking_reminder_deliveries(deliveries: dict[str, Any]) -> dict[str, str]: threshold = _now() - timedelta(days=14) cleaned: dict[str, str] = {} for key, value in deliv` (стр. 5745)
- `_cleanup_return_reminder_deliveriesdef _cleanup_return_reminder_deliveries(deliveries: dict[str, Any]) -> dict[str, str]: threshold = _now() - timedelta(days=30) cleaned: dict[str, str] = {} for key, value in delive` (стр. 5765)
- `_booking_client_reminder_messagedef _booking_client_reminder_message(booking: Booking) -> str: return ( "Напоминание о записи\n" f"Услуга: {booking.service}\n" f"Дата: {booking.date} {booking.time}\n" f"Бокс: {bo` (стр. 5785)
- `_booking_worker_reminder_messagedef _booking_worker_reminder_message(booking: Booking, worker_name: str) -> str: return ( f"Напоминание мастеру {worker_name}\n" f"Клиент: {booking.client_name}\n" f"Услуга: {booki` (стр. 5805)
- `_dispatch_booking_remindersdef _dispatch_booking_reminders( db: Session, *, target_date: str | None = None, force: bool = False,` (стр. 5825)
- `_dispatch_return_visit_remindersdef _dispatch_return_visit_reminders(db: Session) -> int: reminder_state = _return_reminder_state(db) deliveries = reminder_state.get("deliveries") if not isinstance(deliveries, di` (стр. 6087)
- `_shift_checklist_payloaddef _shift_checklist_payload(entry: dict[str, Any]) -> ShiftChecklistPayload: return ShiftChecklistPayload( id=str(entry.get("id") or ""), workerId=str(entry.get("workerId") or "")` (стр. 6197)
- `_chemistry_stock_itemsdef _chemistry_stock_items(db: Session) -> list[StockItem]: return db.scalars( select(StockItem) .where(StockItem.category == "Химия") .order_by(StockItem.name.asc()) ).all()` (стр. 6251)
- `_latest_shift_checklist_entrydef _latest_shift_checklist_entry( entries: list[dict[str, Any]], worker_id: str, phase: str` (стр. 6267)
- `_clean_data_url_prefixdef _clean_data_url_prefix(data_url: str) -> str: return data_url.split(",", 1)[1] if "," in data_url else data_url` (стр. 6289)
- `_decode_data_url_imagedef _decode_data_url_image(data_url: str) -> tuple[str, bytes]: raw = data_url.strip() if not raw.startswith("data:image/"):` (стр. 6297)
- `_admin_shift_inspection_suppliesdef _admin_shift_inspection_supplies(db: Session) -> list[dict[str, Any]]: items = db.scalars( select(StockItem) .where(StockItem.category.in_(("Химия", "Расходники"))) .order_by(S` (стр. 6363)
- `_admin_shift_inspection_payloaddef _admin_shift_inspection_payload( entry: dict[str, Any],` (стр. 6421)
- `_admin_shift_captiondef _admin_shift_caption(entry: dict[str, Any]) -> str: checked_supplies = [ item.get("name") for item in entry.get("supplies", []) if isinstance(item, dict) and item.get("checked"` (стр. 6510)
- `_admin_shift_owner_inline_keyboarddef _admin_shift_owner_inline_keyboard(inspection_id: str) -> dict[str, Any]: return { "inline_keyboard": [ [ { "text": "Подтвердить", "callback_data": f"shiftapprove:{inspection_i` (стр. 6562)
- `_notify_owner_about_admin_shiftdef _notify_owner_about_admin_shift(db: Session, entry: dict[str, Any]) -> None: caption = _admin_shift_caption(entry) mime_type, photo_bytes = _decode_data_url_image( str(entry.ge` (стр. 6590)
- `_apply_admin_shift_reviewdef _apply_admin_shift_review( db: Session, inspection_id: str, *, action: str, issue_note: str, owner_actor_id: str,` (стр. 6660)
- `_serialize_state_datetimedef _serialize_state_datetime(value: datetime | None) -> str | None: if value is None: return None return _as_utc(value).isoformat()` (стр. 6780)
- `_parse_state_datetimedef _parse_state_datetime(value: Any) -> datetime | None: if not value: return None if not isinstance(value, str):` (стр. 6792)
- `_owner_database_reset_statedef _owner_database_reset_state(db: Session) -> dict[str, Any] | None: row = db.get(AppSetting, OWNER_DATABASE_RESET_SETTING_KEY) if row is None or not isinstance(row.value, dict):` (стр. 6814)
- `_save_owner_database_reset_statedef _save_owner_database_reset_state( db: Session, value: dict[str, Any]` (стр. 6828)
- `_clear_owner_database_reset_statedef _clear_owner_database_reset_state(db: Session) -> None: row = db.get(AppSetting, OWNER_DATABASE_RESET_SETTING_KEY) if row is not None: db.delete(row) db.flush()` (стр. 6840)
- `_normalize_database_reset_phrasedef _normalize_database_reset_phrase(value: str) -> str: normalized = " ".join(value.replace("\n", " ").split()).strip().upper() return normalized.replace("Ё", "Е")` (стр. 6854)
- `_owner_database_reset_previewdef _owner_database_reset_preview( db: Session,` (стр. 6864)
- `_owner_database_reset_warningsdef _owner_database_reset_warnings( preview: OwnerDatabaseResetPreviewPayload,` (стр. 6918)
- `_perform_owner_database_resetdef _perform_owner_database_reset(db: Session) -> None: db.execute(sa_delete(TelegramLinkCode)) db.execute(sa_delete(Notification)) db.execute(sa_delete(BookingWorker)) db.execute(` (стр. 6958)
- `_parse_datedef _parse_date(s: str) -> date | None: if "." in s: parts = s.split(".") try: return date(int(parts[2]), int(parts[1]), int(parts[0])) except (ValueError, IndexError):` (стр. 7022)
- `_owner_export_filedef _owner_export_file( db: Session, actor_id: str, kind: str, segment: str = "all", date_from: str | None = None, date_to: str | None = None,` (стр. 7048)
- `_in_rangedef _in_range(d: str | None) -> bool: if not d: return True parsed = _parse_date(d) if not parsed: return True if parsed_from and parsed < parsed_from: return False if parsed_to an` (стр. 7192)
- `_download_responsedef _download_response(export_file: GeneratedExport) -> Response: return Response( content=export_file.content, media_type=export_file.media_type, headers={ "Content-Disposition": ` (стр. 7270)
- `class _PartialBroadcastError(Exception):` (стр. 7290)
- `_PartialBroadcastError.__init__def __init__(self, payload: TelegramBroadcastPayload) -> None: super().__init__("partial broadcast failure") self.payload = payload` (стр. 7296)
- `_send_export_to_telegramdef _send_export_to_telegram( db: Session, actor_id: str, export_file: GeneratedExport` (стр. 7306)
- `_owner_summary_reportdef _owner_summary_report( db: Session, actor_id: str, period: str, segment: str` (стр. 7426)
- `_owner_summary_export_filedef _owner_summary_export_file( db: Session, actor_id: str, period: str, segment: str` (стр. 7544)
- `_send_owner_summary_reportdef _send_owner_summary_report( db: Session, actor_id: str, report: OwnerSummaryReport, export_file: GeneratedExport,` (стр. 7660)
- `_booking_car_labeldef _booking_car_label(car: str | None, plate: str | None) -> str: car_value = (car or "").strip() or "Авто не указано" plate_value = (plate or "").strip() return f"{car_value}, {p` (стр. 7851)
- `_admin_booking_notification_titledef _admin_booking_notification_title( client_name: str, car: str | None, plate: str | None` (стр. 7863)
- `_booking_datetime_labeldef _booking_datetime_label(date: str | None, time: str | None) -> str: if not (date or "").strip():` (стр. 7875)
- `_admin_booking_notification_textdef _admin_booking_notification_text( client_name: str, car: str | None, plate: str | None, date: str | None, time: str | None,` (стр. 7891)
- `_notify_admins_about_bookingdef _notify_admins_about_booking(db: Session, booking: Booking) -> None: admins = db.scalars( select(StaffUser).where(StaffUser.role == "admin", StaffUser.active.is_(True)) ).all()` (стр. 7911)
- `_notify_owners_about_bookingdef _notify_owners_about_booking(db: Session, booking: Booking) -> None: owners = _all_owner_telegram_recipients(db) text = ( "Новая запись\n" f"Клиент: {booking.client_name}\n" f"` (стр. 7943)
- `_service_category_keydef _service_category_key(value: str | None) -> str: return (value or "").strip().lower()` (стр. 7971)
- `_resource_group_keydef _resource_group_key(value: str | None) -> str: return (value or "").strip().lower() or DEFAULT_RESOURCE_GROUP` (стр. 7979)
- `_normalized_textdef _normalized_text(value: str | None) -> str: return (value or "").strip()` (стр. 7987)
- `_default_service_resource_groupdef _default_service_resource_group(service: Service | None) -> str: if service is None: return DEFAULT_RESOURCE_GROUP return _resource_group_for_service_category(service.category)` (стр. 7995)
- `_default_box_resource_groupdef _default_box_resource_group(box: Box | None) -> str: if box is None: return DEFAULT_RESOURCE_GROUP name_key = (box.name or "").strip().lower() description_key = (box.descriptio` (стр. 8007)
- `_service_resource_groupdef _service_resource_group(service: Service | None) -> str: if service is None: return DEFAULT_RESOURCE_GROUP return _resource_group_key( service.resource_group or _default_servic` (стр. 8027)
- `_compatible_box_namesdef _compatible_box_names(db: Session, resource_group: str | None) -> list[str]: target_group = _resource_group_key(resource_group) return [ box.name for box in db.scalars( select(` (стр. 8043)
- `_is_box_rental_servicedef _is_box_rental_service(service: Service | None) -> bool: return ( service is not None and _service_category_key(service.category) == "аренда бокса" )` (стр. 8069)
- `_is_detailing_servicedef _is_detailing_service(service: Service | None) -> bool: return ( service is not None and _service_category_key(service.category) == "детейлинг" )` (стр. 8083)
- `_resource_group_for_service_categorydef _resource_group_for_service_category(category: str | None) -> str: category_key = _service_category_key(category) if category_key == "детейлинг": return DETAILING_RESOURCE_GROU` (стр. 8095)
- `_box_by_namedef _box_by_name(db: Session, box_name: str) -> Box | None: return db.scalar(select(Box).where(Box.name == box_name))` (стр. 8109)
- `_normalize_service_and_box_resourcesdef _normalize_service_and_box_resources(db: Session) -> None: changed = False services = db.scalars(select(Service)).all() for service in services: expected_group = _default_servi` (стр. 8117)
- `_box_hourly_pricedef _box_hourly_price(db: Session, box_name: str, fallback_price: int) -> int: box = _box_by_name(db, box_name) if box is not None and box.price_per_hour > 0: return box.price_per_` (стр. 8339)
- `_payment_type_labeldef _payment_type_label(payment_type: str) -> str: return { "cash": "Наличные", "transfer": "Перевод", "invoice": "По счёту", "credit": "В долг (депозит)", }.get(payment_type, paym` (стр. 8353)
- `_booking_payment_labeldef _booking_payment_label(booking: Booking) -> str: if not booking.payment_settled: return "Не оплачено" return _payment_type_label(booking.payment_type)` (стр. 8371)
- `_notify_ownersdef _notify_owners(db: Session, text: str) -> None: db.add( Notification( id=f"n-{uuid4()}", recipient_role="owner", recipient_id=None, message=text, read=False, created_at=_now(),` (стр. 8383)
- `_booking_receipt_textdef _booking_receipt_text(booking: Booking, *, worker_name: str | None = None) -> str: worker_line = f"\nМастер: {worker_name}" if worker_name else "" return ( "Чек по записи\n" f"` (стр. 8419)
- `_notify_booking_completion_receiptdef _notify_booking_completion_receipt( db: Session, booking: Booking, *, worker_name: str | None = None` (стр. 8449)
- `_notify_owner_about_worker_booking_eventdef _notify_owner_about_worker_booking_event( db: Session, booking: Booking, *, worker_name: str, event_label: str` (стр. 8521)
- `_notify_workers_about_assignmentdef _notify_workers_about_assignment( db: Session, booking: Booking, worker_ids: set[str]` (стр. 8562)
- `_notify_workers_about_notedef _notify_workers_about_note( db: Session, booking: Booking, worker_ids: set[str]` (стр. 8648)
- `_notify_workers_about_rescheduledef _notify_workers_about_reschedule( db: Session, booking: Booking, worker_ids: set[str], previous_date: str, previous_time: str, previous_box: str,` (стр. 8718)
- `_payroll_entry_labeldef _payroll_entry_label(kind: str) -> str: return { "bonus": "премия", "advance": "аванс", "deduction": "удержание", "payout": "выплата", "adjustment": "корректировка", }.get(kind` (стр. 8806)
- `_notify_worker_about_payroll_entrydef _notify_worker_about_payroll_entry( db: Session, worker: StaffUser, *, actor_role: str, actor_id: str, kind: str, amount: int, note: str, …` (стр. 8826)
- `_default_contentdef _default_content() -> ContentPayload: return ContentPayload( hero=ContentHeroPayload(), about=ContentAboutPayload( text=( "<b>\u2728 \u041e \u0441\u0442\u0443\u0434\u0438\u0438` (стр. 9126)
- `_normalize_legacy_contentdef _normalize_legacy_content(value: dict) -> dict: """Мигрирует старый формат контента (hero.title строкой + hero.titleHighlight) в новый (hero.title => {before, highlight, after}` (стр. 9206)
- `_get_or_create_contentdef _get_or_create_content(db: Session) -> ContentPayload: row = db.get(AppSetting, "content") if row is None or not isinstance(row.value, dict):` (стр. 9227)
- `_write_off_booking_materialsdef _write_off_booking_materials(db: Session, booking: Booking) -> None: if booking.materials_written_off: print(f"[WRITE_OFF] skip booking {booking.id[:8]} — already written off")` (стр. 10144)
- `_booking_materials_costdef _booking_materials_cost(db: Session, booking: Booking) -> int: """Фактическая стоимость материалов по записи; fallback — материалы услуги со склада.""" override = (booking.mone` (стр. 10231)
- `_booking_materials_cost_actualdef _booking_materials_cost_actual(db: Session, booking: Booking) -> int: """Фактическая стоимость материалов по записи; fallback — материалы услуги со склада.""" materials_cost = ` (стр. 10239)
- `_booking_money_splitdef _booking_money_split( db: Session, booking: Booking, complaints_by_worker: dict[str, list] | None = None,` (стр. 10258)
- `_PartialBroadcastError._compute_masterdef _compute_master(base: int) -> tuple[dict[str, int], int, int]: """Доля мастеров: явные суммы (override/fixed) + сервисный режим/проценты профиля от base. Возвращает (master_by_` (стр. 10298)
- `_PartialBroadcastError._compute_piggydef _compute_piggy(base: int) -> int: if piggy_pay_type == "fixed": return piggy_pay_value if piggy_pay_type == "percent": return round(base * piggy_pay_value / 100) if piggy_pay_t` (стр. 10403)
- `_PartialBroadcastError._allocate_ownersdef _allocate_owners(claimed: int, limit: int) -> tuple[int, dict[str, int]]: owner_by_owner: dict[str, int] = {} if claimed <= 0 or not owner_split_enabled: return 0, owner_by_own` (стр. 10414)
- `_process_piggy_bank_for_bookingdef _process_piggy_bank_for_booking(db: Session, booking: Booking) -> None: """Auto-deposit 24% into piggy bank for detailing bookings and repay material withdrawals for any servic` (стр. 10499)
- `_process_owner_profit_sharedef _process_owner_profit_share(db: Session, booking: Booking) -> None: """Расчёт доли владельцев: цена → материалы → мастера → копилка → остаток владельцам (50/50).""" if booking.` (стр. 10708)
- `_PartialBroadcastError._parse_date_strdef _parse_date_str(s: str) -> date | None: try: if "." in s: parts = s.split(".") return date(int(parts[2]), int(parts[1]), int(parts[0])) return date.fromisoformat(s) except (Val` (стр. 13104)
- `_PartialBroadcastError._in_rangedef _in_range(d: str | None) -> bool: if not d: return True parsed = _parse_date_str(d) if not parsed: return True if parsed_from and parsed < parsed_from: return False if parsed_t` (стр. 13128)
- `_deposit_balancedef _deposit_balance(db: Session, client_id: str) -> float: return sum( t.amount for t in db.scalars( select(DepositTransaction).where(DepositTransaction.client_id == client_id) ).` (стр. 13719)
- `_deposit_add_transactiondef _deposit_add_transaction( db: Session, client_id: str, txn_type: str, amount: float, description: str, *, date: str, booking_id: str | None = None, created_by_id: str | None = ` (стр. 13728)
- `_deposit_txn_payloaddef _deposit_txn_payload(txn: DepositTransaction) -> DepositTransactionPayload: return DepositTransactionPayload( id=txn.id, clientId=txn.client_id, date=txn.date, transaction_type` (стр. 13756)
- `_deposit_month_labeldef _deposit_month_label() -> str: return datetime.now().strftime("%m.%Y")` (стр. 13771)
- `_deposit_month_ofdef _deposit_month_of(date_str: str) -> str: parts = (date_str or "").split(".") if len(parts) == 3: return f"{parts[1]}.{parts[2]}" return ""` (стр. 13773)
- `_deposit_month_wash_total_fordef _deposit_month_wash_total_for(db: Session, client_id: str, month: str) -> float: total = 0.0 rows = db.scalars( select(Booking).where( Booking.client_id == client_id, Booking.p` (стр. 13780)
- `_deposit_plan_keydef _deposit_plan_key(value: str | None) -> str: plan = (value or "").strip() or "fee" return plan if plan in {"fee", "washes", "per_wash", "unlimited"} else "fee"` (стр. 13796)
- `_deposit_prev_monthdef _deposit_prev_month(month: str) -> str: try: m, y = month.split(".") yi = int(y) - (1 if int(m) == 1 else 0) mi = 12 if int(m) == 1 else int(m) - 1 return f"{mi:02d}.{yi}" exce` (стр. 13801)
- `_deposit_month_wash_count_fordef _deposit_month_wash_count_for(db: Session, client_id: str, month: str) -> int: rows = db.scalars( select(Booking).where( Booking.client_id == client_id, Booking.payment_type ==` (стр. 13811)
- `_deposit_carried_washesdef _deposit_carried_washes(db: Session, client: Client, month: str) -> int: prev = _deposit_prev_month(month) row = db.scalar( select(DepositMonth).where( DepositMonth.client_id =` (стр. 13823)
- `_deposit_wash_limitdef _deposit_wash_limit(db: Session, client: Client, month: str) -> int: """Лимит моек по плану 'washes' (включённые + перенесённые).""" if _deposit_plan_key(client.deposit_plan or` (стр. 13834)
- `_deposit_month_wash_extradef _deposit_month_wash_extra(db: Session, client: Client, month: str) -> float: """Сумма цен моек сверх включённого лимита по плану 'washes'.""" if _deposit_plan_key(client.deposi` (стр. 13844)
- `_deposit_month_payabledef _deposit_month_payable(db: Session, client: Client, month: str) -> float: """Сколько клиент должен заплатить за месяц по своему типу абонемента.""" plan = _deposit_plan_key(cli` (стр. 13873)
- `_deposit_months_activedef _deposit_months_active(start_month: str) -> int: match = re.fullmatch(r"(\d{2})\.(\d{4})", (start_month or "").strip()) if not match: return 0 start_total = int(match.group(2))` (стр. 13893)
- `_deposit_month_rowsdef _deposit_month_rows( db: Session, client: Client, transactions: list[DepositTransaction], closed_months: list[DepositMonth],` (стр. 13902)
- `_deposit_overviewdef _deposit_overview( db: Session, client_id: str, client: Client` (стр. 13944)
- `_week_boundsdef _week_bounds() -> tuple[date, date]: today = date.today() saturday = today - timedelta(days=(today.weekday() - 5) % 7) friday = saturday + timedelta(days=6) return saturday, fr` (стр. 14419)
- `_dmydef _dmy(d: date) -> str: return f"{d.day:02d}.{d.month:02d}.{d.year}"` (стр. 14430)
- `_dmy_to_datedef _dmy_to_date(s: str) -> date: return datetime.strptime(s.strip(), "%d.%m.%Y").date()` (стр. 14435)
- `_search_text_normalizedef _search_text_normalize(value: str) -> str: return value.strip().lower().replace(" ", "").replace("-", "")` (стр. 15011)
- `_search_plate_normalizedef _search_plate_normalize(value: str) -> str: return "".join(_SEARCH_LATIN_TO_CYRILLIC.get(char, char) for char in _search_text_normalize(value))` (стр. 15015)
- ...ещё 9

### backend/app/models.py (573 строк)

Классы и функции (28):

- `utc_nowdef utc_now() -> datetime: return datetime.now(timezone.utc)` (стр. 15)
- `class Client(Base):` (стр. 19)
- `class StaffUser(Base):` (стр. 59)
- `class Service(Base):` (стр. 108)
- `class Box(Base):` (стр. 134)
- `class ScheduleEntry(Base):` (стр. 145)
- `class Booking(Base):` (стр. 156)
- `class BookingWorker(Base):` (стр. 204)
- `class BookingAdditionalService(Base):` (стр. 220)
- `class BookingMaterial(Base):` (стр. 242)
- `class AdditionalServiceWorker(Base):` (стр. 264)
- `class Notification(Base):` (стр. 281)
- `class StockCategory(Base):` (стр. 294)
- `class StockItem(Base):` (стр. 316)
- `class Expense(Base):` (стр. 336)
- `class StockWriteOff(Base):` (стр. 352)
- `class Penalty(Base):` (стр. 376)
- `class PayrollEntry(Base):` (стр. 403)
- `class TelegramLinkCode(Base):` (стр. 425)
- `class AppSetting(Base):` (стр. 440)
- `class UploadedFile(Base):` (стр. 447)
- `class DataConsent(Base):` (стр. 457)
- `class Income(Base):` (стр. 465)
- `class WeeklyArchive(Base):` (стр. 484)
- `class PiggyBankTransaction(Base):` (стр. 502)
- `class DepositTransaction(Base):` (стр. 521)
- `class DepositMonth(Base):` (стр. 540)
- `class OwnerProfitShare(Base):` (стр. 558)

### backend/app/schemas.py (2042 строк)

Классы и функции (200):

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
- `class ClientCreateRequest(BaseModel):` (стр. 235)
- `ClientCreateRequest.validate_namedef validate_name(cls, value: str) -> str: return normalize_person_name(value)` (стр. 246)
- `ClientCreateRequest.validate_phonedef validate_phone(cls, value: str) -> str: if not value.strip():` (стр. 251)
- `ClientCreateRequest.validate_vehicledef validate_vehicle(self) -> "ClientCreateRequest": if self.car.strip():` (стр. 257)
- `class WorkerPayload(BaseModel):` (стр. 265)
- `class PayrollEntryPayload(BaseModel):` (стр. 284)
- `class WorkerPayrollBookingPayload(BaseModel):` (стр. 295)
- `class WorkerPayrollSummaryPayload(BaseModel):` (стр. 308)
- `class SalaryBookingItem(BaseModel):` (стр. 333)
- `class SalaryPayoutItem(BaseModel):` (стр. 353)
- `class SalaryDetailResponse(BaseModel):` (стр. 361)
- `class PaySalaryRequest(BaseModel):` (стр. 378)
- `class PaySalaryResponse(BaseModel):` (стр. 387)
- `class BookingWorkerPayload(BaseModel):` (стр. 394)
- `class BookingServiceItem(BaseModel):` (стр. 402)
- `class AdditionalServiceWorkerPayload(BaseModel):` (стр. 409)
- `class AdditionalServicePayload(BaseModel):` (стр. 417)
- `class AddAdditionalServiceRequest(BaseModel):` (стр. 429)
- `class UpdateAdditionalServiceRequest(BaseModel):` (стр. 438)
- `class BookingPayload(BaseModel):` (стр. 446)
- `class WorkerCalendarBookingPayload(BaseModel):` (стр. 475)
- `class BookingAvailabilitySlotPayload(BaseModel):` (стр. 490)
- `class BookingAvailabilityPayload(BaseModel):` (стр. 497)
- `class NotificationPayload(BaseModel):` (стр. 503)
- `class StockCategoryPayload(BaseModel):` (стр. 512)
- `class StockItemPayload(BaseModel):` (стр. 518)
- `class BookingMaterialPayload(BaseModel):` (стр. 528)
- `class ShiftChecklistItemPayload(BaseModel):` (стр. 537)
- `class ShiftChecklistPayload(BaseModel):` (стр. 546)
- `class ShiftChecklistSubmitItem(BaseModel):` (стр. 556)
- `class ShiftChecklistSubmitRequest(BaseModel):` (стр. 561)
- `class AdminShiftInspectionSupplyPayload(BaseModel):` (стр. 567)
- `class AdminShiftInspectionMasterPayload(BaseModel):` (стр. 576)
- `class AdminShiftInspectionPayload(BaseModel):` (стр. 582)
- `class AdminShiftInspectionSubmitSupply(BaseModel):` (стр. 599)
- `class AdminShiftInspectionSubmitMaster(BaseModel):` (стр. 604)
- `class AdminShiftInspectionSubmitRequest(BaseModel):` (стр. 609)
- `class AdminShiftInspectionReviewRequest(BaseModel):` (стр. 617)
- `class ExpensePayload(BaseModel):` (стр. 622)
- `class PenaltyPayload(BaseModel):` (стр. 632)
- `class TelegramLinkCodePayload(BaseModel):` (стр. 644)
- `class ServicePayload(BaseModel):` (стр. 650)
- `class DetailingRequestCreateRequest(BaseModel):` (стр. 674)
- `DetailingRequestCreateRequest.validate_cardef validate_car(cls, value: str | None) -> str | None: if value is None: return None return normalize_vehicle_name(value)` (стр. 683)
- `DetailingRequestCreateRequest.validate_plate_fielddef validate_plate_field(self) -> "DetailingRequestCreateRequest": if self.plate is not None: if not self.plate.strip():` (стр. 689)
- `class BoxPayload(BaseModel):` (стр. 698)
- `class SchedulePayload(BaseModel):` (стр. 707)
- `class AdminNotificationSettings(BaseModel):` (стр. 715)
- `class AdminProfilePayload(BaseModel):` (стр. 723)
- `class WorkerNotificationSettings(BaseModel):` (стр. 730)
- `class WorkerProfilePayload(BaseModel):` (стр. 738)
- `class OperatingMode(str, Enum):` (стр. 749)
- `class OwnerCompanyPayload(BaseModel):` (стр. 754)
- `class OwnerNotificationSettings(BaseModel):` (стр. 764)
- `class OwnerIntegrationsPayload(BaseModel):` (стр. 774)
- `class OwnerSecurityPayload(BaseModel):` (стр. 781)
- `class AuthSessionPayload(BaseModel):` (стр. 785)
- `class EmployeeSettingPayload(BaseModel):` (стр. 794)
- `class WorkerCreateRequest(BaseModel):` (стр. 805)
- `class PayrollEntryCreateRequest(BaseModel):` (стр. 817)
- `PayrollEntryCreateRequest.validate_notedef validate_note(cls, value: str) -> str: return value.strip()` (стр. 825)
- `class PayrollEntryUpdateRequest(BaseModel):` (стр. 829)
- `PayrollEntryUpdateRequest.validate_notedef validate_note(cls, value: str) -> str: return value.strip()` (стр. 835)
- `class SettingsBundlePayload(BaseModel):` (стр. 839)
- `class SessionPayload(BaseModel):` (стр. 849)
- `class BootstrapPayload(BaseModel):` (стр. 857)
- `class ClientRegisterRequest(BaseModel):` (стр. 875)
- `ClientRegisterRequest.validate_namedef validate_name(cls, value: str) -> str: if not value.strip():` (стр. 884)
- `ClientRegisterRequest.validate_phonedef validate_phone(cls, value: str) -> str: return normalize_phone(value)` (стр. 891)
- `ClientRegisterRequest.validate_vehicledef validate_vehicle(self) -> "ClientRegisterRequest": if self.plate.strip():` (стр. 895)
- `class ConsentRecordPayload(BaseModel):` (стр. 901)
- `class ConsentCheckResponse(BaseModel):` (стр. 906)
- `class StaffLinkRequest(BaseModel):` (стр. 910)
- `class SwitchRoleRequest(BaseModel):` (стр. 915)
- `class BookingCreateRequest(BaseModel):` (стр. 919)
- `BookingCreateRequest.validate_client_namedef validate_client_name(cls, value: str) -> str: if not value.strip():` (стр. 944)
- `BookingCreateRequest.validate_client_phonedef validate_client_phone(cls, value: str) -> str: if not value.strip():` (стр. 951)
- `BookingCreateRequest.validate_vehicledef validate_vehicle(self) -> "BookingCreateRequest": if self.car is not None and self.car.strip():` (стр. 957)
- `class AddBookingServiceRequest(BaseModel):` (стр. 965)
- `class BookingUpdateRequest(BaseModel):` (стр. 972)
- `BookingUpdateRequest.validate_client_namedef validate_client_name(cls, value: str | None) -> str | None: if value is None: return None return normalize_person_name(value)` (стр. 996)
- `BookingUpdateRequest.validate_client_phonedef validate_client_phone(cls, value: str | None) -> str | None: if value is None: return None return normalize_phone(value)` (стр. 1003)
- `BookingUpdateRequest.validate_vehicledef validate_vehicle(self) -> "BookingUpdateRequest": if self.car is not None and not self.car.strip():` (стр. 1009)
- `class ClientCardUpdateRequest(BaseModel):` (стр. 1022)
- `ClientCardUpdateRequest.validate_namedef validate_name(cls, value: str | None) -> str | None: if value is None: return None return normalize_person_name(value)` (стр. 1040)
- `ClientCardUpdateRequest.validate_phonedef validate_phone(cls, value: str | None) -> str | None: if value is None or not value.strip():` (стр. 1047)
- `ClientCardUpdateRequest.validate_vehicledef validate_vehicle(self) -> "ClientCardUpdateRequest": if self.car is not None and not self.car.strip():` (стр. 1053)
- `class NotificationCreateRequest(BaseModel):` (стр. 1066)
- `class ReadAllNotificationsRequest(BaseModel):` (стр. 1073)
- `class StockItemCreateRequest(BaseModel):` (стр. 1077)
- `class StockItemUpdateRequest(BaseModel):` (стр. 1086)
- `class StockCategoryCreateRequest(BaseModel):` (стр. 1095)
- `class StockCategoryUpdateRequest(BaseModel):` (стр. 1100)
- `class StockWriteOffRequest(BaseModel):` (стр. 1105)
- `class StockWriteOffPayload(BaseModel):` (стр. 1109)
- `class IncomeCreateRequest(BaseModel):` (стр. 1127)
- `IncomeCreateRequest.validate_sourcedef validate_source(cls, value: str) -> str: stripped = value.strip() if not stripped: raise ValueError("source не может быть пустым или состоять только из пробелов") return stripp` (стр. 1136)
- `IncomeCreateRequest.validate_datedef validate_date(cls, value: str) -> str: if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value.strip()):` (стр. 1144)
- `class IncomePayload(BaseModel):` (стр. 1150)
- `class ExpenseCreateRequest(BaseModel):` (стр. 1161)
- `ExpenseCreateRequest.validate_datedef validate_date(cls, value: str) -> str: if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value.strip()):` (стр. 1171)
- `class PenaltyCreateRequest(BaseModel):` (стр. 1177)
- `class OwnerReminderDispatchRequest(BaseModel):` (стр. 1183)
- `class OwnerReminderDispatchPayload(BaseModel):` (стр. 1188)
- `class ChangePasswordRequest(BaseModel):` (стр. 1196)
- `class OwnerDatabaseResetPreviewPayload(BaseModel):` (стр. 1201)
- `class OwnerDatabaseResetStartRequest(BaseModel):` (стр. 1216)
- `class OwnerDatabaseResetApproveRequest(BaseModel):` (стр. 1220)
- `class OwnerDatabaseResetExecuteRequest(BaseModel):` (стр. 1226)
- `class OwnerDatabaseResetStartPayload(BaseModel):` (стр. 1230)
- `class OwnerDatabaseResetApprovePayload(BaseModel):` (стр. 1239)
- `class OwnerDatabaseResetExecutePayload(BaseModel):` (стр. 1247)
- `class ContentAboutPayload(BaseModel):` (стр. 1252)
- `class ContentServicePayload(BaseModel):` (стр. 1258)
- `class ContentWorksPayload(BaseModel):` (стр. 1269)
- `class ContentStatsPayload(BaseModel):` (стр. 1275)
- `class ContentTitlePayload(BaseModel):` (стр. 1280)
- `ContentTitlePayload.to_full_titledef to_full_title(self) -> str: return f"{self.before}{self.highlight}{self.after}"` (стр. 1285)
- `class ContentHeroPayload(BaseModel):` (стр. 1289)
- `class ContentPayload(BaseModel):` (стр. 1305)
- `class ContactPayload(BaseModel):` (стр. 1312)
- `class ResetPasswordRequest(BaseModel):` (стр. 1319)
- `class GenericMessage(BaseModel):` (стр. 1323)
- `class TelegramDeliveryResult(BaseModel):` (стр. 1327)
- `class TelegramBroadcastPayload(BaseModel):` (стр. 1333)
- `class OwnerExportDeliveryPayload(BaseModel):` (стр. 1339)
- `class ShiftAttendancePayload(BaseModel):` (стр. 1346)
- `class ExpenseUpdateRequest(BaseModel):` (стр. 1357)
- `ExpenseUpdateRequest.validate_titledef validate_title(cls, value: str | None) -> str | None: if value is None: return None stripped = value.strip() if not stripped: raise ValueError("title не может быть пустым или с` (стр. 1367)
- `ExpenseUpdateRequest.validate_datedef validate_date(cls, value: str | None) -> str | None: if value is None: return None if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):` (стр. 1377)
- `ExpenseUpdateRequest.require_at_least_one_fielddef require_at_least_one_field(self) -> "ExpenseUpdateRequest": if all(v is None for v in [self.title, self.amount, self.category, self.date, self.note]):` (стр. 1385)
- `class IncomeUpdateRequest(BaseModel):` (стр. 1391)
- `IncomeUpdateRequest.validate_sourcedef validate_source(cls, value: str | None) -> str | None: if value is None: return None stripped = value.strip() if not stripped: raise ValueError("source не может быть пустым или` (стр. 1400)
- `IncomeUpdateRequest.validate_datedef validate_date(cls, value: str | None) -> str | None: if value is None: return None if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):` (стр. 1410)
- `IncomeUpdateRequest.require_at_least_one_fielddef require_at_least_one_field(self) -> "IncomeUpdateRequest": # Use model_fields_set to detect explicitly provided fields (including null). # This allows {"note": null} to pass as` (стр. 1418)
- `class PiggyBankTransactionPayload(BaseModel):` (стр. 1426)
- `class PiggyBankWithdrawRequest(BaseModel):` (стр. 1448)
- `PiggyBankWithdrawRequest.validate_datedef validate_date(cls, value: str) -> str: if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value.strip()):` (стр. 1457)
- `class PiggyBankWashBreakdown(BaseModel):` (стр. 1463)
- `class PiggyBankDetailingBreakdown(BaseModel):` (стр. 1476)
- `class PiggyBankResponse(BaseModel):` (стр. 1487)
- `class WeeklyArchivePayload(BaseModel):` (стр. 1506)
- `class WalletResponse(BaseModel):` (стр. 1520)
- `class OwnerProfitShareItem(BaseModel):` (стр. 1537)
- `class OwnerProfitShareSummary(BaseModel):` (стр. 1554)
- `class OwnerSalaryDetailResponse(BaseModel):` (стр. 1563)
- `class PayOwnerSalaryRequest(BaseModel):` (стр. 1570)
- `class PayOwnerSalaryResponse(BaseModel):` (стр. 1576)
- `class OverrideEarnedRequest(BaseModel):` (стр. 1583)
- `class BookingHistoryItem(BaseModel):` (стр. 1587)
- `class BookingTotalsWorkerItem(BaseModel):` (стр. 1604)
- `class BookingTotalsOwnerItem(BaseModel):` (стр. 1622)
- `class BookingTotalsPiggyItem(BaseModel):` (стр. 1629)
- `class BookingHistoryTotals(BaseModel):` (стр. 1635)
- `class BookingMoneySplitWorkerItem(BaseModel):` (стр. 1641)
- `class BookingMoneySplitOwnerItem(BaseModel):` (стр. 1652)
- `class BookingPiggyTxItem(BaseModel):` (стр. 1660)
- `class BookingAdditionalServiceItem(BaseModel):` (стр. 1669)
- `class BookingAsvcPiggyItem(BaseModel):` (стр. 1676)
- `class BookingAsvcWorkerItem(BaseModel):` (стр. 1682)
- `class BookingMoneySplitDetail(BaseModel):` (стр. 1693)
- `class BookingWorkerEarnedUpdate(BaseModel):` (стр. 1740)
- `class BookingMoneySplitOwnerUpdate(BaseModel):` (стр. 1745)
- `class BookingMoneySplitUpdateRequest(BaseModel):` (стр. 1750)
- `class ArchiveBookingWorkerItem(BaseModel):` (стр. 1760)
- `class ArchiveAdditionalServiceItem(BaseModel):` (стр. 1770)
- `class ArchiveBookingItem(BaseModel):` (стр. 1776)
- `class ArchivePayrollItem(BaseModel):` (стр. 1803)
- `class ArchiveOwnerItem(BaseModel):` (стр. 1821)
- `class ArchiveSummary(BaseModel):` (стр. 1829)
- `class ArchiveResponse(BaseModel):` (стр. 1845)
- `class DepositSubscriptionUpdateRequest(BaseModel):` (стр. 1862)
- `DepositSubscriptionUpdateRequest.validate_plandef validate_plan(cls, value: str) -> str: value = value.strip() if value and value not in DEPOSIT_PLANS: raise ValueError("Неизвестный тип абонемента") return value` (стр. 1876)
- `class DepositTopUpRequest(BaseModel):` (стр. 1883)
- `DepositTopUpRequest.validate_datedef validate_date(cls, value: str) -> str: value = value.strip() if value and not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):` (стр. 1891)
- `class DepositAdjustRequest(BaseModel):` (стр. 1898)
- `DepositAdjustRequest.validate_datedef validate_date(cls, value: str) -> str: value = value.strip() if value and not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):` (стр. 1906)
- `class DepositWashRequest(BaseModel):` (стр. 1913)
- `DepositWashRequest.validate_vehicledef validate_vehicle(self) -> "DepositWashRequest": if not self.car.strip() and not self.plate.strip():` (стр. 1929)
- `class DepositSettleRequest(BaseModel):` (стр. 1939)
- `DepositSettleRequest.validate_monthdef validate_month(cls, value: str) -> str: if not re.fullmatch(r"\d{2}\.\d{4}", value.strip()):` (стр. 1945)
- `class DepositTransactionPayload(BaseModel):` (стр. 1951)
- `class DepositMonthPayload(BaseModel):` (стр. 1964)
- `class DepositStats(BaseModel):` (стр. 1975)
- `class DepositMonthBreakdown(BaseModel):` (стр. 1985)
- `class DepositOverview(BaseModel):` (стр. 1999)
- `class DepositSummaryItem(BaseModel):` (стр. 2028)

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

### backend/tests/test_archive.py (391 строк)

Классы и функции (23):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 20)
- `build_init_datadef build_init_data(telegram_id: str) -> str: """Build Telegram init data that passes insecure validation (no HMAC).""" return urllib.parse.urlencode( {"user": json.dumps({"id": te` (стр. 26)
- `class ArchiveEndpointTests(unittest.TestCase):` (стр. 33)
- `ArchiveEndpointTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 38)
- `ArchiveEndpointTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 61)
- `ArchiveEndpointTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 67)
- `ArchiveEndpointTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 76)
- `ArchiveEndpointTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser mapping = { "admin": self.ADMIN_TG_ID, "ivan": self.WORKER_TG_ID, ` (стр. 85)
- `ArchiveEndpointTests.auth_headersdef auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 102)
- `ArchiveEndpointTests.next_active_datedef next_active_date() -> str: candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 106)
- `ArchiveEndpointTests.create_bookingdef create_booking(self, *, status: str = "scheduled") -> dict: booking_date = self.next_active_date() create_response = self.client.post( "/api/bookings", headers=self.auth_header` (стр. 114)
- `ArchiveEndpointTests.get_archivedef get_archive(self, *, token: str | None = None, **params) -> dict: query = urllib.parse.urlencode(params) response = self.client.get( f"/api/owner/archive?{query}", headers=self` (стр. 149)
- `ArchiveEndpointTests.test_archive_returns_booking_with_split_amountsdef test_archive_returns_booking_with_split_amounts(self) -> None: booking = self.create_booking(status="completed") archive = self.get_archive() item = next( (b for b in archive["` (стр. 158)
- `ArchiveEndpointTests.test_archive_period_filterdef test_archive_period_filter(self) -> None: booking = self.create_booking(status="completed") date_from = booking["date"] archive = self.get_archive(date_from=date_from, date_to=` (стр. 182)
- `ArchiveEndpointTests.test_archive_contains_incomes_expenses_and_piggydef test_archive_contains_incomes_expenses_and_piggy(self) -> None: today = datetime.now().strftime("%d.%m.%Y") income = self.client.post( "/api/owner/incomes", headers=self.auth_h` (стр. 204)
- `ArchiveEndpointTests.test_archive_payroll_and_owners_sectionsdef test_archive_payroll_and_owners_sections(self) -> None: booking = self.create_booking(status="completed") archive = self.get_archive() worker = next( (w for w in archive["payro` (стр. 240)
- `ArchiveEndpointTests.test_archive_booking_detail_matches_money_splitdef test_archive_booking_detail_matches_money_split(self) -> None: booking = self.create_booking(status="completed") archive = self.get_archive() item = next((b for b in archive["b` (стр. 261)
- `ArchiveEndpointTests.test_archive_booking_has_client_iddef test_archive_booking_has_client_id(self) -> None: booking = self.create_booking(status="completed") archive = self.get_archive() item = next((b for b in archive["bookings"] if ` (стр. 281)
- `ArchiveEndpointTests.test_wallet_accepts_period_datesdef test_wallet_accepts_period_dates(self) -> None: yesterday = (datetime.now() - timedelta(days=1)).strftime("%d.%m.%Y") income = self.client.post( "/api/owner/incomes", headers=s` (стр. 288)
- `ArchiveEndpointTests.test_owners_salary_detail_with_datesdef test_owners_salary_detail_with_dates(self) -> None: booking = self.create_booking(status="completed") split = self.client.get( f"/api/owner/bookings/{booking['id']}/money-split` (стр. 317)
- `ArchiveEndpointTests.test_archive_requires_owner_roledef test_archive_requires_owner_role(self) -> None: response = self.client.get( "/api/owner/archive", headers=self.auth_headers(self.admin_token), ) self.assertEqual(response.statu` (стр. 336)
- `ArchiveEndpointTests.test_archive_rejects_invalid_datedef test_archive_rejects_invalid_date(self) -> None: response = self.client.get( "/api/owner/archive?date_from=not-a-date", headers=self.auth_headers(self.owner_token), ) self.asse` (стр. 349)
- `ArchiveEndpointTests.test_worker_salary_detail_accepts_both_date_formatsdef test_worker_salary_detail_accepts_both_date_formats(self) -> None: booking = self.create_booking(status="completed") booking_date = booking["date"] iso_date = booking_date[6:10` (стр. 356)

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

### backend/tests/test_booking_logic.py (4088 строк)

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
- `BookingLogicTests.test_client_booking_can_share_busy_boxdef test_client_booking_can_share_busy_box(self) -> None: admin_token = self.login_staff("admin", "admin") booking_date = self.next_active_date() admin_response = self.client.post(` (стр. 608)
- `BookingLogicTests.test_detailing_booking_uses_detailing_room_and_keeps_slots_separatedef test_detailing_booking_uses_detailing_room_and_keeps_slots_separate(self) -> None: admin_token = self.login_staff("admin", "admin") booking_date = self.next_active_date() wash_` (стр. 660)
- `BookingLogicTests.test_booking_rejects_box_time_overlapdef test_booking_rejects_box_time_overlap(self) -> None: token, _ = self.login_client(name="Alice", phone="+7 (999) 111-22-33") common = { "clientId": "", "clientName": "Alice", "c` (стр. 726)
- `BookingLogicTests.test_admin_can_edit_and_complete_existing_booking_on_inactive_daydef test_admin_can_edit_and_complete_existing_booking_on_inactive_day(self) -> None: from app.database import SessionLocal from app.models import Booking, Client admin_token = self` (стр. 762)
- `BookingLogicTests.test_admin_booking_without_box_picks_available_wash_boxdef test_admin_booking_without_box_picks_available_wash_box(self) -> None: admin_token = self.login_staff("admin", "admin") booking_date = self.next_active_date() first_response = ` (стр. 818)
- `BookingLogicTests.test_admin_can_start_booking_that_ends_exactly_at_closing_timedef test_admin_can_start_booking_that_ends_exactly_at_closing_time(self) -> None: from app.database import SessionLocal from app.models import ScheduleEntry admin_token = self.logi` (стр. 868)
- `BookingLogicTests.test_admin_can_change_booking_status_without_revalidating_unchanged_slotdef test_admin_can_change_booking_status_without_revalidating_unchanged_slot(self) -> None: from app.database import SessionLocal from app.models import Booking, ScheduleEntry admi` (стр. 924)
- `BookingLogicTests.test_booking_must_fit_schedule_windowdef test_booking_must_fit_schedule_window(self) -> None: token, _ = self.login_client(name="Alice", phone="+7 (999) 111-22-33") response = self.client.post( "/api/bookings", header` (стр. 989)
- `BookingLogicTests.test_worker_cannot_update_foreign_bookingdef test_worker_cannot_update_foreign_booking(self) -> None: admin_token = self.login_staff("admin", "admin") create_response = self.client.post( "/api/bookings", headers=self.auth` (стр. 1014)
- `BookingLogicTests.test_owner_can_revoke_all_worker_complaintsdef test_owner_can_revoke_all_worker_complaints(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") worker = self.get_staff(login="ivan"` (стр. 1048)
- `BookingLogicTests.test_owner_summary_report_sends_detailed_excel_documentdef test_owner_summary_report_sends_detailed_excel_document(self) -> None: from app.database import SessionLocal from app.models import Booking, BookingWorker self.disable_owner_tw` (стр. 1077)
- `BookingLogicTests.fake_send_documentdef fake_send_document(chat_id: str | int, *, file_name: str, content: bytes, caption: str | None = None, mime_type: str = "application/octet-stream") -> None: sent_documents.appen` (стр. 1141)
- `BookingLogicTests.test_admin_create_booking_can_assign_workers_and_notify_themdef test_admin_create_booking_can_assign_workers_and_notify_them(self) -> None: from app.database import SessionLocal from app.models import Notification, StaffUser admin_token = s` (стр. 1187)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 1201)
- `BookingLogicTests.test_admin_can_create_booking_without_platedef test_admin_can_create_booking_without_plate(self) -> None: admin_token = self.login_staff("admin", "admin") response = self.client.post( "/api/bookings", headers=self.auth_head` (стр. 1252)
- `BookingLogicTests.test_admin_can_create_admin_review_booking_with_empty_optional_fieldsdef test_admin_can_create_admin_review_booking_with_empty_optional_fields(self) -> None: admin_token = self.login_staff("admin", "admin") response = self.client.post( "/api/booking` (стр. 1282)
- `BookingLogicTests.test_owner_can_create_client_and_past_booking_visible_on_first_client_logindef test_owner_can_create_client_and_past_booking_visible_on_first_client_login(self) -> None: owner_token = self.login_staff("owner", "owner") client_response = self.client.post( ` (стр. 1320)
- `BookingLogicTests.test_service_resource_group_syncs_from_service_type_on_savedef test_service_resource_group_syncs_from_service_type_on_save(self) -> None: owner_token = self.login_staff("owner", "owner") bootstrap = self.client.get("/api/auth/session", hea` (стр. 1373)
- `BookingLogicTests.test_fired_worker_loses_access_and_future_assignmentsdef test_fired_worker_loses_access_and_future_assignments(self) -> None: admin_token = self.login_staff("admin", "admin") self.disable_owner_two_factor() owner_token = self.login_s` (стр. 1390)
- `BookingLogicTests.test_same_telegram_client_reuses_existing_accountdef test_same_telegram_client_reuses_existing_account(self) -> None: self.verify_client_phone("1001", "+7 (999) 111-22-33") first = self.client.post( "/api/auth/client", json=self.` (стр. 1450)
- `BookingLogicTests.test_generic_telegram_auth_logs_in_linked_clientdef test_generic_telegram_auth_logs_in_linked_client(self) -> None: self.verify_client_phone("1001", "+7 (999) 111-22-33") first = self.client.post( "/api/auth/client", json=self.c` (стр. 1480)
- `BookingLogicTests.test_generic_telegram_auth_tolerates_legacy_client_profile_datadef test_generic_telegram_auth_tolerates_legacy_client_profile_data(self) -> None: from app.database import SessionLocal from app.models import Client self.verify_client_phone("100` (стр. 1497)
- `BookingLogicTests.test_generic_telegram_auth_prefers_linked_staff_windowdef test_generic_telegram_auth_prefers_linked_staff_window(self) -> None: self.set_staff_telegram("ivan", "7001") self.verify_client_phone("7001", "+7 (999) 111-22-33") client = se` (стр. 1527)
- `BookingLogicTests.test_generic_telegram_auth_does_not_claim_primary_ownerdef test_generic_telegram_auth_does_not_claim_primary_owner(self) -> None: self.set_primary_owner_telegram("") response = self.client.post("/api/auth/telegram", json={"initData": s` (стр. 1544)
- `BookingLogicTests.test_primary_owner_telegram_route_rejects_unlinked_ownerdef test_primary_owner_telegram_route_rejects_unlinked_owner(self) -> None: self.set_primary_owner_telegram("") response = self.client.post( "/api/auth/telegram-owner", json={"init` (стр. 1551)
- `BookingLogicTests.test_nullable_text_values_are_treated_as_empty_stringsdef test_nullable_text_values_are_treated_as_empty_strings(self) -> None: from app.main import _safe_text self.assertEqual(_safe_text(None), "") self.assertEqual(_safe_text(" 9001 ` (стр. 1563)
- `BookingLogicTests.test_primary_owner_can_log_in_via_dedicated_telegram_routedef test_primary_owner_can_log_in_via_dedicated_telegram_route(self) -> None: self.set_primary_owner_telegram("9001") response = self.client.post( "/api/auth/telegram-owner", json=` (стр. 1569)
- `BookingLogicTests.test_generic_telegram_auth_rejects_expired_init_datadef test_generic_telegram_auth_rejects_expired_init_data(self) -> None: self.set_staff_telegram("ivan", "7002") response = self.client.post( "/api/auth/telegram", json={"initData":` (стр. 1586)
- `BookingLogicTests.test_generic_telegram_auth_rejects_duplicate_staff_bindingsdef test_generic_telegram_auth_rejects_duplicate_staff_bindings(self) -> None: self.set_staff_telegram("ivan", "7007") self.set_staff_telegram("oleg", "7007") response = self.clien` (стр. 1596)
- `BookingLogicTests.test_client_registration_rejects_same_phone_for_different_telegram_idsdef test_client_registration_rejects_same_phone_for_different_telegram_ids(self) -> None: self.verify_client_phone("1001", "+7 (999) 111-22-33") first = self.client.post( "/api/aut` (стр. 1604)
- `BookingLogicTests.test_client_profile_cannot_take_phone_of_another_clientdef test_client_profile_cannot_take_phone_of_another_client(self) -> None: first_token, first_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") second_token, _ = sel` (стр. 1619)
- `BookingLogicTests.test_client_booking_creates_notification_for_same_client_iddef test_client_booking_creates_notification_for_same_client_id(self) -> None: token, actor_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") response = self.client.` (стр. 1638)
- `BookingLogicTests.test_client_cannot_mark_other_clients_notification_as_readdef test_client_cannot_mark_other_clients_notification_as_read(self) -> None: admin_token = self.login_staff("admin", "admin") first_token, first_id = self.login_client(name="Alice` (стр. 1669)
- `BookingLogicTests.test_client_login_rejects_foreign_telegram_id_for_existing_phonedef test_client_login_rejects_foreign_telegram_id_for_existing_phone(self) -> None: self.verify_client_phone("1001", "+7 (999) 111-22-33") first = self.client.post( "/api/auth/clie` (стр. 1698)
- `BookingLogicTests.test_client_read_all_marks_only_own_notificationsdef test_client_read_all_marks_only_own_notifications(self) -> None: admin_token = self.login_staff("admin", "admin") first_token, first_id = self.login_client(name="Alice", phone=` (стр. 1719)
- `BookingLogicTests.test_client_read_all_rejects_foreign_role_payloaddef test_client_read_all_rejects_foreign_role_payload(self) -> None: token, _ = self.login_client(name="Alice", phone="+7 (999) 111-22-33") response = self.client.post( "/api/notif` (стр. 1761)
- `BookingLogicTests.test_deleting_client_removes_client_sessions_and_notificationsdef test_deleting_client_removes_client_sessions_and_notifications(self) -> None: admin_token = self.login_staff("admin", "admin") client_token, client_id = self.login_client(name=` (стр. 1770)
- `BookingLogicTests.test_client_cancel_booking_creates_client_and_admin_notificationsdef test_client_cancel_booking_creates_client_and_admin_notifications(self) -> None: token, actor_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") create_response =` (стр. 1798)
- `BookingLogicTests.test_deleted_client_can_register_again_with_same_phone_and_telegramdef test_deleted_client_can_register_again_with_same_phone_and_telegram(self) -> None: admin_token = self.login_staff("admin", "admin") self.verify_client_phone("1001", "+7 (999) 1` (стр. 1839)
- `BookingLogicTests.test_secure_client_auth_requires_valid_init_datadef test_secure_client_auth_requires_valid_init_data(self) -> None: self.shutdown_app() os.environ["ALLOW_INSECURE_CLIENT_AUTH"] = "false" self.restart_app() missing = self.client.` (стр. 1863)
- `BookingLogicTests.test_admin_reschedule_creates_client_notificationdef test_admin_reschedule_creates_client_notification(self) -> None: admin_token = self.login_staff("admin", "admin") client_token, actor_id = self.login_client(name="Alice", phone` (стр. 1894)
- `BookingLogicTests.test_admin_completion_creates_client_notificationdef test_admin_completion_creates_client_notification(self) -> None: admin_token = self.login_staff("admin", "admin") client_token, actor_id = self.login_client(name="Alice", phone` (стр. 1932)
- `BookingLogicTests.test_admin_booking_reuses_existing_client_by_normalized_phonedef test_admin_booking_reuses_existing_client_by_normalized_phone(self) -> None: admin_token = self.login_staff("admin", "admin") _, client_id = self.login_client(name="Alice", pho` (стр. 1976)
- `BookingLogicTests.test_admin_cannot_create_booking_with_conflicting_client_and_phonedef test_admin_cannot_create_booking_with_conflicting_client_and_phone(self) -> None: admin_token = self.login_staff("admin", "admin") _, first_client_id = self.login_client(name="` (стр. 2010)
- `BookingLogicTests.test_admin_can_save_profile_and_notification_settingsdef test_admin_can_save_profile_and_notification_settings(self) -> None: admin_token = self.login_staff("admin", "admin") profile_response = self.client.put( "/api/settings/admin/p` (стр. 2038)
- `BookingLogicTests.test_owner_can_create_admin_like_worker_and_update_telegram_idsdef test_owner_can_create_admin_like_worker_and_update_telegram_ids(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") create_admin = s` (стр. 2074)
- `BookingLogicTests.test_owner_can_create_and_login_accountantdef test_owner_can_create_and_login_accountant(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") create_accountant = self.client.post(` (стр. 2156)
- `BookingLogicTests.test_owner_can_rehire_employee_with_same_telegram_after_dismissaldef test_owner_can_rehire_employee_with_same_telegram_after_dismissal(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") create_worker ` (стр. 2195)
- `BookingLogicTests.test_admin_can_manage_master_payroll_and_private_client_ratingdef test_admin_can_manage_master_payroll_and_private_client_rating(self) -> None: admin_token = self.login_staff("admin", "admin") _, client_id = self.login_client(name="Alice", ph` (стр. 2246)
- `BookingLogicTests.test_owner_and_admin_can_see_detailed_worker_payroll_summarydef test_owner_and_admin_can_see_detailed_worker_payroll_summary(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") admin_token = self.` (стр. 2288)
- `BookingLogicTests.test_payroll_entry_notifies_worker_and_updates_summarydef test_payroll_entry_notifies_worker_and_updates_summary(self) -> None: from app.database import SessionLocal from app.models import Notification, StaffUser self.disable_owner_tw` (стр. 2381)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 2396)
- `BookingLogicTests.test_admin_cannot_issue_advance_before_worker_earns_1000def test_admin_cannot_issue_advance_before_worker_earns_1000(self) -> None: admin_token = self.login_staff("admin", "admin") response = self.client.post( "/api/payroll/entries", he` (стр. 2422)
- `BookingLogicTests.test_owner_pdf_export_returns_pdf_filedef test_owner_pdf_export_returns_pdf_file(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") response = self.client.get("/api/owner/ex` (стр. 2438)
- `BookingLogicTests.test_owner_can_create_booking_with_assigned_master_without_platedef test_owner_can_create_booking_with_assigned_master_without_plate(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") response = self` (стр. 2447)
- `BookingLogicTests.test_admin_reschedule_notifies_assigned_workerdef test_admin_reschedule_notifies_assigned_worker(self) -> None: from app.database import SessionLocal from app.models import Notification, StaffUser admin_token = self.login_staf` (стр. 2476)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 2515)
- `BookingLogicTests.test_worker_start_and_completion_notify_owner_and_send_receiptdef test_worker_start_and_completion_notify_owner_and_send_receipt(self) -> None: from app.database import SessionLocal from app.models import Client, Notification self.disable_own` (стр. 2543)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 2588)
- `BookingLogicTests.test_client_can_store_multiple_vehiclesdef test_client_can_store_multiple_vehicles(self) -> None: token, client_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") response = self.client.patch( "/api/client` (стр. 2634)
- `BookingLogicTests.test_owner_can_notify_admin_about_inactive_clientsdef test_owner_can_notify_admin_about_inactive_clients(self) -> None: from app.database import SessionLocal from app.models import Booking, Notification self.disable_owner_two_fact` (стр. 2671)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 2706)
- `BookingLogicTests.test_owner_dispatches_return_visit_reminders_to_clientsdef test_owner_dispatches_return_visit_reminders_to_clients(self) -> None: from app.database import SessionLocal from app.models import Booking, Notification self.disable_owner_two` (стр. 2726)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 2770)
- `BookingLogicTests.test_worker_can_submit_shift_checklists_and_owner_can_review_themdef test_worker_can_submit_shift_checklists_and_owner_can_review_them(self) -> None: from app.database import SessionLocal from app.models import Notification self.disable_owner_tw` (стр. 2800)
- `BookingLogicTests.test_admin_shift_inspection_sends_owner_photo_and_can_be_approveddef test_admin_shift_inspection_sends_owner_photo_and_can_be_approved(self) -> None: from app.database import SessionLocal from app.models import Notification self.disable_owner_tw` (стр. 2869)
- `BookingLogicTests.fake_send_photodef fake_send_photo(chat_id: str | int, **kwargs) -> None: sent_photos.append({"chat_id": chat_id, **kwargs})` (стр. 2889)
- `BookingLogicTests.test_admin_shift_inspection_list_uses_photo_endpointdef test_admin_shift_inspection_list_uses_photo_endpoint(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") admin_token = self.login_st` (стр. 2925)
- `BookingLogicTests.test_bot_can_reject_admin_shift_with_issue_notedef test_bot_can_reject_admin_shift_with_issue_note(self) -> None: from bot import BotRuntime, process_telegram_update from app.database import SessionLocal from app.models import ` (стр. 2968)
- `BookingLogicTests.fake_telegram_calldef fake_telegram_call(_runtime, method: str, payload: dict[str, object] | None = None, **_kwargs): telegram_calls.append((method, payload or {})) return {}` (стр. 3003)
- `BookingLogicTests.test_admin_mark_read_all_affects_only_admin_notificationsdef test_admin_mark_read_all_affects_only_admin_notifications(self) -> None: admin_token = self.login_staff("admin", "admin") owner_token = self.login_staff("owner", "owner") if Fa` (стр. 3035)
- `BookingLogicTests.test_admin_cannot_access_owner_only_endpointsdef test_admin_cannot_access_owner_only_endpoints(self) -> None: admin_token = self.login_staff("admin", "admin") create_worker = self.client.post( "/api/workers", headers=self.aut` (стр. 3078)
- `BookingLogicTests.test_worker_can_update_only_own_assigned_booking_status_and_notesdef test_worker_can_update_only_own_assigned_booking_status_and_notes(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "maste` (стр. 3124)
- `BookingLogicTests.test_worker_completion_creates_admin_notification_with_amount_client_and_servicedef test_worker_completion_creates_admin_notification_with_amount_client_and_service(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff` (стр. 3170)
- `BookingLogicTests.test_worker_cannot_change_time_or_workers_even_on_own_bookingdef test_worker_cannot_change_time_or_workers_even_on_own_booking(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master") ` (стр. 3210)
- `BookingLogicTests.test_worker_must_specify_payment_state_when_completing_bookingdef test_worker_must_specify_payment_state_when_completing_booking(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master")` (стр. 3252)
- `BookingLogicTests.test_worker_can_save_only_own_profiledef test_worker_can_save_only_own_profile(self) -> None: worker_token = self.login_staff("ivan", "master") worker = self.get_staff(login="ivan") other_worker = self.get_staff(login` (стр. 3305)
- `BookingLogicTests.test_worker_can_save_only_own_notification_settingsdef test_worker_can_save_only_own_notification_settings(self) -> None: worker_token = self.login_staff("ivan", "master") worker = self.get_staff(login="ivan") other_worker = self.g` (стр. 3343)
- `BookingLogicTests.test_worker_mark_read_all_affects_only_own_notificationsdef test_worker_mark_read_all_affects_only_own_notifications(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") worker_token = self.log` (стр. 3376)
- `BookingLogicTests.test_worker_cannot_create_penaltiesdef test_worker_cannot_create_penalties(self) -> None: worker_token = self.login_staff("ivan", "master") other_worker = self.get_staff(login="oleg") response = self.client.post( "/` (стр. 3409)
- `BookingLogicTests.test_worker_cannot_create_notifications_for_other_rolesdef test_worker_cannot_create_notifications_for_other_roles(self) -> None: worker_token = self.login_staff("ivan", "master") _, client_id = self.login_client(name="Alice", phone="+` (стр. 3419)
- `BookingLogicTests.test_worker_can_create_notification_for_assigned_clientdef test_worker_can_create_notification_for_assigned_client(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master") worker` (стр. 3434)
- `BookingLogicTests.test_worker_can_generate_telegram_link_codedef test_worker_can_generate_telegram_link_code(self) -> None: worker_token = self.login_staff("ivan", "master") response = self.client.post( "/api/telegram/link-code", headers=sel` (стр. 3475)
- `BookingLogicTests.test_telegram_webhook_rejects_invalid_secretdef test_telegram_webhook_rejects_invalid_secret(self) -> None: os.environ["WEBAPP_URL"] = "https://crm.example" os.environ["TELEGRAM_DELIVERY_MODE"] = "webhook" self.restart_app()` (стр. 3486)
- `BookingLogicTests.test_telegram_webhook_processes_update_with_valid_secretdef test_telegram_webhook_processes_update_with_valid_secret(self) -> None: os.environ["WEBAPP_URL"] = "https://crm.example" os.environ["TELEGRAM_DELIVERY_MODE"] = "webhook" self.r` (стр. 3498)
- `BookingLogicTests.test_client_bootstrap_contains_only_own_bookings_and_no_worker_directorydef test_client_bootstrap_contains_only_own_bookings_and_no_worker_directory(self) -> None: admin_token = self.login_staff("admin", "admin") first_token, first_id = self.login_clie` (стр. 3513)
- `BookingLogicTests.test_worker_bootstrap_contains_only_assigned_bookingsdef test_worker_bootstrap_contains_only_assigned_bookings(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master") first_wo` (стр. 3573)
- `BookingLogicTests.test_admin_can_update_booking_alias_fields_and_service_canonical_datadef test_admin_can_update_booking_alias_fields_and_service_canonical_data(self) -> None: admin_token = self.login_staff("admin", "admin") create_response = self.client.post( "/api/` (стр. 3633)
- `BookingLogicTests.test_owner_stock_write_off_rejects_negative_qtydef test_owner_stock_write_off_rejects_negative_qty(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") create_response = self.client.po` (стр. 3684)
- `BookingLogicTests.test_admin_can_read_targeted_admin_notificationsdef test_admin_can_read_targeted_admin_notifications(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") admin_token = self.login_staff(` (стр. 3713)
- `BookingLogicTests.test_deleting_client_removes_related_bookings_and_sessionsdef test_deleting_client_removes_related_bookings_and_sessions(self) -> None: admin_token = self.login_staff("admin", "admin") client_token, client_id = self.login_client(name="Ali` (стр. 3766)
- `BookingLogicTests.test_worker_cannot_message_client_from_only_completed_bookingdef test_worker_cannot_message_client_from_only_completed_booking(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master") ` (стр. 3803)
- `BookingLogicTests.test_owner_database_reset_execute_requires_delay_after_approvaldef test_owner_database_reset_execute_requires_delay_after_approval(self) -> None: self.disable_owner_two_factor() self.set_primary_owner_telegram() owner_token = self.login_staff(` (стр. 3850)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 3856)
- `BookingLogicTests.test_owner_database_reset_clears_operational_data_and_preserves_ownersdef test_owner_database_reset_clears_operational_data_and_preserves_owners(self) -> None: from app.database import SessionLocal from app.models import ( AppSetting, Booking, Box, C` (стр. 3890)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 3961)
- `BookingLogicTests.test_normalize_service_and_box_resources_handles_legacy_null_box_fieldsdef test_normalize_service_and_box_resources_handles_legacy_null_box_fields(self) -> None: from app.main import DETAILING_BOX_NAME, WASH_BOX_NAMES, _normalize_service_and_box_resou` (стр. 4025)
- `class FakeScalarResult: def __init__(self, items: list[object]) -> None: self._items = items def all(self) -> list[objec` (стр. 4029)
- `FakeScalarResult.__init__def __init__(self, items: list[object]) -> None: self._items = items` (стр. 4030)
- `FakeScalarResult.alldef all(self) -> list[object]: return self._items` (стр. 4033)
- `class FakeSession: def __init__(self, services: list[Service], boxes: list[Box]) -> None: self.services = services self.` (стр. 4036)
- `FakeSession.__init__def __init__(self, services: list[Service], boxes: list[Box]) -> None: self.services = services self.boxes = boxes self.flushed = False` (стр. 4037)
- `FakeSession.scalarsdef scalars(self, statement): entity = statement.column_descriptions[0]["entity"] if entity is Service: return FakeScalarResult(self.services) if entity is Box: return FakeScalarRe` (стр. 4042)
- `FakeSession.adddef add(self, _item: object) -> None: return None` (стр. 4050)
- `FakeSession.flushdef flush(self) -> None: self.flushed = True` (стр. 4053)

### backend/tests/test_booking_money_split.py (844 строк)

Классы и функции (27):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 16)
- `build_init_datadef build_init_data(telegram_id: str) -> str: """Build Telegram init data that passes insecure validation (no HMAC).""" return urllib.parse.urlencode({"user": json.dumps({"id": tel` (стр. 28)
- `class BookingMoneySplitTests(unittest.TestCase):` (стр. 33)
- `BookingMoneySplitTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 38)
- `BookingMoneySplitTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 61)
- `BookingMoneySplitTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 67)
- `BookingMoneySplitTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 76)
- `BookingMoneySplitTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser mapping = { "admin": self.ADMIN_TG_ID, "ivan": self.WORKER_TG_ID, ` (стр. 85)
- `BookingMoneySplitTests.auth_headersdef auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 102)
- `BookingMoneySplitTests.next_active_datedef next_active_date() -> str: candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 106)
- `BookingMoneySplitTests.create_bookingdef create_booking(self, *, status: str = "scheduled") -> dict: booking_date = self.next_active_date() create_response = self.client.post( "/api/bookings", headers=self.auth_header` (стр. 114)
- `BookingMoneySplitTests.get_splitdef get_split(self, booking_id: str, token: str) -> dict: response = self.client.get( f"/api/owner/bookings/{booking_id}/money-split", headers=self.auth_headers(token), ) self.asse` (стр. 149)
- `BookingMoneySplitTests.test_bookings_history_lists_and_filtersdef test_bookings_history_lists_and_filters(self) -> None: booking = self.create_booking(status="completed") response = self.client.get( "/api/owner/bookings-history", headers=self` (стр. 157)
- `BookingMoneySplitTests.test_bookings_history_totals_accepts_dd_mm_yyyy_datesdef test_bookings_history_totals_accepts_dd_mm_yyyy_dates(self) -> None: booking = self.create_booking(status="completed") booking_date = booking["date"] dated = self.client.get( f` (стр. 199)
- `BookingMoneySplitTests.test_money_split_get_returns_full_distributiondef test_money_split_get_returns_full_distribution(self) -> None: booking = self.create_booking(status="completed") split = self.get_split(booking["id"], self.owner_token) self.ass` (стр. 218)
- `BookingMoneySplitTests.test_money_split_update_changes_all_partsdef test_money_split_update_changes_all_parts(self) -> None: from app.database import SessionLocal from app.models import BookingWorker, Expense, OwnerProfitShare, PiggyBankTransac` (стр. 236)
- `BookingMoneySplitTests.test_money_split_reset_restores_auto_valuesdef test_money_split_reset_restores_auto_values(self) -> None: booking = self.create_booking(status="completed") split = self.get_split(booking["id"], self.owner_token) response = ` (стр. 312)
- `BookingMoneySplitTests.test_money_split_rejects_paid_owner_sharedef test_money_split_rejects_paid_owner_share(self) -> None: from app.database import SessionLocal from app.models import OwnerProfitShare booking = self.create_booking(status="com` (стр. 329)
- `BookingMoneySplitTests.test_money_split_rejects_unfinished_bookingdef test_money_split_rejects_unfinished_booking(self) -> None: booking = self.create_booking(status="scheduled") response = self.client.put( f"/api/owner/bookings/{booking['id']}/m` (стр. 356)
- `BookingMoneySplitTests.test_money_split_requires_owner_roledef test_money_split_requires_owner_role(self) -> None: booking = self.create_booking(status="completed") get_response = self.client.get( f"/api/owner/bookings/{booking['id']}/mone` (стр. 366)
- `BookingMoneySplitTests.test_money_split_missing_booking_returns_404def test_money_split_missing_booking_returns_404(self) -> None: response = self.client.get( f"/api/owner/bookings/{uuid4().hex}/money-split", headers=self.auth_headers(self.owner_t` (стр. 382)
- `BookingMoneySplitTests.test_credit_booking_skips_piggy_deposit_and_owner_sharedef test_credit_booking_skips_piggy_deposit_and_owner_share(self) -> None: booking_date = self.next_active_date() create_response = self.client.post( "/api/bookings", headers=self.` (стр. 389)
- `BookingMoneySplitTests.test_money_split_subtract_additional_service_pipelinedef test_money_split_subtract_additional_service_pipeline(self) -> None: from app.database import SessionLocal from app.models import Service with SessionLocal() as db: svc = db.ge` (стр. 451)
- `BookingMoneySplitTests.test_money_split_subtract_other_master_paid_included_in_totaldef test_money_split_subtract_other_master_paid_included_in_total(self) -> None: from app.database import SessionLocal from app.models import Service with SessionLocal() as db: svc` (стр. 547)
- `BookingMoneySplitTests.test_money_split_pipeline_with_materials_not_in_orderdef test_money_split_pipeline_with_materials_not_in_order(self) -> None: from app.database import SessionLocal from app.models import Service with SessionLocal() as db: svc = db.ge` (стр. 618)
- `BookingMoneySplitTests.test_money_split_pipeline_materials_step_lastdef test_money_split_pipeline_materials_step_last(self) -> None: from app.database import SessionLocal from app.models import Service with SessionLocal() as db: svc = db.get(Servic` (стр. 693)
- `BookingMoneySplitTests.test_money_split_classic_with_subtract_additional_servicedef test_money_split_classic_with_subtract_additional_service(self) -> None: from app.database import SessionLocal from app.models import Service with SessionLocal() as db: svc = d` (стр. 767)

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

### backend/tests/test_content.py (178 строк)

Классы и функции (11):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 24)
- `build_init_datadef build_init_data(telegram_id: str) -> str: return urllib.parse.urlencode({"user": json.dumps({"id": telegram_id})})` (стр. 35)
- `class ContentTests(unittest.TestCase):` (стр. 39)
- `ContentTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_content_{uuid4().hex}.` (стр. 42)
- `ContentTests.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 68)
- `ContentTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select with SessionLocal() as db: owner = d` (стр. 81)
- `ContentTests._seed_contentdef _seed_content(self, value: dict) -> None: from app.main import get_db from app.models import AppSetting with next(get_db()) as db: row = db.get(AppSetting, "content") if row is` (стр. 92)
- `ContentTests.test_missing_row_returns_defaultdef test_missing_row_returns_default(self) -> None: res = self.client.get("/api/content") assert res.status_code == 200, res.text payload = res.json() assert isinstance(payload["he` (стр. 104)
- `ContentTests.test_legacy_format_is_migrated_on_readdef test_legacy_format_is_migrated_on_read(self) -> None: self._seed_content({ "hero": { "backgroundImage": "/hero-bg.jpg", "badgeText": "ATMOSFERA", "title": "Ваш автомобиль заслу` (стр. 111)
- `ContentTests.test_new_format_passes_throughdef test_new_format_passes_through(self) -> None: self._seed_content({ "hero": { "backgroundImage": "/hero-bg.jpg", "badgeText": "ATMOSFERA", "title": {"before": "Ваш автомобиль за` (стр. 134)
- `ContentTests.test_put_roundtrip_new_formatdef test_put_roundtrip_new_format(self) -> None: payload = { "hero": { "backgroundImage": "/bg.jpg", "badgeText": "ATMOSFERA", "title": {"before": "A ", "highlight": "H", "after": ` (стр. 155)

### backend/tests/test_deposit.py (515 строк)

Классы и функции (27):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 27)
- `build_init_datadef build_init_data(telegram_id: str) -> str: """Build Telegram init data that passes insecure validation (no HMAC).""" return urllib.parse.urlencode({"user": json.dumps({"id": tel` (стр. 38)
- `class DepositTests(unittest.TestCase):` (стр. 43)
- `DepositTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 47)
- `DepositTests.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 74)
- `DepositTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select with SessionLocal() as db: owner = d` (стр. 91)
- `DepositTests._auth_headersdef _auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 106)
- `DepositTests._create_clientdef _create_client(self) -> str: from app.database import SessionLocal from app.models import Client client_id = f"c-{uuid4().hex[:12]}" with SessionLocal() as db: db.add( Client( ` (стр. 109)
- `DepositTests._activate_depositdef _activate_deposit(self, client_id: str, monthly: int = 4000, **plan_fields) -> None: payload: dict = {"clientId": client_id, "depositActive": True, "depositMonthly": monthly} p` (стр. 127)
- `DepositTests._topupdef _topup(self, client_id: str, amount: float = 4000.0) -> None: response = self.client.post( f"/api/owner/deposits/{client_id}/topup", headers=self._auth_headers(self.owner_token` (стр. 137)
- `DepositTests._record_washdef _record_wash(self, client_id: str, price: float = 1000.0, car: str = "BMW", plate: str = "M001AA") -> None: response = self.client.post( f"/api/owner/deposits/{client_id}/washe` (стр. 145)
- `DepositTests._overviewdef _overview(self, client_id: str) -> dict: response = self.client.get( f"/api/owner/deposits/{client_id}", headers=self._auth_headers(self.owner_token), ) self.assertEqual(respon` (стр. 159)
- `DepositTests.test_activate_and_topup_and_balancedef test_activate_and_topup_and_balance(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) self._topup(client_id, 4000) overview = self._overv` (стр. 171)
- `DepositTests.test_credit_wash_deducts_and_no_immediate_piggy_depositdef test_credit_wash_deducts_and_no_immediate_piggy_deposit(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) self._topup(client_id, 4000) se` (стр. 190)
- `DepositTests.test_settle_month_returns_wash_total_to_piggy_bankdef test_settle_month_returns_wash_total_to_piggy_bank(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) self._topup(client_id, 4000) self._r` (стр. 217)
- `DepositTests.test_settle_month_twice_is_rejecteddef test_settle_month_twice_is_rejected(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) self._topup(client_id, 4000) self._record_wash(clie` (стр. 256)
- `DepositTests.test_wash_requires_active_depositdef test_wash_requires_active_deposit(self) -> None: client_id = self._create_client() response = self.client.post( f"/api/owner/deposits/{client_id}/washes", headers=self._auth_he` (стр. 277)
- `DepositTests.test_topup_requires_active_depositdef test_topup_requires_active_deposit(self) -> None: client_id = self._create_client() response = self.client.post( f"/api/owner/deposits/{client_id}/topup", headers=self._auth_he` (стр. 286)
- `DepositTests.test_export_exceldef test_export_excel(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) self._topup(client_id, 4000) self._record_wash(client_id, 1000) respo` (стр. 295)
- `DepositTests.test_export_alldef test_export_all(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) response = self.client.get( "/api/owner/deposits/export-all.xlsx", head` (стр. 311)
- `DepositTests.test_overview_allowed_for_admindef test_overview_allowed_for_admin(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) response = self.client.get( f"/api/owner/deposits/{clie` (стр. 325)
- `DepositTests.test_activate_deposit_as_admindef test_activate_deposit_as_admin(self) -> None: client_id = self._create_client() response = self.client.patch( f"/api/owner/deposits/{client_id}", headers=self._auth_headers(sel` (стр. 335)
- `DepositTests.test_settle_month_allowed_for_admindef test_settle_month_allowed_for_admin(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) self._topup(client_id, 4000) self._record_wash(clie` (стр. 353)
- `DepositTests.test_per_wash_plan_charges_tariff_and_no_refund_at_settledef test_per_wash_plan_charges_tariff_and_no_refund_at_settle(self) -> None: client_id = self._create_client() self._activate_deposit( client_id, monthly=0, depositPlan="per_wash",` (стр. 371)
- `DepositTests.test_washes_plan_charges_full_price_and_refunds_only_covereddef test_washes_plan_charges_full_price_and_refunds_only_covered(self) -> None: client_id = self._create_client() self._activate_deposit( client_id, monthly=4000, depositPlan="wash` (стр. 409)
- `DepositTests.test_washes_plan_carryover_from_previous_monthdef test_washes_plan_carryover_from_previous_month(self) -> None: from datetime import date from uuid import uuid4 as _uuid4 from app.database import SessionLocal from app.models i` (стр. 453)
- `DepositTests.test_deposit_export_telegram_endpoints_reachabledef test_deposit_export_telegram_endpoints_reachable(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) response = self.client.post( f"/api/ow` (стр. 493)

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

### backend/tests/test_worker_car_search.py (363 строк)

Классы и функции (23):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 26)
- `build_init_datadef build_init_data(telegram_id: str) -> str: """Build Telegram init data that passes insecure validation (no HMAC).""" return urllib.parse.urlencode({"user": json.dumps({"id": tel` (стр. 37)
- `class WorkerCarSearchTests(unittest.TestCase):` (стр. 42)
- `WorkerCarSearchTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 48)
- `WorkerCarSearchTests.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 75)
- `WorkerCarSearchTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select with SessionLocal() as db: ivan = db` (стр. 92)
- `WorkerCarSearchTests._auth_headersdef _auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 107)
- `WorkerCarSearchTests._next_active_datedef _next_active_date() -> str: candidate = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 111)
- `WorkerCarSearchTests._today_labeldef _today_label() -> str: return datetime.now().astimezone().strftime("%d.%m.%Y")` (стр. 120)
- `WorkerCarSearchTests._create_clientdef _create_client(self) -> tuple[str, str]: from app.database import SessionLocal from app.models import Client client_id = f"c-{uuid4().hex[:12]}" phone = f"+7 (999) 000-{str(uui` (стр. 123)
- `WorkerCarSearchTests._create_bookingdef _create_booking(self, *, worker_id: str = "w2", status: str = "new", time: str = "10:00") -> str: client_id, client_phone = self._create_client() response = self.client.post( "` (стр. 142)
- `WorkerCarSearchTests._create_booking_directdef _create_booking_direct( self, *, date: str, plate: str = "M001AA", car: str = "BMW", client_name: str = "Тест Клиент", status: str = "new", worker_id: str = "w2",` (стр. 169)
- `WorkerCarSearchTests.test_worker_searches_by_plate_case_insensitivedef test_worker_searches_by_plate_case_insensitive(self) -> None: booking_id = self._create_booking(worker_id="w2") response = self.client.get( "/api/worker/cars/search", headers=s` (стр. 230)
- `WorkerCarSearchTests.test_worker_searches_by_plate_with_spaces_and_dashesdef test_worker_searches_by_plate_with_spaces_and_dashes(self) -> None: booking_id = self._create_booking(worker_id="w2") response = self.client.get( "/api/worker/cars/search", hea` (стр. 242)
- `WorkerCarSearchTests.test_worker_searches_by_car_modeldef test_worker_searches_by_car_model(self) -> None: booking_id = self._create_booking(worker_id="w2") response = self.client.get( "/api/worker/cars/search", headers=self._auth_hea` (стр. 254)
- `WorkerCarSearchTests.test_worker_searches_by_client_namedef test_worker_searches_by_client_name(self) -> None: booking_id = self._create_booking(worker_id="w2") response = self.client.get( "/api/worker/cars/search", headers=self._auth_h` (стр. 266)
- `WorkerCarSearchTests.test_worker_search_no_match_returns_empty_listdef test_worker_search_no_match_returns_empty_list(self) -> None: self._create_booking(worker_id="w2") response = self.client.get( "/api/worker/cars/search", headers=self._auth_hea` (стр. 278)
- `WorkerCarSearchTests.test_worker_search_empty_query_returns_today_onlydef test_worker_search_empty_query_returns_today_only(self) -> None: today_id = self._create_booking_direct(date=self._today_label()) tomorrow = (datetime.now().astimezone() + time` (стр. 289)
- `WorkerCarSearchTests.test_worker_search_respects_date_paramdef test_worker_search_respects_date_param(self) -> None: tomorrow = (datetime.now().astimezone() + timedelta(days=1)).strftime("%d.%m.%Y") future_id = self._create_booking_direct(` (стр. 303)
- `WorkerCarSearchTests.test_worker_search_excludes_cancelleddef test_worker_search_excludes_cancelled(self) -> None: active_id = self._create_booking(worker_id="w2") cancel_response = self.client.patch( f"/api/bookings/{active_id}", headers` (стр. 316)
- `WorkerCarSearchTests.test_worker_search_reports_workers_on_bookingdef test_worker_search_reports_workers_on_booking(self) -> None: self._create_booking(worker_id="w2") response = self.client.get( "/api/worker/cars/search", headers=self._auth_head` (стр. 336)
- `WorkerCarSearchTests.test_worker_search_forbidden_for_ownerdef test_worker_search_forbidden_for_owner(self) -> None: response = self.client.get( "/api/worker/cars/search", headers=self._auth_headers(self.owner_token), params={"q": "M001AA"` (стр. 349)
- `WorkerCarSearchTests.test_worker_search_forbidden_without_authdef test_worker_search_forbidden_without_auth(self) -> None: response = self.client.get("/api/worker/cars/search", params={"q": "M001AA"}) self.assertEqual(response.status_code, 40` (стр. 357)

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

### frontend/src/app/App.tsx (731 строк)

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
- `usePath` (стр. 697) — локальный
- `onPopState` (стр. 700) — локальный
- `LandingWrapper` (стр. 707) — локальный
- `App` (стр. 715)
- `path` (стр. 716) — локальный

### frontend/src/app/components/admin/AdminApp.tsx (4483 строк)

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
- `parentCategories` (стр. 345) — локальный
- `selectableBookingDates` (стр. 421) — локальный
- `masterWorkers` (стр. 427) — локальный
- `selectedClient` (стр. 428) — локальный
- `normalizedClientSearchQuery` (стр. 429) — локальный
- `filteredClients` (стр. 432) — локальный
- `plates` (стр. 437) — локальный
- `selectedClientBookings` (стр. 445) — локальный
- `leftDate` (стр. 449) — локальный
- `rightDate` (стр. 450) — локальный
- `selectedClientFilteredBookings` (стр. 455) — локальный
- `svc` (стр. 457) — локальный
- `selectedClientVehicles` (стр. 461) — локальный
- `newBookingClientVehicles` (стр. 465) — локальный
- `client` (стр. 467) — локальный
- `selectedClientSpent` (стр. 473) — локальный
- `selectedClientCompletedCount` (стр. 476) — локальный
- `selectedClientUpcoming` (стр. 477) — локальный
- `selectedClientLastVisit` (стр. 478) — локальный
- `shiftSupplies` (стр. 479) — локальный
- `uploadedShiftPhotos` (стр. 484) — локальный
- `selectedService` (стр. 497) — локальный
- `defaultBoxForService` (стр. 515) — локальный
- `settingsBoxes` (стр. 527) — локальный
- `bookingFormBoxes` (стр. 528) — локальный
- `editBookingBoxes` (стр. 529) — локальный
- `newBookingLocationLabel` (стр. 532) — локальный
- `editBookingLocationLabel` (стр. 533) — локальный
- `modalMaxHeight` (стр. 585) — локальный
- `vv` (стр. 589) — локальный
- `handler` (стр. 591) — локальный
- `el` (стр. 592) — локальный
- `staffRoleTitle` (стр. 605) — локальный
- `staffNotificationsRole` (стр. 606) — локальный
- `adminNotifications` (стр. 607) — локальный
- `unreadCount` (стр. 612) — локальный
- `todayBookings` (стр. 613) — локальный
- `completedAll` (стр. 614) — локальный
- `totalRevenue` (стр. 615) — локальный
- `glass` (стр. 617) — локальный
- `bg` (стр. 618) — локальный
- `text` (стр. 619) — локальный
- `sub` (стр. 620) — локальный
- `primary` (стр. 621) — локальный
- `accent` (стр. 622) — локальный
- `surface` (стр. 623) — локальный
- `inputCls` (стр. 624) — локальный
- `selectCls` (стр. 625) — локальный
- `timeToMinutes` (стр. 626) — локальный
- `match` (стр. 627) — локальный
- `hours` (стр. 629) — локальный
- `minutes` (стр. 630) — локальный
- `byService` (стр. 636) — локальный
- `byStatus` (стр. 642) — локальный
- `byPayment` (стр. 653) — локальный
- `workerStats` (стр. 660) — локальный
- `bw` (стр. 664) — локальный
- `avgCheck` (стр. 671) — локальный
- `conversionRate` (стр. 672) — локальный
- `scheduleSummary` (стр. 673) — локальный
- `revenueData` (стр. 674) — локальный
- `formatted` (стр. 675) — локальный
- `hourData` (стр. 681) — локальный
- `handleStatusChange` (стр. 685) — локальный
- `handleDeleteClient` (стр. 690) — локальный
- `confirmed` (стр. 691) — локальный
- `handleCreateClient` (стр. 696) — локальный
- `nameError` (стр. 698) — локальный
- `phoneError` (стр. 702) — локальный
- `carError` (стр. 706) — локальный
- `plateError` (стр. 710) — локальный
- `created` (стр. 718) — локальный
- `handleSaveClientCard` (стр. 740) — локальный
- `draft` (стр. 741) — локальный
- `handleShiftPhotoChange` (стр. 755) — локальный
- `file` (стр. 756) — локальный
- `dataUrl` (стр. 760) — локальный
- `handleSubmitShiftInspection` (стр. 772) — локальный
- `primaryPhoto` (стр. 776) — локальный
- `uploadedCategoriesLabel` (стр. 783) — локальный
- `composedNote` (стр. 784) — локальный
- `saved` (стр. 788) — локальный
- `validateClientName` (стр. 805) — локальный
- `validateClientPhone` (стр. 809) — локальный
- `validateBookingDate` (стр. 813) — локальный
- `parsedDate` (стр. 815) — локальный
- `scheduleDay` (стр. 820) — локальный
- `normalizedTime` (стр. 825) — локальный
- `slotStart` (стр. 826) — локальный
- `openMinutes` (стр. 835) — локальный
- `closeMinutes` (стр. 836) — локальный
- `slotEnd` (стр. 837) — локальный
- `validateBookingDateForEdit` (стр. 847) — локальный
- `parsedDate` (стр. 849) — локальный
- `scheduleDay` (стр. 854) — локальный
- `normalizedTime` (стр. 859) — локальный
- `slotStart` (стр. 860) — локальный
- `openMinutes` (стр. 866) — локальный
- `closeMinutes` (стр. 867) — локальный
- `slotEnd` (стр. 868) — локальный
- `validateBookingDateTimeFormat` (стр. 878) — локальный
- `parsedDate` (стр. 880) — локальный
- `validateNewBookingForm` (стр. 893) — локальный
- `selectedService` (стр. 895) — локальный
- `nameError` (стр. 897) — локальный
- `phoneError` (стр. 901) — локальный
- `carError` (стр. 905) — локальный
- `plateError` (стр. 909) — локальный
- `hasDate` (стр. 912) — локальный
- `hasTime` (стр. 913) — локальный
- `requiresScheduledSlot` (стр. 914) — локальный
- `validation` (стр. 924) — локальный
- `validation` (стр. 940) — локальный
- `resetNewBookingDraft` (стр. 952) — локальный
- `openNewBookingModal` (стр. 980) — локальный
- `openAdditionalServiceModal` (стр. 985) — локальный
- `openNewBookingForClient` (стр. 994) — локальный
- `historyDate` (стр. 996) — локальный
- `clientVehicles` (стр. 998) — локальный
- `mainVehicle` (стр. 1000) — локальный
- `closeNewBookingModal` (стр. 1016) — локальный
- `handleAddService` (стр. 1021) — локальный
- `svc` (стр. 1030) — локальный
- `workersList` (стр. 1031) — локальный
- `worker` (стр. 1032) — локальный
- `updatedBooking` (стр. 1035) — локальный
- `handleRemoveService` (стр. 1053) — локальный
- `handleOpenEditAsvc` (стр. 1057) — локальный
- `handleSaveEditAsvc` (стр. 1065) — локальный
- `workersList` (стр. 1070) — локальный
- `worker` (стр. 1071) — локальный
- `updatedBooking` (стр. 1074) — локальный
- `closeAddServiceModal` (стр. 1089) — локальный
- `openEditModal` (стр. 1095) — локальный
- `handleSaveEditedBooking` (стр. 1117) — локальный
- `editServiceId` (стр. 1119) — локальный
- `detailingBooking` (стр. 1120) — локальный
- `requiresScheduledSlot` (стр. 1121) — локальный
- `dateChanged` (стр. 1123) — локальный
- `timeChanged` (стр. 1124) — локальный
- `validationErrors` (стр. 1126) — локальный
- `handleDeleteBooking` (стр. 1180) — локальный
- `name` (стр. 1182) — локальный
- `handleAssignWorkers` (стр. 1189) — локальный
- `updatedWorkers` (стр. 1191) — локальный
- `w` (стр. 1192) — локальный
- `handleSaveNewBooking` (стр. 1200) — локальный

### frontend/src/app/components/admin/ContentEditor.tsx (420 строк)

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
- `next` (стр. 302) — локальный

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

### frontend/src/app/components/landing/Hero.tsx (114 строк)

- `API_BASE` (стр. 4) — локальный
- `resolveImageUrl` (стр. 6) — локальный
- `STAT_ICONS` (стр. 29) — локальный
- `scrollToSection` (стр. 31) — локальный
- `id` (стр. 32) — локальный
- `Hero` (стр. 36)
- `h` (стр. 37) — локальный
- `bg` (стр. 38) — локальный
- `stats` (стр. 39) — локальный
- `Icon` (стр. 90) — локальный

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

### frontend/src/app/components/owner/DepositPanel.tsx (1142 строк)

- `toISODate` (стр. 22) — локальный
- `parsed` (стр. 23) — локальный
- `y` (стр. 25) — локальный
- `m` (стр. 26) — локальный
- `d` (стр. 27) — локальный
- `TIME_SLOTS` (стр. 31) — локальный
- `h` (стр. 32) — локальный
- `m` (стр. 33) — локальный
- `MONTH_LABELS` (стр. 37) — локальный
- `PLAN_OPTIONS` (стр. 39) — локальный
- `TXN_TYPE_OPTIONS` (стр. 46) — локальный
- `monthKeyToLabel` (стр. 54) — локальный
- `match` (стр. 55) — локальный
- `monthIndex` (стр. 57) — локальный
- `currentMonthKey` (стр. 61) — локальный
- `now` (стр. 62) — локальный
- `txnMonthOf` (стр. 66) — локальный
- `parts` (стр. 67) — локальный
- `formatMoney` (стр. 71) — локальный
- `planLabel` (стр. 75) — локальный
- `fieldLabel` (стр. 79) — локальный
- `BalanceSparkline` (стр. 83) — локальный
- `points` (стр. 84) — локальный
- `sorted` (стр. 86) — локальный
- `values` (стр. 87) — локальный
- `min` (стр. 88) — локальный
- `max` (стр. 89) — локальный
- `range` (стр. 90) — локальный
- `w` (стр. 91) — локальный
- `h` (стр. 92) — локальный
- `coords` (стр. 99) — локальный
- `Sheet` (стр. 123) — локальный
- `DepositPanel` (стр. 153)
- `glass` (стр. 171) — локальный
- `sub` (стр. 172) — локальный
- `primary` (стр. 173) — локальный
- `accent` (стр. 174) — локальный
- `danger` (стр. 175) — локальный
- `inputCls` (стр. 176) — локальный
- `selectCls` (стр. 177) — локальный
- `loadSummaries` (стр. 212) — локальный
- `loadOverview` (стр. 224) — локальный
- `timer` (стр. 239) — локальный
- `selectedClient` (стр. 243) — локальный
- `workerOptions` (стр. 248) — локальный
- `eligibleClients` (стр. 250) — локальный
- `monthOptions` (стр. 252) — локальный
- `months` (стр. 253) — локальный
- `filteredTxns` (стр. 258) — локальный
- `openClient` (стр. 267) — локальный
- `runAndRefresh` (стр. 274) — локальный
- `handleActivate` (стр. 286) — локальный
- `handleTopup` (стр. 312) — локальный
- `handleAdjust` (стр. 322) — локальный
- `handleRecordWash` (стр. 331) — локальный
- `selectedWorker` (стр. 341) — локальный
- `handleSettle` (стр. 365) — локальный
- `handleExportOne` (стр. 370) — локальный
- `fileName` (стр. 375) — локальный
- `delivery` (стр. 377) — локальный
- `msg` (стр. 380) — локальный
- `delivery` (стр. 385) — локальный
- `handleExportAll` (стр. 393) — локальный
- `fileName` (стр. 397) — локальный
- `delivery` (стр. 399) — локальный
- `msg` (стр. 402) — локальный
- `delivery` (стр. 407) — локальный
- `openActivateFor` (стр. 415) — локальный
- `openWashFor` (стр. 428) — локальный
- `openTopupFor` (стр. 439) — локальный
- `val` (стр. 1112) — локальный

### frontend/src/app/components/owner/OwnerApp.tsx (11324 строк)

- `EXPENSE_CATEGORIES` (стр. 219) — локальный
- `STOCK_UNITS` (стр. 220) — локальный
- `SERVICE_TYPE_OPTIONS` (стр. 221) — локальный
- `ownerBookingStatusRequiresScheduledSlot` (стр. 232) — локальный
- `employeeRoleLabel` (стр. 235) — локальный
- `ownerServiceResourceGroup` (стр. 241) — локальный
- `ownerDefaultBoxForService` (стр. 245) — локальный
- `rg` (стр. 246) — локальный
- `match` (стр. 247) — локальный
- `ownerBookingBoxes` (стр. 251) — локальный
- `ownerLocationLabel` (стр. 259) — локальный
- `parseOwnerBookingMinutes` (стр. 263) — локальный
- `match` (стр. 264) — локальный
- `hours` (стр. 266) — локальный
- `minutes` (стр. 267) — локальный
- `OWNER_CALENDAR_WEEKDAYS` (стр. 272) — локальный
- `OWNER_CALENDAR_MONTHS` (стр. 273) — локальный
- `OWNER_CALENDAR_DEFAULT_OPEN` (стр. 277) — локальный
- `OWNER_CALENDAR_DEFAULT_CLOSE` (стр. 278) — локальный
- `ownerScheduleTimeToMinutes` (стр. 280) — локальный
- `ownerMonthTitle` (стр. 284) — локальный
- `ownerBuildMonthCells` (стр. 288) — локальный
- `year` (стр. 289) — локальный
- `month` (стр. 290) — локальный
- `first` (стр. 291) — локальный
- `offset` (стр. 292) — локальный
- `daysInMonth` (стр. 293) — локальный
- `date` (стр. 299) — локальный
- `ownerCalendarDayHours` (стр. 308) — локальный
- `parsedDate` (стр. 309) — локальный
- `daySchedule` (стр. 313) — локальный
- `open` (стр. 317) — локальный
- `close` (стр. 318) — локальный
- `OWNER_CALENDAR_LOAD_COLORS` (стр. 322) — локальный
- `ownerCalendarLoadTone` (стр. 328) — локальный
- `ratio` (стр. 330) — локальный
- `ownerGroupBookingsByHour` (стр. 340) — локальный
- `timed` (стр. 345) — локальный
- `hourLabel` (стр. 348) — локальный
- `slotEnd` (стр. 349) — локальный
- `slotBookings` (стр. 350) — локальный
- `start` (стр. 352) — локальный
- `ownerOpenBookingDetail` (стр. 364) — локальный
- `ownerBookingBlocksBox` (стр. 373) — локальный
- `nextStart` (стр. 376) — локальный
- `existingStart` (стр. 377) — локальный
- `nextEnd` (стр. 379) — локальный
- `existingEnd` (стр. 380) — локальный
- `ownerPickDefaultBookingBox` (стр. 384) — локальный
- `resourceGroup` (стр. 393) — локальный
- `preferred` (стр. 394) — локальный
- `fallback` (стр. 395) — локальный
- `candidates` (стр. 396) — локальный
- `serviceResourceGroupForCategory` (стр. 401) — локальный
- `numberInputValue` (стр. 405) — локальный
- `ORDER_STEPS` (стр. 419) — локальный
- `serviceMoneySummary` (стр. 426) — локальный
- `piggyTargetLabel` (стр. 427) — локальный
- `master` (стр. 431) — локальный
- `piggy` (стр. 436) — локальный
- `owners` (стр. 443) — локальный
- `previewServiceSplit` (стр. 451) — локальный
- `materials` (стр. 456) — локальный
- `net` (стр. 457) — локальный
- `order` (стр. 458) — локальный
- `pipeline` (стр. 459) — локальный
- `piggyType` (стр. 460) — локальный
- `computeMaster` (стр. 467) — локальный
- `computePiggy` (стр. 476) — локальный
- `m` (стр. 483) — локальный
- `p` (стр. 485) — локальный
- `afterMasterPiggy` (стр. 487) — локальный
- `m` (стр. 506) — локальный
- `p` (стр. 510) — локальный
- `isLast` (стр. 514) — локальный
- `claimed` (стр. 515) — локальный
- `ownerPaymentLabel` (стр. 534) — локальный
- `normalizeOwnerPhoneSearchValue` (стр. 541) — локальный
- `numberFromInput` (стр. 547) — локальный
- `toISODate` (стр. 551) — локальный
- `parsed` (стр. 552) — локальный
- `y` (стр. 554) — локальный
- `m` (стр. 555) — локальный
- `d` (стр. 556) — локальный
- `TIME_SLOTS` (стр. 560) — локальный
- `h` (стр. 561) — локальный
- `m` (стр. 562) — локальный
- `OwnerApp` (стр. 569)
- `isAccountant` (стр. 646) — локальный
- `modalMaxHeight` (стр. 647) — локальный
- `financeRoleTitle` (стр. 648) — локальный
- `financeNotificationRole` (стр. 649) — локальный
- `__nowRpt` (стр. 716) — локальный
- `__dowRpt` (стр. 717) — локальный
- `__monRpt` (стр. 718) — локальный
- `__sunRpt` (стр. 719) — локальный
- `parentCategories` (стр. 740) — локальный
- `today` (стр. 873) — локальный
- `adminShiftPhotoUrlsRef` (стр. 899) — локальный
- `clearOwnerResetFlow` (стр. 986) — локальный
- `nextBoxes` (стр. 1009) — локальный
- `params` (стр. 1043) — локальный
- `params` (стр. 1058) — локальный
- `handlePayOwnerSalary` (стр. 1069) — локальный
- `amount` (стр. 1070) — локальный
- `res` (стр. 1074) — локальный
- `updated` (стр. 1083) — локальный
- `loadPiggyBank` (стр. 1091) — локальный
- `params` (стр. 1095) — локальный
- `qs` (стр. 1098) — локальный
- `data` (стр. 1100) — локальный
- `loadWallet` (стр. 1108) — локальный
- `params` (стр. 1112) — локальный
- `qs` (стр. 1115) — локальный
- `data` (стр. 1117) — локальный
- `handlePiggyWithdraw` (стр. 1123) — локальный
- `f` (стр. 1124) — локальный
- `syncCountdown` (стр. 1190) — локальный
- `diffMs` (стр. 1191) — локальный
- `intervalId` (стр. 1196) — локальный
- `ownerNotifications` (стр. 1221) — локальный
- `unreadCount` (стр. 1222) — локальный
- `completedBookings` (стр. 1223) — локальный
- `todayBookings` (стр. 1224) — локальный
- `latestShiftChecklists` (стр. 1225) — локальный
- `latestAdminShiftInspections` (стр. 1226) — локальный
- `latestAdminShiftInspectionKey` (стр. 1227) — локальный
- `activeIds` (стр. 1243) — локальный
- `currentPhotoUrls` (стр. 1256) — локальный
- `missing` (стр. 1257) — локальный
- `next` (стр. 1269) — локальный
- `vv` (стр. 1291) — локальный
- `handler` (стр. 1293) — локальный
- `el` (стр. 1294) — локальный
- `bookingFormBoxes` (стр. 1306) — локальный
- `bookingFormLocationLabel` (стр. 1307) — локальный
- `editBookingLocationLabel` (стр. 1308) — локальный
- `todayRevenue` (стр. 1309) — локальный
- `now` (стр. 1312) — локальный
- `dayOfWeek` (стр. 1313) — локальный
- `diffToSaturday` (стр. 1314) — локальный
- `weekSaturday` (стр. 1315) — локальный
- `weekFriday` (стр. 1318) — локальный
- `isDateInWeek` (стр. 1321) — локальный
- `d` (стр. 1322) — локальный
- `weeklyCompletedBookings` (стр. 1325) — локальный
- `weeklyBookings` (стр. 1326) — локальный
- `weeklyExpenses` (стр. 1327) — локальный
- `weeklyIncomes` (стр. 1328) — локальный
- `totalRevenue` (стр. 1329) — локальный
- `totalExpenses` (стр. 1330) — локальный
- `totalIncomes` (стр. 1331) — локальный
- `profit` (стр. 1332) — локальный
- `averageCheck` (стр. 1333) — локальный
- `activeBookings` (стр. 1334) — локальный
- `pipelineCounts` (стр. 1335) — локальный
- `totalStockValue` (стр. 1342) — локальный
- `washRevenue` (стр. 1345) — локальный
- `detailingRevenue` (стр. 1348) — локальный
- `washExpenses` (стр. 1351) — локальный
- `detailingExpenses` (стр. 1354) — локальный
- `washIncomes` (стр. 1357) — локальный
- `detailingIncomes` (стр. 1360) — локальный
- `resourceGroupLabel` (стр. 1364) — локальный
- `payrollRows` (стр. 1369) — локальный
- `workerPenalties` (стр. 1370) — локальный
- `complaintState` (стр. 1371) — локальный
- `payrollTotal` (стр. 1379) — локальный
- `formatComplaintDate` (стр. 1380) — локальный
- `resetPreviewRows` (стр. 1381) — локальный
- `resetExecuteLocked` (стр. 1395) — локальный
- `glass` (стр. 1397) — локальный
- `bg` (стр. 1398) — локальный
- `text` (стр. 1399) — локальный
- `sub` (стр. 1400) — локальный
- `primary` (стр. 1401) — локальный
- `accent` (стр. 1402) — локальный
- `surface` (стр. 1403) — локальный
- `inputCls` (стр. 1404) — локальный
- `selectCls` (стр. 1405) — локальный
- `tooltipStyle` (стр. 1406) — локальный
- `createDraftId` (стр. 1407) — локальный
- `handleAddBoxDraft` (стр. 1409) — локальный
- `handleRemoveBoxDraft` (стр. 1423) — локальный
- `handleAddServiceDraft` (стр. 1427) — локальный
- `handleRemoveServiceDraft` (стр. 1456) — локальный
- `handleHireWorker` (стр. 1460) — локальный
- `name` (стр. 1461) — локальный
- `login` (стр. 1462) — локальный
- `password` (стр. 1463) — локальный
- `employeeLabel` (стр. 1464) — локальный
- `handleSaveSettings` (стр. 1507) — локальный
- `wantsPasswordChange` (стр. 1509) — локальный
- `historyPeriodDates` (стр. 1558) — локальный
- `today` (стр. 1559) — локальный
- `from` (стр. 1562) — локальный
- `offset` (стр. 1563) — локальный
- `from` (стр. 1568) — локальный
- `fetchBookingsHistory` (стр. 1575) — локальный
- `params` (стр. 1578) — локальный

### frontend/src/app/components/shared/AttendanceTable.tsx (199 строк)

- `AttendanceTable` (стр. 34)
- `fetchData` (стр. 41) — локальный
- `result` (стр. 52) — локальный
- `result` (стр. 56) — локальный

### frontend/src/app/components/shared/ServiceSearchSelect.tsx (128 строк)

- `ServiceSearchSelect` (стр. 18)
- `containerRef` (стр. 32) — локальный
- `inputRef` (стр. 33) — локальный
- `selectedService` (стр. 35) — локальный
- `filtered` (стр. 37) — локальный
- `handleClickOutside` (стр. 42) — локальный
- `handleSelect` (стр. 51) — локальный
- `handleInputChange` (стр. 57) — локальный
- `handleInputFocus` (стр. 62) — локальный
- `CheckIcon` (стр. 122) — локальный

### frontend/src/app/components/worker/WorkerApp.tsx (1659 строк)

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
- `params` (стр. 342) — локальный
- `loadCalendar` (стр. 353) — локальный
- `timer` (стр. 369) — локальный
- `params` (стр. 371) — локальный
- `myNotifications` (стр. 381) — локальный
- `unreadCount` (стр. 382) — локальный
- `allTasks` (стр. 384) — локальный
- `todayTasks` (стр. 387) — локальный
- `myEarnings` (стр. 389) — локальный
- `w` (стр. 392) — локальный
- `earned` (стр. 393) — локальный
- `totalEarned` (стр. 400) — локальный
- `payrollSummary` (стр. 401) — локальный
- `earnedForDisplay` (стр. 402) — локальный
- `myPenalties` (стр. 403) — локальный
- `complaintState` (стр. 404) — локальный
- `payoutAfterPenalties` (стр. 405) — локальный
- `allMyTasks` (стр. 407) — локальный
- `completedCount` (стр. 408) — локальный
- `avgCheck` (стр. 409) — локальный
- `chemistryItems` (стр. 410) — локальный
- `formatTimer` (стр. 418) — локальный
- `glass` (стр. 420) — локальный
- `bg` (стр. 421) — локальный
- `text` (стр. 422) — локальный
- `sub` (стр. 423) — локальный
- `primary` (стр. 424) — локальный
- `accent` (стр. 425) — локальный
- `surface` (стр. 426) — локальный
- `inputCls` (стр. 427) — локальный
- `formatComplaintDate` (стр. 428) — локальный
- `handleStartTask` (стр. 430) — локальный
- `openFinishModal` (стр. 437) — локальный
- `handleFinish` (стр. 446) — локальный
- `nextNote` (стр. 452) — локальный
- `handleSaveProfile` (стр. 490) — локальный
- `handleSubmitShiftChecklist` (стр. 496) — локальный
- `saved` (стр. 499) — локальный
- `handleSavePass` (стр. 514) — локальный
- `handleGenerateTelegramCode` (стр. 541) — локальный
- `handleSaveNotifications` (стр. 545) — локальный
- `headerTitle` (стр. 551) — локальный
- `isMyService` (стр. 617) — локальный
- `dayTasks` (стр. 716) — локальный
- `assignedToMe` (стр. 779) — локальный
- `shiftPay` (стр. 924) — локальный
- `bonuses` (стр. 925) — локальный
- `advances` (стр. 926) — локальный
- `deductions` (стр. 927) — локальный
- `adjustments` (стр. 928) — локальный
- `totalAccrued` (стр. 929) — локальный
- `totalDeducted` (стр. 930) — локальный
- `w` (стр. 1314) — локальный
- `earned` (стр. 1315) — локальный
- `paymentLabel` (стр. 1318) — локальный

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

### frontend/src/app/context/AppContext.tsx (1983 строк)

- `EMPTY_CONTENT` (стр. 886)
- `timeToMinutes` (стр. 908) — локальный
- `minutesToTime` (стр. 915) — локальный
- `hours` (стр. 916) — локальный
- `minutes` (стр. 917) — локальный
- `buildTimeSlots` (стр. 921) — локальный
- `timeRangesOverlap` (стр. 929) — локальный
- `AppContext` (стр. 933) — локальный
- `normalizeWorker` (стр. 935) — локальный
- `normalizeBootstrap` (стр. 949) — локальный
- `AppProvider` (стр. 973)
- `upcomingDates` (стр. 997) — локальный
- `todayLabel` (стр. 998) — локальный
- `tomorrowLabel` (стр. 999) — локальный
- `applyBootstrap` (стр. 1001) — локальный
- `normalized` (стр. 1002) — локальный
- `refreshBootstrap` (стр. 1030) — локальный
- `bootstrap` (стр. 1031) — локальный
- `handleError` (стр. 1035) — локальный
- `message` (стр. 1036) — локальный
- `restoreSession` (стр. 1041) — локальный
- `bootstrap` (стр. 1043) — локальный
- `refreshActiveSessions` (стр. 1052) — локальный
- `applyTelegramTheme` (стр. 1056) — локальный
- `root` (стр. 1058) — локальный
- `theme` (стр. 1059) — локальный
- `cssVar` (стр. 1062) — локальный
- `tg` (стр. 1069) — локальный
- `logout` (стр. 1086) — локальный
- `loginClient` (стр. 1110) — локальный
- `bootstrap` (стр. 1114) — локальный
- `linkStaff` (стр. 1128) — локальный
- `bootstrap` (стр. 1132) — локальный
- `switchRole` (стр. 1146) — локальный
- `bootstrap` (стр. 1150) — локальный
- `updateClientProfile` (стр. 1164) — локальный
- `payload` (стр. 1165) — локальный
- `saved` (стр. 1166) — локальный
- `remindAdminAboutInactiveClients` (стр. 1170) — локальный
- `response` (стр. 1171) — локальный
- `addClient` (стр. 1175) — локальный
- `created` (стр. 1176) — локальный
- `normalized` (стр. 1177) — локальный
- `updateClientCard` (стр. 1182) — локальный
- `saved` (стр. 1183) — локальный
- `normalized` (стр. 1184) — локальный
- `deleteClient` (стр. 1188) — локальный
- `listDepositClients` (стр. 1193) — локальный
- `items` (стр. 1194) — локальный
- `getDepositOverview` (стр. 1198) — локальный
- `overview` (стр. 1199) — локальный
- `updateDepositSubscription` (стр. 1207) — локальный
- `overview` (стр. 1208) — локальный
- `depositTopUp` (стр. 1216) — локальный
- `txn` (стр. 1217) — локальный
- `depositAdjust` (стр. 1221) — локальный
- `overview` (стр. 1222) — локальный
- `depositRecordWash` (стр. 1230) — локальный
- `overview` (стр. 1231) — локальный
- `depositSettleMonth` (стр. 1239) — локальный
- `overview` (стр. 1240) — локальный
- `downloadDepositExport` (стр. 1248) — локальный
- `downloadDepositExportAll` (стр. 1252) — локальный
- `sendDepositExport` (стр. 1256) — локальный
- `sendDepositExportAll` (стр. 1260) — локальный
- `addBooking` (стр. 1264) — локальный
- `created` (стр. 1265) — локальный
- `existingClient` (стр. 1285) — локальный
- `nextClient` (стр. 1286) — локальный
- `updateBooking` (стр. 1310) — локальный
- `updated` (стр. 1311) — локальный
- `deleteBooking` (стр. 1337) — локальный
- `addBookingService` (стр. 1342) — локальный
- `updated` (стр. 1343) — локальный
- `addBookingAdditionalService` (стр. 1363) — локальный
- `updated` (стр. 1364) — локальный
- `updateBookingAdditionalService` (стр. 1384) — локальный
- `updated` (стр. 1385) — локальный
- `removeBookingAdditionalService` (стр. 1405) — локальный
- `updated` (стр. 1406) — локальный
- `addNotification` (стр. 1426) — локальный
- `created` (стр. 1427) — локальный
- `markNotificationRead` (стр. 1446) — локальный
- `markAllNotificationsRead` (стр. 1451) — локальный
- `addStockItem` (стр. 1465) — локальный
- `created` (стр. 1466) — локальный
- `updateStockItem` (стр. 1470) — локальный
- `updated` (стр. 1471) — локальный
- `writeOffStock` (стр. 1475) — локальный
- `updated` (стр. 1476) — локальный
- `getWriteOffHistory` (стр. 1480) — локальный
- `deleteStockItem` (стр. 1484) — локальный
- `addStockCategory` (стр. 1489) — локальный
- `created` (стр. 1490) — локальный
- `updateStockCategory` (стр. 1494) — локальный
- `updated` (стр. 1495) — локальный
- `deleteStockCategory` (стр. 1499) — локальный
- `addExpense` (стр. 1508) — локальный
- `created` (стр. 1509) — локальный
- `addIncome` (стр. 1513) — локальный
- `created` (стр. 1514) — локальный
- `updateExpense` (стр. 1518) — локальный
- `updated` (стр. 1519) — локальный
- `updateIncome` (стр. 1523) — локальный
- `updated` (стр. 1524) — локальный
- `addPenalty` (стр. 1528) — локальный
- `revokePenalty` (стр. 1533) — локальный
- `revokeAllPenalties` (стр. 1538) — локальный
- `createTelegramLinkCode` (стр. 1543) — локальный
- `created` (стр. 1544) — локальный
- `downloadOwnerExport` (стр. 1548) — локальный
- `fallback` (стр. 1549) — локальный
- `qs` (стр. 1552) — локальный
- `qstr` (стр. 1556) — локальный
- `sendOwnerExportToTelegram` (стр. 1562) — локальный
- `qs` (стр. 1565) — локальный
- `qstr` (стр. 1569) — локальный
- `sendOwnerSummaryReport` (стр. 1575) — локальный
- `response` (стр. 1576) — локальный
- `dispatchOwnerReminders` (стр. 1580) — локальный
- `saveServices` (стр. 1590) — локальный
- `saveBoxes` (стр. 1595) — локальный
- `saveSchedule` (стр. 1599) — локальный
- `saveAdminProfile` (стр. 1603) — локальный
- `saved` (стр. 1604) — локальный
- `saveAdminNotificationSettings` (стр. 1608) — локальный
- `saved` (стр. 1609) — локальный
- `saveWorkerProfile` (стр. 1613) — локальный
- `saved` (стр. 1614) — локальный
- `normalized` (стр. 1615) — локальный
- `saveWorkerNotificationSettings` (стр. 1622) — локальный
- `saved` (стр. 1623) — локальный
- `saveOwnerCompany` (стр. 1630) — локальный
- `saved` (стр. 1631) — локальный
- `saveOwnerNotificationSettings` (стр. 1635) — локальный
- `saved` (стр. 1636) — локальный
- `saveOwnerIntegrations` (стр. 1640) — локальный
- `saved` (стр. 1641) — локальный
- `saveOwnerSecurity` (стр. 1645) — локальный
- `saved` (стр. 1646) — локальный
- `saveWorkerSettings` (стр. 1650) — локальный
- `saved` (стр. 1651) — локальный
- `saveAdminWorkerPayroll` (стр. 1655) — локальный
- `saved` (стр. 1656) — локальный
- `normalized` (стр. 1657) — локальный
- `nextWorker` (стр. 1659) — локальный
- `saveContent` (стр. 1664) — локальный
- `saved` (стр. 1665) — локальный
- `createPayrollEntry` (стр. 1669) — локальный
- `checkConsent` (стр. 1674) — локальный
- `response` (стр. 1675) — локальный
- `submitConsent` (стр. 1679) — локальный
- `listShiftChecklists` (стр. 1683) — локальный
- `entries` (стр. 1684) — локальный
- `submitShiftChecklist` (стр. 1688) — локальный
- `entry` (стр. 1689) — локальный
- `listAdminShiftInspections` (стр. 1696) — локальный
- `entries` (стр. 1697) — локальный
- `submitAdminShiftInspection` (стр. 1705) — локальный
- `entry` (стр. 1712) — локальный
- `hireWorker` (стр. 1723) — локальный
- `created` (стр. 1724) — локальный
- `normalized` (стр. 1725) — локальный
- `fireWorker` (стр. 1735) — локальный
- `resetWorkerPassword` (стр. 1740) — локальный
- `changePassword` (стр. 1747) — локальный
- `requestOwnerDatabaseReset` (стр. 1754) — локальный
- `response` (стр. 1755) — локальный
- `approveOwnerDatabaseReset` (стр. 1772) — локальный
- `response` (стр. 1773) — локальный
- `executeOwnerDatabaseReset` (стр. 1789) — локальный
- `response` (стр. 1790) — локальный
- `getTimeSlotsForDate` (стр. 1798) — локальный
- `parsedDate` (стр. 1799) — локальный
- `day` (стр. 1801) — локальный
- `openMinutes` (стр. 1804) — локальный
- `closeMinutes` (стр. 1805) — локальный
- `durationMinutes` (стр. 1808) — локальный
- `scheduleSlots` (стр. 1809) — локальный
- `candidateBoxes` (стр. 1810) — локальный
- `boxNames` (стр. 1815) — локальный
- `slotStart` (стр. 1817) — локальный
- `slotEnd` (стр. 1819) — локальный
- `bookingStart` (стр. 1826) — локальный
- `getBookingAvailabilityForDate` (стр. 1833) — локальный
- `durationMinutes` (стр. 1834) — локальный
- `params` (стр. 1836) — локальный
- `response` (стр. 1846) — локальный
- `useApp` (стр. 1975)
- `ctx` (стр. 1976) — локальный
- `getWorkerNotificationSettings` (стр. 1981)

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

- `backend/app/main.py` (2026-08-07 16:50)
- `backend/tests/test_deposit.py` (2026-08-07 16:47)
- `frontend/src/app/components/owner/DepositPanel.tsx` (2026-08-07 16:38)
- `frontend/src/app/context/AppContext.tsx` (2026-08-07 16:37)
- `backend/app/schemas.py` (2026-08-07 16:36)
- `backend/app/exports.py` (2026-08-07 16:19)
- `backend/app/models.py` (2026-08-07 16:16)
- `frontend/src/app/components/owner/OwnerApp.tsx` (2026-08-07 15:47)
- `frontend/src/app/components/admin/AdminApp.tsx` (2026-08-07 15:47)
- `frontend/src/app/components/client/ClientApp.tsx` (2026-08-07 15:47)
- `backend/tests/test_content.py` (2026-08-07 15:36)
- `frontend/src/app/components/admin/ContentEditor.tsx` (2026-08-07 15:29)
- `frontend/src/app/components/landing/Hero.tsx` (2026-08-07 15:29)
- `frontend/src/app/App.tsx` (2026-08-07 13:22)
- `backend/tests/test_booking_money_split.py` (2026-08-07 12:41)
