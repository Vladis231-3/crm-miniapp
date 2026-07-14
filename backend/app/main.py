from __future__ import annotations

import hmac as hmac_mod
import logging
import secrets
import base64
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from threading import Thread
from typing import Any
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy import delete as sa_delete, inspect, or_, select, func
from sqlalchemy.orm import Session, joinedload
import time as time_module

from .complaints import (
    COMPLAINT_DURATION_DAYS,
    COMPLAINT_PERCENT_DEDUCTION,
    COMPLAINT_THRESHOLD,
    adjusted_booking_percent,
    clamp_worker_percent,
    complaint_active_until,
    complaint_status_for_percent,
)
from .config import get_settings, PERSISTENT_DATA_DIR
from .database import Base, engine, get_db
from .exports import (
    GeneratedExport,
    OwnerSummaryReport,
    build_owner_export,
    build_owner_summary_export,
    build_owner_summary_report,
)
from .models import (
    AppSetting,
    Booking,
    BookingWorker,
    Box,
    Client,
    DataConsent,
    Expense,
    Income,
    Notification,
    Penalty,
    PayrollEntry,
    PiggyBankTransaction,
    ScheduleEntry,
    Service,
    StaffUser,
    StockItem,
    TelegramLinkCode,
    UploadedFile,
    WeeklyArchive,
)
from .schemas import (
    AdminNotificationSettings,
    AdminShiftInspectionPayload,
    AdminShiftInspectionReviewRequest,
    AdminShiftInspectionSubmitRequest,
    AdminProfilePayload,
    BookingAvailabilityPayload,
    BookingAvailabilitySlotPayload,
    BookingCreateRequest,
    BookingPayload,
    BookingServiceItem,
    BookingUpdateRequest,
    BookingWorkerPayload,
    AddBookingServiceRequest,
    BootstrapPayload,
    BoxPayload,
    ChangePasswordRequest,
    ClientRegisterRequest,
    ConsentCheckResponse,
    ConsentRecordPayload,
    StaffLinkRequest,
    ClientCreateRequest,
    ClientCardUpdateRequest,
    ClientProfileInput,
    ClientProfilePayload,
    ClientSummaryPayload,
    ClientVehiclePayload,
    EmployeeSettingPayload,
    ExpenseCreateRequest,
    ExpensePayload,
    ExpenseUpdateRequest,
    GenericMessage,
    IncomeCreateRequest,
    IncomePayload,
    IncomeUpdateRequest,
    NotificationCreateRequest,
    NotificationPayload,
    OwnerCompanyPayload,
    OwnerDatabaseResetApprovePayload,
    OwnerDatabaseResetApproveRequest,
    OwnerDatabaseResetExecutePayload,
    OwnerDatabaseResetExecuteRequest,
    OwnerReminderDispatchPayload,
    OwnerReminderDispatchRequest,
    OwnerDatabaseResetPreviewPayload,
    OwnerDatabaseResetStartPayload,
    OwnerDatabaseResetStartRequest,
    OwnerExportDeliveryPayload,
    OwnerIntegrationsPayload,
    OwnerNotificationSettings,
    AuthSessionPayload,
    OwnerSecurityPayload,
    PiggyBankDetailingBreakdown,
    PiggyBankResponse,
    PiggyBankTransactionPayload,
    PiggyBankWashBreakdown,
    PiggyBankWithdrawRequest,
    ReadAllNotificationsRequest,
    SchedulePayload,
    ServicePayload,
    SessionPayload,
    ShiftChecklistPayload,
    ShiftChecklistItemPayload,
    ShiftChecklistSubmitRequest,
    SettingsBundlePayload,
    StockItemCreateRequest,
    SwitchRoleRequest,
    StockItemPayload,
    StockItemUpdateRequest,
    StockWriteOffRequest,
    normalize_plate,
    normalize_phone,
    normalize_phone_digits,
    normalize_vehicle_name,
    PenaltyCreateRequest,
    PenaltyPayload,
    PayrollEntryCreateRequest,
    PayrollEntryPayload,
    PayrollEntryUpdateRequest,
    PaySalaryRequest,
    PaySalaryResponse,
    SalaryBookingItem,
    SalaryDetailResponse,
    SalaryPayoutItem,
    TelegramDeliveryResult,
    TelegramBroadcastPayload,
    TelegramLinkCodePayload,
    ShiftAttendancePayload,
    WorkerNotificationSettings,
    WorkerPayrollBookingPayload,
    WorkerPayrollSummaryPayload,
    WorkerPayload,
    WorkerCreateRequest,
    WorkerProfilePayload,
    ContentPayload,
    ContentAboutPayload,
    ContentServicePayload,
    ContentWorksPayload,
    ContentHeroPayload,
    ContactPayload,
    ResetPasswordRequest,
    WalletResponse,
    WeeklyArchivePayload,
)
from .security import (
    hash_one_time_code,
    hash_password,
    validate_telegram_init_data,
    verify_one_time_code,
    verify_password,
)
from .seed import seed_database
from .telegram_linking import create_link_code, ensure_staff_chat_id_available

try:
    from backend.bot import (
        process_telegram_update,
        run_polling,
        send_telegram_document,
        send_telegram_message,
        send_telegram_photo,
        sync_telegram_webhook,
        telegram_webhook_secret,
    )
except ImportError:
    from bot import (
        process_telegram_update,
        run_polling,
        send_telegram_document,
        send_telegram_message,
        send_telegram_photo,
        sync_telegram_webhook,
        telegram_webhook_secret,
    )


settings = get_settings()
logger = logging.getLogger(__name__)


def _resolve_frontend_dist() -> Path:
    """Каталог собранного React-фронтенда.

    В обычном режиме — <project>/frontend/dist (родитель каталога app/).
    В frozen-режиме (PyInstaller bundle десктоп-приложения) фронт лежит рядом
    с исполняемым файлом в resources/frontend/dist.
    """
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS) / "frontend" / "dist"
    return Path(__file__).resolve().parents[2] / "frontend" / "dist"


frontend_dist = _resolve_frontend_dist()
frontend_assets = frontend_dist / "assets"
UPLOAD_DIR = PERSISTENT_DATA_DIR / "uploads"
try:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    logger.warning("Cannot create upload dir at %s", UPLOAD_DIR)
bot_thread: Thread | None = None
PRIMARY_OWNER_ID = "owner-primary"
PRIMARY_OWNER_LOGIN = "creator_owner"
SECONDARY_OWNER_ID = "owner-1"
# Жёстко зашитые владельцы, входящие по Telegram без пароля.
# Формат: (id записи в БД, login, telegram chat id).
# Эти аккаунты восстанавливаются на каждом старте бэка,
# поэтому их нельзя случайно отвязать/затереть через UI.
PERMANENT_TELEGRAM_OWNERS: tuple[tuple[str, str, str], ...] = (
    ("owner-tg-1768985608", "owner_tg_1", "1768985608"),
    ("owner-tg-476719812", "owner_tg_2", "476719812"),
)
OWNER_DATABASE_RESET_SETTING_KEY = "owner_database_reset"
BOOKING_REMINDER_STATE_KEY = "booking_reminder_dispatch_state"
RETURN_REMINDER_STATE_KEY = "return_visit_reminder_state"
SHIFT_CHECKLISTS_KEY = "worker_shift_checklists"
ADMIN_SHIFT_INSPECTIONS_KEY = "admin_shift_inspections"
ADMIN_SHIFT_OWNER_BOT_STATE_KEY = "admin_shift_owner_bot_state"
OWNER_DATABASE_RESET_CONFIRMATION_PHRASE = "ПОДТВЕРЖДАЮ ПОЛНУЮ ОЧИСТКУ"
OWNER_DATABASE_RESET_CODE_LIFETIME_MINUTES = 10
OWNER_DATABASE_RESET_DELAY_SECONDS = 10
BOOKING_ACTIVE_STATUSES = {"new", "confirmed", "scheduled", "in_progress"}
BOOKING_CLIENT_CANCELLABLE_STATUSES = {"new", "confirmed", "scheduled"}
BOOKING_REMINDER_ELIGIBLE_STATUSES = {"new", "confirmed", "scheduled"}
BOOKING_WORKER_MESSAGE_STATUSES = {
    "new",
    "confirmed",
    "scheduled",
    "in_progress",
    "admin_review",
}
DETAILING_REQUEST_TIME = "00:00"
DETAILING_REQUEST_BOX = "По согласованию"
DEFAULT_RESOURCE_GROUP = "wash"
DETAILING_RESOURCE_GROUP = "detailing"
WASH_RESOURCE_GROUP = "wash"
DETAILING_BOX_NAMES = ("Детейлинг 1", "Детейлинг 2", "Детейлинг 3")
DETAILING_BOX_NAME = DETAILING_BOX_NAMES[0]
WASH_BOX_NAMES = ("Бокс 1", "Бокс 2")
CLIENT_PHONE_VERIFICATIONS_KEY = "client_phone_verifications"
DEFAULT_ADMIN_SHIFT_SUPPLIES = [
    {
        "id": "preset-foam",
        "name": "Активная пена",
        "category": "Химия",
        "unit": "шт",
        "qty": 0,
    },
    {
        "id": "preset-shampoo",
        "name": "Автошампунь",
        "category": "Химия",
        "unit": "шт",
        "qty": 0,
    },
    {
        "id": "preset-microfiber",
        "name": "Микрофибра",
        "category": "Расходники",
        "unit": "шт",
        "qty": 0,
    },
    {
        "id": "preset-gloves",
        "name": "Перчатки",
        "category": "Расходники",
        "unit": "шт",
        "qty": 0,
    },
]

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Telegram-Bot-Api-Secret-Token"],
)

# Rate limiting for login attempts (simple in-memory store)
_login_attempts: dict[str, list[float]] = {}
_LOGIN_RATE_LIMIT_WINDOW = 60  # seconds
_LOGIN_MAX_ATTEMPTS = 10  # max attempts per window
_last_rate_limit_cleanup: float = 0.0
_RATE_LIMIT_CLEANUP_INTERVAL = 300  # clean every 5 minutes

def _check_rate_limit(ip: str) -> None:
    global _last_rate_limit_cleanup
    now = time_module.time()
    window_start = now - _LOGIN_RATE_LIMIT_WINDOW

    # Periodic cleanup of stale entries to prevent memory growth
    if now - _last_rate_limit_cleanup > _RATE_LIMIT_CLEANUP_INTERVAL:
        _last_rate_limit_cleanup = now
        stale_keys = [
            key for key, attempts in _login_attempts.items()
            if not attempts or all(t <= window_start for t in attempts)
        ]
        for key in stale_keys:
            del _login_attempts[key]

    # Clean old attempts for this IP
    if ip in _login_attempts:
        _login_attempts[ip] = [t for t in _login_attempts[ip] if t > window_start]

    if ip not in _login_attempts:
        _login_attempts[ip] = []

    if len(_login_attempts[ip]) >= _LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Слишком много запросов. Попробуйте позже.",
        )

    _login_attempts[ip].append(now)

if frontend_assets.exists():
    app.mount("/assets", StaticFiles(directory=frontend_assets), name="frontend-assets")


HTML_NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
}


@app.middleware("http")
async def serve_single_page_app(request: Request, call_next):
    path = request.url.path
    index_file = frontend_dist / "index.html"

    if request.method not in {"GET", "HEAD"}:
        return await call_next(request)
    if path.startswith("/api") or path in {"/docs", "/redoc", "/openapi.json"}:
        return await call_next(request)
    if path.startswith("/assets/"):
        return await call_next(request)
    if not frontend_dist.exists() or not index_file.exists():
        return await call_next(request)

    candidate = (frontend_dist / path.lstrip("/")).resolve()
    if candidate.is_file() and str(candidate).startswith(str(frontend_dist.resolve())):
        headers = HTML_NO_CACHE_HEADERS if candidate.suffix == ".html" else None
        return FileResponse(candidate, headers=headers)
    response = FileResponse(index_file, headers=HTML_NO_CACHE_HEADERS)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.on_event("startup")
def on_startup() -> None:
    global bot_thread
    Base.metadata.create_all(bind=engine)
    _apply_runtime_migrations()
    db = next(get_db())
    try:
        seed_database(db, include_demo_staff=settings.allow_demo_seed_data, is_production=settings.is_production)
        _ensure_owner_accounts(db)
        _repair_text_data(db)
        _normalize_worker_rules(db)
        _normalize_service_and_box_resources(db)
        db.commit()
    finally:
        db.close()

    if (
        settings.telegram_delivery_mode == "webhook"
        and settings.sync_telegram_webhook
        and settings.telegram_bot_token
        and settings.webapp_url
    ):
        try:
            username = sync_telegram_webhook(drop_pending_updates=False)
            logger.info(
                "Telegram webhook synced for @%s -> %s",
                username,
                settings.telegram_webhook_path,
            )
        except Exception:
            logger.exception("Failed to sync Telegram webhook")

    if (
        settings.telegram_delivery_mode == "polling"
        and settings.run_embedded_bot
        and settings.telegram_bot_token
        and settings.webapp_url
        and bot_thread is None
    ):
        bot_thread = Thread(target=run_polling, name="telegram-bot", daemon=True)
        bot_thread.start()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _request_ip(request: Request) -> str:
    # For rate limiting, prefer direct client IP to prevent X-Forwarded-For spoofing
    if request.client is not None and request.client.host:
        return request.client.host
    forwarded_for = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    if forwarded_for:
        return forwarded_for
    return ""


def _safe_text(value: Any) -> str:
    return value if isinstance(value, str) else ""


def _client_by_phone(db: Session, phone: str) -> Client | None:
    if not phone.strip():
        return None
    try:
        target_phone = normalize_phone_digits(phone)
    except ValueError:
        return None
    exact = db.scalar(select(Client).where(Client.phone == phone, Client.deleted_at.is_(None)))
    if exact is not None:
        return exact
    for client in db.scalars(select(Client).where(Client.phone != "", Client.deleted_at.is_(None))).all():
        try:
            if normalize_phone_digits(client.phone) == target_phone:
                return client
        except ValueError:
            continue
    return None


def _owner_query():
    return (
        select(StaffUser)
        .where(StaffUser.role == "owner")
        .order_by(StaffUser.created_at.asc(), StaffUser.id.asc())
    )


def _primary_owner(db: Session) -> StaffUser | None:
    return db.scalar(
        select(StaffUser)
        .where(StaffUser.role == "owner", StaffUser.is_primary_owner.is_(True))
        .order_by(StaffUser.created_at.asc(), StaffUser.id.asc())
    )


def _ensure_permanent_telegram_owners(db: Session) -> None:
    """Гарантирует, что владельцы с зашитыми Telegram ID существуют и активны.

    На каждом старте бэка:
    * снимает chat_id с любой другой записи, чтобы избежать конфликта уникальности;
    * создаёт запись владельца, если её нет;
    * принудительно восстанавливает role/active/telegram_chat_id, если запись есть
      (защита от случайного/ручного редактирования в UI).
    """
    for staff_id, login, chat_id in PERMANENT_TELEGRAM_OWNERS:
        # 1) Снимаем chat_id с любой другой записи, чтобы upsert не словил 409.
        squatters = db.scalars(
            select(StaffUser).where(
                StaffUser.telegram_chat_id == chat_id,
                StaffUser.id != staff_id,
            )
        ).all()
        for squatter in squatters:
            squatter.telegram_chat_id = ""

        # 2) Upsert самой записи владельца.
        owner = db.get(StaffUser, staff_id)
        if owner is None:
            owner = StaffUser(
                id=staff_id,
                login=login,
                password_hash=hash_password(secrets.token_urlsafe(32)),
                role="owner",
                name="Владелец",
                phone="",
                email="",
                city="",
                experience="",
                specialty="",
                about=(
                    "Владелец с зашитым Telegram ID. Входит в Mini App "
                    "напрямую через Telegram, пароль не используется."
                ),
                telegram_chat_id=chat_id,
                is_primary_owner=False,
                default_percent=0,
                salary_base=0,
                salary_per_shift=0,
                available=True,
                active=True,
            )
            db.add(owner)
        else:
            owner.login = login
            owner.role = "owner"
            owner.is_primary_owner = False
            owner.telegram_chat_id = chat_id
            owner.active = True
            owner.updated_at = _now()
        db.flush()


def _ensure_owner_accounts(db: Session) -> None:
    owners = db.scalars(_owner_query()).all()
    primary_owner = next((owner for owner in owners if owner.is_primary_owner), None)
    if primary_owner is None:
        primary_owner = StaffUser(
            id=PRIMARY_OWNER_ID,
            login=PRIMARY_OWNER_LOGIN,
            password_hash=hash_password(secrets.token_urlsafe(18)),
            role="owner",
            name="Создатель",
            phone="",
            email="",
            city="",
            experience="",
            specialty="",
            about="Главный владелец. Входит в Mini App напрямую через Telegram.",
            telegram_chat_id="",
            is_primary_owner=True,
            default_percent=0,
            salary_base=0,
            available=True,
            active=True,
        )
        db.add(primary_owner)
        db.flush()
        owners.append(primary_owner)
    else:
        primary_owner.is_primary_owner = True

    for owner in owners:
        if owner.id != primary_owner.id:
            owner.is_primary_owner = False

    if settings.allow_demo_seed_data and settings.is_production:
        logger.warning("ALLOW_DEMO_SEED_DATA is True in production — skipping demo owner creation for security")
    elif settings.allow_demo_seed_data and not any(
        owner.id != primary_owner.id for owner in owners
    ):
        db.add(
            StaffUser(
                id=SECONDARY_OWNER_ID,
                login="owner",
                password_hash=hash_password("owner"),
                role="owner",
                name="Владелец",
                phone="+7 (495) 000-00-00",
                email="info@atmosfera.ru",
                city="Москва",
                experience="12 лет",
                specialty="Управление бизнесом",
                about="Второй владелец, который работает в приложении по логину, паролю и 2FA.",
                telegram_chat_id="",
                is_primary_owner=False,
                default_percent=0,
                salary_base=0,
                available=True,
                active=True,
            )
        )
        db.flush()

    _ensure_permanent_telegram_owners(db)


def _device_label(user_agent: str) -> str:
    if "Telegram-Android" in user_agent:
        return "Telegram Android"
    if "Telegram-iOS" in user_agent:
        return "Telegram iPhone"
    if "iPhone" in user_agent:
        return "iPhone"
    if "Android" in user_agent:
        return "Android"
    if "Macintosh" in user_agent or "Mac OS X" in user_agent:
        return "Mac"
    if "Windows" in user_agent:
        return "Windows"
    if "Linux" in user_agent:
        return "Linux"
    return "Неизвестное устройство"


def _apply_runtime_migrations() -> None:
    def boolean_default_sql(value: bool) -> str:
        if engine.dialect.name == "postgresql":
            return "TRUE" if value else "FALSE"
        return "1" if value else "0"

    def ensure_postgres_varchar_length(
        table_name: str, column_name: str, minimum_length: int
    ) -> None:
        if engine.dialect.name != "postgresql":
            return
        column = next(
            (
                item
                for item in inspect(engine).get_columns(table_name)
                if item["name"] == column_name
            ),
            None,
        )
        if column is None:
            return
        current_length = getattr(column["type"], "length", None)
        if current_length is not None and current_length >= minimum_length:
            return
        with engine.begin() as connection:
            connection.exec_driver_sql(
                f"ALTER TABLE {table_name} ALTER COLUMN {column_name} TYPE VARCHAR({minimum_length})"
            )

    def ensure_postgres_text_column(table_name: str, column_name: str) -> None:
        if engine.dialect.name != "postgresql":
            return
        column = next(
            (
                item
                for item in inspect(engine).get_columns(table_name)
                if item["name"] == column_name
            ),
            None,
        )
        if column is None:
            return
        if column["type"].__class__.__name__.lower() == "text":
            return
        with engine.begin() as connection:
            connection.exec_driver_sql(
                f"ALTER TABLE {table_name} ALTER COLUMN {column_name} TYPE TEXT"
            )

    inspector = inspect(engine)
    client_columns = {column["name"] for column in inspector.get_columns("clients")}
    if "notes" not in client_columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE clients ADD COLUMN notes TEXT DEFAULT ''"
            )
    if "debt_balance" not in client_columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE clients ADD COLUMN debt_balance INTEGER DEFAULT 0"
            )
    if "admin_rating" not in client_columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE clients ADD COLUMN admin_rating INTEGER DEFAULT 0"
            )
    if "admin_note" not in client_columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE clients ADD COLUMN admin_note TEXT DEFAULT ''"
            )
    if "referral_source" not in client_columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE clients ADD COLUMN referral_source VARCHAR(64) DEFAULT ''"
            )
    if "clients" in inspector.get_table_names():
        ensure_postgres_varchar_length("clients", "id", 64)
    columns = {column["name"] for column in inspector.get_columns("staff_users")}
    if "staff_users" in inspector.get_table_names():
        ensure_postgres_varchar_length("staff_users", "id", 64)
    if "telegram_chat_id" not in columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE staff_users ADD COLUMN telegram_chat_id VARCHAR(64) DEFAULT ''"
            )
    elif "staff_users" in inspector.get_table_names():
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "UPDATE staff_users SET telegram_chat_id = '' WHERE telegram_chat_id IS NULL"
            )
    if "is_primary_owner" not in columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                f"ALTER TABLE staff_users ADD COLUMN is_primary_owner BOOLEAN DEFAULT {boolean_default_sql(False)}"
            )
    if "two_factor_code_hash" not in columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE staff_users ADD COLUMN two_factor_code_hash VARCHAR(128)"
            )
    if "two_factor_expires_at" not in columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE staff_users ADD COLUMN two_factor_expires_at TIMESTAMP"
            )
    if "failed_login_attempts" not in columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE staff_users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0"
            )
    if "login_locked_until" not in columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE staff_users ADD COLUMN login_locked_until TIMESTAMP"
            )
    if "extra_roles" not in columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE staff_users ADD COLUMN extra_roles TEXT DEFAULT '[]'"
            )
    if "telegram_link_codes" not in inspector.get_table_names():
        TelegramLinkCode.__table__.create(bind=engine)
    else:
        ensure_postgres_varchar_length("telegram_link_codes", "staff_id", 64)
    if "bookings" in inspector.get_table_names():
        ensure_postgres_varchar_length("bookings", "id", 64)
        ensure_postgres_varchar_length("bookings", "client_id", 64)
    service_columns = (
        {column["name"] for column in inspector.get_columns("services")}
        if "services" in inspector.get_table_names()
        else set()
    )
    if (
        "resource_group" not in service_columns
        and "services" in inspector.get_table_names()
    ):
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE services ADD COLUMN resource_group VARCHAR(64) DEFAULT 'wash'"
            )
    box_columns = (
        {column["name"] for column in inspector.get_columns("boxes")}
        if "boxes" in inspector.get_table_names()
        else set()
    )
    if "resource_group" not in box_columns and "boxes" in inspector.get_table_names():
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE boxes ADD COLUMN resource_group VARCHAR(64) DEFAULT 'wash'"
                    )
            if "schedule_entries" in inspector.get_table_names():
                sched_columns = {col["name"] for col in inspector.get_columns("schedule_entries")}
                if "day_index" in sched_columns:
                    from sqlalchemy import text
                    with engine.begin() as connection:
                        rows = connection.execute(text("SELECT day_index, day_label FROM schedule_entries")).fetchall()
                        index_to_label = {row[0]: row[1] for row in rows}
                        has_old_scheme = index_to_label.get(0) == "Пн"
                        if has_old_scheme:
                            connection.exec_driver_sql(
                                "UPDATE schedule_entries SET day_index = CASE day_index "
                                "WHEN 0 THEN 2 WHEN 1 THEN 3 WHEN 2 THEN 4 WHEN 3 THEN 5 "
                                "WHEN 4 THEN 6 WHEN 5 THEN 0 WHEN 6 THEN 1 END"
                            )
                            connection.exec_driver_sql(
                                "UPDATE schedule_entries SET day_label = CASE day_index "
                                "WHEN 0 THEN 'Сб' WHEN 1 THEN 'Вс' WHEN 2 THEN 'Пн' WHEN 3 THEN 'Вт' "
                                "WHEN 4 THEN 'Ср' WHEN 5 THEN 'Чт' WHEN 6 THEN 'Пт' END"
                            )

    # Миграция: columns.deleted_at для clients и bookings
    if "clients" in inspector.get_table_names():
        client_columns = {col["name"] for col in inspector.get_columns("clients")}
        if "deleted_at" not in client_columns:
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    "ALTER TABLE clients ADD COLUMN deleted_at TIMESTAMP"
                )
    if "bookings" in inspector.get_table_names():
        booking_columns = {col["name"] for col in inspector.get_columns("bookings")}
        if "deleted_at" not in booking_columns:
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    "ALTER TABLE bookings ADD COLUMN deleted_at TIMESTAMP"
                )
    if (
        "payment_settled" not in booking_columns
        and "bookings" in inspector.get_table_names()
    ):
        with engine.begin() as connection:
            connection.exec_driver_sql(
                f"ALTER TABLE bookings ADD COLUMN payment_settled BOOLEAN DEFAULT {boolean_default_sql(True)}"
            )
    if "services" not in booking_columns and "bookings" in inspector.get_table_names():
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE bookings ADD COLUMN services TEXT DEFAULT '[]'"
            )
    if "booking_workers" in inspector.get_table_names():
        ensure_postgres_varchar_length("booking_workers", "booking_id", 64)
        ensure_postgres_varchar_length("booking_workers", "worker_id", 64)
    if "notifications" in inspector.get_table_names():
        ensure_postgres_varchar_length("notifications", "id", 64)
        ensure_postgres_varchar_length("notifications", "recipient_id", 64)
    if "stock_items" in inspector.get_table_names():
        ensure_postgres_varchar_length("stock_items", "id", 64)
    if "expenses" in inspector.get_table_names():
        ensure_postgres_varchar_length("expenses", "id", 64)
    penalty_columns = {column["name"] for column in inspector.get_columns("penalties")}
    if "penalties" in inspector.get_table_names():
        ensure_postgres_varchar_length("penalties", "id", 64)
        ensure_postgres_varchar_length("penalties", "worker_id", 64)
        ensure_postgres_varchar_length("penalties", "owner_id", 64)
        ensure_postgres_varchar_length("penalties", "revoked_by", 64)
    if "active_until" not in penalty_columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE penalties ADD COLUMN active_until TIMESTAMP"
            )
    if "revoked_at" not in penalty_columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE penalties ADD COLUMN revoked_at TIMESTAMP"
            )
    if "revoked_by" not in penalty_columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE penalties ADD COLUMN revoked_by VARCHAR(64)"
            )
    if "payroll_entries" not in inspector.get_table_names():
        PayrollEntry.__table__.create(bind=engine)
    else:
        ensure_postgres_varchar_length("payroll_entries", "id", 64)
        ensure_postgres_varchar_length("payroll_entries", "worker_id", 64)
        ensure_postgres_varchar_length("payroll_entries", "actor_id", 64)
        ensure_postgres_text_column("payroll_entries", "note")
    if "incomes" not in inspector.get_table_names():
        Income.__table__.create(bind=engine)
    # salary_per_shift column migration
    staff_columns = {col["name"] for col in inspector.get_columns("staff_users")}
    if "salary_per_shift" not in staff_columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE staff_users ADD COLUMN salary_per_shift INTEGER DEFAULT 0"
            )

    expense_columns = (
        {column["name"] for column in inspector.get_columns("expenses")}
        if "expenses" in inspector.get_table_names()
        else set()
    )
    if "resource_group" not in expense_columns and "expenses" in inspector.get_table_names():
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE expenses ADD COLUMN resource_group VARCHAR(64) DEFAULT 'wash'"
            )

    income_columns = (
        {column["name"] for column in inspector.get_columns("incomes")}
        if "incomes" in inspector.get_table_names()
        else set()
    )
    if "resource_group" not in income_columns and "incomes" in inspector.get_table_names():
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE incomes ADD COLUMN resource_group VARCHAR(64) DEFAULT 'wash'"
            )

    # Миграция: старые названия боксов -> новые
    if "bookings" in inspector.get_table_names():
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "UPDATE bookings SET box = 'Бокс 1' WHERE box = 'Мойка самообслуживания'"
            )
            connection.exec_driver_sql(
                "UPDATE bookings SET box = 'Бокс 2' WHERE box = 'Мойка от мастера'"
            )

    # Миграция: percent INTEGER -> NUMERIC(7,5) для поддержки дробных процентов
    if engine.dialect.name == "postgresql":
        for table, column in [("staff_users", "default_percent"), ("booking_workers", "percent")]:
            col_info = next(
                (c for c in inspector.get_columns(table) if c["name"] == column), None
            )
            if col_info and str(col_info.get("type", "")).upper().startswith("INT"):
                with engine.begin() as connection:
                    connection.exec_driver_sql(
                        f"ALTER TABLE {table} ALTER COLUMN {column} TYPE NUMERIC(7,5) USING {column}::numeric"
                    )

    # Миграция расписания: старая схема (0=Пн..6=Вс) -> новая (0=Сб, 1=Вс, 2=Пн..6=Пт)
    if "schedule_entries" in inspector.get_table_names():
        sched_columns = {col["name"] for col in inspector.get_columns("schedule_entries")}
        if "day_index" in sched_columns:
            from sqlalchemy import text
            with engine.begin() as connection:
                rows = connection.execute(text("SELECT day_index, day_label FROM schedule_entries")).fetchall()
                # Проверяем по actual mapping: в старой схеме day_index=0 → "Пн", в новой → "Сб"
                index_to_label = {row[0]: row[1] for row in rows}
                has_old_scheme = index_to_label.get(0) == "Пн"
                if has_old_scheme:
                    connection.exec_driver_sql(
                        "UPDATE schedule_entries SET day_index = CASE day_index "
                        "WHEN 0 THEN 2 WHEN 1 THEN 3 WHEN 2 THEN 4 WHEN 3 THEN 5 "
                        "WHEN 4 THEN 6 WHEN 5 THEN 0 WHEN 6 THEN 1 END"
                    )
                    connection.exec_driver_sql(
                        "UPDATE schedule_entries SET day_label = CASE day_index "
                        "WHEN 0 THEN 'Сб' WHEN 1 THEN 'Вс' WHEN 2 THEN 'Пн' WHEN 3 THEN 'Вт' "
                        "WHEN 4 THEN 'Ср' WHEN 5 THEN 'Чт' WHEN 6 THEN 'Пт' END"
                    )

    # wash_type column migration
    if "services" in inspector.get_table_names():
        service_columns = {col["name"] for col in inspector.get_columns("services")}
        if "wash_type" not in service_columns:
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    "ALTER TABLE services ADD COLUMN wash_type VARCHAR(32) DEFAULT ''"
                )
                connection.exec_driver_sql(
                    "UPDATE services SET wash_type = 'classic' WHERE category = 'Мойка' AND wash_type = ''"
                )


def _repair_text_value(value: str) -> str:
    if not value or not any(ord(char) > 127 for char in value):
        return value
    try:
        fixed = value.encode("cp1251").decode("utf-8")
    except UnicodeError:
        return value
    return fixed if fixed != value else value


def _repair_nested_text(value):
    if isinstance(value, str):
        return _repair_text_value(value)
    if isinstance(value, list):
        return [_repair_nested_text(item) for item in value]
    if isinstance(value, dict):
        return {key: _repair_nested_text(item) for key, item in value.items()}
    return value


def _repair_model_text_fields(db: Session, model, fields: tuple[str, ...]) -> bool:
    changed = False
    for item in db.scalars(select(model)).all():
        for field in fields:
            current = getattr(item, field)
            if not isinstance(current, str):
                continue
            fixed = _repair_text_value(current)
            if fixed != current:
                setattr(item, field, fixed)
                changed = True
    return changed


def _sanitize_notification_message(message: str) -> str:
    fixed = _repair_text_value(message).strip()
    for source, target in {
        "вЂў": "•",
        "в€¢": "•",
        "вВў": "•",
        "â€¢": "•",
        "вЂ”": "-",
        "в€“": "-",
    }.items():
        fixed = fixed.replace(source, target)
    compact = "".join(char for char in fixed if not char.isspace())
    if compact and compact.count("?") * 2 >= len(compact):
        return ""
    return fixed


def _repair_text_data(db: Session) -> None:
    changed = False
    changed |= _repair_model_text_fields(
        db,
        StaffUser,
        ("name", "city", "experience", "specialty", "about"),
    )
    changed |= _repair_model_text_fields(
        db,
        Client,
        ("name", "car", "plate", "notes"),
    )
    changed |= _repair_model_text_fields(
        db,
        Service,
        ("name", "category", "description"),
    )
    changed |= _repair_model_text_fields(
        db,
        Box,
        ("name", "description"),
    )
    changed |= _repair_model_text_fields(
        db,
        ScheduleEntry,
        ("day_label", "open_time", "close_time"),
    )
    changed |= _repair_model_text_fields(
        db,
        Booking,
        ("client_name", "service", "box", "notes", "car", "plate"),
    )
    changed |= _repair_model_text_fields(
        db,
        BookingWorker,
        ("worker_name",),
    )
    changed |= _repair_model_text_fields(
        db,
        StockItem,
        ("name", "unit", "category"),
    )
    changed |= _repair_model_text_fields(
        db,
        Expense,
        ("title", "category", "note"),
    )
    changed |= _repair_model_text_fields(
        db,
        Penalty,
        ("title", "reason"),
    )

    for notification in db.scalars(select(Notification)).all():
        fixed_message = _sanitize_notification_message(notification.message)
        if not fixed_message:
            db.delete(notification)
            changed = True
            continue
        if fixed_message != notification.message:
            notification.message = fixed_message
            changed = True

    for setting in db.scalars(select(AppSetting)).all():
        fixed_value = _repair_nested_text(setting.value)
        if fixed_value != setting.value:
            setting.value = fixed_value
            changed = True

    if changed:
        db.flush()


def _setting(db: Session, key: str, default: dict) -> dict:
    row = db.get(AppSetting, key)
    if row:
        return row.value
    row = AppSetting(key=key, value=default)
    db.add(row)
    db.flush()
    return row.value


def _merge_setting_dict(value: Any, default: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(value, dict):
        return dict(default)
    merged = dict(default)
    for key, item in value.items():
        if key in default and isinstance(default[key], dict) and isinstance(item, dict):
            merged[key] = _merge_setting_dict(item, default[key])
        else:
            merged[key] = item
    return merged


def _normalize_client_vehicles(
    vehicles: list[ClientVehiclePayload] | list[dict[str, str]] | None,
    *,
    fallback_car: str = "",
    fallback_plate: str = "",
) -> list[ClientVehiclePayload]:
    normalized: list[ClientVehiclePayload] = []
    for item in vehicles or []:
        if isinstance(item, dict):
            car = item.get("car", "")
            plate = item.get("plate", "")
        else:
            car = item.car
            plate = item.plate
        car = normalize_vehicle_name(car) if car.strip() else ""
        plate = normalize_plate(plate) if plate.strip() else ""
        if not car and not plate:
            continue
        normalized.append(ClientVehiclePayload(car=car, plate=plate))
    if not normalized and (fallback_car.strip() or fallback_plate.strip()):
        normalized.append(ClientVehiclePayload(car=fallback_car, plate=fallback_plate))
    deduped: list[ClientVehiclePayload] = []
    seen: set[tuple[str, str]] = set()
    for item in normalized:
        key = (item.car, item.plate)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped[:5]


def _client_vehicles_map(db: Session) -> dict[str, Any]:
    return _setting(db, "client_vehicles", {})


def _client_vehicles_payload(db: Session, client: Client) -> list[ClientVehiclePayload]:
    raw = _client_vehicles_map(db).get(client.id, [])
    return _normalize_client_vehicles(
        raw, fallback_car=client.car or "", fallback_plate=client.plate or ""
    )


def _save_client_vehicles(
    db: Session, client_id: str, vehicles: list[ClientVehiclePayload]
) -> None:
    current = _client_vehicles_map(db)
    current[client_id] = [item.model_dump() for item in vehicles]
    _upsert_setting(db, "client_vehicles", current)


def _client_phone_verifications_map(db: Session) -> dict[str, Any]:
    value = _setting(db, CLIENT_PHONE_VERIFICATIONS_KEY, {})
    return value if isinstance(value, dict) else {}


def _client_verified_phone_digits(db: Session, telegram_id: str | None) -> str | None:
    if not telegram_id:
        return None
    entry = _client_phone_verifications_map(db).get(str(telegram_id))
    if not isinstance(entry, dict):
        return None
    phone_digits = entry.get("phoneDigits")
    return phone_digits if isinstance(phone_digits, str) and phone_digits else None


def _client_phone_is_verified(db: Session, telegram_id: str | None, phone: str) -> bool:
    if not phone.strip():
        return True
    if not telegram_id:
        return bool(settings.allow_insecure_client_auth)
    try:
        normalized_digits = normalize_phone_digits(phone)
    except ValueError:
        return False
    verified_digits = _client_verified_phone_digits(db, telegram_id)
    return verified_digits == normalized_digits


def _require_client_phone_verification(
    db: Session, telegram_id: str | None, phone: str
) -> None:
    if _client_phone_is_verified(db, telegram_id, phone):
        return
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Подтвердите номер телефона через Telegram, чтобы продолжить",
    )


def _client_payload(client: Client | None) -> ClientProfilePayload | None:
    if client is None:
        return None
    with Session(engine) as vehicles_db:
        vehicles = _client_vehicles_payload(vehicles_db, client)
        phone_verified = _client_phone_is_verified(
            vehicles_db, client.telegram_id, client.phone
        )
    return ClientProfilePayload(
        name=client.name,
        phone=client.phone,
        car=client.car or "",
        plate=client.plate or "",
        vehicles=vehicles,
        registered=client.registered,
        phoneVerified=phone_verified,
    )


def _client_summary_payload(
    client: Client, db: Session | None = None
) -> ClientSummaryPayload:
    if db is not None:
        vehicles = _client_vehicles_payload(db, client)
    else:
        with Session(engine) as vehicles_db:
            vehicles = _client_vehicles_payload(vehicles_db, client)
    return ClientSummaryPayload(
        id=client.id,
        name=client.name,
        phone=client.phone,
        car=client.car or "",
        plate=client.plate or "",
        vehicles=vehicles,
        notes=client.notes or "",
        debtBalance=client.debt_balance,
        adminRating=max(0, min(5, client.admin_rating or 0)),
        adminNote=client.admin_note or "",
        referralSource=client.referral_source or "",
    )


def _booking_status_label(status_value: str) -> str:
    return {
        "new": "Новая заявка",
        "confirmed": "Подтверждена",
        "scheduled": "Запланирована",
        "in_progress": "В работе",
        "completed": "Завершена",
        "no_show": "Клиент не приехал",
        "cancelled": "Отменена",
        "admin_review": "На уточнении у администратора",
    }.get(status_value, status_value)


def _booking_status_short_label(status_value: str) -> str:
    return {
        "new": "Новая",
        "confirmed": "Подтв.",
        "scheduled": "Запл.",
        "in_progress": "В работе",
        "completed": "Завершена",
        "no_show": "Не приехал",
        "cancelled": "Отменена",
        "admin_review": "Уточнение",
    }.get(status_value, status_value)


def _format_local_datetime(value: datetime) -> str:
    return _as_utc(value).astimezone().strftime("%d.%m.%Y %H:%M")


def _parse_booking_datetime(date_value: str, time_value: str) -> datetime | None:
    raw = f"{date_value.strip()} {time_value.strip()}"
    for fmt in ("%d.%m.%Y %H:%M", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return None


def _py_weekday_to_schedule_index(py_weekday: int) -> int:
    return (py_weekday + 2) % 7


def _parse_time_to_minutes(time_value: str) -> int | None:
    raw = time_value.strip()
    if len(raw) != 5 or raw[2] != ":":
        return None
    try:
        hours = int(raw[:2])
        minutes = int(raw[3:])
    except ValueError:
        return None
    if hours < 0 or hours > 23 or minutes < 0 or minutes > 59:
        return None
    return hours * 60 + minutes


def _today_label() -> str:
    return datetime.now().strftime("%d.%m.%Y")


def _build_schedule_slots(
    open_minutes: int, close_minutes: int, step_minutes: int = 30
) -> list[str]:
    slots: list[str] = []
    current = open_minutes
    while current + step_minutes <= close_minutes:
        hours, minutes = divmod(current, 60)
        slots.append(f"{hours:02d}:{minutes:02d}")
        current += step_minutes
    return slots


def _booking_requires_scheduled_slot(status_value: str) -> bool:
    return status_value in BOOKING_ACTIVE_STATUSES


def _booking_slot_fields_changed(booking: Booking, updates: dict) -> bool:
    if "date" in updates and (updates.get("date") or "").strip() != (booking.date or "").strip():
        return True
    if "time" in updates and (updates.get("time") or "").strip() != (booking.time or "").strip():
        return True
    if "duration" in updates and updates.get("duration") != booking.duration:
        return True
    return False


def _booking_time_range(
    date_value: str, time_value: str, duration: int
) -> tuple[datetime, datetime] | None:
    scheduled_at = _parse_booking_datetime(date_value, time_value)
    if scheduled_at is None or duration <= 0:
        return None
    return scheduled_at, scheduled_at + timedelta(minutes=duration)


def _time_ranges_overlap(
    start_at: datetime,
    end_at: datetime,
    other_start_at: datetime,
    other_end_at: datetime,
) -> bool:
    return start_at < other_end_at and end_at > other_start_at


def _ensure_booking_datetime_not_in_past(date_value: str, time_value: str, role: str) -> None:
    if role in {"admin", "owner"}:
        return
    scheduled_at = _parse_booking_datetime(date_value, time_value)
    if scheduled_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Укажите корректные дату и время записи",
        )
    current_local = datetime.now().replace(second=0, microsecond=0)
    if scheduled_at < current_local:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя записаться на прошедшее время",
        )


def _ensure_booking_within_schedule(
    db: Session, date_value: str, time_value: str, duration: int
) -> None:
    time_range = _booking_time_range(date_value, time_value, duration)
    if time_range is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Укажите корректные дату, время и длительность",
        )

    scheduled_at, _ = time_range
    day_schedule = db.scalar(
        select(ScheduleEntry).where(ScheduleEntry.day_index == _py_weekday_to_schedule_index(scheduled_at.weekday()))
    )
    if day_schedule is None or not day_schedule.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="В этот день запись недоступна",
        )

    open_minutes = _parse_time_to_minutes(day_schedule.open_time)
    close_minutes = _parse_time_to_minutes(day_schedule.close_time)
    start_minutes = _parse_time_to_minutes(time_value)
    if open_minutes is None or close_minutes is None or start_minutes is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Некорректно настроен график работы",
        )

    end_minutes = start_minutes + duration
    if start_minutes < open_minutes or end_minutes > close_minutes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Запись доступна только в часы работы: {day_schedule.open_time}-{day_schedule.close_time}",
        )


def _box_is_available(
    db: Session,
    *,
    booking_id: str | None,
    date_value: str,
    time_value: str,
    duration: int,
    box: str,
) -> bool:
    candidate_range = _booking_time_range(date_value, time_value, duration)
    if candidate_range is None:
        return False
    start_at, end_at = candidate_range

    query = select(Booking).where(
        Booking.date == date_value,
        Booking.box == box,
        Booking.status.in_(tuple(BOOKING_ACTIVE_STATUSES)),
        Booking.deleted_at.is_(None),
    )
    if booking_id is not None:
        query = query.where(Booking.id != booking_id)

    for existing in db.scalars(query.with_for_update(skip_locked=True)).all():
        existing_range = _booking_time_range(
            existing.date, existing.time, existing.duration
        )
        if existing_range is None:
            continue
        existing_start_at, existing_end_at = existing_range
        if _time_ranges_overlap(start_at, end_at, existing_start_at, existing_end_at):
            return False
    return True


def _pick_available_box(
    db: Session,
    *,
    booking_id: str | None,
    date_value: str,
    time_value: str,
    duration: int,
    resource_group: str | None = None,
    preferred_box: str | None = None,
) -> str | None:
    active_box_names = _compatible_box_names(db, resource_group)
    candidate_boxes: list[str] = []
    if preferred_box and preferred_box in active_box_names:
        candidate_boxes.append(preferred_box)
    for box_name in active_box_names:
        if box_name not in candidate_boxes:
            candidate_boxes.append(box_name)

    for box_name in candidate_boxes:
        if _box_is_available(
            db,
            booking_id=booking_id,
            date_value=date_value,
            time_value=time_value,
            duration=duration,
            box=box_name,
        ):
            return box_name
    return None


def _booking_slot_availability(
    db: Session,
    *,
    date_value: str,
    duration: int,
    service_id: str | None = None,
    resource_group: str | None = None,
) -> BookingAvailabilityPayload:
    parsed_date = _parse_booking_datetime(date_value, "00:00")
    if parsed_date is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Укажите дату в формате ДД.ММ.ГГГГ",
        )

    day_schedule = db.scalar(
        select(ScheduleEntry).where(ScheduleEntry.day_index == _py_weekday_to_schedule_index(parsed_date.weekday()))
    )
    if day_schedule is None or not day_schedule.active:
        return BookingAvailabilityPayload(date=date_value, duration=duration, slots=[])

    open_minutes = _parse_time_to_minutes(day_schedule.open_time)
    close_minutes = _parse_time_to_minutes(day_schedule.close_time)
    if open_minutes is None or close_minutes is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Некорректно настроен график работы",
        )

    service = db.get(Service, service_id) if service_id else None
    active_boxes = _compatible_box_names(
        db, resource_group or _service_resource_group(service)
    )
    slots: list[BookingAvailabilitySlotPayload] = []
    for slot in _build_schedule_slots(open_minutes, close_minutes):
        slot_start = _parse_time_to_minutes(slot)
        if slot_start is None:
            continue
        slot_end = slot_start + duration
        if slot_start < open_minutes or slot_end > close_minutes:
            slots.append(
                BookingAvailabilitySlotPayload(
                    time=slot,
                    available=False,
                    freeBoxes=0,
                    occupiedBoxes=len(active_boxes),
                )
            )
            continue

        free_boxes = sum(
            1
            for box_name in active_boxes
            if _box_is_available(
                db,
                booking_id=None,
                date_value=date_value,
                time_value=slot,
                duration=duration,
                box=box_name,
            )
        )
        slot_dt = _parse_booking_datetime(date_value, slot)
        now_local = datetime.now().replace(second=0, microsecond=0)
        is_past = slot_dt is not None and slot_dt < now_local
        slots.append(
            BookingAvailabilitySlotPayload(
                time=slot,
                available=free_boxes > 0 and not is_past,
                freeBoxes=free_boxes,
                occupiedBoxes=max(0, len(active_boxes) - free_boxes),
            )
        )
    return BookingAvailabilityPayload(date=date_value, duration=duration, slots=slots)


def _ensure_booking_has_no_conflicts(
    db: Session,
    *,
    booking_id: str | None,
    date_value: str,
    time_value: str,
    duration: int,
    box: str,
    worker_ids: set[str],
    status_value: str,
) -> None:
    if status_value not in BOOKING_ACTIVE_STATUSES:
        return

    candidate_range = _booking_time_range(date_value, time_value, duration)
    if candidate_range is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Укажите корректные дату, время и длительность",
        )
    start_at, end_at = candidate_range

    query = (
        select(Booking)
        .options(joinedload(Booking.worker_links))
        .where(
            Booking.date == date_value,
            Booking.status.in_(tuple(BOOKING_ACTIVE_STATUSES)),
            Booking.deleted_at.is_(None),
        )
        .with_for_update(skip_locked=True)
    )
    if booking_id is not None:
        query = query.where(Booking.id != booking_id)

    for existing in db.scalars(query).unique().all():
        existing_range = _booking_time_range(
            existing.date, existing.time, existing.duration
        )
        if existing_range is None:
            continue
        existing_start_at, existing_end_at = existing_range
        if not _time_ranges_overlap(
            start_at, end_at, existing_start_at, existing_end_at
        ):
            continue

        if box and existing.box == box:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Бокс {box} уже занят на это время",
            )

    # Проверяем глобальное ограничение: максимум 2 записи одновременно
    overlapping_bookings = [
        b for b in db.scalars(query).unique().all()
        if _booking_time_range(b.date, b.time, b.duration) is not None
        and _time_ranges_overlap(
            start_at, end_at,
            *_booking_time_range(b.date, b.time, b.duration)  # type: ignore[arg-type]
        )
    ]
    if len(overlapping_bookings) >= 2:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="На это время уже записаны 2 клиента. Пожалуйста, выберите другое время.",
        )

        # Worker overlap check removed: masters can work on multiple cars simultaneously
        # overlapping_worker_names = sorted(
        #     {
        #         link.worker_name
        #         for link in existing.worker_links
        #         if link.worker_id in worker_ids
        #     }
        # )
        # if overlapping_worker_names:
        #     raise HTTPException(
        #         status_code=status.HTTP_409_CONFLICT,
        #         detail="Мастер уже занят: " + ", ".join(overlapping_worker_names),
        #     )


def _load_penalties(
    db: Session, *, worker_ids: set[str] | None = None
) -> list[Penalty]:
    query = (
        select(Penalty)
        .options(joinedload(Penalty.worker))
        .order_by(Penalty.created_at.desc())
    )
    if worker_ids:
        query = query.where(Penalty.worker_id.in_(worker_ids))
    return db.scalars(query).all()


def _complaints_by_worker(penalties: list[Penalty]) -> dict[str, list[Penalty]]:
    grouped: dict[str, list[Penalty]] = {}
    for penalty in penalties:
        grouped.setdefault(penalty.worker_id, []).append(penalty)
    return grouped


def _normalize_worker_rules(db: Session) -> None:
    changed = False
    workers = db.scalars(select(StaffUser).where(StaffUser.role == "worker")).all()
    for worker in workers:
        capped_percent = clamp_worker_percent(worker.default_percent)
        if worker.default_percent != capped_percent:
            worker.default_percent = capped_percent
            worker.updated_at = _now()
            changed = True

    booking_links = db.scalars(select(BookingWorker)).all()
    for link in booking_links:
        capped_percent = clamp_worker_percent(link.percent)
        if link.percent != capped_percent:
            link.percent = capped_percent
            changed = True

    penalties = db.scalars(select(Penalty)).all()
    for penalty in penalties:
        if penalty.active_until is None:
            penalty.active_until = complaint_active_until(penalty.created_at)
            changed = True

    if changed:
        db.flush()


def _worker_payload(worker: StaffUser) -> WorkerPayload:
    return WorkerPayload(
        id=worker.id,
        role=worker.role,  # type: ignore[arg-type]
        name=worker.name,
        experience=worker.experience,
        defaultPercent=clamp_worker_percent(worker.default_percent),
        salaryBase=worker.salary_base,
        salaryPerShift=getattr(worker, "salary_per_shift", 0) or 0,
        available=worker.available,
        active=worker.active,
        phone=worker.phone,
        email=worker.email,
        city=worker.city,
        specialty=worker.specialty,
        about=worker.about,
        telegramChatId=worker.telegram_chat_id or "",
    )


def _payroll_entry_payload(entry: PayrollEntry, actor_name: str) -> PayrollEntryPayload:
    return PayrollEntryPayload(
        id=entry.id,
        workerId=entry.worker_id,
        kind=entry.kind,  # type: ignore[arg-type]
        amount=entry.amount,
        note=entry.note or "",
        createdAt=entry.created_at,
        createdByRole=entry.actor_role,  # type: ignore[arg-type]
        createdByName=actor_name,
    )


def _worker_payroll_summaries(
    db: Session,
    workers: list[StaffUser],
    complaints_by_worker: dict[str, list[Penalty]],
) -> dict[str, WorkerPayrollSummaryPayload]:
    if not workers:
        return {}

    worker_ids = [worker.id for worker in workers]
    completed_bookings = (
        db.scalars(
            select(Booking)
            .options(joinedload(Booking.worker_links))
            .join(Booking.worker_links)
            .where(
                Booking.status == "completed",
                BookingWorker.worker_id.in_(worker_ids),
            )
            .order_by(
                Booking.date.desc(), Booking.time.desc(), Booking.created_at.desc()
            )
        )
        .unique()
        .all()
    )
    entries = db.scalars(
        select(PayrollEntry)
        .where(PayrollEntry.worker_id.in_(worker_ids))
        .order_by(PayrollEntry.created_at.desc())
    ).all()
    actors = (
        {
            item.id: item.name
            for item in db.scalars(
                select(StaffUser).where(
                    StaffUser.id.in_({entry.actor_id for entry in entries})
                )
            ).all()
        }
        if entries
        else {}
    )

    booking_items_by_worker: dict[str, list[WorkerPayrollBookingPayload]] = {
        worker_id: [] for worker_id in worker_ids
    }
    for booking in completed_bookings:
        for link in booking.worker_links:
            if link.worker_id not in booking_items_by_worker:
                continue
            percent = adjusted_booking_percent(
                link.percent,
                complaints_by_worker.get(link.worker_id, []),
                date_value=booking.date,
                time_value=booking.time,
                fallback=booking.created_at,
            )
            booking_items_by_worker[link.worker_id].append(
                WorkerPayrollBookingPayload(
                    bookingId=booking.id,
                    service=booking.service,
                    date=booking.date,
                    time=booking.time,
                    price=booking.price,
                    percent=percent,
                    earned=round(booking.price * percent / 100),
                )
            )

    entry_payloads_by_worker: dict[str, list[PayrollEntryPayload]] = {
        worker_id: [] for worker_id in worker_ids
    }
    for entry in entries:
        entry_payloads_by_worker.setdefault(entry.worker_id, []).append(
            _payroll_entry_payload(entry, actors.get(entry.actor_id, "Сотрудник"))
        )

    result: dict[str, WorkerPayrollSummaryPayload] = {}
    for worker in workers:
        booking_items = booking_items_by_worker.get(worker.id, [])
        payroll_entries = entry_payloads_by_worker.get(worker.id, [])
        bonus_total = sum(
            item.amount for item in payroll_entries if item.kind == "bonus"
        )
        advance_total = sum(
            item.amount for item in payroll_entries if item.kind == "advance"
        )
        deduction_total = sum(
            item.amount for item in payroll_entries if item.kind == "deduction"
        )
        payout_total = sum(
            item.amount for item in payroll_entries if item.kind == "payout"
        )
        adjustment_total = sum(
            item.amount for item in payroll_entries if item.kind == "adjustment"
        )
        accrued_from_bookings = sum(item.earned for item in booking_items)
        completed_revenue = sum(item.price for item in booking_items)

        # Считаем количество смен за всё время для salary_per_shift
        # (согласовано с accrued_from_bookings и salary_base — оба за всё время)
        from datetime import date as _date
        inspections = _admin_shift_inspections_state(db)
        shift_count, _shift_dates = _compute_shift_attendance(
            inspections, worker.id, _date(2000, 1, 1), _date.today()
        )
        salary_per_shift = getattr(worker, "salary_per_shift", 0) or 0
        shift_pay_total = shift_count * salary_per_shift

        total_accrued = (
            accrued_from_bookings
            + worker.salary_base
            + shift_pay_total
            + bonus_total
            + max(adjustment_total, 0)
        )
        total_deducted = (
            advance_total + deduction_total + payout_total + max(-adjustment_total, 0)
        )
        result[worker.id] = WorkerPayrollSummaryPayload(
            completedBookings=len(booking_items),
            completedRevenue=completed_revenue,
            accruedFromBookings=accrued_from_bookings,
            baseSalary=worker.salary_base,
            shiftPayTotal=shift_pay_total,
            shiftCount=shift_count,
            bonusTotal=bonus_total,
            adjustmentTotal=adjustment_total,
            advanceTotal=advance_total,
            deductionTotal=deduction_total,
            payoutTotal=payout_total,
            totalAccrued=total_accrued,
            totalDeducted=total_deducted,
            balance=total_accrued - total_deducted,
            bookingItems=booking_items[:12],
            entries=payroll_entries[:20],
        )
    return result


def _worker_payload_with_payroll(
    worker: StaffUser,
    payroll_summaries: dict[str, WorkerPayrollSummaryPayload] | None = None,
) -> WorkerPayload:
    payload = _worker_payload(worker)
    if payroll_summaries is not None:
        payload.payrollSummary = payroll_summaries.get(
            worker.id, WorkerPayrollSummaryPayload(baseSalary=worker.salary_base)
        )
    return payload


def _booking_payload(
    booking: Booking, complaints_by_worker: dict[str, list[Penalty]] | None = None
) -> BookingPayload:
    svc_list = booking.services if isinstance(booking.services, list) else []
    booking_services = [
        BookingServiceItem(
            name=s['name'],
            serviceId=s['serviceId'],
            price=int(s.get('price', 0)),
            duration=int(s.get('duration', 30)),
        )
        for s in svc_list
    ]
    return BookingPayload(
        id=booking.id,
        clientId=booking.client_id,
        clientName=booking.client_name,
        clientPhone=booking.client_phone,
        service=booking.service,
        serviceId=booking.service_id,
        date=booking.date,
        time=booking.time,
        duration=booking.duration,
        price=booking.price,
        status=booking.status,
        workers=[
            BookingWorkerPayload(
                workerId=link.worker_id,
                workerName=link.worker_name,
                percent=adjusted_booking_percent(
                    link.percent,
                    (complaints_by_worker or {}).get(link.worker_id, []),
                    date_value=booking.date,
                    time_value=booking.time,
                    fallback=booking.created_at,
                ),
            )
            for link in booking.worker_links
        ],
        box=booking.box,
        paymentType=booking.payment_type,
        paymentSettled=booking.payment_settled,
        createdAt=booking.created_at,
        notes=booking.notes,
        car=booking.car,
        plate=booking.plate,
        services=booking_services,
    )


def _notification_payload(notification: Notification) -> NotificationPayload:
    return NotificationPayload(
        id=notification.id,
        recipientRole=notification.recipient_role,  # type: ignore[arg-type]
        recipientId=notification.recipient_id,
        message=notification.message,
        read=notification.read,
        createdAt=notification.created_at,
    )


def _stock_payload(item: StockItem) -> StockItemPayload:
    return StockItemPayload(
        id=item.id,
        name=item.name,
        qty=item.qty,
        unit=item.unit,
        unitPrice=item.unit_price,
        category=item.category,
    )


def _expense_payload(expense: Expense) -> ExpensePayload:
    return ExpensePayload(
        id=expense.id,
        title=expense.title,
        amount=expense.amount,
        category=expense.category,
        date=expense.date,
        note=expense.note,
        resourceGroup=expense.resource_group,
    )


def _penalty_payload(penalty: Penalty) -> PenaltyPayload:
    worker_name = penalty.worker.name if penalty.worker else ""
    return PenaltyPayload(
        id=penalty.id,
        workerId=penalty.worker_id,
        workerName=worker_name,
        ownerId=penalty.owner_id,
        title=penalty.title,
        reason=penalty.reason,
        createdAt=penalty.created_at,
        activeUntil=penalty.active_until or complaint_active_until(penalty.created_at),
        revokedAt=penalty.revoked_at,
    )


def _service_payload(service: Service) -> ServicePayload:
    return ServicePayload(
        id=service.id,
        name=service.name,
        category=service.category,
        price=service.price,
        duration=service.duration,
        resourceGroup=(service.resource_group or DEFAULT_RESOURCE_GROUP).strip()
        or DEFAULT_RESOURCE_GROUP,
        washType=service.wash_type or "",
        desc=service.description,
        active=service.active,
    )


def _box_payload(box: Box) -> BoxPayload:
    return BoxPayload(
        id=box.id,
        name=box.name,
        resourceGroup=(box.resource_group or DEFAULT_RESOURCE_GROUP).strip()
        or DEFAULT_RESOURCE_GROUP,
        pricePerHour=box.price_per_hour,
        active=box.active,
        description=box.description,
    )


def _visible_boxes(db: Session) -> list[Box]:
    boxes = db.scalars(select(Box).order_by(Box.name.asc())).all()
    wash_order_map = {name: index for index, name in enumerate(WASH_BOX_NAMES)}
    detailing_order_map = {name: index for index, name in enumerate(DETAILING_BOX_NAMES)}

    def box_order(box: Box) -> tuple[int, int, str, str]:
        resource_group = _resource_group_key(
            box.resource_group or _default_box_resource_group(box)
        )
        if resource_group == DETAILING_RESOURCE_GROUP:
            group_order = 1
            name_order = detailing_order_map.get(box.name, len(detailing_order_map))
        else:
            group_order = 0
            name_order = wash_order_map.get(box.name, len(wash_order_map))
        return (group_order, name_order, _normalized_text(box.name).lower(), box.id)

    return sorted(
        boxes,
        key=box_order,
    )


def _schedule_payload(entry: ScheduleEntry) -> SchedulePayload:
    return SchedulePayload(
        dayIndex=entry.day_index,
        day=entry.day_label,
        open=entry.open_time,
        close=entry.close_time,
        active=entry.active,
    )


def _settings_payload(db: Session) -> SettingsBundlePayload:
    admin_profile_default = {
        "name": "Администратор",
        "email": "",
        "phone": "",
        "telegramChatId": "",
    }
    admin_notification_default = {
        "newBooking": True,
        "cancelled": True,
        "paymentDue": False,
        "workerAssigned": True,
        "reminders": True,
    }
    owner_company_default = {
        "name": "ATMOSFERA",
        "legalName": "",
        "inn": "",
        "address": "",
        "phone": "",
        "email": "",
    }
    owner_notification_default = {
        "telegramBot": True,
        "emailReports": True,
        "smsReminders": False,
        "lowStock": True,
        "dailyReport": True,
        "weeklyReport": False,
        "bookingReminders": True,
    }
    owner_integrations_default = {
        "telegram": True,
        "yookassa": False,
        "amoCrm": False,
        "googleCalendar": False,
    }
    owner_security_default = {"twoFactor": False}
    worker_notification_default = {
        "newTask": True,
        "taskUpdate": True,
        "payment": True,
        "reminders": True,
        "sms": False,
    }

    admin_profile = _merge_setting_dict(
        _setting(db, "admin_profile", admin_profile_default), admin_profile_default
    )
    admin_staff = db.scalar(
        select(StaffUser)
        .where(StaffUser.role == "admin")
        .order_by(StaffUser.created_at.asc())
    )
    owner_staff = _primary_owner(db)
    if admin_staff is not None:
        admin_profile = {
            **admin_profile,
            "name": admin_staff.name,
            "email": admin_staff.email,
            "phone": admin_staff.phone,
            "telegramChatId": admin_staff.telegram_chat_id or "",
        }
    owner_security = _merge_setting_dict(
        _setting(db, "owner_security", owner_security_default), owner_security_default
    )
    if owner_security.get("twoFactor") and not (
        owner_staff and _safe_text(owner_staff.telegram_chat_id).strip()
    ):
        owner_security = {"twoFactor": False}
    raw_worker_notifications = _setting(db, "worker_notification_settings", {})
    if not isinstance(raw_worker_notifications, dict):
        raw_worker_notifications = {}
    return SettingsBundlePayload(
        adminProfile=AdminProfilePayload.model_validate(admin_profile),
        adminNotificationSettings=AdminNotificationSettings.model_validate(
            _merge_setting_dict(
                _setting(db, "admin_notification_settings", admin_notification_default),
                admin_notification_default,
            )
        ),
        ownerCompany=OwnerCompanyPayload.model_validate(
            _merge_setting_dict(
                _setting(db, "owner_company", owner_company_default),
                owner_company_default,
            )
        ),
        ownerNotificationSettings=OwnerNotificationSettings.model_validate(
            _merge_setting_dict(
                _setting(db, "owner_notification_settings", owner_notification_default),
                owner_notification_default,
            )
        ),
        ownerIntegrations=OwnerIntegrationsPayload.model_validate(
            _merge_setting_dict(
                _setting(db, "owner_integrations", owner_integrations_default),
                owner_integrations_default,
            )
        ),
        ownerSecurity=OwnerSecurityPayload.model_validate(owner_security),
        workerNotificationSettings={
            worker_id: WorkerNotificationSettings.model_validate(
                _merge_setting_dict(value, worker_notification_default)
            )
            for worker_id, value in raw_worker_notifications.items()
        },
    )


def _empty_settings_payload() -> SettingsBundlePayload:
    return SettingsBundlePayload(
        adminProfile=AdminProfilePayload(
            name="", email="", phone="", telegramChatId=""
        ),
        adminNotificationSettings=AdminNotificationSettings(
            newBooking=False,
            cancelled=False,
            paymentDue=False,
            workerAssigned=False,
            reminders=False,
        ),
        ownerCompany=OwnerCompanyPayload(
            name="",
            legalName="",
            inn="",
            address="",
            phone="",
            email="",
        ),
        ownerNotificationSettings=OwnerNotificationSettings(
            telegramBot=False,
            emailReports=False,
            smsReminders=False,
            lowStock=False,
            dailyReport=False,
            weeklyReport=False,
            bookingReminders=False,
        ),
        ownerIntegrations=OwnerIntegrationsPayload(
            telegram=False,
            yookassa=False,
            amoCrm=False,
            googleCalendar=False,
        ),
        ownerSecurity=OwnerSecurityPayload(twoFactor=False),
        workerNotificationSettings={},
    )


def _scoped_settings_payload(
    db: Session, role: str, actor_id: str
) -> SettingsBundlePayload:
    full = _settings_payload(db)
    if role == "owner":
        return full

    empty = _empty_settings_payload()
    if role in {"admin", "accountant"}:
        admin_profile = full.adminProfile
        admin_staff = db.get(StaffUser, actor_id)
        if admin_staff is not None and admin_staff.role in {"admin", "accountant"}:
            admin_profile = AdminProfilePayload(
                name=admin_staff.name,
                email=admin_staff.email,
                phone=admin_staff.phone,
                telegramChatId=admin_staff.telegram_chat_id or "",
            )
        return SettingsBundlePayload(
            adminProfile=admin_profile,
            adminNotificationSettings=full.adminNotificationSettings,
            ownerCompany=empty.ownerCompany,
            ownerNotificationSettings=empty.ownerNotificationSettings,
            ownerIntegrations=empty.ownerIntegrations,
            ownerSecurity=empty.ownerSecurity,
            workerNotificationSettings={},
        )
    if role == "worker":
        worker_settings: dict[str, WorkerNotificationSettings] = {}
        if actor_id in full.workerNotificationSettings:
            worker_settings[actor_id] = full.workerNotificationSettings[actor_id]
        return SettingsBundlePayload(
            adminProfile=empty.adminProfile,
            adminNotificationSettings=empty.adminNotificationSettings,
            ownerCompany=empty.ownerCompany,
            ownerNotificationSettings=empty.ownerNotificationSettings,
            ownerIntegrations=empty.ownerIntegrations,
            ownerSecurity=empty.ownerSecurity,
            workerNotificationSettings=worker_settings,
        )
    return empty


def _session_payload(session_data: dict) -> SessionPayload:
    return SessionPayload(
        role=session_data["role"],
        actorId=session_data["actorId"],
        sessionId=session_data.get("sessionId", ""),
        login=session_data.get("login"),
        displayName=session_data["displayName"],
    )


def _mark_overdue_bookings_for_admin_review(db: Session) -> None:
    now_local = datetime.now().replace(second=0, microsecond=0)
    changed = False
    for booking in db.scalars(
        select(Booking).where(
            Booking.status.in_(tuple(BOOKING_ACTIVE_STATUSES)),
            Booking.deleted_at.is_(None),
        )
    ).all():
        booking_range = _booking_time_range(
            booking.date, booking.time, booking.duration
        )
        if booking_range is None:
            continue
        _start_at, end_at = booking_range
        if end_at <= now_local:
            booking.status = "admin_review"
            changed = True
    if changed:
        db.commit()


def _build_bootstrap(db: Session, session_data: dict) -> BootstrapPayload:
    role = session_data["role"]
    actor_id = session_data["actorId"]

    _mark_overdue_bookings_for_admin_review(db)

    services = db.scalars(select(Service).order_by(Service.name)).all()
    boxes = _visible_boxes(db)
    schedule = db.scalars(select(ScheduleEntry).order_by(ScheduleEntry.day_index)).all()
    workers = db.scalars(
        select(StaffUser)
        .where(StaffUser.role.in_(("admin", "worker", "accountant")))
        .order_by(StaffUser.role.asc(), StaffUser.name.asc())
    ).all()
    all_penalties = _load_penalties(db)
    complaints_by_worker = _complaints_by_worker(all_penalties)
    payroll_summaries = (
        _worker_payroll_summaries(db, workers, complaints_by_worker)
        if role in {"admin", "owner", "worker", "accountant"}
        else {}
    )
    clients: list[ClientSummaryPayload] = []

    bookings_query = (
        select(Booking)
        .options(joinedload(Booking.worker_links))
        .where(Booking.deleted_at.is_(None))
        .order_by(Booking.date.desc(), Booking.time.desc(), Booking.created_at.desc())
    )
    notifications_query = select(Notification).order_by(Notification.created_at.desc())
    stock_query = select(StockItem).order_by(StockItem.name)
    expense_query = select(Expense).order_by(
        Expense.date.desc(), Expense.created_at.desc()
    )

    client = None
    staff_profile = None
    penalties: list[PenaltyPayload] = []

    if role == "client":
        client = db.get(Client, actor_id)
        bookings_query = bookings_query.where(Booking.client_id == actor_id)
        notifications_query = notifications_query.where(
            Notification.recipient_role == "client",
            Notification.recipient_id == actor_id,
        )
        stock_items = []
        expenses = []
    else:
        staff_profile = db.get(StaffUser, actor_id)
        if role == "worker":
            bookings_query = bookings_query.join(Booking.worker_links).where(
                BookingWorker.worker_id == actor_id
            )
            notifications_query = notifications_query.where(
                Notification.recipient_role == "worker",
                Notification.recipient_id == actor_id,
            )
        elif role in {"admin", "accountant"}:
            notifications_query = notifications_query.where(
                Notification.recipient_role.in_(("admin", "accountant")),
                or_(
                    Notification.recipient_id.is_(None),
                    Notification.recipient_id == actor_id,
                ),
            )
            clients = [
                _client_summary_payload(item, db)
                for item in db.scalars(
                    select(Client).where(Client.deleted_at.is_(None)).order_by(
                        Client.updated_at.desc(), Client.created_at.desc()
                    )
                ).all()
            ]
        else:
            notifications_query = notifications_query.where(
                Notification.recipient_role == "owner",
                or_(
                    Notification.recipient_id.is_(None),
                    Notification.recipient_id == actor_id,
                ),
            )

        if role in {"owner", "accountant"}:
            clients = [
                _client_summary_payload(item, db)
                for item in db.scalars(
                    select(Client).where(Client.deleted_at.is_(None)).order_by(
                        Client.updated_at.desc(), Client.created_at.desc()
                    )
                ).all()
            ]
            stock_items = [
                _stock_payload(item) for item in db.scalars(stock_query).all()
            ]
            expenses = [
                _expense_payload(item) for item in db.scalars(expense_query).all()
            ]
            penalties = (
                [_penalty_payload(item) for item in all_penalties]
                if role == "owner"
                else []
            )
        else:
            stock_items = []
            expenses = []
            if role == "worker":
                penalties = [
                    _penalty_payload(item)
                    for item in all_penalties
                    if item.worker_id == actor_id
                ]
            else:
                penalties = []

    bookings = [
        _booking_payload(item, complaints_by_worker)
        for item in db.scalars(bookings_query).unique().all()
    ]
    notifications = [
        _notification_payload(item) for item in db.scalars(notifications_query).all()
    ]

    return BootstrapPayload(
        session=_session_payload(session_data),
        clientProfile=_client_payload(client),
        staffProfile=_worker_payload_with_payroll(staff_profile, payroll_summaries)
        if staff_profile
        else None,
        clients=clients,
        bookings=bookings,
        notifications=notifications,
        stockItems=stock_items,
        expenses=expenses,
        penalties=penalties,
        workers=[
            _worker_payload_with_payroll(worker, payroll_summaries)
            for worker in workers
        ]
        if role in {"admin", "owner", "accountant"}
        else [],
        services=[_service_payload(service) for service in services],
        boxes=[_box_payload(box) for box in boxes],
        schedule=[_schedule_payload(entry) for entry in schedule],
        settings=_scoped_settings_payload(db, role, actor_id),
    )


def _resolve_user_from_init_data(authorization: str, db: Session) -> dict | None:
    try:
        validated = validate_telegram_init_data(authorization, settings.telegram_bot_token)
    except ValueError:
        if settings.allow_insecure_client_auth:
            try:
                validated = validate_telegram_init_data(
                    authorization, settings.telegram_bot_token, skip_validation=True
                )
            except ValueError:
                return None
        else:
            return None
    telegram_user = validated.get("user") or {}
    telegram_id = str(telegram_user.get("id")) if telegram_user.get("id") is not None else ""
    if not telegram_id:
        return None
    staff = db.scalar(
        select(StaffUser).where(
            StaffUser.telegram_chat_id == telegram_id,
            StaffUser.active.is_(True),
        )
    )
    if staff is not None:
        return {
            "role": staff.role,
            "actorId": staff.id,
            "login": staff.login,
            "displayName": staff.name,
            "sessionId": "",
        }
    client = db.scalar(
        select(Client).where(
            Client.telegram_id == telegram_id,
            Client.deleted_at.is_(None),
        )
    )
    if client is not None:
        return {
            "role": "client",
            "actorId": client.id,
            "displayName": client.name,
            "sessionId": "",
        }
    return None


def _require_session(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization"
        )
    session_data = _resolve_user_from_init_data(authorization, db)
    if session_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Аккаунт не привязан. Сначала завершите регистрацию или привязку профиля.",
        )
    return session_data


def _ensure_staff_role(session_data: dict, allowed: set[str]) -> None:
    if session_data["role"] not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def _validated_booking_workers(
    db: Session, workers: list[BookingWorkerPayload]
) -> list[BookingWorkerPayload]:
    if not workers:
        return []

    ordered_ids: list[str] = []
    worker_inputs: dict[str, BookingWorkerPayload] = {}
    for worker in workers:
        worker_id = worker.workerId.strip()
        if not worker_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Укажите мастера"
            )
        if worker_id in worker_inputs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Один и тот же мастер указан несколько раз",
            )
        ordered_ids.append(worker_id)
        worker_inputs[worker_id] = worker

    db_workers = {
        worker.id: worker
        for worker in db.scalars(
            select(StaffUser).where(StaffUser.id.in_(ordered_ids))
        ).all()
    }
    validated: list[BookingWorkerPayload] = []
    for worker_id in ordered_ids:
        worker = db_workers.get(worker_id)
        if worker is None or worker.role != "worker" or not worker.active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Мастер не найден или недоступен",
            )
        worker_input = worker_inputs[worker_id]
        validated.append(
            BookingWorkerPayload(
                workerId=worker.id,
                workerName=worker.name,
                percent=clamp_worker_percent(worker_input.percent),
            )
        )
    return validated


def _booking_payload_for_response(db: Session, booking: Booking) -> BookingPayload:
    worker_ids = {link.worker_id for link in booking.worker_links}
    penalties = _load_penalties(db, worker_ids=worker_ids) if worker_ids else []
    return _booking_payload(booking, _complaints_by_worker(penalties))


def _sync_booking_workers(
    db: Session, booking: Booking, workers: list[BookingWorkerPayload]
) -> None:
    booking.worker_links.clear()
    for worker in workers:
        booking.worker_links.append(
            BookingWorker(
                worker_id=worker.workerId,
                worker_name=worker.workerName,
                percent=clamp_worker_percent(worker.percent),
            )
        )
    db.flush()


def _send_telegram_safe(chat_id: str | None, text: str) -> None:
    if not chat_id:
        return
    try:
        send_telegram_message(chat_id, text)
    except Exception:
        pass


def _telegram_display_name(telegram_user: dict, fallback: str) -> str:
    first_name = str(telegram_user.get("first_name") or "").strip()
    last_name = str(telegram_user.get("last_name") or "").strip()
    return (
        " ".join(part for part in [first_name, last_name] if part).strip() or fallback
    )


def _owner_two_factor_recipient(db: Session) -> StaffUser:
    owner = _primary_owner(db)
    if owner is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Главный владелец ещё не настроен. Перезапустите сервер и попробуйте снова.",
        )
    if not _safe_text(owner.telegram_chat_id).strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Создатель ещё не открыл Mini App из Telegram. Сначала зайдите создателем через бота.",
        )
    return owner


def _all_active_owners(db: Session) -> list[StaffUser]:
    """Возвращает всех активных владельцев, отсортированных по created_at asc."""
    return list(
        db.scalars(
            select(StaffUser)
            .where(StaffUser.role == "owner", StaffUser.active.is_(True))
            .order_by(StaffUser.created_at.asc())
        ).all()
    )


def _all_owner_telegram_recipients(db: Session) -> list[StaffUser]:
    """Возвращает всех владельцев с непустым telegram_chat_id, отсортированных по created_at asc."""
    return list(
        db.scalars(
            select(StaffUser)
            .where(
                StaffUser.role == "owner",
                StaffUser.telegram_chat_id != "",
            )
            .order_by(StaffUser.created_at.asc())
        ).all()
    )


def _booking_reminder_target_date(days_ahead: int = 1) -> str:
    return (datetime.now() + timedelta(days=days_ahead)).strftime("%d.%m.%Y")


def _worker_notification_settings_map(db: Session) -> dict[str, dict[str, Any]]:
    return _setting(db, "worker_notification_settings", {})


def _booking_reminder_state(db: Session) -> dict[str, Any]:
    return _setting(db, BOOKING_REMINDER_STATE_KEY, {"deliveries": {}})


def _return_reminder_state(db: Session) -> dict[str, Any]:
    return _setting(db, RETURN_REMINDER_STATE_KEY, {"deliveries": {}})


def _shift_checklists_state(db: Session) -> list[dict[str, Any]]:
    value = _setting(db, SHIFT_CHECKLISTS_KEY, [])
    return value if isinstance(value, list) else []


def _admin_shift_inspections_state(db: Session) -> list[dict[str, Any]]:
    value = _setting(db, ADMIN_SHIFT_INSPECTIONS_KEY, [])
    return value if isinstance(value, list) else []


def _compute_shift_attendance(
    inspections: list[dict],
    worker_id: str,
    date_from: date,
    date_to: date,
) -> tuple[int, list[str]]:
    """
    Вычисляет посещаемость мастера за период.

    Критерий включения инспекции:
    - ``createdAt`` попадает в ``[date_from, date_to]`` (включительно)
    - в ``masters`` есть объект с ``workerId == worker_id`` и ``checked == True``

    Возвращает ``(shiftCount, shiftDates)``, где ``shiftDates`` — список дат
    в формате ``DD.MM.YYYY``, отсортированный по убыванию.
    """
    shift_dates: list[date] = []

    for inspection in inspections:
        raw_created_at = inspection.get("createdAt")
        if raw_created_at is None:
            continue

        # Разбираем дату создания инспекции
        if isinstance(raw_created_at, datetime):
            inspection_date = raw_created_at.date()
        elif isinstance(raw_created_at, date):
            inspection_date = raw_created_at
        else:
            # Строковый формат ISO 8601 (например "2024-05-01T10:00:00Z")
            try:
                dt_str = str(raw_created_at)
                # Убираем суффикс Z и обрезаем до 19 символов
                dt_str = dt_str.rstrip("Z").split("+")[0][:19]
                inspection_date = datetime.fromisoformat(dt_str).date()
            except (ValueError, AttributeError):
                continue

        # Проверяем попадание в период
        if not (date_from <= inspection_date <= date_to):
            continue

        # Проверяем наличие мастера с checked=True
        masters = inspection.get("masters")
        if not isinstance(masters, list):
            continue

        worker_checked = any(
            isinstance(m, dict)
            and m.get("workerId") == worker_id
            and m.get("checked") is True
            for m in masters
        )
        if not worker_checked:
            continue

        shift_dates.append(inspection_date)

    # Сортируем по убыванию и форматируем
    shift_dates.sort(reverse=True)
    shift_dates_str = [d.strftime("%d.%m.%Y") for d in shift_dates]

    return len(shift_dates_str), shift_dates_str


def _period_to_date_range(period: str) -> tuple[date, date]:
    """
    Преобразует строковый период в диапазон дат (date_from, date_to).

    - ``week``  → последние 7 дней
    - ``month`` → последние 30 дней
    - ``year``  → последние 365 дней

    Неверный period → HTTP 422.
    """
    today = date.today()
    if period == "week":
        return today - timedelta(days=6), today
    if period == "month":
        return today - timedelta(days=29), today
    if period == "year":
        return today - timedelta(days=364), today
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="period must be week, month or year",
    )


def _admin_shift_owner_bot_state(db: Session) -> dict[str, Any]:
    value = _setting(db, ADMIN_SHIFT_OWNER_BOT_STATE_KEY, {"pendingIssueByChat": {}})
    return value if isinstance(value, dict) else {"pendingIssueByChat": {}}


def _cleanup_booking_reminder_deliveries(deliveries: dict[str, Any]) -> dict[str, str]:
    threshold = _now() - timedelta(days=14)
    cleaned: dict[str, str] = {}
    for key, value in deliveries.items():
        delivered_at = _parse_state_datetime(value)
        if delivered_at is None or delivered_at >= threshold:
            cleaned[key] = value
    return cleaned


def _cleanup_return_reminder_deliveries(deliveries: dict[str, Any]) -> dict[str, str]:
    threshold = _now() - timedelta(days=30)
    cleaned: dict[str, str] = {}
    for key, value in deliveries.items():
        delivered_at = _parse_state_datetime(value)
        if delivered_at is None or delivered_at >= threshold:
            cleaned[key] = value
    return cleaned


def _booking_client_reminder_message(booking: Booking) -> str:
    return (
        "Напоминание о записи\n"
        f"Услуга: {booking.service}\n"
        f"Дата: {booking.date} {booking.time}\n"
        f"Бокс: {booking.box}\n"
        "Если планы изменились, пожалуйста, предупредите заранее."
    )


def _booking_worker_reminder_message(booking: Booking, worker_name: str) -> str:
    return (
        f"Напоминание мастеру {worker_name}\n"
        f"Клиент: {booking.client_name}\n"
        f"Услуга: {booking.service}\n"
        f"Дата: {booking.date} {booking.time}\n"
        f"Бокс: {booking.box}"
    )


def _dispatch_booking_reminders(
    db: Session,
    *,
    target_date: str | None = None,
    force: bool = False,
) -> OwnerReminderDispatchPayload:
    reminder_date = (target_date or "").strip() or _booking_reminder_target_date()
    owner_settings = _setting(
        db,
        "owner_notification_settings",
        {
            "telegramBot": True,
            "emailReports": True,
            "smsReminders": False,
            "lowStock": True,
            "dailyReport": True,
            "weeklyReport": False,
            "bookingReminders": True,
        },
    )
    if not owner_settings.get("bookingReminders", True) and not force:
        return OwnerReminderDispatchPayload(
            message="Автоматические напоминания отключены в настройках владельца.",
            targetDate=reminder_date,
            clientReminders=0,
            workerReminders=0,
            telegramDelivered=0,
        )

    reminder_state = _booking_reminder_state(db)
    deliveries = reminder_state.get("deliveries")
    if not isinstance(deliveries, dict):
        deliveries = {}
    deliveries = _cleanup_booking_reminder_deliveries(deliveries)

    worker_settings = _worker_notification_settings_map(db)
    telegram_enabled = bool(owner_settings.get("telegramBot", True))
    client_reminders = 0
    worker_reminders = 0
    telegram_delivered = 0

    bookings = (
        db.scalars(
            select(Booking)
            .options(joinedload(Booking.worker_links))
            .where(
                Booking.date == reminder_date,
                Booking.status.in_(tuple(BOOKING_REMINDER_ELIGIBLE_STATUSES)),
            )
            .order_by(Booking.time.asc(), Booking.created_at.asc())
        )
        .unique()
        .all()
    )

    worker_ids = {
        link.worker_id for booking in bookings for link in booking.worker_links
    }
    workers_map = (
        {
            worker.id: worker
            for worker in db.scalars(
                select(StaffUser).where(StaffUser.id.in_(worker_ids))
            ).all()
        }
        if worker_ids
        else {}
    )

    for booking in bookings:
        client = db.get(Client, booking.client_id)
        client_key = f"client:{booking.id}:{reminder_date}"
        client_message = _booking_client_reminder_message(booking)
        if client is not None and (force or client_key not in deliveries):
            db.add(
                Notification(
                    id=f"n-{uuid4()}",
                    recipient_role="client",
                    recipient_id=client.id,
                    message=client_message,
                    read=False,
                    created_at=_now(),
                )
            )
            client_reminders += 1
            deliveries[client_key] = _serialize_state_datetime(_now())
            if telegram_enabled and client.telegram_id:
                _send_telegram_safe(client.telegram_id, client_message)
                telegram_delivered += 1

        for link in booking.worker_links:
            worker_preferences = worker_settings.get(link.worker_id, {})
            if not worker_preferences.get("reminders", False):
                continue
            worker_key = f"worker:{link.worker_id}:{booking.id}:{reminder_date}"
            if not force and worker_key in deliveries:
                continue
            worker = workers_map.get(link.worker_id)
            worker_message = _booking_worker_reminder_message(booking, link.worker_name)
            db.add(
                Notification(
                    id=f"n-{uuid4()}",
                    recipient_role="worker",
                    recipient_id=link.worker_id,
                    message=worker_message,
                    read=False,
                    created_at=_now(),
                )
            )
            worker_reminders += 1
            deliveries[worker_key] = _serialize_state_datetime(_now())
            if telegram_enabled and worker is not None and worker.telegram_chat_id:
                _send_telegram_safe(worker.telegram_chat_id, worker_message)
                telegram_delivered += 1

    reminder_state["deliveries"] = deliveries
    _upsert_setting(db, BOOKING_REMINDER_STATE_KEY, reminder_state)

    return OwnerReminderDispatchPayload(
        message=(
            "Напоминания отправлены."
            if client_reminders or worker_reminders
            else f"Для даты {reminder_date} активных записей для напоминаний не найдено."
        ),
        targetDate=reminder_date,
        clientReminders=client_reminders,
        workerReminders=worker_reminders,
        telegramDelivered=telegram_delivered,
    )


def _dispatch_return_visit_reminders(db: Session) -> int:
    reminder_state = _return_reminder_state(db)
    deliveries = reminder_state.get("deliveries")
    if not isinstance(deliveries, dict):
        deliveries = {}
    deliveries = _cleanup_return_reminder_deliveries(deliveries)

    sent_count = 0
    completed_bookings = db.scalars(
        select(Booking)
        .where(Booking.status == "completed", Booking.client_id.is_not(None))
        .order_by(Booking.created_at.desc())
    ).all()
    latest_by_client: dict[str, Booking] = {}
    for booking in completed_bookings:
        if booking.client_id and booking.client_id not in latest_by_client:
            latest_by_client[booking.client_id] = booking

    for client_id, booking in latest_by_client.items():
        client = db.get(Client, client_id)
        if client is None:
            continue
        last_visit = _parse_booking_datetime(booking.date, booking.time) or _as_utc(
            booking.created_at
        ).replace(tzinfo=None)
        if last_visit > datetime.now() - timedelta(days=5):
            continue
        reminder_key = f"return:{client_id}:{booking.id}"
        if reminder_key in deliveries:
            continue
        car_label = booking.car or client.car or "ваша машина"
        message = (
            f"{car_label} давно не была чистой\n"
            "Пора вернуться на мойку и освежить автомобиль.\n"
            "Мы будем рады записать вас на удобное время."
        )
        db.add(
            Notification(
                id=f"n-{uuid4()}",
                recipient_role="client",
                recipient_id=client.id,
                message=message,
                read=False,
                created_at=_now(),
            )
        )
        _send_telegram_safe(client.telegram_id, message)
        deliveries[reminder_key] = _serialize_state_datetime(_now())
        sent_count += 1

    reminder_state["deliveries"] = deliveries
    _upsert_setting(db, RETURN_REMINDER_STATE_KEY, reminder_state)
    return sent_count


def _shift_checklist_payload(entry: dict[str, Any]) -> ShiftChecklistPayload:
    return ShiftChecklistPayload(
        id=str(entry.get("id") or ""),
        workerId=str(entry.get("workerId") or ""),
        workerName=str(entry.get("workerName") or ""),
        phase=str(entry.get("phase") or "start"),  # type: ignore[arg-type]
        note=str(entry.get("note") or ""),
        createdAt=_parse_state_datetime(entry.get("createdAt")) or _now(),
        items=[
            ShiftChecklistItemPayload(
                stockItemId=str(item.get("stockItemId") or ""),
                name=str(item.get("name") or ""),
                unit=str(item.get("unit") or ""),
                startQty=int(item.get("startQty"))
                if item.get("startQty") is not None
                else None,
                endQty=int(item.get("endQty"))
                if item.get("endQty") is not None
                else None,
                actualQty=int(item.get("actualQty") or 0),
            )
            for item in entry.get("items", [])
            if isinstance(item, dict)
        ],
    )


def _chemistry_stock_items(db: Session) -> list[StockItem]:
    return db.scalars(
        select(StockItem)
        .where(StockItem.category == "Химия")
        .order_by(StockItem.name.asc())
    ).all()


def _latest_shift_checklist_entry(
    entries: list[dict[str, Any]], worker_id: str, phase: str
) -> dict[str, Any] | None:
    for entry in sorted(
        entries, key=lambda item: str(item.get("createdAt") or ""), reverse=True
    ):
        if entry.get("workerId") == worker_id and entry.get("phase") == phase:
            return entry
    return None


def _clean_data_url_prefix(data_url: str) -> str:
    return data_url.split(",", 1)[1] if "," in data_url else data_url


def _decode_data_url_image(data_url: str) -> tuple[str, bytes]:
    raw = data_url.strip()
    if not raw.startswith("data:image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Нужно загрузить фото"
        )
    header, _, encoded = raw.partition(",")
    if not encoded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Фото повреждено"
        )
    # Limit base64 payload to ~5MB (base64 encodes 3 bytes per 4 chars, so ~6.7M chars)
    _MAX_BASE64_CHARS = 7_000_000
    if len(encoded) > _MAX_BASE64_CHARS:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Фото слишком большое. Максимальный размер — 5 МБ.",
        )
    mime_type = header[5:].split(";", 1)[0] or "image/jpeg"
    try:
        content = base64.b64decode(encoded)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Не удалось прочитать фото"
        ) from exc
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Фото слишком большое. Максимальный размер — 5 МБ.",
        )
    return mime_type, content


def _admin_shift_inspection_supplies(db: Session) -> list[dict[str, Any]]:
    items = db.scalars(
        select(StockItem)
        .where(StockItem.category.in_(("Химия", "Расходники")))
        .order_by(StockItem.category.asc(), StockItem.name.asc())
    ).all()
    if items:
        return [
            {
                "stockItemId": item.id,
                "name": item.name,
                "category": item.category,
                "unit": item.unit,
                "qty": item.qty,
            }
            for item in items
        ]
    return [
        {
            "stockItemId": item["id"],
            "name": item["name"],
            "category": item["category"],
            "unit": item["unit"],
            "qty": item["qty"],
        }
        for item in DEFAULT_ADMIN_SHIFT_SUPPLIES
    ]


def _admin_shift_inspection_payload(
    entry: dict[str, Any],
) -> AdminShiftInspectionPayload:
    inspection_id = str(entry.get("id") or "")
    return AdminShiftInspectionPayload(
        id=inspection_id,
        adminId=str(entry.get("adminId") or ""),
        adminName=str(entry.get("adminName") or ""),
        status=str(entry.get("status") or "pending"),  # type: ignore[arg-type]
        createdAt=_parse_state_datetime(entry.get("createdAt")) or _now(),
        reviewedAt=_parse_state_datetime(entry.get("reviewedAt")),
        floorPhotoUrl=f"/api/admin/shift-inspections/{inspection_id}/photo"
        if str(entry.get("floorPhotoUrl") or "").strip()
        else "",
        clothsReady=bool(entry.get("clothsReady")),
        suppliesChecked=bool(entry.get("suppliesChecked")),
        note=str(entry.get("note") or ""),
        issueNote=str(entry.get("issueNote") or ""),
        ownerDecisionBy=str(entry.get("ownerDecisionBy") or "") or None,
        supplies=[
            {
                "stockItemId": str(item.get("stockItemId") or ""),
                "name": str(item.get("name") or ""),
                "category": str(item.get("category") or ""),
                "unit": str(item.get("unit") or ""),
                "qty": int(item.get("qty") or 0),
                "checked": bool(item.get("checked")),
            }
            for item in entry.get("supplies", [])
            if isinstance(item, dict)
        ],
        masters=[
            {
                "workerId": str(item.get("workerId") or ""),
                "workerName": str(item.get("workerName") or ""),
                "checked": bool(item.get("checked")),
            }
            for item in entry.get("masters", [])
            if isinstance(item, dict)
        ],
    )


def _admin_shift_caption(entry: dict[str, Any]) -> str:
    checked_supplies = [
        item.get("name")
        for item in entry.get("supplies", [])
        if isinstance(item, dict) and item.get("checked")
    ]
    checked_masters = [
        item.get("workerName")
        for item in entry.get("masters", [])
        if isinstance(item, dict) and item.get("checked")
    ]
    created_at = _parse_state_datetime(entry.get("createdAt")) or _now()
    lines = [
        "Открытие смены администратором",
        f"Админ: {entry.get('adminName') or 'Неизвестно'}",
        f"Дата: {_format_local_datetime(created_at)}",
        f"Чистые тряпки: {'Да' if entry.get('clothsReady') else 'Нет'}",
        f"Расходники отмечены: {'Да' if entry.get('suppliesChecked') else 'Нет'}",
        f"Мастера на смене: {', '.join(checked_masters) if checked_masters else 'Не выбраны'}",
        f"Проверено по складу: {', '.join(checked_supplies) if checked_supplies else 'Ничего не отмечено'}",
    ]
    if entry.get("note"):
        lines.append(f"Комментарий: {entry.get('note')}")
    return "\n".join(lines)


def _admin_shift_owner_inline_keyboard(inspection_id: str) -> dict[str, Any]:
    return {
        "inline_keyboard": [
            [
                {
                    "text": "Подтвердить",
                    "callback_data": f"shiftapprove:{inspection_id}",
                },
                {"text": "Отказать", "callback_data": f"shiftreject:{inspection_id}"},
            ]
        ]
    }


def _notify_owner_about_admin_shift(db: Session, entry: dict[str, Any]) -> None:
    caption = _admin_shift_caption(entry)
    mime_type, photo_bytes = _decode_data_url_image(
        str(entry.get("floorPhotoUrl") or "")
    )
    owners = db.scalars(
        select(StaffUser).where(StaffUser.role == "owner", StaffUser.active.is_(True))
    ).all()
    for owner in owners:
        db.add(
            Notification(
                id=f"n-{uuid4()}",
                recipient_role="owner",
                recipient_id=owner.id,
                message=f"{caption}\nОжидает подтверждения владельца.",
                read=False,
                created_at=_now(),
            )
        )
        if owner.telegram_chat_id:
            try:
                send_telegram_photo(
                    owner.telegram_chat_id,
                    file_name=f"shift-{entry['id']}.jpg",
                    content=photo_bytes,
                    mime_type=mime_type,
                    caption=caption,
                    reply_markup=_admin_shift_owner_inline_keyboard(str(entry["id"])),
                )
            except Exception:
                logger.exception(
                    "Failed to send admin shift inspection photo to owner %s", owner.id
                )


def _apply_admin_shift_review(
    db: Session,
    inspection_id: str,
    *,
    action: str,
    issue_note: str,
    owner_actor_id: str,
) -> AdminShiftInspectionPayload:
    entries = _admin_shift_inspections_state(db)
    entry = next((item for item in entries if item.get("id") == inspection_id), None)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Чек-лист смены не найден"
        )
    if str(entry.get("status") or "") != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Решение по смене уже принято",
        )
    if action == "rejected" and not issue_note.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Опишите проблему при отказе",
        )

    entry["status"] = action
    entry["issueNote"] = issue_note.strip()
    entry["reviewedAt"] = _serialize_state_datetime(_now())
    entry["ownerDecisionBy"] = owner_actor_id
    _upsert_setting(db, ADMIN_SHIFT_INSPECTIONS_KEY, entries[-200:])

    admin_id = str(entry.get("adminId") or "")
    admin = db.get(StaffUser, admin_id) if admin_id else None
    owner = db.get(StaffUser, owner_actor_id)
    owner_name = owner.name if owner is not None else "Владелец"
    result_line = (
        "подтвердил открытие смены"
        if action == "approved"
        else "отклонил открытие смены"
    )
    extra = f"\nПроблема: {issue_note.strip()}" if issue_note.strip() else ""
    message = (
        f"{owner_name} {result_line} администратора {entry.get('adminName')}.{extra}"
    )
    if admin is not None:
        db.add(
            Notification(
                id=f"n-{uuid4()}",
                recipient_role="admin",
                recipient_id=admin.id,
                message=message,
                read=False,
                created_at=_now(),
            )
        )
        _send_telegram_safe(admin.telegram_chat_id, message)
    db.commit()
    return _admin_shift_inspection_payload(entry)


def _serialize_state_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    return _as_utc(value).isoformat()


def _parse_state_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if not isinstance(value, str):
        return None
    try:
        return _as_utc(datetime.fromisoformat(value))
    except ValueError:
        return None


def _owner_database_reset_state(db: Session) -> dict[str, Any] | None:
    row = db.get(AppSetting, OWNER_DATABASE_RESET_SETTING_KEY)
    if row is None or not isinstance(row.value, dict):
        return None
    return row.value


def _save_owner_database_reset_state(
    db: Session, value: dict[str, Any]
) -> dict[str, Any]:
    return _upsert_setting(db, OWNER_DATABASE_RESET_SETTING_KEY, value)


def _clear_owner_database_reset_state(db: Session) -> None:
    row = db.get(AppSetting, OWNER_DATABASE_RESET_SETTING_KEY)
    if row is not None:
        db.delete(row)
        db.flush()


def _normalize_database_reset_phrase(value: str) -> str:
    normalized = " ".join(value.replace("\n", " ").split()).strip().upper()
    return normalized.replace("Ё", "Е")


def _owner_database_reset_preview(
    db: Session,
) -> OwnerDatabaseResetPreviewPayload:
    return OwnerDatabaseResetPreviewPayload(
        ownersPreserved=len(
            db.scalars(select(StaffUser.id).where(StaffUser.role == "owner")).all()
        ),
        employeesDeleted=len(
            db.scalars(
                select(StaffUser.id).where(
                    StaffUser.role.in_(("admin", "worker", "accountant"))
                )
            ).all()
        ),
        clientsDeleted=len(db.scalars(select(Client.id)).all()),
        bookingsDeleted=len(db.scalars(select(Booking.id)).all()),
        notificationsDeleted=len(db.scalars(select(Notification.id)).all()),
        stockItemsDeleted=len(db.scalars(select(StockItem.id)).all()),
        expensesDeleted=len(db.scalars(select(Expense.id)).all()),
        penaltiesDeleted=len(db.scalars(select(Penalty.id)).all()),
        servicesReset=len(db.scalars(select(Service.id)).all()),
        boxesReset=len(db.scalars(select(Box.id)).all()),
        scheduleReset=len(db.scalars(select(ScheduleEntry.id)).all()),
        settingsReset=len(db.scalars(select(AppSetting.key)).all()),
    )


def _owner_database_reset_warnings(
    preview: OwnerDatabaseResetPreviewPayload,
) -> list[str]:
    return [
        (
            "Будут удалены все клиенты, записи, уведомления, склад, расходы и жалобы "
            f"({preview.clientsDeleted} клиентов, {preview.bookingsDeleted} записей, {preview.notificationsDeleted} уведомлений)."
        ),
        (
            "Будут удалены все сотрудники с ролями администратор и мастер "
            f"({preview.employeesDeleted} сотрудников)."
        ),
        (
            "Услуги, боксы, расписание и настройки CRM будут сброшены до стартовых значений "
            f"({preview.servicesReset} услуг, {preview.boxesReset} боксов, {preview.scheduleReset} дней расписания)."
        ),
        f"Сохранятся только аккаунты владельцев ({preview.ownersPreserved}).",
    ]


def _perform_owner_database_reset(db: Session) -> None:
    db.execute(sa_delete(TelegramLinkCode))
    db.execute(sa_delete(Notification))
    db.execute(sa_delete(BookingWorker))
    db.execute(sa_delete(Booking))
    db.execute(sa_delete(PayrollEntry))
    db.execute(sa_delete(Penalty))
    db.execute(sa_delete(Expense))
    db.execute(sa_delete(StockItem))
    db.execute(sa_delete(Client))
    db.execute(sa_delete(Service))
    db.execute(sa_delete(Box))
    db.execute(sa_delete(ScheduleEntry))
    db.execute(sa_delete(AppSetting))
    db.execute(
        sa_delete(StaffUser).where(
            StaffUser.role.in_(("admin", "worker", "accountant"))
        )
    )

    for owner in db.scalars(select(StaffUser).where(StaffUser.role == "owner")).all():
        owner.two_factor_code_hash = None
        owner.two_factor_expires_at = None
        owner.updated_at = _now()

    seed_database(db)
    _ensure_owner_accounts(db)
    _repair_text_data(db)
    _normalize_worker_rules(db)
    _clear_owner_database_reset_state(db)


def _owner_export_file(db: Session, actor_id: str, kind: str) -> GeneratedExport:
    owner = db.get(StaffUser, actor_id)
    if owner is None or owner.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found"
        )
    if kind not in {"report", "pdf"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Unknown export type"
        )

    _mark_overdue_bookings_for_admin_review(db)

    company_settings = _setting(
        db,
        "owner_company",
        {
            "name": "ATMOSFERA",
            "legalName": "",
            "inn": "",
            "address": "",
            "phone": "",
            "email": "",
        },
    )
    bookings = (
        db.scalars(
            select(Booking)
            .options(joinedload(Booking.worker_links))
            .order_by(
                Booking.date.desc(), Booking.time.desc(), Booking.created_at.desc()
            )
        )
        .unique()
        .all()
    )
    expenses = db.scalars(
        select(Expense).order_by(Expense.created_at.desc(), Expense.date.desc())
    ).all()
    penalties = _load_penalties(db)
    workers = db.scalars(
        select(StaffUser).where(StaffUser.role == "worker").order_by(StaffUser.name)
    ).all()
    stock_items = db.scalars(select(StockItem).order_by(StockItem.name)).all()
    services = db.scalars(select(Service).order_by(Service.name)).all()
    incomes = db.scalars(
        select(Income).order_by(Income.created_at.desc(), Income.date.desc())
    ).all()
    payroll_entries_list = db.scalars(
        select(PayrollEntry).order_by(PayrollEntry.created_at.desc())
    ).all()
    # Compute shift pay for each worker to include in export
    from datetime import date as _date
    inspections = _admin_shift_inspections_state(db)
    shift_pay_map: dict[str, int] = {}
    for worker in workers:
        sc, _ = _compute_shift_attendance(inspections, worker.id, _date(2000, 1, 1), _date.today())
        shift_pay_map[worker.id] = sc * (getattr(worker, "salary_per_shift", 0) or 0)
    export_kind = "report" if kind == "report" else "pdf"
    return build_owner_export(
        kind=export_kind,
        owner=owner,
        company_name=str(company_settings.get("name") or "ATMOSFERA"),
        bookings=bookings,
        expenses=expenses,
        penalties=penalties,
        workers=workers,
        stock_items=stock_items,
        services=services,
        incomes=incomes,
        payroll_entries=list(payroll_entries_list),
        shift_pay_by_worker=shift_pay_map,
    )


def _download_response(export_file: GeneratedExport) -> Response:
    return Response(
        content=export_file.content,
        media_type=export_file.media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{export_file.file_name}"'
        },
    )


class _PartialBroadcastError(Exception):
    """Raised when a broadcast partially fails; carries the broadcast payload."""

    def __init__(self, payload: TelegramBroadcastPayload) -> None:
        super().__init__("partial broadcast failure")
        self.payload = payload


def _send_export_to_telegram(
    db: Session, actor_id: str, export_file: GeneratedExport
) -> OwnerExportDeliveryPayload:
    all_owners = _all_active_owners(db)
    telegram_recipients = _all_owner_telegram_recipients(db)
    results: list[TelegramDeliveryResult] = []
    for recipient in telegram_recipients:
        try:
            send_telegram_document(
                recipient.telegram_chat_id,
                file_name=export_file.file_name,
                content=export_file.content,
                caption=export_file.telegram_caption,
                mime_type=export_file.media_type.split(";", 1)[0],
            )
            results.append(TelegramDeliveryResult(owner_id=recipient.id, success=True, error=None))
        except Exception as exc:
            results.append(TelegramDeliveryResult(owner_id=recipient.id, success=False, error=str(exc)))
    # Create in-app notifications for ALL active owners
    for owner in all_owners:
        db.add(
            Notification(
                id=f"n-{uuid4()}",
                recipient_role="owner",
                recipient_id=owner.id,
                message=export_file.telegram_caption or "Экспорт отправлен",
                read=False,
                created_at=_now(),
            )
        )
    delivered = sum(1 for r in results if r.success)
    failed = sum(1 for r in results if not r.success)
    if delivered == 0 and not all_owners:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Нет получателей с привязанным Telegram",
        )
    # Return legacy payload for backward compatibility when all succeeded
    if delivered > 0 and failed == 0:
        first_success = next(r for r in results if r.success)
        recipient_obj = next(u for u in telegram_recipients if u.id == first_success.owner_id)
        return OwnerExportDeliveryPayload(
            message=f"Файл отправлен в Telegram ({delivered} получателей).",
            fileName=export_file.file_name,
            telegramSent=True,
            telegramChatId=recipient_obj.telegram_chat_id,
        )
    if delivered == 0:
        return OwnerExportDeliveryPayload(
            message="Файл не отправлен — нет получателей с привязанным Telegram.",
            fileName=export_file.file_name,
            telegramSent=False,
            telegramChatId="",
        )
    # Partial failure — caller should handle HTTP 207
    raise _PartialBroadcastError(
        TelegramBroadcastPayload(results=results, delivered=delivered, failed=failed)
    )


def _owner_summary_report(
    db: Session, actor_id: str, period: str, segment: str
) -> OwnerSummaryReport:
    owner = db.get(StaffUser, actor_id)
    if owner is None or owner.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found"
        )
    if period not in {"daily", "weekly"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Unknown report period"
        )
    if segment not in {"wash", "detailing"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Unknown report segment"
        )

    _mark_overdue_bookings_for_admin_review(db)
    company_settings = _setting(
        db,
        "owner_company",
        {
            "name": "ATMOSFERA",
            "legalName": "",
            "inn": "",
            "address": "",
            "phone": "",
            "email": "",
        },
    )
    bookings = (
        db.scalars(
            select(Booking)
            .options(joinedload(Booking.worker_links))
            .order_by(
                Booking.date.desc(), Booking.time.desc(), Booking.created_at.desc()
            )
        )
        .unique()
        .all()
    )
    services = db.scalars(select(Service).order_by(Service.name)).all()
    expenses = db.scalars(select(Expense).order_by(Expense.created_at.desc())).all()
    incomes = db.scalars(select(Income).order_by(Income.created_at.desc())).all()
    piggy_transactions = db.scalars(
        select(PiggyBankTransaction).order_by(PiggyBankTransaction.created_at.desc())
    ).all()
    return build_owner_summary_report(
        company_name=str(company_settings.get("name") or "ATMOSFERA"),
        bookings=bookings,
        services=services,
        expenses=list(expenses),
        incomes=list(incomes),
        piggy_transactions=list(piggy_transactions),
        period=period,
        segment=segment,
    )


def _owner_summary_export_file(
    db: Session, actor_id: str, period: str, segment: str
) -> GeneratedExport:
    owner = db.get(StaffUser, actor_id)
    if owner is None or owner.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found"
        )
    if period not in {"daily", "weekly"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Unknown report period"
        )
    if segment not in {"wash", "detailing"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Unknown report segment"
        )

    _mark_overdue_bookings_for_admin_review(db)
    company_settings = _setting(
        db,
        "owner_company",
        {
            "name": "ATMOSFERA",
            "legalName": "",
            "inn": "",
            "address": "",
            "phone": "",
            "email": "",
        },
    )
    bookings = (
        db.scalars(
            select(Booking)
            .options(joinedload(Booking.worker_links))
            .order_by(
                Booking.date.desc(), Booking.time.desc(), Booking.created_at.desc()
            )
        )
        .unique()
        .all()
    )
    services = db.scalars(select(Service).order_by(Service.name)).all()
    penalties = db.scalars(select(Penalty).order_by(Penalty.created_at.desc())).all()
    piggy_transactions = db.scalars(
        select(PiggyBankTransaction).order_by(PiggyBankTransaction.created_at.desc())
    ).all()
    return build_owner_summary_export(
        owner=owner,
        company_name=str(company_settings.get("name") or "ATMOSFERA"),
        bookings=bookings,
        services=services,
        penalties=penalties,
        piggy_transactions=list(piggy_transactions),
        period=period,
        segment=segment,
    )


def _send_owner_summary_report(
    db: Session,
    actor_id: str,
    report: OwnerSummaryReport,
    export_file: GeneratedExport,
) -> Response:
    all_owners = _all_active_owners(db)
    telegram_recipients = _all_owner_telegram_recipients(db)
    results: list[TelegramDeliveryResult] = []
    for recipient in telegram_recipients:
        try:
            send_telegram_document(
                recipient.telegram_chat_id,
                file_name=export_file.file_name,
                content=export_file.content,
                caption=export_file.telegram_caption,
                mime_type=export_file.media_type.split(";", 1)[0],
            )
            results.append(TelegramDeliveryResult(owner_id=recipient.id, success=True, error=None))
        except Exception as exc:
            results.append(TelegramDeliveryResult(owner_id=recipient.id, success=False, error=str(exc)))
    # Create in-app notifications for ALL active owners (not just Telegram recipients)
    for owner in all_owners:
        db.add(
            Notification(
                id=f"n-{uuid4()}",
                recipient_role="owner",
                recipient_id=owner.id,
                message=report.message,
                read=False,
                created_at=_now(),
            )
        )
    delivered = sum(1 for r in results if r.success)
    failed = sum(1 for r in results if not r.success)
    if delivered == 0 and not all_owners:
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Нет получателей с привязанным Telegram",
        )
    db.commit()
    if delivered == 0:
        msg = GenericMessage(
            message="Отчёт сохранён в уведомлениях, но нет получателей с привязанным Telegram для отправки файла."
        )
        return Response(
            content=msg.model_dump_json(),
            status_code=status.HTTP_200_OK,
            media_type="application/json",
        )
    if failed == 0:
        msg = GenericMessage(
            message=f"{report.title} отправлен в Telegram файлом {export_file.file_name} ({delivered} получателей)."
        )
        return Response(
            content=msg.model_dump_json(),
            status_code=status.HTTP_200_OK,
            media_type="application/json",
        )
    broadcast_payload = TelegramBroadcastPayload(results=results, delivered=delivered, failed=failed)
    return Response(
        content=broadcast_payload.model_dump_json(),
        status_code=status.HTTP_207_MULTI_STATUS,
        media_type="application/json",
    )


def _booking_car_label(car: str | None, plate: str | None) -> str:
    car_value = (car or "").strip() or "Авто не указано"
    plate_value = (plate or "").strip()
    return f"{car_value}, {plate_value}" if plate_value else car_value


def _admin_booking_notification_title(
    client_name: str, car: str | None, plate: str | None
) -> str:
    return f"{client_name} - {_booking_car_label(car, plate)}"


def _booking_datetime_label(date: str | None, time: str | None) -> str:
    if not (date or "").strip():
        return "Время согласует администратор"
    if not (time or "").strip() or (time or "").strip() == DETAILING_REQUEST_TIME:
        return f"{date} - время согласует администратор"
    return f"{date} {time}"


def _admin_booking_notification_text(
    client_name: str,
    car: str | None,
    plate: str | None,
    date: str | None,
    time: str | None,
) -> str:
    return f"{_admin_booking_notification_title(client_name, car, plate)} - {_booking_datetime_label(date, time)}"


def _notify_admins_about_booking(db: Session, booking: Booking) -> None:
    admins = db.scalars(
        select(StaffUser).where(StaffUser.role == "admin", StaffUser.active.is_(True))
    ).all()
    text = (
        "Новая запись\n"
        f"Клиент: {booking.client_name}\n"
        f"Авто: {_booking_car_label(booking.car, booking.plate)}\n"
        f"Услуга: {booking.service}\n"
        f"Дата: {_booking_datetime_label(booking.date, booking.time)}\n"
        f"Телефон: {booking.client_phone}"
    )
    for admin in admins:
        _send_telegram_safe(admin.telegram_chat_id, text)


def _service_category_key(value: str | None) -> str:
    return (value or "").strip().lower()


def _resource_group_key(value: str | None) -> str:
    return (value or "").strip().lower() or DEFAULT_RESOURCE_GROUP


def _normalized_text(value: str | None) -> str:
    return (value or "").strip()


def _default_service_resource_group(service: Service | None) -> str:
    if service is None:
        return DEFAULT_RESOURCE_GROUP
    return _resource_group_for_service_category(service.category)


def _default_box_resource_group(box: Box | None) -> str:
    if box is None:
        return DEFAULT_RESOURCE_GROUP
    name_key = (box.name or "").strip().lower()
    description_key = (box.description or "").strip().lower()
    if "детейл" in name_key or "детейл" in description_key:
        return DETAILING_RESOURCE_GROUP
    return WASH_RESOURCE_GROUP


def _service_resource_group(service: Service | None) -> str:
    if service is None:
        return DEFAULT_RESOURCE_GROUP
    return _resource_group_key(
        service.resource_group or _default_service_resource_group(service)
    )


def _compatible_box_names(db: Session, resource_group: str | None) -> list[str]:
    target_group = _resource_group_key(resource_group)
    return [
        box.name
        for box in db.scalars(
            select(Box).where(Box.active.is_(True)).order_by(Box.name.asc())
        ).all()
        if _normalized_text(box.name)
        and _resource_group_key(box.resource_group or _default_box_resource_group(box))
        == target_group
    ]


def _is_box_rental_service(service: Service | None) -> bool:
    return (
        service is not None
        and _service_category_key(service.category) == "аренда бокса"
    )


def _is_detailing_service(service: Service | None) -> bool:
    return (
        service is not None and _service_category_key(service.category) == "детейлинг"
    )


def _resource_group_for_service_category(category: str | None) -> str:
    category_key = _service_category_key(category)
    if category_key == "детейлинг":
        return DETAILING_RESOURCE_GROUP
    return WASH_RESOURCE_GROUP


def _box_by_name(db: Session, box_name: str) -> Box | None:
    return db.scalar(select(Box).where(Box.name == box_name))


def _normalize_service_and_box_resources(db: Session) -> None:
    changed = False

    services = db.scalars(select(Service)).all()
    for service in services:
        expected_group = _default_service_resource_group(service)
        if _resource_group_key(service.resource_group) != expected_group:
            service.resource_group = expected_group
            changed = True

    boxes = db.scalars(select(Box).order_by(Box.name.asc())).all()
    if boxes:
        detailing_boxes = [
            box
            for box in boxes
            if _resource_group_key(box.resource_group) == DETAILING_RESOURCE_GROUP
        ]
        if not detailing_boxes:
            for i in range(len(DETAILING_BOX_NAMES)):
                target_box = Box(
                    id=f"box-detailing-{i + 1}",
                    name=DETAILING_BOX_NAMES[i],
                    resource_group=DETAILING_RESOURCE_GROUP,
                    price_per_hour=700,
                    active=True,
                    description="Отдельное помещение для детейлинга",
                )
                db.add(target_box)
                boxes.append(target_box)
            changed = True
        else:
            for index, box in enumerate(detailing_boxes):
                if (
                    index < len(DETAILING_BOX_NAMES)
                    and box.name != DETAILING_BOX_NAMES[index]
                ):
                    box.name = DETAILING_BOX_NAMES[index]
                    changed = True
                if not _normalized_text(box.description):
                    box.description = "Отдельное помещение для детейлинга"
                    changed = True
                if not box.active:
                    box.active = True
                    changed = True
            while len(detailing_boxes) < len(DETAILING_BOX_NAMES):
                target_box = Box(
                    id=f"box-detailing-{len(detailing_boxes) + 1}",
                    name=DETAILING_BOX_NAMES[len(detailing_boxes)],
                    resource_group=DETAILING_RESOURCE_GROUP,
                    price_per_hour=700,
                    active=True,
                    description="Отдельное помещение для детейлинга",
                )
                db.add(target_box)
                boxes.append(target_box)
                detailing_boxes.append(target_box)
                changed = True
            for index, box in enumerate(detailing_boxes):
                if index >= len(DETAILING_BOX_NAMES) and box.active:
                    box.active = False
                    changed = True

        wash_boxes = [
            box
            for box in boxes
            if _resource_group_key(box.resource_group) != DETAILING_RESOURCE_GROUP
        ]
        while len(wash_boxes) < len(WASH_BOX_NAMES):
            next_index = len(wash_boxes)
            next_box = Box(
                id=f"box-wash-{next_index + 1}",
                name=WASH_BOX_NAMES[next_index],
                resource_group=WASH_RESOURCE_GROUP,
                price_per_hour=500,
                active=True,
                description="Моечный бокс",
            )
            db.add(next_box)
            boxes.append(next_box)
            wash_boxes.append(next_box)
            changed = True

        for index, box in enumerate(wash_boxes):
            if index < len(WASH_BOX_NAMES) and box.name != WASH_BOX_NAMES[index]:
                box.name = WASH_BOX_NAMES[index]
                changed = True
            if index >= len(WASH_BOX_NAMES) and box.active:
                box.active = False
                changed = True

        for index, box in enumerate(boxes):
            expected_group = (
                DETAILING_RESOURCE_GROUP
                if _resource_group_key(box.resource_group) == DETAILING_RESOURCE_GROUP
                else WASH_RESOURCE_GROUP
            )
            if _resource_group_key(box.resource_group) != expected_group:
                box.resource_group = expected_group
                changed = True
            if expected_group == WASH_RESOURCE_GROUP and not _normalized_text(box.name):
                box.name = (
                    WASH_BOX_NAMES[index]
                    if index < len(WASH_BOX_NAMES)
                    else f"Бокс {index + 1}"
                )
                changed = True

    if changed:
        db.flush()


def _box_hourly_price(db: Session, box_name: str, fallback_price: int) -> int:
    box = _box_by_name(db, box_name)
    if box is not None and box.price_per_hour > 0:
        return box.price_per_hour
    return max(0, fallback_price)


def _payment_type_label(payment_type: str) -> str:
    return {
        "cash": "Наличные",
        "card": "Карта",
        "online": "Онлайн",
    }.get(payment_type, payment_type)


def _booking_payment_label(booking: Booking) -> str:
    if not booking.payment_settled:
        return "Не оплачено"
    return _payment_type_label(booking.payment_type)


def _notify_owners(db: Session, text: str) -> None:
    db.add(
        Notification(
            id=f"n-{uuid4()}",
            recipient_role="owner",
            recipient_id=None,
            message=text,
            read=False,
            created_at=_now(),
        )
    )
    owners = db.scalars(
        select(StaffUser).where(StaffUser.role == "owner", StaffUser.active.is_(True))
    ).all()
    for owner in owners:
        _send_telegram_safe(owner.telegram_chat_id, text)


def _booking_receipt_text(booking: Booking, *, worker_name: str | None = None) -> str:
    worker_line = f"\nМастер: {worker_name}" if worker_name else ""
    return (
        "Чек по записи\n"
        f"Клиент: {booking.client_name}\n"
        f"Услуга: {booking.service}\n"
        f"Дата: {booking.date} {booking.time}\n"
        f"Бокс: {booking.box}\n"
        f"Сумма: {booking.price:,} ₽\n".replace(",", " ")
        + f"Оплата: {_booking_payment_label(booking)}"
        + worker_line
    )


def _notify_booking_completion_receipt(
    db: Session, booking: Booking, *, worker_name: str | None = None
) -> None:
    message = _booking_receipt_text(booking, worker_name=worker_name)
    db.add(
        Notification(
            id=f"n-{uuid4()}",
            recipient_role="admin",
            recipient_id=None,
            message=message,
            read=False,
            created_at=_now(),
        )
    )
    if booking.client_id:
        db.add(
            Notification(
                id=f"n-{uuid4()}",
                recipient_role="client",
                recipient_id=booking.client_id,
                message=message,
                read=False,
                created_at=_now(),
            )
        )
        client = db.get(Client, booking.client_id)
        if client is not None:
            _send_telegram_safe(client.telegram_id, message)
    _notify_owners(db, message)
    admins = db.scalars(
        select(StaffUser).where(StaffUser.role == "admin", StaffUser.active.is_(True))
    ).all()
    for admin in admins:
        _send_telegram_safe(admin.telegram_chat_id, message)


def _notify_owner_about_worker_booking_event(
    db: Session, booking: Booking, *, worker_name: str, event_label: str
) -> None:
    _notify_owners(
        db,
        (
            f"Мастер {event_label} работу по записи\n"
            f"Мастер: {worker_name}\n"
            f"Клиент: {booking.client_name}\n"
            f"Услуга: {booking.service}\n"
            f"Дата: {_booking_datetime_label(booking.date, booking.time)}\n"
            f"Бокс: {booking.box}"
        ),
    )


def _notify_workers_about_assignment(
    db: Session, booking: Booking, worker_ids: set[str]
) -> None:
    if not worker_ids:
        return
    workers = db.scalars(select(StaffUser).where(StaffUser.id.in_(worker_ids))).all()
    for worker in workers:
        worker_link = next(
            (link for link in booking.worker_links if link.worker_id == worker.id), None
        )
        percent_label = (
            f"{worker_link.percent}%" if worker_link is not None else "не указан"
        )
        car_part = ""
        if booking.car:
            car_part = f"\nАвто: {booking.car}"
            if booking.plate:
                car_part += f" ({booking.plate})"
        text = (
            "Вам назначена запись\n"
            f"Клиент: {booking.client_name}\n"
            f"Услуга: {booking.service}\n"
            f"Дата: {booking.date} {booking.time}\n"
            f"Бокс: {booking.box}\n"
            f"Процент: {percent_label}"
        )
        if car_part:
            text += car_part
        if booking.notes:
            text += f"\nПримечание администратора: {booking.notes}"
        db.add(
            Notification(
                id=f"n-{uuid4()}",
                recipient_role="worker",
                recipient_id=worker.id,
                message=text,
                read=False,
                created_at=_now(),
            )
        )
        _send_telegram_safe(worker.telegram_chat_id, text)


def _notify_workers_about_note(
    db: Session, booking: Booking, worker_ids: set[str]
) -> None:
    note = (booking.notes or "").strip()
    if not worker_ids or not note:
        return
    workers = db.scalars(select(StaffUser).where(StaffUser.id.in_(worker_ids))).all()
    for worker in workers:
        car_part = ""
        if booking.car:
            car_part = f"\nАвто: {booking.car}"
            if booking.plate:
                car_part += f" ({booking.plate})"
        text = (
            "Администратор обновил примечание к вашей записи\n"
            f"Клиент: {booking.client_name}\n"
            f"Услуга: {booking.service}\n"
            f"Дата: {booking.date} {booking.time}"
        )
        if car_part:
            text += car_part
        text += f"\nПримечание: {note}"
        db.add(
            Notification(
                id=f"n-{uuid4()}",
                recipient_role="worker",
                recipient_id=worker.id,
                message=text,
                read=False,
                created_at=_now(),
            )
        )
        _send_telegram_safe(worker.telegram_chat_id, text)


def _notify_workers_about_reschedule(
    db: Session,
    booking: Booking,
    worker_ids: set[str],
    previous_date: str,
    previous_time: str,
    previous_box: str,
) -> None:
    if not worker_ids:
        return
    workers = db.scalars(select(StaffUser).where(StaffUser.id.in_(worker_ids))).all()
    old_slot = (
        f"{_booking_datetime_label(previous_date, previous_time)} · {previous_box}"
    )
    new_slot = f"{_booking_datetime_label(booking.date, booking.time)} · {booking.box}"
    for worker in workers:
        car_part = ""
        if booking.car:
            car_part = f"\nАвто: {booking.car}"
            if booking.plate:
                car_part += f" ({booking.plate})"
        text = (
            "Администратор перенёс вашу запись\n"
            f"Клиент: {booking.client_name}\n"
            f"Услуга: {booking.service}"
        )
        if car_part:
            text += car_part
        text += f"\nБыло: {old_slot}\nСтало: {new_slot}"
        if booking.notes:
            text += f"\nПримечание администратора: {booking.notes}"
        db.add(
            Notification(
                id=f"n-{uuid4()}",
                recipient_role="worker",
                recipient_id=worker.id,
                message=text,
                read=False,
                created_at=_now(),
            )
        )
        _send_telegram_safe(worker.telegram_chat_id, text)


def _payroll_entry_label(kind: str) -> str:
    return {
        "bonus": "премия",
        "advance": "аванс",
        "deduction": "удержание",
        "payout": "выплата",
        "adjustment": "корректировка",
    }.get(kind, "операция")


def _notify_worker_about_payroll_entry(
    db: Session,
    worker: StaffUser,
    *,
    actor_role: str,
    actor_id: str,
    kind: str,
    amount: int,
    note: str,
) -> None:
    actor = (
        db.get(StaffUser, actor_id)
        if actor_role in {"owner", "admin", "worker", "accountant"}
        else None
    )
    actor_name = actor.name if actor is not None else "CRM"
    action_label = _payroll_entry_label(kind)
    note_suffix = f"\nПримечание: {note}" if note else ""
    message = (
        f"Изменение по зарплате\n"
        f"Операция: {action_label}\n"
        f"Сумма: {amount} ₽\n"
        f"Кто внёс: {actor_name}{note_suffix}"
    )
    db.add(
        Notification(
            id=f"n-{uuid4()}",
            recipient_role="worker",
            recipient_id=worker.id,
            message=message,
            read=False,
            created_at=_now(),
        )
    )
    _send_telegram_safe(worker.telegram_chat_id, message)


@app.get("/api/health", response_model=GenericMessage)
def health() -> GenericMessage:
    return GenericMessage(message="ok")


_content_cache: dict[str, Any] = {"data": None, "ts": 0.0}


def _default_content() -> ContentPayload:
    return ContentPayload(
        hero=ContentHeroPayload(),
        about=ContentAboutPayload(
            text=(
                "<b>\u2728 \u041e \u0441\u0442\u0443\u0434\u0438\u0438 ATMOSFERA</b>\n\n"
                "\u041c\u044b \u2014 \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0439 \u0434\u0435\u0442\u0435\u0439\u043b\u0438\u043d\u0433-\u0446\u0435\u043d\u0442\u0440 \u0432 \u041a\u0430\u0437\u0430\u043d\u0438.\n\n"
                "<b>\u041d\u0430\u0448\u0438 \u043f\u0440\u0435\u0438\u043c\u0443\u0449\u0435\u0441\u0442\u0432\u0430:</b>\n"
                "\U0001f6e0 \u041f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u0430\u044f \u043c\u043e\u0439\u043a\u0430 \u0438 \u0434\u0435\u0442\u0435\u0439\u043b\u0438\u043d\u0433\n"
                "\U0001f9fc \u0411\u0435\u0440\u0435\u0436\u043d\u044b\u0439 \u0443\u0445\u043e\u0434\n"
                "\U0001f4c5 \u0423\u0434\u043e\u0431\u043d\u043e\u0435 \u043e\u043d\u043b\u0430\u0439\u043d-\u0431\u0440\u043e\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435\n"
                "\U0001f468\u200d\U0001f52c \u041e\u043f\u044b\u0442\u043d\u044b\u0435 \u043c\u0430\u0441\u0442\u0435\u0440\u0430\n"
                "\u2b50 \u0418\u043d\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u043e\u0434\u0445\u043e\u0434"
            ),
            features=[
                "\u041f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u0430\u044f \u043c\u043e\u0439\u043a\u0430",
                "\u0414\u0435\u0442\u0435\u0439\u043b\u0438\u043d\u0433",
                "\u041e\u043d\u043b\u0430\u0439\u043d-\u0431\u0440\u043e\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435",
            ],
        ),
        services=[
            ContentServicePayload(
                title="\u042d\u043a\u0441\u043f\u0440\u0435\u0441\u0441-\u043c\u043e\u0439\u043a\u0430",
                subtitle="\u0411\u044b\u0441\u0442\u0440\u043e \u0438 \u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0435\u043d\u043d\u043e",
                description="\u041c\u043e\u0439\u043a\u0430 \u043a\u0443\u0437\u043e\u0432\u0430 \u0437\u0430 15 \u043c\u0438\u043d\u0443\u0442",
                price="\u041e\u0442 500 \u20bd",
                features=["\u041f\u0435\u043d\u0430", "\u041c\u043e\u0439\u043a\u0430", "\u0421\u0443\u0448\u043a\u0430"],
            ),
            ContentServicePayload(
                title="\u0425\u0438\u043c\u0447\u0438\u0441\u0442\u043a\u0430 \u0441\u0430\u043b\u043e\u043d\u0430",
                subtitle="\u0413\u043b\u0443\u0431\u043e\u043a\u0430\u044f \u043e\u0447\u0438\u0441\u0442\u043a\u0430",
                description="\u041f\u043e\u043b\u043d\u0430\u044f \u0445\u0438\u043c\u0447\u0438\u0441\u0442\u043a\u0430 \u0441\u0430\u043b\u043e\u043d\u0430",
                price="\u041e\u0442 3000 \u20bd",
                features=["\u041f\u044b\u043b\u0435\u0441\u043e\u0441", "\u041f\u0430\u0440", "\u041a\u043e\u0436\u0430"],
            ),
        ],
        works=[],
    )


def _get_or_create_content(db: Session) -> ContentPayload:
    row = db.get(AppSetting, "content")
    if row is None or not isinstance(row.value, dict):
        default = _default_content()
        db.add(AppSetting(key="content", value=default.model_dump()))
        db.flush()
        return default
    return ContentPayload.model_validate(row.value)


@app.get("/api/content", response_model=ContentPayload)
def get_public_content(
    db: Session = Depends(get_db),
) -> ContentPayload:
    return _get_or_create_content(db)


@app.put("/api/content", response_model=ContentPayload)
def save_content(
    payload: ContentPayload,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> ContentPayload:
    _ensure_staff_role(session_data, {"admin", "owner"})
    dumped = payload.model_dump()
    logger.info("Saving content: about.image=%s hero.backgroundImage=%s",
                dumped.get("about", {}).get("image"),
                dumped.get("hero", {}).get("backgroundImage"))
    _upsert_setting(db, "content", dumped)
    db.commit()
    logger.info("Content saved successfully")
    return payload


ALLOWED_UPLOAD_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}


@app.post("/api/upload")
async def upload_file(
    file: UploadFile = ...,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> dict:
    _ensure_staff_role(session_data, {"admin", "owner"})
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Недопустимый формат файла: {ext}")
    unique_name = f"{uuid4().hex}{ext}"
    dest = UPLOAD_DIR / unique_name
    content = await file.read()
    dest.write_bytes(content)
    mime = file.content_type or "application/octet-stream"
    db.add(UploadedFile(id=Path(unique_name).stem, filename=file.filename or unique_name, mime_type=mime, data=content))
    db.commit()
    return {"url": f"/api/uploads/{unique_name}"}


@app.get("/api/uploads/{filename}")
async def serve_upload(filename: str, db: Session = Depends(get_db)) -> Response:
    if "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    stem = Path(filename).stem
    record = db.get(UploadedFile, stem)
    if record is not None:
        return Response(content=record.data, media_type=record.mime_type)
    dest = UPLOAD_DIR / filename
    if not dest.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(dest)


@app.post("/api/contact", response_model=GenericMessage)
def submit_contact(
    payload: ContactPayload,
    db: Session = Depends(get_db),
) -> GenericMessage:
    name = (payload.name or "").strip()
    phone = (payload.phone or "").strip()
    service = (payload.service or "").strip()
    message_text = (payload.message or "").strip()
    parts = [f"✉️ <b>Новая заявка с сайта</b>\n"]
    if name:
        parts.append(f"<b>Имя:</b> {name}")
    if phone:
        parts.append(f"<b>Телефон:</b> {phone}")
    if service:
        parts.append(f"<b>Услуга:</b> {service}")
    if message_text:
        parts.append(f"<b>Сообщение:</b> {message_text}")
    text = "\n".join(parts)
    owners = _all_owner_telegram_recipients(db)
    for owner in owners:
        send_telegram_message(owner.telegram_chat_id, text)
    return GenericMessage(message="Заявка отправлена")


@app.post(settings.telegram_webhook_path, response_model=GenericMessage)
def handle_telegram_webhook(
    payload: dict[str, Any],
    telegram_secret: str | None = Header(
        default=None, alias="X-Telegram-Bot-Api-Secret-Token"
    ),
) -> GenericMessage:
    if not settings.telegram_bot_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram bot is not configured",
        )
    expected_secret = telegram_webhook_secret()
    if not telegram_secret or not hmac_mod.compare_digest(telegram_secret, expected_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram webhook secret",
        )
    try:
        process_telegram_update(payload)
    except Exception:
        logger.exception("Telegram webhook handler failed")
    return GenericMessage(message="ok")


@app.post("/api/telegram/webhook/sync", response_model=GenericMessage)
def resync_telegram_webhook(
    session_data: dict = Depends(_require_session),
) -> GenericMessage:
    _ensure_staff_role(session_data, {"owner"})
    if settings.telegram_delivery_mode != "webhook":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Telegram delivery mode is not webhook",
        )
    if not settings.telegram_bot_token or not settings.webapp_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Configure TELEGRAM_BOT_TOKEN and WEBAPP_URL before syncing webhook",
        )
    username = sync_telegram_webhook(drop_pending_updates=False)
    return GenericMessage(message=f"Telegram webhook synced for @{username or 'bot'}")


@app.get("/api/owner/exports/{kind}")
def download_owner_export(
    kind: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> Response:
    _ensure_staff_role(session_data, {"owner", "accountant"})
    export_file = _owner_export_file(db, session_data["actorId"], kind)
    return _download_response(export_file)


@app.post(
    "/api/owner/exports/{kind}/telegram", response_model=OwnerExportDeliveryPayload
)
def send_owner_export_to_telegram(
    kind: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> Response:
    _ensure_staff_role(session_data, {"owner", "accountant"})
    export_file = _owner_export_file(db, session_data["actorId"], kind)
    try:
        result = _send_export_to_telegram(db, session_data["actorId"], export_file)
        db.commit()
        return Response(
            content=result.model_dump_json(),
            status_code=status.HTTP_200_OK,
            media_type="application/json",
        )
    except _PartialBroadcastError as exc:
        db.commit()
        return Response(
            content=exc.payload.model_dump_json(),
            status_code=status.HTTP_207_MULTI_STATUS,
            media_type="application/json",
        )


@app.post(
    "/api/owner/reports/{period}/{segment}/telegram", response_model=GenericMessage
)
def send_owner_summary_report_to_telegram(
    period: str,
    segment: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> Response:
    _ensure_staff_role(session_data, {"owner", "accountant"})
    report = _owner_summary_report(db, session_data["actorId"], period, segment)
    export_file = _owner_summary_export_file(
        db, session_data["actorId"], period, segment
    )
    return _send_owner_summary_report(db, session_data["actorId"], report, export_file)


@app.post("/api/owner/reminders/dispatch", response_model=OwnerReminderDispatchPayload)
def dispatch_owner_booking_reminders(
    payload: OwnerReminderDispatchRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerReminderDispatchPayload:
    _ensure_staff_role(session_data, {"owner"})
    response = _dispatch_booking_reminders(
        db, target_date=payload.targetDate, force=payload.force
    )
    return_visit_count = _dispatch_return_visit_reminders(db)
    response.clientReminders += return_visit_count
    if return_visit_count:
        response.message = (
            f"{response.message} Клиентов на возврат: {return_visit_count}."
        )
    db.commit()
    return response


@app.post("/api/owner/inactive-clients/remind-admin", response_model=GenericMessage)
def remind_admin_about_inactive_clients(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    _ensure_staff_role(session_data, {"owner"})
    cutoff = datetime.now() - timedelta(days=5)
    inactive: list[str] = []
    clients = db.scalars(
        select(Client).order_by(Client.updated_at.desc(), Client.created_at.desc())
    ).all()
    for client in clients:
        bookings = db.scalars(
            select(Booking)
            .where(Booking.client_id == client.id, Booking.status == "completed")
            .order_by(Booking.created_at.desc())
        ).all()
        if not bookings:
            continue
        last_booking = bookings[0]
        last_visit = _parse_booking_datetime(
            last_booking.date, last_booking.time
        ) or _as_utc(last_booking.created_at).replace(tzinfo=None)
        if last_visit <= cutoff:
            inactive.append(
                f"• {client.name} ({client.phone}) - последний визит {last_booking.date}"
            )
    if not inactive:
        return GenericMessage(
            message="Клиентов без визита более двух недель не найдено"
        )
    text = "Нужно обзвонить клиентов, которые не были более двух недель\n" + "\n".join(
        inactive[:12]
    )
    admins = db.scalars(
        select(StaffUser).where(StaffUser.role == "admin", StaffUser.active.is_(True))
    ).all()
    for admin in admins:
        db.add(
            Notification(
                id=f"n-{uuid4()}",
                recipient_role="admin",
                recipient_id=admin.id,
                message=text,
                read=False,
                created_at=_now(),
            )
        )
        _send_telegram_safe(admin.telegram_chat_id, text)
    db.commit()
    return GenericMessage(
        message=f"Админу отправлено напоминание по {len(inactive)} клиентам"
    )


@app.post("/api/cron/reminders", response_model=OwnerReminderDispatchPayload)
def run_booking_reminders_cron(
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> OwnerReminderDispatchPayload:
    if not settings.cron_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRON_SECRET is not configured",
        )
    if not authorization or not hmac_mod.compare_digest(authorization, f"Bearer {settings.cron_secret}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid cron secret"
        )
    import ipaddress
    client_ip = _request_ip(request)
    if client_ip:
        try:
            ip = ipaddress.ip_address(client_ip)
            if not (ip.is_loopback or ip.is_private):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cron endpoint not accessible from public networks",
                )
        except ValueError:
            pass
    response = _dispatch_booking_reminders(db)
    return_visit_count = _dispatch_return_visit_reminders(db)
    response.clientReminders += return_visit_count
    if return_visit_count:
        response.message = (
            f"{response.message} Клиентов на возврат: {return_visit_count}."
        )
    db.commit()
    return response


@app.post("/api/cron/reports", response_model=GenericMessage)
def run_reports_cron(
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> GenericMessage:
    """Автоматическая отправка ежедневного и еженедельного отчётов владельцам."""
    if not settings.cron_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRON_SECRET is not configured",
        )
    if not authorization or not hmac_mod.compare_digest(authorization, f"Bearer {settings.cron_secret}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid cron secret"
        )

    owner_settings = _setting(
        db,
        "owner_notification_settings",
        {
            "telegramBot": True,
            "emailReports": True,
            "smsReminders": False,
            "lowStock": True,
            "dailyReport": True,
            "weeklyReport": False,
            "bookingReminders": True,
        },
    )

    telegram_recipients = _all_owner_telegram_recipients(db)
    all_owners = _all_active_owners(db)
    if not telegram_recipients and not all_owners:
        return GenericMessage(message="Нет получателей с привязанным Telegram")

    sent: list[str] = []
    today = datetime.now()
    is_saturday = today.weekday() == 5
    first_owner_id = (telegram_recipients[0] if telegram_recipients else all_owners[0]).id

    for segment in ("wash", "detailing"):
        if owner_settings.get("dailyReport", True):
            try:
                report = _owner_summary_report(db, first_owner_id, "daily", segment)
                export_file = _owner_summary_export_file(db, first_owner_id, "daily", segment)
                # Send Telegram to recipients who have chat_id
                for recipient in telegram_recipients:
                    try:
                        send_telegram_document(
                            recipient.telegram_chat_id,
                            file_name=export_file.file_name,
                            content=export_file.content,
                            caption=export_file.telegram_caption,
                            mime_type=export_file.media_type.split(";", 1)[0],
                        )
                        sent.append(f"daily/{segment}")
                    except Exception:
                        logger.exception("Cron: failed to send daily/%s to %s", segment, recipient.id)
                # Create in-app notifications for ALL active owners
                for owner in all_owners:
                    db.add(
                        Notification(
                            id=f"n-{uuid4()}",
                            recipient_role="owner",
                            recipient_id=owner.id,
                            message=report.message,
                            read=False,
                            created_at=_now(),
                        )
                    )
            except Exception:
                logger.exception("Cron: failed to build daily/%s report", segment)

        if owner_settings.get("weeklyReport", False) and is_saturday:
            try:
                report = _owner_summary_report(db, first_owner_id, "weekly", segment)
                export_file = _owner_summary_export_file(db, first_owner_id, "weekly", segment)
                for recipient in telegram_recipients:
                    try:
                        send_telegram_document(
                            recipient.telegram_chat_id,
                            file_name=export_file.file_name,
                            content=export_file.content,
                            caption=export_file.telegram_caption,
                            mime_type=export_file.media_type.split(";", 1)[0],
                        )
                        sent.append(f"weekly/{segment}")
                    except Exception:
                        logger.exception("Cron: failed to send weekly/%s to %s", segment, recipient.id)
                for owner in all_owners:
                    db.add(
                        Notification(
                            id=f"n-{uuid4()}",
                            recipient_role="owner",
                            recipient_id=owner.id,
                            message=report.message,
                            read=False,
                            created_at=_now(),
                        )
                    )
            except Exception:
                logger.exception("Cron: failed to build weekly/%s report", segment)

    db.commit()
    if sent:
        return GenericMessage(message=f"Отчёты отправлены: {', '.join(sent)}")
    return GenericMessage(message="Нет отчётов для отправки")


def _create_weekly_archive(db: Session) -> str | None:
    today = date.today()
    days_since_saturday = (today.weekday() - 5) % 7
    last_saturday = today - timedelta(days=days_since_saturday + 7)
    last_friday = last_saturday + timedelta(days=6)

    week_start_str = last_saturday.isoformat()
    week_end_str = last_friday.isoformat()

    existing = db.scalars(
        select(WeeklyArchive).where(WeeklyArchive.week_start == week_start_str)
    ).first()
    if existing:
        return None

    week_incomes = db.scalars(
        select(Income).where(Income.date >= week_start_str, Income.date <= week_end_str)
    ).all()
    week_expenses = db.scalars(
        select(Expense).where(Expense.date >= week_start_str, Expense.date <= week_end_str)
    ).all()
    week_bookings = db.scalars(
        select(Booking).where(
            Booking.status == "completed",
            Booking.deleted_at.is_(None),
            Booking.date >= week_start_str,
            Booking.date <= week_end_str,
        )
    ).all()
    all_piggy = db.scalars(select(PiggyBankTransaction)).all()
    piggy_balance = sum(t.amount for t in all_piggy)

    archive = WeeklyArchive(
        week_start=week_start_str,
        week_end=week_end_str,
        total_revenue=sum(b.price for b in week_bookings),
        total_income=sum(i.amount for i in week_incomes),
        total_expense=sum(e.amount for e in week_expenses),
        booking_count=len(week_bookings),
        income_count=len(week_incomes),
        expense_count=len(week_expenses),
        piggy_bank_balance=piggy_balance,
    )
    db.add(archive)
    db.commit()

    return (
        f"Архив за неделю {week_start_str} — {week_end_str} создан: "
        f"выручка {archive.total_revenue}₽, "
        f"доходы {archive.total_income}₽, "
        f"расходы {archive.total_expense}₽, "
        f"записей {archive.booking_count}"
    )


def _run_weekly_archive_scheduler() -> None:
    while True:
        try:
            db = next(get_db())
            try:
                msg = _create_weekly_archive(db)
                if msg:
                    logger.info("Weekly archive: %s", msg)
            finally:
                db.close()
        except Exception:
            logger.exception("Weekly archive scheduler error")
        time_module.sleep(3600)  # Check every hour


@app.on_event("startup")
def _start_weekly_archive_thread() -> None:
    thread = Thread(target=_run_weekly_archive_scheduler, name="weekly-archive", daemon=True)
    thread.start()


@app.post("/api/cron/weekly-archive", response_model=GenericMessage)
def run_weekly_archive_cron(
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> GenericMessage:
    if not settings.cron_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRON_SECRET is not configured",
        )
    if not authorization or not hmac_mod.compare_digest(authorization, f"Bearer {settings.cron_secret}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid cron secret"
        )

    import ipaddress
    client_ip = _request_ip(request)
    if client_ip:
        try:
            ip = ipaddress.ip_address(client_ip)
            if not (ip.is_loopback or ip.is_private):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cron endpoint not accessible from public networks",
                )
        except ValueError:
            pass

    msg = _create_weekly_archive(db)
    if msg is None:
        today = date.today()
        last_saturday = today - timedelta(days=((today.weekday() - 5) % 7) + 7)
        return GenericMessage(message=f"Архив за неделю {last_saturday.isoformat()} уже существует")
    return GenericMessage(message=msg)


@app.post(
    "/api/owner/database-reset/start", response_model=OwnerDatabaseResetStartPayload
)
def start_owner_database_reset(
    payload: OwnerDatabaseResetStartRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerDatabaseResetStartPayload:
    _ensure_staff_role(session_data, {"owner"})
    owner = db.get(StaffUser, session_data["actorId"])
    if owner is None or owner.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found"
        )
    if not verify_password(payload.password, owner.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Текущий пароль неверный"
        )

    recipient_owner = _owner_two_factor_recipient(db)
    generated_code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = _now() + timedelta(minutes=OWNER_DATABASE_RESET_CODE_LIFETIME_MINUTES)
    request_id = str(uuid4())
    preview = _owner_database_reset_preview(
        db, current_session_id=session_data.get("sessionId")
    )
    warnings = _owner_database_reset_warnings(preview)

    _save_owner_database_reset_state(
        db,
        {
            "requestId": request_id,
            "requestedBy": owner.id,
            "requestedByLogin": owner.login,
            "requestedByName": owner.name,
            "codeHash": hash_one_time_code(generated_code, settings.app_secret),
            "codeExpiresAt": _serialize_state_datetime(expires_at),
            "approvedAt": None,
            "finalizeAfter": None,
            "createdAt": _serialize_state_datetime(_now()),
        },
    )
    try:
        send_telegram_message(
            recipient_owner.telegram_chat_id,
            (
                "Запрошена полная очистка CRM\n"
                f"Инициатор: {owner.name} ({owner.login})\n"
                f"Код подтверждения: {generated_code}\n"
                "Код действует 10 минут.\n"
                "Подтверждайте только если действительно хотите удалить клиентов, записи, склад, расходы, "
                "жалобы, сотрудников и настройки CRM."
            ),
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Не удалось отправить код создателю в Telegram. Проверьте доступность бота и Telegram создателя.",
        ) from exc
    db.commit()
    return OwnerDatabaseResetStartPayload(
        requestId=request_id,
        creatorCodeExpiresAt=expires_at,
        confirmationPhrase=OWNER_DATABASE_RESET_CONFIRMATION_PHRASE,
        preview=preview,
        warnings=warnings,
        message="Код подтверждения отправлен создателю в Telegram. Проверьте список того, что будет удалено.",
    )


@app.post(
    "/api/owner/database-reset/approve", response_model=OwnerDatabaseResetApprovePayload
)
def approve_owner_database_reset(
    payload: OwnerDatabaseResetApproveRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerDatabaseResetApprovePayload:
    _ensure_staff_role(session_data, {"owner"})
    state = _owner_database_reset_state(db)
    if state is None or state.get("requestId") != payload.requestId:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Запрос на очистку не найден. Начните заново.",
        )
    if state.get("requestedBy") != session_data["actorId"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Этот запрос на очистку создан другим владельцем.",
        )

    if (
        _normalize_database_reset_phrase(payload.confirmationPhrase)
        != OWNER_DATABASE_RESET_CONFIRMATION_PHRASE
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Введите фразу точно: {OWNER_DATABASE_RESET_CONFIRMATION_PHRASE}",
        )

    code_expires_at = _parse_state_datetime(state.get("codeExpiresAt"))
    code_hash = str(state.get("codeHash") or "")
    if not code_hash or code_expires_at is None or code_expires_at < _now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Код создателя истёк. Запросите новый.",
        )
    if not payload.creatorCode.strip().isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Введите 6-значный код от создателя.",
        )
    if not verify_one_time_code(
        payload.creatorCode.strip(), code_hash, settings.app_secret
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Код создателя неверный."
        )

    finalize_after = _now() + timedelta(seconds=OWNER_DATABASE_RESET_DELAY_SECONDS)
    state["approvedAt"] = _serialize_state_datetime(_now())
    state["finalizeAfter"] = _serialize_state_datetime(finalize_after)
    state["codeHash"] = None
    state["codeExpiresAt"] = None
    _save_owner_database_reset_state(db, state)
    preview = _owner_database_reset_preview(db)
    warnings = _owner_database_reset_warnings(preview)
    db.commit()
    return OwnerDatabaseResetApprovePayload(
        requestId=payload.requestId,
        finalizeAfter=finalize_after,
        preview=preview,
        warnings=warnings,
        message="Финальный шаг разблокируется через 10 секунд. Ещё раз проверьте, что именно будет удалено.",
    )


@app.post(
    "/api/owner/database-reset/execute", response_model=OwnerDatabaseResetExecutePayload
)
def execute_owner_database_reset(
    payload: OwnerDatabaseResetExecuteRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerDatabaseResetExecutePayload:
    _ensure_staff_role(session_data, {"owner"})
    state = _owner_database_reset_state(db)
    if state is None or state.get("requestId") != payload.requestId:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Запрос на очистку не найден. Начните заново.",
        )
    if state.get("requestedBy") != session_data["actorId"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Этот запрос на очистку создан другим владельцем.",
        )

    finalize_after = _parse_state_datetime(state.get("finalizeAfter"))
    if finalize_after is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Сначала подтвердите пароль, код создателя и фразу.",
        )
    if finalize_after > _now():
        seconds_left = max(1, int((finalize_after - _now()).total_seconds()) + 1)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Финальная кнопка ещё заблокирована. Подождите {seconds_left} сек.",
        )

    preview = _owner_database_reset_preview(db)
    _perform_owner_database_reset(db)
    db.commit()
    return OwnerDatabaseResetExecutePayload(
        message="Полная очистка CRM завершена. Владельцы сохранены, остальные данные сброшены до стартового состояния.",
        preview=preview,
    )


@app.post("/api/auth/client", response_model=BootstrapPayload)
def register_or_login_client(
    payload: ClientRegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> BootstrapPayload:
    authorization = request.headers.get("authorization", "")
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing initData"
        )
    try:
        validated = validate_telegram_init_data(authorization, settings.telegram_bot_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        )
    telegram_user = validated.get("user") or {}
    telegram_id = str(telegram_user.get("id")) if telegram_user.get("id") is not None else ""
    if not telegram_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Telegram user is missing"
        )
    existing = db.scalar(
        select(Client).where(
            Client.telegram_id == telegram_id,
            Client.deleted_at.is_(None),
        )
    )
    if existing:
        return _build_bootstrap(db, {
            "role": "client",
            "actorId": existing.id,
            "displayName": existing.name,
            "sessionId": "",
        })
    try:
        normalized_car = normalize_vehicle_name(payload.car)
        normalized_plate = normalize_plate(payload.plate)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        )
    client = Client(
        id=f"c-{uuid4()}",
        telegram_id=telegram_id,
        name=payload.name,
        phone=payload.phone,
        car=normalized_car,
        plate=normalized_plate,
    )
    db.add(client)
    db.commit()
    return _build_bootstrap(db, {
        "role": "client",
        "actorId": client.id,
        "displayName": client.name,
        "sessionId": "",
    })


@app.post("/api/auth/staff/link", response_model=BootstrapPayload)
def link_staff_account(
    payload: StaffLinkRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> BootstrapPayload:
    authorization = request.headers.get("authorization", "")
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing initData"
        )
    try:
        validated = validate_telegram_init_data(authorization, settings.telegram_bot_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        )
    telegram_user = validated.get("user") or {}
    telegram_id = str(telegram_user.get("id")) if telegram_user.get("id") is not None else ""
    if not telegram_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Telegram user is missing"
        )
    staff = db.scalar(
        select(StaffUser).where(StaffUser.login == payload.login.strip().lower())
    )
    if staff is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль"
        )
    if not verify_password(payload.password, staff.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль"
        )
    if staff.role not in {"admin", "worker", "owner", "accountant"} or not staff.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Доступ к аккаунту отключён"
        )
    staff.telegram_chat_id = telegram_id
    staff.updated_at = _now()
    db.commit()
    return _build_bootstrap(db, {
        "role": staff.role,
        "actorId": staff.id,
        "login": staff.login,
        "displayName": staff.name,
        "sessionId": "",
    })


@app.post("/api/auth/telegram", response_model=BootstrapPayload)
def authenticate_via_telegram(
    request: Request,
    db: Session = Depends(get_db),
) -> BootstrapPayload:
    authorization = request.headers.get("authorization", "")
    session_data = _resolve_user_from_init_data(authorization, db)
    if session_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Аккаунт для этого Telegram ещё не привязан. Сначала завершите регистрацию или привязку профиля.",
        )
    return _build_bootstrap(db, session_data)


@app.post("/api/auth/telegram-owner", response_model=BootstrapPayload)
def authenticate_primary_owner_via_telegram(
    request: Request,
    db: Session = Depends(get_db),
) -> BootstrapPayload:
    authorization = request.headers.get("authorization", "")
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing initData"
        )
    try:
        validated = validate_telegram_init_data(authorization, settings.telegram_bot_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        )
    telegram_user = validated.get("user") or {}
    telegram_id = str(telegram_user.get("id")) if telegram_user.get("id") is not None else ""
    if not telegram_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Telegram user is missing"
        )
    owner = _primary_owner(db)
    if owner is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Главный владелец не настроен"
        )
    current_chat_id = _safe_text(owner.telegram_chat_id).strip()
    if not current_chat_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Telegram создателя ещё не привязан. Сначала войдите по логину и привяжите Telegram через CRM.",
        )
    if current_chat_id != telegram_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Этот Telegram не привязан к создателю"
        )
    if not owner.name.strip():
        owner.name = _telegram_display_name(telegram_user, "Создатель")
    return _build_bootstrap(db, {
        "role": owner.role,
        "actorId": owner.id,
        "login": owner.login,
        "displayName": owner.name,
        "sessionId": "",
    })


def _extract_telegram_id_from_init_data(authorization: str) -> str:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing initData")
    try:
        validated = validate_telegram_init_data(authorization, settings.telegram_bot_token)
    except ValueError:
        if settings.allow_insecure_client_auth:
            try:
                validated = validate_telegram_init_data(
                    authorization, settings.telegram_bot_token, skip_validation=True
                )
            except ValueError as exc:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid initData")
    telegram_user = validated.get("user") or {}
    telegram_id = str(telegram_user.get("id")) if telegram_user.get("id") is not None else ""
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Telegram user is missing")
    return telegram_id


@app.get("/api/auth/consent/check", response_model=ConsentCheckResponse)
def check_data_consent(
    request: Request,
    db: Session = Depends(get_db),
) -> ConsentCheckResponse:
    authorization = request.headers.get("authorization", "")
    telegram_id = _extract_telegram_id_from_init_data(authorization)
    consent = db.scalar(select(DataConsent).where(DataConsent.telegram_id == telegram_id))
    return ConsentCheckResponse(consented=consent is not None)


@app.post("/api/auth/consent", response_model=ConsentRecordPayload)
def record_data_consent(
    request: Request,
    db: Session = Depends(get_db),
) -> ConsentRecordPayload:
    authorization = request.headers.get("authorization", "")
    telegram_id = _extract_telegram_id_from_init_data(authorization)
    existing = db.scalar(select(DataConsent).where(DataConsent.telegram_id == telegram_id))
    if existing is not None:
        return ConsentRecordPayload(consented=True, consentedAt=existing.consented_at.isoformat())
    consent = DataConsent(telegram_id=telegram_id)
    db.add(consent)
    db.commit()
    return ConsentRecordPayload(consented=True, consentedAt=consent.consented_at.isoformat())


@app.get("/api/auth/session", response_model=BootstrapPayload)
def get_session_bootstrap(
    session_data: dict = Depends(_require_session), db: Session = Depends(get_db)
) -> BootstrapPayload:
    return _build_bootstrap(db, session_data)


@app.get("/api/auth/sessions", response_model=list[AuthSessionPayload])
def get_active_sessions(
    session_data: dict = Depends(_require_session),
) -> list[AuthSessionPayload]:
    return []


@app.post("/api/auth/sessions/{session_id}/revoke", response_model=GenericMessage)
def revoke_active_session(
    session_id: str,
    session_data: dict = Depends(_require_session),
) -> GenericMessage:
    return GenericMessage(message="Сессия завершена")


@app.post("/api/auth/logout", response_model=GenericMessage)
def logout(
    session_data: dict = Depends(_require_session),
) -> GenericMessage:
    return GenericMessage(message="Выход выполнен")


@app.post("/api/auth/switch-role", response_model=BootstrapPayload)
def switch_role(
    payload: SwitchRoleRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> BootstrapPayload:
    current_role = session_data["role"]
    if current_role not in {"owner", "admin", "worker", "accountant"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Недоступно для этой роли"
        )
    staff = db.scalar(select(StaffUser).where(StaffUser.id == session_data["actorId"]))
    if staff is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Сотрудник не найден"
        )
    allowed = {staff.role, *(staff.extra_roles or [])}
    if payload.targetRole not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Роль недоступна"
        )
    return _build_bootstrap(db, {
        "role": payload.targetRole,
        "actorId": staff.id,
        "login": staff.login,
        "displayName": staff.name,
        "sessionId": "",
    })


@app.patch("/api/clients/me", response_model=ClientProfilePayload)
def update_client_profile(
    payload: ClientProfileInput,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> ClientProfilePayload:
    if session_data["role"] != "client":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    client = db.get(Client, session_data["actorId"])
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Client not found"
        )
    try:
        normalized_car = normalize_vehicle_name(payload.car)
        normalized_plate = normalize_plate(payload.plate)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    vehicles = _normalize_client_vehicles(
        payload.vehicles, fallback_car=normalized_car, fallback_plate=normalized_plate
    )
    primary_vehicle = (
        vehicles[0] if vehicles else ClientVehiclePayload(car="", plate="")
    )
    phone_client = _client_by_phone(db, payload.phone)
    if phone_client is not None and phone_client.id != client.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Клиент с таким номером телефона уже зарегистрирован",
        )
    client.name = payload.name
    client.phone = payload.phone
    client.car = primary_vehicle.car
    client.plate = primary_vehicle.plate
    client.registered = payload.registered
    client.updated_at = _now()
    _save_client_vehicles(db, client.id, vehicles)
    db.commit()
    db.refresh(client)
    return _client_payload(client)  # type: ignore[return-value]


@app.post("/api/clients", response_model=ClientSummaryPayload)
def create_client(
    payload: ClientCreateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> ClientSummaryPayload:
    _ensure_staff_role(session_data, {"admin", "owner"})
    existing_client = _client_by_phone(db, payload.phone)
    if existing_client is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Клиент с таким номером телефона уже зарегистрирован",
        )

    vehicles = _normalize_client_vehicles(
        [{"car": payload.car, "plate": payload.plate}],
        fallback_car=payload.car,
        fallback_plate=payload.plate,
    )
    primary_vehicle = (
        vehicles[0] if vehicles else ClientVehiclePayload(car="", plate="")
    )
    client = Client(
        id=f"c-{uuid4()}",
        name=payload.name,
        phone=payload.phone,
        car=primary_vehicle.car,
        plate=primary_vehicle.plate,
        notes=payload.notes.strip(),
        referral_source=payload.referralSource.strip(),
        registered=True,
    )
    db.add(client)
    db.flush()
    _save_client_vehicles(db, client.id, vehicles)
    db.commit()
    db.refresh(client)
    return _client_summary_payload(client, db)


@app.patch("/api/clients/{client_id}/card", response_model=ClientSummaryPayload)
def update_client_card(
    client_id: str,
    payload: ClientCardUpdateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> ClientSummaryPayload:
    _ensure_staff_role(session_data, {"admin", "owner"})
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден"
        )
    updates = payload.model_dump(exclude_unset=True)
    if "notes" in updates and updates["notes"] is not None:
        client.notes = updates["notes"].strip()
    if "debtBalance" in updates and updates["debtBalance"] is not None:
        client.debt_balance = int(updates["debtBalance"])
    if "adminRating" in updates and updates["adminRating"] is not None:
        client.admin_rating = max(0, min(5, int(updates["adminRating"])))
    if "adminNote" in updates and updates["adminNote"] is not None:
        client.admin_note = updates["adminNote"].strip()
    if "referralSource" in updates and updates["referralSource"] is not None:
        client.referral_source = updates["referralSource"].strip()
    if "name" in updates and updates["name"] is not None:
        client.name = updates["name"].strip()
    if "phone" in updates and updates["phone"] is not None:
        client.phone = updates["phone"].strip()
    if "car" in updates and updates["car"] is not None:
        client.car = updates["car"].strip()
    if "plate" in updates and updates["plate"] is not None:
        client.plate = updates["plate"].strip()
    client.updated_at = _now()
    db.commit()
    db.refresh(client)
    return _client_summary_payload(client, db)


@app.delete("/api/clients/{client_id}", response_model=GenericMessage)
def delete_client(
    client_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    _ensure_staff_role(session_data, {"admin", "owner"})
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден"
        )
    db.execute(
        sa_delete(Notification).where(
            Notification.recipient_role == "client",
            Notification.recipient_id == client_id,
        )
    )
    client_bookings = (
        db.scalars(
            select(Booking)
            .options(joinedload(Booking.worker_links))
            .where(Booking.client_id == client_id)
        )
        .unique()
        .all()
    )
    for booking in client_bookings:
        booking.deleted_at = _now()
    vehicles_map = _client_vehicles_map(db)
    if client_id in vehicles_map:
        vehicles_map.pop(client_id, None)
        _upsert_setting(db, "client_vehicles", vehicles_map)
    client.deleted_at = _now()
    db.commit()
    return GenericMessage(message="Клиент удалён")


@app.get("/api/bookings/availability", response_model=BookingAvailabilityPayload)
def get_booking_availability(
    date: str,
    duration: int = 30,
    serviceId: str | None = None,
    resourceGroup: str | None = None,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> BookingAvailabilityPayload:
    if session_data["role"] not in {"client", "admin", "owner", "accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return _booking_slot_availability(
        db,
        date_value=date,
        duration=max(1, duration),
        service_id=serviceId,
        resource_group=resourceGroup,
    )


@app.post("/api/bookings", response_model=BookingPayload)
def create_booking(
    payload: BookingCreateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> BookingPayload:
    if session_data["role"] not in {"client", "admin", "owner", "accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    service = db.get(Service, payload.serviceId) if payload.serviceId else None
    booking_service = payload.service
    booking_service_id = payload.serviceId
    booking_duration = payload.duration
    booking_price = payload.price
    booking_date = payload.date.strip()
    booking_time = payload.time.strip()
    booking_box = payload.box.strip()
    is_box_rental = _is_box_rental_service(service)
    service_resource_group = _service_resource_group(service)

    if session_data["role"] == "client":
        client = db.get(Client, session_data["actorId"])
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Client not found"
            )
        if service is None or not service.active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Услуга не найдена или недоступна",
            )
        booking_client_name = client.name
        booking_client_phone = client.phone
        booking_car = client.car or ""
        booking_plate = client.plate or ""
        booking_service = service.name
        booking_service_id = service.id
        booking_duration = service.duration
        booking_price = service.price
        if is_box_rental:
            requested_hours = max(1, (payload.duration + 59) // 60)
            booking_duration = requested_hours * 60
    else:
        normalized_client_name = payload.clientName.strip()
        normalized_client_phone = (
            normalize_phone(payload.clientPhone) if payload.clientPhone.strip() else ""
        )
        client = db.get(Client, payload.clientId) if payload.clientId else None
        phone_client = (
            _client_by_phone(db, normalized_client_phone)
            if normalized_client_phone
            else None
        )
        if (
            client is not None
            and phone_client is not None
            and phone_client.id != client.id
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Клиент с таким номером уже зарегистрирован на другой профиль",
            )
        if client is None and phone_client is not None:
            client = phone_client
        if client is None:
            client = Client(
                id=payload.clientId or f"c-{uuid4()}",
                name=normalized_client_name,
                phone=normalized_client_phone,
                car=payload.car or "",
                plate=payload.plate or "",
                registered=True,
            )
            db.add(client)
        else:
            if normalized_client_name:
                client.name = normalized_client_name
            if normalized_client_phone:
                client.phone = normalized_client_phone
            if payload.car:
                client.car = payload.car
            if payload.plate:
                client.plate = payload.plate
            client.registered = True
            client.updated_at = _now()
        db.flush()
        booking_client_name = client.name
        booking_client_phone = client.phone
        booking_car = client.car or ""
        booking_plate = client.plate or ""
        if service is not None:
            booking_service = service.name
            booking_service_id = service.id

    booking_workers = (
        []
        if session_data["role"] == "client"
        else _validated_booking_workers(db, payload.workers)
    )
    booking_status = "new" if session_data["role"] == "client" else payload.status

    requires_scheduled_slot = _booking_requires_scheduled_slot(booking_status)
    if requires_scheduled_slot:
        _ensure_booking_datetime_not_in_past(booking_date, booking_time, session_data["role"])
        _ensure_booking_within_schedule(
            db, booking_date, booking_time, booking_duration
        )
    if session_data["role"] == "client" and requires_scheduled_slot:
        available_box = _pick_available_box(
            db,
            booking_id=None,
            date_value=booking_date,
            time_value=booking_time,
            duration=booking_duration,
            resource_group=service_resource_group,
            preferred_box=booking_box or None,
        )
        if available_box is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="На это время нет свободных мест в нужном помещении",
            )
        booking_box = available_box
        if is_box_rental:
            booking_price = _box_hourly_price(
                db, booking_box, service.price if service is not None else booking_price
            ) * max(1, booking_duration // 60)
    elif booking_box:
        compatible_boxes = _compatible_box_names(db, service_resource_group)
        if compatible_boxes:
            if booking_box not in compatible_boxes:
                booking_box = compatible_boxes[0]
        elif requires_scheduled_slot:
            picked = _pick_available_box(
                db,
                booking_id=None,
                date_value=booking_date,
                time_value=booking_time,
                duration=booking_duration,
                resource_group=service_resource_group,
            )
            if picked is not None:
                booking_box = picked
    elif requires_scheduled_slot and not booking_box:
        booking_box = _pick_available_box(
            db,
            booking_id=None,
            date_value=booking_date,
            time_value=booking_time,
            duration=booking_duration,
            resource_group=service_resource_group,
        )
    _ensure_booking_has_no_conflicts(
        db,
        booking_id=None,
        date_value=booking_date,
        time_value=booking_time,
        duration=booking_duration,
        box=booking_box,
        worker_ids={worker.workerId for worker in booking_workers},
        status_value=booking_status,
    )

    booking = Booking(
        id=f"b-{uuid4()}",
        client_id=client.id,
        client_name=booking_client_name,
        client_phone=booking_client_phone,
        service=booking_service,
        service_id=booking_service_id,
        date=booking_date,
        time=booking_time,
        duration=booking_duration,
        price=booking_price,
        status=booking_status,
        box=booking_box,
        payment_type=payload.paymentType,
        payment_settled=payload.paymentSettled,
        services=[],
        notes=payload.notes,
        car=booking_car,
        plate=booking_plate,
        created_at=_now(),
    )
    db.add(booking)
    db.flush()
    _sync_booking_workers(db, booking, booking_workers)
    if session_data["role"] in {"admin", "owner"} and payload.notifyWorkers:
        _notify_workers_about_assignment(
            db, booking, {link.worker_id for link in booking.worker_links}
        )
    if session_data["role"] == "client":
        client_message = f"Заявка на {booking_service} создана на {booking_date} в {booking_time}. Статус: {_booking_status_label(booking_status)}"
        db.add_all(
            [
                Notification(
                    id=f"n-{uuid4()}",
                    recipient_role="client",
                    recipient_id=client.id,
                    message=client_message,
                    read=False,
                    created_at=_now(),
                ),
                Notification(
                    id=f"n-{uuid4()}",
                    recipient_role="admin",
                    recipient_id=None,
                    message=_admin_booking_notification_text(
                        booking_client_name,
                        booking_car,
                        booking_plate,
                        booking_date,
                        booking_time,
                    ),
                    read=False,
                    created_at=_now(),
                ),
            ]
        )
        _notify_admins_about_booking(db, booking)
    db.commit()
    db.refresh(booking)
    return _booking_payload_for_response(db, booking)


def _process_piggy_bank_for_booking(db: Session, booking: Booking) -> None:
    """Auto-deposit 24% into piggy bank for detailing bookings and repay material withdrawals for any service."""
    service = db.get(Service, booking.service_id) if booking.service_id else None
    rg = _service_resource_group(service)

    date_str = booking.date

    # 1. Repay outstanding material withdrawals for this booking (any service type)
    withdrawals = db.scalars(
        select(PiggyBankTransaction).where(
            PiggyBankTransaction.booking_id == booking.id,
            PiggyBankTransaction.transaction_type == "material_withdrawal",
        )
    ).all()
    total_withdrawn = sum(abs(t.amount) for t in withdrawals if t.amount < 0)

    # Check if already repaid
    existing_repayments = db.scalars(
        select(PiggyBankTransaction).where(
            PiggyBankTransaction.booking_id == booking.id,
            PiggyBankTransaction.transaction_type == "material_repayment",
        )
    ).all()
    total_repaid = sum(t.amount for t in existing_repayments if t.amount > 0)

    outstanding = total_withdrawn - total_repaid
    if outstanding > 0:
        db.add(
            PiggyBankTransaction(
                id=f"pb-{uuid4()}",
                booking_id=booking.id,
                amount=outstanding,
                transaction_type="material_repayment",
                purpose=f"Возврат средств за материалы по заказу {booking.service} ({booking.client_name})",
                material_name=None,
                material_cost=None,
                date=date_str,
                resource_group=rg,
                created_at=_now(),
            )
        )

    # 2. Deposit 24% of booking price (only for detailing)
    if rg == "detailing":
        deposit_amount = round(booking.price * 24 / 100)
        if deposit_amount > 0:
            db.add(
                PiggyBankTransaction(
                    id=f"pb-{uuid4()}",
                    booking_id=booking.id,
                    amount=deposit_amount,
                    transaction_type="deposit_24percent",
                    purpose=f"24% от заказа {booking.service} ({booking.client_name})",
                    material_name=None,
                    material_cost=None,
                    date=date_str,
                    resource_group="detailing",
                    created_at=_now(),
                )
            )


@app.patch("/api/bookings/{booking_id}", response_model=BookingPayload)
def update_booking(
    booking_id: str,
    payload: BookingUpdateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> BookingPayload:
    _ensure_staff_role(session_data, {"admin", "worker", "owner", "accountant"})
    booking = db.scalar(
        select(Booking)
        .options(joinedload(Booking.worker_links))
        .where(Booking.id == booking_id)
    )
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
        )

    updates = payload.model_dump(exclude_unset=True, exclude={"workers"})
    previous_date = booking.date
    previous_time = booking.time
    previous_status = booking.status
    previous_payment_settled = booking.payment_settled
    previous_service = booking.service
    previous_box = booking.box
    previous_note = (booking.notes or "").strip()
    worker = (
        db.get(StaffUser, session_data["actorId"])
        if session_data["role"] == "worker"
        else None
    )
    if session_data["role"] == "worker":
        assigned_worker_ids = {link.worker_id for link in booking.worker_links}
        if session_data["actorId"] not in assigned_worker_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden"
            )
        # Log when worker marks payment as settled
        if "paymentSettled" in updates and updates.get("paymentSettled"):
            logger.info(
                "Worker %s marked booking %s as payment settled (type=%s)",
                session_data["actorId"],
                booking_id,
                updates.get("paymentType", "unknown"),
            )
        forbidden_fields = set(updates) - {
            "status",
            "notes",
            "paymentType",
            "paymentSettled",
        }
        if payload.workers is not None:
            forbidden_fields.add("workers")
        if forbidden_fields:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Worker can update only own task status",
            )
        # Forward-only status transitions for workers
        if "status" in updates and updates["status"] != booking.status:
            _WORKER_STATUS_ORDER = ["new", "confirmed", "scheduled", "in_progress", "completed", "no_show", "admin_review", "cancelled"]
            try:
                old_idx = _WORKER_STATUS_ORDER.index(booking.status)
                new_idx = _WORKER_STATUS_ORDER.index(updates["status"])
                if new_idx < old_idx:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Нельзя вернуть статус на предыдущий этап",
                    )
            except ValueError:
                pass

    if "serviceId" in updates:
        service = db.get(Service, updates["serviceId"])
        if service is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Service not found"
            )
        updates["service"] = service.name
        updates.setdefault("duration", service.duration)
        updates.setdefault("price", service.price)
    else:
        service = db.get(Service, booking.service_id) if booking.service_id else None

    if booking.client_id and any(
        field in updates for field in ("clientName", "clientPhone", "car", "plate")
    ):
        client = db.get(Client, booking.client_id)
        if client is not None:
            if "clientPhone" in updates:
                phone_client = _client_by_phone(db, updates["clientPhone"])
                if phone_client is not None and phone_client.id != client.id:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Клиент с таким номером телефона уже зарегистрирован",
                    )
                client.phone = updates["clientPhone"]
            if "clientName" in updates:
                client.name = updates["clientName"]
            if "car" in updates:
                client.car = updates["car"] or ""
            if "plate" in updates:
                client.plate = updates["plate"] or ""
            client.registered = True
            client.updated_at = _now()

    next_date = (updates.get("date", booking.date) or "").strip()
    next_time = (updates.get("time", booking.time) or "").strip()
    next_duration = updates.get("duration", booking.duration)
    next_box = (updates.get("box", booking.box) or "").strip()
    next_status = updates.get("status", booking.status)
    next_payment_settled = updates.get("paymentSettled", booking.payment_settled)
    service_resource_group = _service_resource_group(service)
    next_workers = (
        _validated_booking_workers(db, payload.workers)
        if payload.workers is not None
        else [
            BookingWorkerPayload(
                workerId=link.worker_id,
                workerName=link.worker_name,
                percent=link.percent,
            )
            for link in booking.worker_links
        ]
    )
    slot_fields_updated = _booking_slot_fields_changed(booking, updates)
    should_validate_slot = _booking_requires_scheduled_slot(next_status) or slot_fields_updated
    has_candidate_slot = bool(next_date and next_time)
    if should_validate_slot:
        if not has_candidate_slot:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Укажите дату и время записи",
            )
        if slot_fields_updated:
            _ensure_booking_datetime_not_in_past(next_date, next_time, session_data["role"])
            _ensure_booking_within_schedule(db, next_date, next_time, next_duration)
    if _booking_requires_scheduled_slot(next_status):
        if not next_box or next_box == DETAILING_REQUEST_BOX:
            picked = _pick_available_box(
                db,
                booking_id=booking.id,
                date_value=next_date,
                time_value=next_time,
                duration=next_duration,
                resource_group=service_resource_group,
                preferred_box=next_box or None,
            )
            if picked:
                next_box = picked
                updates["box"] = next_box
        if not next_box:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Укажите бокс для записи"
            )
    if next_box:
        compatible_boxes = _compatible_box_names(db, service_resource_group)
        if compatible_boxes and next_box not in compatible_boxes:
            next_box = compatible_boxes[0]
            updates["box"] = next_box
    _ensure_booking_has_no_conflicts(
        db,
        booking_id=booking.id,
        date_value=next_date,
        time_value=next_time,
        duration=next_duration,
        box=next_box,
        worker_ids={worker.workerId for worker in next_workers},
        status_value=next_status,
    )
    if (
        session_data["role"] == "worker"
        and previous_status != "completed"
        and next_status == "completed"
    ):
        if payload.paymentSettled is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Укажите, оплатил ли клиент заказ",
            )
        if next_payment_settled and payload.paymentType is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Укажите способ оплаты"
            )

    for field, value in updates.items():
        target_field = {
            "clientName": "client_name",
            "clientPhone": "client_phone",
            "serviceId": "service_id",
            "paymentType": "payment_type",
            "paymentSettled": "payment_settled",
        }.get(field, field)
        setattr(booking, target_field, value)

    previous_worker_ids = {link.worker_id for link in booking.worker_links}
    if payload.workers is not None:
        if not payload.workers and previous_worker_ids:
            logger.warning(
                "Booking %s: empty workers list provided, clearing %d worker assignments",
                booking.id,
                len(previous_worker_ids),
            )
        _sync_booking_workers(db, booking, next_workers)

    client_notification_parts: list[str] = []
    if booking.client_id:
        if booking.date != previous_date or booking.time != previous_time:
            client_notification_parts.append(
                f"Дата и время: {_booking_datetime_label(booking.date, booking.time)}"
            )
        if booking.status != previous_status:
            client_notification_parts.append(
                f"Статус: {_booking_status_label(booking.status)}"
            )
        if booking.service != previous_service:
            client_notification_parts.append(f"Услуга: {booking.service}")
        if booking.box != previous_box:
            client_notification_parts.append(f"Бокс: {booking.box}")
    if client_notification_parts:
        db.add(
            Notification(
                id=f"n-{uuid4()}",
                recipient_role="client",
                recipient_id=booking.client_id,
                message=f"Изменения по записи: {'; '.join(client_notification_parts)}",
                read=False,
                created_at=_now(),
            )
        )

    if (
        session_data["role"] == "worker"
        and previous_status != "completed"
        and booking.status == "completed"
    ):
        worker_name = worker.name if worker is not None else "Мастер"
        db.add(
            Notification(
                id=f"n-{uuid4()}",
                recipient_role="admin",
                recipient_id=None,
                message=(
                    f"{worker_name} завершил работу. Клиент: {booking.client_name}. "
                    f"Услуга: {booking.service}. Сумма: {booking.price:,} ₽. "
                    f"Оплата: {_booking_payment_label(booking)}".replace(",", " ")
                ),
                read=False,
                created_at=_now(),
            )
        )

    # Piggy bank: auto-deposit 24% and repay material withdrawals
    booking_just_completed = (
        previous_status != "completed" and booking.status == "completed"
    )
    payment_just_settled = (
        not previous_payment_settled and next_payment_settled
    )
    if (booking_just_completed or payment_just_settled) and next_payment_settled:
        _process_piggy_bank_for_booking(db, booking)

    db.commit()
    db.refresh(booking)
    current_worker_ids = {link.worker_id for link in booking.worker_links}
    if payload.workers is not None and session_data["role"] in {"admin", "owner"}:
        if payload.notifyWorkers:
            _notify_workers_about_assignment(
                db, booking, current_worker_ids - previous_worker_ids
            )
    rescheduled = (
        booking.date != previous_date
        or booking.time != previous_time
        or booking.box != previous_box
    )
    wrote_worker_notifications = False
    if session_data["role"] in {"admin", "owner"} and rescheduled:
        _notify_workers_about_reschedule(
            db,
            booking,
            current_worker_ids,
            previous_date,
            previous_time,
            previous_box,
        )
        wrote_worker_notifications = True
    if (
        session_data["role"] in {"admin", "owner"}
        and (booking.notes or "").strip() != previous_note
    ):
        _notify_workers_about_note(db, booking, current_worker_ids)
        wrote_worker_notifications = True
    if (
        session_data["role"] == "worker"
        and worker is not None
        and booking.status != previous_status
    ):
        if booking.status == "in_progress":
            _notify_owner_about_worker_booking_event(
                db, booking, worker_name=worker.name, event_label="начал"
            )
            wrote_worker_notifications = True
        if booking.status == "completed":
            _notify_owner_about_worker_booking_event(
                db, booking, worker_name=worker.name, event_label="завершил"
            )
            _notify_booking_completion_receipt(db, booking, worker_name=worker.name)
            wrote_worker_notifications = True
    if wrote_worker_notifications:
        db.commit()
    return _booking_payload_for_response(db, booking)


@app.delete("/api/bookings/{booking_id}", response_model=GenericMessage)
def delete_booking(
    booking_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    if session_data["role"] not in {"client", "admin", "owner", "accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
        )
    if session_data["role"] == "client":
        if booking.client_id != session_data["actorId"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden"
            )
        if booking.status not in BOOKING_CLIENT_CANCELLABLE_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Клиент может отменить только новую, подтверждённую или запланированную запись",
            )
        db.add_all(
            [
                Notification(
                    id=f"n-{uuid4()}",
                    recipient_role="client",
                    recipient_id=booking.client_id,
                    message=f"Запись на {booking.service} от {booking.date} в {booking.time} отменена.",
                    read=False,
                    created_at=_now(),
                ),
                Notification(
                    id=f"n-{uuid4()}",
                    recipient_role="admin",
                    recipient_id=None,
                    message=f"Клиент отменил запись: {booking.client_name}, {booking.date} {booking.time}, {booking.service}",
                    read=False,
                    created_at=_now(),
                ),
            ]
        )
    booking.deleted_at = _now()
    db.commit()
    return GenericMessage(message="Запись удалена")



@app.post("/api/bookings/{booking_id}/services", response_model=BookingPayload)
def add_booking_service(
    booking_id: str,
    payload: AddBookingServiceRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> BookingPayload:
    if session_data["role"] not in {"admin", "owner", "accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    booking = db.scalar(
        select(Booking)
        .options(joinedload(Booking.worker_links))
        .where(Booking.id == booking_id)
    )
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
        )
    svc_list = booking.services if isinstance(booking.services, list) else []
    svc_list.append({
        "name": payload.name,
        "serviceId": payload.serviceId,
        "price": payload.price,
        "duration": payload.duration,
    })
    booking.services = svc_list
    booking.price = (booking.price or 0) + payload.price
    booking.duration = (booking.duration or 0) + payload.duration
    # Re-validate schedule after extending duration
    if booking.status in BOOKING_ACTIVE_STATUSES and booking.date and booking.time:
        _ensure_booking_within_schedule(db, booking.date, booking.time, booking.duration)
    db.commit()
    db.refresh(booking)
    return _booking_payload_for_response(db, booking)


@app.post("/api/notifications", response_model=NotificationPayload)
def create_notification(
    payload: NotificationCreateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> NotificationPayload:
    if session_data["role"] not in {"admin", "worker", "owner", "accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if session_data["role"] == "worker":
        if payload.recipientRole != "client" or not payload.recipientId:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden"
            )
        assigned_booking = db.scalar(
            select(Booking)
            .join(Booking.worker_links)
            .where(
                BookingWorker.worker_id == session_data["actorId"],
                Booking.client_id == payload.recipientId,
                Booking.status.in_(tuple(BOOKING_WORKER_MESSAGE_STATUSES)),
            )
        )
        if assigned_booking is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden"
            )
    notification = Notification(
        id=f"n-{uuid4()}",
        recipient_role=payload.recipientRole,
        recipient_id=payload.recipientId,
        message=payload.message,
        read=payload.read,
        created_at=_now(),
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return _notification_payload(notification)


@app.patch(
    "/api/notifications/{notification_id}/read", response_model=NotificationPayload
)
def mark_notification_read(
    notification_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> NotificationPayload:
    notification = db.get(Notification, notification_id)
    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )
    allowed_recipient_roles = {session_data["role"]}
    if session_data["role"] == "accountant":
        allowed_recipient_roles.add("admin")
    if notification.recipient_role not in allowed_recipient_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if (
        session_data["role"] in {"client", "worker"}
        and notification.recipient_id != session_data["actorId"]
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if session_data["role"] in {
        "admin",
        "accountant",
    } and notification.recipient_id not in {None, session_data["actorId"]}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if session_data["role"] == "owner" and notification.recipient_id not in {
        None,
        session_data["actorId"],
    }:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    notification.read = True
    db.commit()
    db.refresh(notification)
    return _notification_payload(notification)


@app.post("/api/notifications/read-all", response_model=GenericMessage)
def mark_all_notifications_read(
    payload: ReadAllNotificationsRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    if payload.role != session_data["role"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    
    actor_id = session_data["actorId"]
    
    query = select(Notification).where(Notification.recipient_role == payload.role)
    
    if payload.role in {"client", "worker"}:
        query = query.where(Notification.recipient_id == actor_id)
    elif payload.role in {"admin", "accountant"}:
        query = query.where(or_(Notification.recipient_id == actor_id, Notification.recipient_id.is_(None)))
        if payload.role == "accountant":
            query = query.where(
                or_(Notification.recipient_role == "accountant", Notification.recipient_role == "admin")
            )
    elif payload.role == "owner":
        query = query.where(or_(Notification.recipient_id == actor_id, Notification.recipient_id.is_(None)))
    
    query = query.where(Notification.read == False)
    
    notifications = db.scalars(query).all()
    for notification in notifications:
        notification.read = True
    db.commit()
    return GenericMessage(message="ok")


@app.post("/api/stock-items", response_model=StockItemPayload)
def create_stock_item(
    payload: StockItemCreateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> StockItemPayload:
    _ensure_staff_role(session_data, {"owner", "accountant"})
    item = StockItem(
        id=f"st-{uuid4()}",
        name=payload.name,
        qty=payload.qty,
        unit=payload.unit,
        unit_price=payload.unitPrice,
        category=payload.category,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _stock_payload(item)


@app.patch("/api/stock-items/{item_id}", response_model=StockItemPayload)
def update_stock_item(
    item_id: str,
    payload: StockItemUpdateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> StockItemPayload:
    _ensure_staff_role(session_data, {"owner", "accountant"})
    item = db.get(StockItem, item_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Stock item not found"
        )
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if field == "unitPrice":
            setattr(item, "unit_price", value)
        else:
            setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _stock_payload(item)


@app.post("/api/stock-items/{item_id}/write-off", response_model=StockItemPayload)
def write_off_stock(
    item_id: str,
    payload: StockWriteOffRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> StockItemPayload:
    _ensure_staff_role(session_data, {"owner", "accountant"})
    item = db.get(StockItem, item_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Stock item not found"
        )
    item.qty = max(0, item.qty - payload.qty)
    db.commit()
    db.refresh(item)
    return _stock_payload(item)


@app.delete("/api/stock-items/{item_id}", response_model=GenericMessage)
def delete_stock_item(
    item_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    _ensure_staff_role(session_data, {"owner", "accountant"})
    item = db.get(StockItem, item_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Stock item not found"
        )
    name = item.name
    db.delete(item)
    db.commit()
    return GenericMessage(message=f"Товар «{name}» удалён")


@app.get("/api/shift-checklists", response_model=list[ShiftChecklistPayload])
def list_shift_checklists(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> list[ShiftChecklistPayload]:
    _ensure_staff_role(session_data, {"owner", "admin", "worker", "accountant"})
    entries = _shift_checklists_state(db)
    if session_data["role"] == "worker":
        entries = [
            entry
            for entry in entries
            if entry.get("workerId") == session_data["actorId"]
        ]
    return [
        _shift_checklist_payload(entry)
        for entry in sorted(
            entries, key=lambda item: str(item.get("createdAt") or ""), reverse=True
        )
    ]


@app.post("/api/shift-checklists", response_model=ShiftChecklistPayload)
def submit_shift_checklist(
    payload: ShiftChecklistSubmitRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> ShiftChecklistPayload:
    _ensure_staff_role(session_data, {"worker"})
    worker = db.get(StaffUser, session_data["actorId"])
    if worker is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Сотрудник не найден"
        )
    stock_items = _chemistry_stock_items(db)
    previous_entries = _shift_checklists_state(db)
    previous_start = _latest_shift_checklist_entry(previous_entries, worker.id, "start")
    previous_start_map = {
        str(item.get("stockItemId")): int(item.get("actualQty") or 0)
        for item in (previous_start or {}).get("items", [])
        if isinstance(item, dict)
    }
    submitted_map = {item.stockItemId: item.actualQty for item in payload.items}
    checklist_items: list[dict[str, Any]] = []
    for stock_item in stock_items:
        actual_qty = int(submitted_map.get(stock_item.id, stock_item.qty))
        checklist_items.append(
            {
                "stockItemId": stock_item.id,
                "name": stock_item.name,
                "unit": stock_item.unit,
                "actualQty": actual_qty,
                "startQty": previous_start_map.get(stock_item.id)
                if payload.phase == "end"
                else stock_item.qty,
                "endQty": actual_qty if payload.phase == "end" else None,
            }
        )
    entry = {
        "id": f"shift-{uuid4()}",
        "workerId": worker.id,
        "workerName": worker.name,
        "phase": payload.phase,
        "note": payload.note.strip(),
        "createdAt": _serialize_state_datetime(_now()),
        "items": checklist_items,
    }
    previous_entries.append(entry)
    _upsert_setting(db, SHIFT_CHECKLISTS_KEY, previous_entries[-200:])
    db.add(
        Notification(
            id=f"n-{uuid4()}",
            recipient_role="owner",
            recipient_id=None,
            message=f"Мастер {worker.name} заполнил чек-лист {('начала' if payload.phase == 'start' else 'закрытия')} смены.",
            read=False,
            created_at=_now(),
        )
    )
    db.commit()
    return _shift_checklist_payload(entry)


@app.get(
    "/api/admin/shift-inspections", response_model=list[AdminShiftInspectionPayload]
)
def list_admin_shift_inspections(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> list[AdminShiftInspectionPayload]:
    _ensure_staff_role(session_data, {"owner", "admin"})
    entries = _admin_shift_inspections_state(db)
    if session_data["role"] == "admin":
        entries = [
            entry
            for entry in entries
            if entry.get("adminId") == session_data["actorId"]
        ]
    return [
        _admin_shift_inspection_payload(entry)
        for entry in sorted(
            entries, key=lambda item: str(item.get("createdAt") or ""), reverse=True
        )
    ]


@app.get("/api/admin/shift-inspections/{inspection_id}/photo")
def get_admin_shift_inspection_photo(
    inspection_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> Response:
    _ensure_staff_role(session_data, {"owner", "admin"})
    entry = next(
        (
            item
            for item in _admin_shift_inspections_state(db)
            if item.get("id") == inspection_id
        ),
        None,
    )
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Чек-лист смены не найден"
        )
    if (
        session_data["role"] == "admin"
        and entry.get("adminId") != session_data["actorId"]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к фото этой смены",
        )
    raw_photo = str(entry.get("floorPhotoUrl") or "").strip()
    if not raw_photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Фото открытия смены не найдено",
        )
    mime_type, content = _decode_data_url_image(raw_photo)
    return Response(
        content=content,
        media_type=mime_type,
        headers={"Cache-Control": "private, max-age=300"},
    )


@app.post("/api/admin/shift-inspections", response_model=AdminShiftInspectionPayload)
def submit_admin_shift_inspection(
    payload: AdminShiftInspectionSubmitRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> AdminShiftInspectionPayload:
    _ensure_staff_role(session_data, {"admin"})
    admin = db.get(StaffUser, session_data["actorId"])
    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Администратор не найден"
        )
    _decode_data_url_image(payload.floorPhotoUrl)
    if not payload.clothsReady:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Подтвердите наличие чистых тряпок",
        )

    supply_checks = {item.stockItemId: item.checked for item in payload.supplies}
    supplies = _admin_shift_inspection_supplies(db)
    supplies_payload = [
        {
            "stockItemId": str(item.get("stockItemId") or ""),
            "name": str(item.get("name") or ""),
            "category": str(item.get("category") or ""),
            "unit": str(item.get("unit") or ""),
            "qty": int(item.get("qty") or 0),
            "checked": bool(
                supply_checks.get(str(item.get("stockItemId") or ""), False)
            ),
        }
        for item in supplies
    ]

    worker_checks = {item.workerId: item.checked for item in payload.masters}
    masters = db.scalars(
        select(StaffUser)
        .where(StaffUser.role == "worker", StaffUser.active.is_(True))
        .order_by(StaffUser.name.asc())
    ).all()
    masters_payload = [
        {
            "workerId": worker.id,
            "workerName": worker.name,
            "checked": bool(worker_checks.get(worker.id, False)),
        }
        for worker in masters
    ]
    if not any(item["checked"] for item in masters_payload):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Отметьте мастеров на смене"
        )

    entries = _admin_shift_inspections_state(db)
    entry = {
        "id": f"admin-shift-{uuid4()}",
        "adminId": admin.id,
        "adminName": admin.name,
        "status": "pending",
        "createdAt": _serialize_state_datetime(_now()),
        "reviewedAt": None,
        "floorPhotoUrl": payload.floorPhotoUrl.strip(),
        "clothsReady": payload.clothsReady,
        "suppliesChecked": any(item["checked"] for item in supplies_payload),
        "note": payload.note.strip(),
        "issueNote": "",
        "ownerDecisionBy": None,
        "supplies": supplies_payload,
        "masters": masters_payload,
    }
    entries.append(entry)
    _upsert_setting(db, ADMIN_SHIFT_INSPECTIONS_KEY, entries[-200:])
    _notify_owner_about_admin_shift(db, entry)
    db.commit()
    return _admin_shift_inspection_payload(entry)


@app.post(
    "/api/admin/shift-inspections/{inspection_id}/review",
    response_model=AdminShiftInspectionPayload,
)
def review_admin_shift_inspection(
    inspection_id: str,
    payload: AdminShiftInspectionReviewRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> AdminShiftInspectionPayload:
    _ensure_staff_role(session_data, {"owner"})
    return _apply_admin_shift_review(
        db,
        inspection_id,
        action=payload.action,
        issue_note=payload.issueNote,
        owner_actor_id=session_data["actorId"],
    )


@app.post("/api/expenses", response_model=ExpensePayload)
def create_expense(
    payload: ExpenseCreateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> ExpensePayload:
    _ensure_staff_role(session_data, {"owner", "accountant"})
    expense = Expense(
        id=f"e-{uuid4()}",
        title=payload.title,
        amount=payload.amount,
        category=payload.category,
        date=payload.date,
        note=payload.note,
        resource_group=payload.resourceGroup,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return _expense_payload(expense)


@app.patch("/api/expenses/{expense_id}", response_model=ExpensePayload)
def update_expense(
    expense_id: str,
    payload: ExpenseUpdateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> ExpensePayload:
    _ensure_staff_role(session_data, {"owner", "accountant"})
    expense = db.get(Expense, expense_id)
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Расход не найден")
    if payload.title is not None:
        expense.title = payload.title
    if payload.amount is not None:
        expense.amount = payload.amount
    if payload.category is not None:
        expense.category = payload.category
    if payload.date is not None:
        expense.date = payload.date
    if "note" in payload.model_fields_set:
        expense.note = payload.note
    if payload.resourceGroup is not None:
        expense.resource_group = payload.resourceGroup
    db.commit()
    db.refresh(expense)
    return _expense_payload(expense)


@app.get("/api/owner/incomes", response_model=list[IncomePayload])
def list_incomes(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> list[IncomePayload]:
    _ensure_staff_role(session_data, {"owner", "admin"})
    incomes = db.scalars(
        select(Income).order_by(Income.created_at.desc())
    ).all()
    return [
        IncomePayload(
            id=income.id,
            amount=income.amount,
            source=income.source,
            note=income.note,
            createdById=income.created_by_id,
            date=income.date,
            resourceGroup=income.resource_group,
            createdAt=income.created_at,
        )
        for income in incomes
    ]


@app.post("/api/owner/incomes", response_model=IncomePayload, status_code=status.HTTP_201_CREATED)
def create_income(
    payload: IncomeCreateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> IncomePayload:
    _ensure_staff_role(session_data, {"owner", "admin"})
    income = Income(
        id=str(uuid4()),
        amount=payload.amount,
        source=payload.source,
        note=payload.note,
        created_by_id=session_data["actorId"],
        date=payload.date,
        resource_group=payload.resourceGroup,
        created_at=_now(),
    )
    db.add(income)
    db.commit()
    db.refresh(income)
    return IncomePayload(
        id=income.id,
        amount=income.amount,
        source=income.source,
        note=income.note,
        createdById=income.created_by_id,
        date=income.date,
        resourceGroup=income.resource_group,
        createdAt=income.created_at,
    )


@app.patch("/api/owner/incomes/{income_id}", response_model=IncomePayload)
def update_income(
    income_id: str,
    payload: IncomeUpdateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> IncomePayload:
    _ensure_staff_role(session_data, {"owner"})
    income = db.get(Income, income_id)
    if income is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Доход не найден")
    if payload.amount is not None:
        income.amount = payload.amount
    if payload.source is not None:
        income.source = payload.source
    if "note" in payload.model_fields_set:
        income.note = payload.note
    if payload.date is not None:
        income.date = payload.date
    if payload.resourceGroup is not None:
        income.resource_group = payload.resourceGroup
    db.commit()
    db.refresh(income)
    return IncomePayload(
        id=income.id,
        amount=income.amount,
        source=income.source,
        note=income.note,
        createdById=income.created_by_id,
        date=income.date,
        resourceGroup=income.resource_group,
        createdAt=income.created_at,
    )


# ---------------------------------------------------------------------------
# Piggy Bank Endpoints
# ---------------------------------------------------------------------------


@app.get("/api/owner/piggy-bank", response_model=PiggyBankResponse)
def get_piggy_bank(
    booking_id: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> PiggyBankResponse:
    _ensure_staff_role(session_data, {"owner", "accountant"})

    # Helper to parse DD.MM.YYYY or YYYY-MM-DD to date
    def _parse_date_str(s: str) -> date | None:
        try:
            if "." in s:
                parts = s.split(".")
                return date(int(parts[2]), int(parts[1]), int(parts[0]))
            return date.fromisoformat(s)
        except (ValueError, IndexError):
            return None

    parsed_from = _parse_date_str(date_from) if date_from else None
    parsed_to = _parse_date_str(date_to) if date_to else None

    def _in_range(d: str | None) -> bool:
        if not d:
            return True
        parsed = _parse_date_str(d)
        if not parsed:
            return True
        if parsed_from and parsed < parsed_from:
            return False
        if parsed_to and parsed > parsed_to:
            return False
        return True

    # Load ALL transactions — balance is always all-time
    all_tx = db.scalars(
        select(PiggyBankTransaction).order_by(PiggyBankTransaction.created_at.desc())
    ).all()
    balance = sum(t.amount for t in all_tx)
    # Filter transactions by date for display only
    if booking_id:
        all_tx = [t for t in all_tx if t.booking_id == booking_id]
    filtered_tx = [t for t in all_tx if _in_range(t.date)]

    transaction_payloads = []
    for t in filtered_tx:
        booking_info = None
        if t.booking_id:
            b = db.get(Booking, t.booking_id)
            if b:
                booking_info = f"{b.service} — {b.client_name} ({b.date})"
        transaction_payloads.append(
            PiggyBankTransactionPayload(
                id=t.id,
                bookingId=t.booking_id,
                amount=t.amount,
                transactionType=t.transaction_type,
                purpose=t.purpose,
                materialName=t.material_name,
                materialCost=t.material_cost,
                date=t.date,
                resourceGroup=t.resource_group,
                createdAt=t.created_at,
                bookingInfo=booking_info,
            )
        )

    services_map = {
        s.id: s for s in db.scalars(select(Service)).all()
    }

    # === Wash breakdown ===
    all_completed_bookings = db.scalars(
        select(Booking)
        .where(Booking.status == "completed", Booking.deleted_at.is_(None))
        .order_by(Booking.date.desc())
    ).all()

    self_service_revenue = 0
    classic_revenue = 0
    for booking in all_completed_bookings:
        if not _in_range(booking.date):
            continue
        svc = services_map.get(booking.service_id)
        if svc is None or svc.resource_group != WASH_RESOURCE_GROUP:
            continue
        if svc.wash_type == "self_service":
            self_service_revenue += booking.price
        else:
            classic_revenue += booking.price
    self_master = round(self_service_revenue * 10 / 100)
    self_piggy = self_service_revenue - self_master
    classic_master = round(classic_revenue * 40 / 100)
    classic_piggy = classic_revenue - classic_master
    total_revenue = self_service_revenue + classic_revenue
    total_master = self_master + classic_master
    total_piggy = self_piggy + classic_piggy

    # === Detailing breakdown ===
    detailing_revenue = 0
    for booking in all_completed_bookings:
        if not _in_range(booking.date):
            continue
        svc = services_map.get(booking.service_id)
        if svc and svc.resource_group == "detailing":
            detailing_revenue += booking.price
    detailing_master = round(detailing_revenue * 40 / 100)

    # Master daily outputs (use date range if provided)
    inspections = _admin_shift_inspections_state(db)
    workers_list = db.scalars(select(StaffUser).where(
        StaffUser.role.in_({"worker", "admin"}),
        StaffUser.active.is_(True),
    )).all()
    total_daily_outputs = 0
    for w in workers_list:
        sd = parsed_from or date(2000, 1, 1)
        ed = parsed_to or date.today()
        shift_count, _ = _compute_shift_attendance(inspections, w.id, sd, ed)
        salary_per_shift = getattr(w, "salary_per_shift", 0) or 0
        total_daily_outputs += shift_count * salary_per_shift

    # Expenses and incomes filtered in Python
    all_expenses = db.scalars(select(Expense)).all()
    all_incomes = db.scalars(select(Income)).all()

    wash_expenses = sum(e.amount for e in all_expenses if e.resource_group == WASH_RESOURCE_GROUP and _in_range(e.date))
    wash_incomes = sum(i.amount for i in all_incomes if i.resource_group == WASH_RESOURCE_GROUP and _in_range(i.date))
    detailing_expenses = sum(e.amount for e in all_expenses if e.resource_group == "detailing" and _in_range(e.date))
    detailing_incomes = sum(i.amount for i in all_incomes if i.resource_group == "detailing" and _in_range(i.date))

    remaining = total_piggy - total_daily_outputs - wash_expenses + wash_incomes

    deposits_24 = sum(t.amount for t in all_tx if t.transaction_type == "deposit_24percent")
    withdrawals = sum(abs(t.amount) for t in all_tx if t.transaction_type == "material_withdrawal" and t.amount < 0)
    repayments = sum(t.amount for t in all_tx if t.transaction_type == "material_repayment")
    net_piggy = deposits_24 + repayments - withdrawals

    # Weekly archives
    archives_db = db.scalars(
        select(WeeklyArchive).order_by(WeeklyArchive.week_start.desc())
    ).all()

    return PiggyBankResponse(
        balance=balance,
        transactions=transaction_payloads,
        wash=PiggyBankWashBreakdown(
            selfServiceRevenue=self_service_revenue,
            selfServiceMaster=self_master,
            selfServicePiggy=self_piggy,
            classicRevenue=classic_revenue,
            classicMaster=classic_master,
            classicPiggy=classic_piggy,
            totalRevenue=total_revenue,
            totalMaster=total_master,
            totalPiggy=total_piggy,
        ),
        detailing=PiggyBankDetailingBreakdown(
            detailingRevenue=detailing_revenue,
            detailingMaster=detailing_master,
            deposits24Percent=deposits_24,
            materialWithdrawals=withdrawals,
            materialRepayments=repayments,
            netPiggy=net_piggy,
            detailingExpenses=detailing_expenses,
            detailingIncomes=detailing_incomes,
        ),
        masterDailyOutputs=total_daily_outputs,
        washExpenses=wash_expenses,
        washIncomes=wash_incomes,
        detailingExpenses=detailing_expenses,
        detailingIncomes=detailing_incomes,
        remainingInPiggyBank=remaining,
        archives=[
            WeeklyArchivePayload(
                id=a.id,
                weekStart=a.week_start,
                weekEnd=a.week_end,
                totalRevenue=a.total_revenue,
                totalIncome=a.total_income,
                totalExpense=a.total_expense,
                bookingCount=a.booking_count,
                incomeCount=a.income_count,
                expenseCount=a.expense_count,
                piggyBankBalance=a.piggy_bank_balance,
                createdAt=a.created_at,
            )
            for a in archives_db
        ],
    )


@app.post("/api/owner/piggy-bank/withdraw", response_model=PiggyBankTransactionPayload)
def piggy_bank_withdraw(
    payload: PiggyBankWithdrawRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> PiggyBankTransactionPayload:
    _ensure_staff_role(session_data, {"owner", "accountant"})

    booking = db.get(Booking, payload.bookingId)
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Запись не найдена"
        )

    # Determine resource group from booking's service
    service = db.get(Service, booking.service_id) if booking.service_id else None
    rg = _service_resource_group(service)

    transaction = PiggyBankTransaction(
        id=f"pb-{uuid4()}",
        booking_id=payload.bookingId,
        amount=-payload.materialCost,
        transaction_type="material_withdrawal",
        purpose=payload.purpose.strip() or f"Закупка {payload.materialName} для {booking.service}",
        material_name=payload.materialName,
        material_cost=payload.materialCost,
        date=payload.date,
        resource_group=rg,
        created_at=_now(),
    )
    db.add(transaction)

    expense = Expense(
        id=f"e-{uuid4()}",
        title=f"Материалы: {payload.materialName}",
        amount=payload.materialCost,
        category="Материалы",
        date=payload.date,
        note=f"Закупка для заказа {booking.service} ({booking.client_name}). {payload.purpose}".strip(),
        resource_group=rg,
        created_at=_now(),
    )
    db.add(expense)

    db.commit()
    db.refresh(transaction)

    booking_info = f"{booking.service} — {booking.client_name} ({booking.date})"
    return PiggyBankTransactionPayload(
        id=transaction.id,
        bookingId=transaction.booking_id,
        amount=transaction.amount,
        transactionType=transaction.transaction_type,
        purpose=transaction.purpose,
        materialName=transaction.material_name,
        materialCost=transaction.material_cost,
        date=transaction.date,
        resourceGroup=transaction.resource_group,
        createdAt=transaction.created_at,
        bookingInfo=booking_info,
    )


# ---------------------------------------------------------------------------
# Wallet Endpoints
# ---------------------------------------------------------------------------


def _week_bounds() -> tuple[date, date]:
    today = date.today()
    saturday = today - timedelta(days=(today.weekday() - 5) % 7)
    friday = saturday + timedelta(days=6)
    return saturday, friday


@app.get("/api/owner/wallet", response_model=WalletResponse)
def get_wallet(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> WalletResponse:
    _ensure_staff_role(session_data, {"owner", "accountant"})

    saturday, friday = _week_bounds()
    week_start_str = saturday.isoformat()
    week_end_str = friday.isoformat()

    # Filter incomes for current week
    incomes = db.scalars(
        select(Income).where(Income.date >= week_start_str, Income.date <= week_end_str)
        .order_by(Income.date.desc(), Income.created_at.desc())
    ).all()

    # Filter expenses for current week
    expenses = db.scalars(
        select(Expense).where(Expense.date >= week_start_str, Expense.date <= week_end_str)
        .order_by(Expense.date.desc(), Expense.created_at.desc())
    ).all()

    # Completed bookings for current week
    completed_bookings = db.scalars(
        select(Booking).where(
            Booking.status == "completed",
            Booking.deleted_at.is_(None),
            Booking.date >= week_start_str,
            Booking.date <= week_end_str,
        )
    ).all()

    revenue = sum(b.price for b in completed_bookings)
    total_income = sum(i.amount for i in incomes)
    total_expense = sum(e.amount for e in expenses)
    profit = revenue + total_income - total_expense

    # Piggy bank balance (all-time)
    all_piggy = db.scalars(
        select(PiggyBankTransaction).order_by(PiggyBankTransaction.created_at.desc())
    ).all()
    piggy_balance = sum(t.amount for t in all_piggy)

    # Archives
    archives_db = db.scalars(
        select(WeeklyArchive).order_by(WeeklyArchive.week_start.desc())
    ).all()

    return WalletResponse(
        weekStart=week_start_str,
        weekEnd=week_end_str,
        revenue=revenue,
        totalIncome=total_income,
        totalExpense=total_expense,
        profit=profit,
        bookingCount=len(completed_bookings),
        incomes=[
            IncomePayload(
                id=i.id,
                amount=i.amount,
                source=i.source,
                note=i.note,
                createdById=i.created_by_id,
                date=i.date,
                resourceGroup=i.resource_group,
                createdAt=i.created_at,
            )
            for i in incomes
        ],
        expenses=[
            ExpensePayload(
                id=e.id,
                title=e.title,
                amount=e.amount,
                category=e.category,
                date=e.date,
                note=e.note,
                resourceGroup=e.resource_group,
            )
            for e in expenses
        ],
        piggyBankBalance=piggy_balance,
        archives=[
            WeeklyArchivePayload(
                id=a.id,
                weekStart=a.week_start,
                weekEnd=a.week_end,
                totalRevenue=a.total_revenue,
                totalIncome=a.total_income,
                totalExpense=a.total_expense,
                bookingCount=a.booking_count,
                incomeCount=a.income_count,
                expenseCount=a.expense_count,
                piggyBankBalance=a.piggy_bank_balance,
                createdAt=a.created_at,
            )
            for a in archives_db
        ],
    )


# ---------------------------------------------------------------------------
# Shift Attendance Endpoints
# ---------------------------------------------------------------------------


@app.get(
    "/api/owner/workers/{worker_id}/shift-attendance",
    response_model=ShiftAttendancePayload,
)
def get_worker_shift_attendance(
    worker_id: str,
    period: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> ShiftAttendancePayload:
    _ensure_staff_role(session_data, {"owner", "admin"})

    worker = db.get(StaffUser, worker_id)
    if worker is None or worker.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found"
        )

    # Resolve date range
    if date_from is not None and date_to is not None:
        try:
            d_from = date.fromisoformat(date_from)
            d_to = date.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="date_from and date_to must be in YYYY-MM-DD format",
            )
    elif period is not None:
        d_from, d_to = _period_to_date_range(period)
    else:
        # Default to week if nothing provided
        d_from, d_to = _period_to_date_range("week")

    inspections = _admin_shift_inspections_state(db)
    shift_count, shift_dates = _compute_shift_attendance(
        inspections, worker_id, d_from, d_to
    )
    return ShiftAttendancePayload(
        workerId=worker.id,
        workerName=worker.name,
        shiftCount=shift_count,
        shiftDates=shift_dates,
    )


@app.get(
    "/api/owner/shift-attendance",
    response_model=list[ShiftAttendancePayload],
)
def get_all_workers_shift_attendance(
    period: str = "week",
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> list[ShiftAttendancePayload]:
    _ensure_staff_role(session_data, {"owner", "admin"})

    d_from, d_to = _period_to_date_range(period)

    active_workers = db.scalars(
        select(StaffUser)
        .where(StaffUser.role == "worker", StaffUser.active.is_(True))
        .order_by(StaffUser.name.asc())
    ).all()

    inspections = _admin_shift_inspections_state(db)

    results: list[ShiftAttendancePayload] = []
    for worker in active_workers:
        shift_count, shift_dates = _compute_shift_attendance(
            inspections, worker.id, d_from, d_to
        )
        results.append(
            ShiftAttendancePayload(
                workerId=worker.id,
                workerName=worker.name,
                shiftCount=shift_count,
                shiftDates=shift_dates,
            )
        )

    # Sort by shiftCount descending
    results.sort(key=lambda x: x.shiftCount, reverse=True)
    return results


@app.get(
    "/api/worker/shift-attendance",
    response_model=ShiftAttendancePayload,
)
def get_own_shift_attendance(
    period: str = "week",
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> ShiftAttendancePayload:
    if session_data.get("role") != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden"
        )

    worker_id = session_data["actorId"]
    worker = db.get(StaffUser, worker_id)
    if worker is None or worker.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found"
        )

    d_from, d_to = _period_to_date_range(period)

    inspections = _admin_shift_inspections_state(db)
    shift_count, shift_dates = _compute_shift_attendance(
        inspections, worker_id, d_from, d_to
    )
    return ShiftAttendancePayload(
        workerId=worker.id,
        workerName=worker.name,
        shiftCount=shift_count,
        shiftDates=shift_dates,
    )


@app.post("/api/penalties", response_model=PenaltyPayload)
def create_penalty(
    payload: PenaltyCreateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> PenaltyPayload:
    _ensure_staff_role(session_data, {"owner"})
    worker = db.get(StaffUser, payload.workerId)
    if worker is None or worker.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found"
        )
    created_at = _now()
    penalty = Penalty(
        id=f"p-{uuid4()}",
        worker_id=worker.id,
        owner_id=session_data["actorId"],
        title=payload.title.strip(),
        reason=payload.reason.strip(),
        amount=0,
        score=5,
        active_until=created_at + timedelta(days=COMPLAINT_DURATION_DAYS),
        revoked_at=None,
        revoked_by=None,
        created_at=created_at,
    )
    db.add(penalty)
    db.flush()
    worker_penalties = _load_penalties(db, worker_ids={worker.id})
    complaint_status = complaint_status_for_percent(
        worker.default_percent, worker_penalties, at=created_at
    )
    if (
        complaint_status.reduction_active
        and complaint_status.reduction_until is not None
    ):
        status_line = (
            f"Активных жалоб: {complaint_status.active_count}. "
            f"Процент по работе снижен на {COMPLAINT_PERCENT_DEDUCTION} п.п. "
            f"до {_format_local_datetime(complaint_status.reduction_until)}."
        )
    else:
        remaining = max(0, COMPLAINT_THRESHOLD - complaint_status.active_count)
        status_line = (
            f"Активных жалоб: {complaint_status.active_count}. "
            f"До снижения процента осталось {remaining}."
        )
    db.add(
        Notification(
            id=f"n-{uuid4()}",
            recipient_role="worker",
            recipient_id=worker.id,
            message=f"Жалоба от владельца: {penalty.title}. {status_line}",
            read=False,
            created_at=created_at,
        )
    )
    db.commit()
    penalty = db.scalar(
        select(Penalty)
        .options(joinedload(Penalty.worker))
        .where(Penalty.id == penalty.id)
    )
    if penalty is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Penalty was not saved",
        )
    _send_telegram_safe(
        worker.telegram_chat_id,
        f"Новая жалоба от владельца\n{penalty.title}\n{status_line}\n{penalty.reason}",
    )
    return _penalty_payload(penalty)


@app.post("/api/penalties/{penalty_id}/revoke", response_model=GenericMessage)
def revoke_penalty(
    penalty_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    _ensure_staff_role(session_data, {"owner"})
    penalty = db.scalar(
        select(Penalty)
        .options(joinedload(Penalty.worker))
        .where(Penalty.id == penalty_id)
    )
    if penalty is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found"
        )
    now = _now()
    active_until = penalty.active_until or complaint_active_until(penalty.created_at)
    if penalty.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Complaint already revoked"
        )
    if now >= _as_utc(active_until):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Complaint already expired"
        )

    worker = penalty.worker or db.get(StaffUser, penalty.worker_id)
    penalty_title = penalty.title
    penalty.revoked_at = now
    penalty.revoked_by = session_data["actorId"]
    db.flush()

    worker_penalties = _load_penalties(db, worker_ids={penalty.worker_id})
    complaint_status = complaint_status_for_percent(
        worker.default_percent if worker else 0, worker_penalties, at=now
    )
    if (
        complaint_status.reduction_active
        and complaint_status.reduction_until is not None
    ):
        status_line = (
            f"Активных жалоб осталось {complaint_status.active_count}. "
            f"Снижение процента действует до {_format_local_datetime(complaint_status.reduction_until)}."
        )
    else:
        status_line = (
            f"Активных жалоб осталось {complaint_status.active_count}. "
            "Снижение процента сейчас не действует."
        )

    if worker is not None:
        db.add(
            Notification(
                id=f"n-{uuid4()}",
                recipient_role="worker",
                recipient_id=worker.id,
                message=f"Владелец снял жалобу: {penalty_title}. {status_line}",
                read=False,
                created_at=now,
            )
        )
    db.commit()
    if worker is not None:
        _send_telegram_safe(
            worker.telegram_chat_id,
            f"Жалоба снята досрочно\n{penalty_title}\n{status_line}",
        )
    return GenericMessage(message=f"Жалоба '{penalty_title}' снята")


@app.post(
    "/api/workers/{worker_id}/penalties/revoke-all", response_model=GenericMessage
)
def revoke_all_worker_penalties(
    worker_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    _ensure_staff_role(session_data, {"owner"})
    worker = db.get(StaffUser, worker_id)
    if worker is None or worker.role not in {"worker", "dismissed_worker"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found"
        )

    now = _now()
    penalties = db.scalars(
        select(Penalty)
        .options(joinedload(Penalty.worker))
        .where(Penalty.worker_id == worker_id)
        .order_by(Penalty.created_at.desc())
    ).all()
    revoked_count = 0
    for penalty in penalties:
        active_until = penalty.active_until or complaint_active_until(
            penalty.created_at
        )
        if penalty.revoked_at is not None or now >= _as_utc(active_until):
            continue
        penalty.revoked_at = now
        penalty.revoked_by = session_data["actorId"]
        revoked_count += 1
    db.flush()

    if revoked_count == 0:
        return GenericMessage(message="Активных жалоб у мастера нет")

    worker_penalties = _load_penalties(db, worker_ids={worker_id})
    complaint_status = complaint_status_for_percent(
        worker.default_percent, worker_penalties, at=now
    )
    if (
        complaint_status.reduction_active
        and complaint_status.reduction_until is not None
    ):
        status_line = (
            f"Активных жалоб осталось {complaint_status.active_count}. "
            f"Снижение процента действует до {_format_local_datetime(complaint_status.reduction_until)}."
        )
    else:
        status_line = (
            f"Активных жалоб осталось {complaint_status.active_count}. "
            "Снижение процента сейчас не действует."
        )

    db.add(
        Notification(
            id=f"n-{uuid4()}",
            recipient_role="worker",
            recipient_id=worker.id,
            message=f"Владелец снял все активные жалобы. {status_line}",
            read=False,
            created_at=now,
        )
    )
    db.commit()
    _send_telegram_safe(
        worker.telegram_chat_id,
        f"Все активные жалобы сняты\n{status_line}",
    )
    return GenericMessage(message=f"Снято жалоб: {revoked_count}")


@app.post("/api/telegram/link-code", response_model=TelegramLinkCodePayload)
def generate_telegram_link_code(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> TelegramLinkCodePayload:
    _ensure_staff_role(session_data, {"admin", "worker", "owner", "accountant"})
    item = create_link_code(db, session_data["actorId"])
    staff = db.get(StaffUser, session_data["actorId"])
    db.commit()
    return TelegramLinkCodePayload(
        code=item.code,
        expiresAt=item.expires_at,
        linked=bool(staff and staff.telegram_chat_id),
    )


def _upsert_setting(db: Session, key: str, value: dict) -> dict:
    row = db.get(AppSetting, key)
    if row is None:
        row = AppSetting(key=key, value=value)
        db.add(row)
    else:
        row.value = value
    db.flush()
    return row.value


@app.put("/api/settings/services", response_model=list[ServicePayload])
def save_services(
    payload: list[ServicePayload],
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> list[ServicePayload]:
    _ensure_staff_role(session_data, {"admin", "owner"})
    existing = {service.id: service for service in db.scalars(select(Service)).all()}
    submitted_ids = {item.id for item in payload}
    for item in payload:
        service = existing.get(item.id)
        if service is None:
            service = Service(id=item.id)
            db.add(service)
        service.name = item.name
        service.category = item.category
        service.price = item.price
        service.duration = item.duration
        # Категория — источник истины для resourceGroup.
        expected_group = _resource_group_for_service_category(item.category)
        requested_group = _resource_group_key(item.resourceGroup)
        service.resource_group = (
            requested_group if requested_group == expected_group else expected_group
        )
        service.wash_type = item.washType or ""
        service.description = item.desc
        service.active = item.active
    for service_id, service in existing.items():
        if service_id not in submitted_ids:
            db.delete(service)
    db.commit()
    services = db.scalars(select(Service).order_by(Service.name)).all()
    return [_service_payload(service) for service in services]


@app.put("/api/settings/boxes", response_model=list[BoxPayload])
def save_boxes(
    payload: list[BoxPayload],
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> list[BoxPayload]:
    _ensure_staff_role(session_data, {"admin", "owner"})
    existing = {box.id: box for box in db.scalars(select(Box)).all()}
    submitted_ids = {item.id for item in payload}
    submitted_groups = {_resource_group_key(item.resourceGroup) for item in payload}
    for item in payload:
        box = existing.get(item.id)
        if box is None:
            box = Box(id=item.id)
            db.add(box)
        box.name = item.name
        box.resource_group = _resource_group_key(item.resourceGroup)
        box.price_per_hour = item.pricePerHour
        box.active = item.active
        box.description = item.description
    for box_id, box in existing.items():
        box_group = _resource_group_key(box.resource_group or _default_box_resource_group(box))
        if box_id not in submitted_ids and box_group in submitted_groups:
            db.delete(box)
    db.commit()
    boxes = _visible_boxes(db)
    return [_box_payload(box) for box in boxes]


@app.put("/api/settings/schedule", response_model=list[SchedulePayload])
def save_schedule(
    payload: list[SchedulePayload],
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> list[SchedulePayload]:
    _ensure_staff_role(session_data, {"admin", "owner"})
    existing = {
        entry.day_index: entry for entry in db.scalars(select(ScheduleEntry)).all()
    }
    for item in payload:
        entry = existing.get(item.dayIndex)
        if entry is None:
            entry = ScheduleEntry(day_index=item.dayIndex)
            db.add(entry)
        entry.day_label = item.day
        entry.open_time = item.open
        entry.close_time = item.close
        entry.active = item.active
    db.commit()
    schedule = db.scalars(select(ScheduleEntry).order_by(ScheduleEntry.day_index)).all()
    return [_schedule_payload(entry) for entry in schedule]


@app.put("/api/settings/admin/profile", response_model=AdminProfilePayload)
def save_admin_profile(
    payload: AdminProfilePayload,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> AdminProfilePayload:
    _ensure_staff_role(session_data, {"admin"})
    staff = db.get(StaffUser, session_data["actorId"])
    telegram_chat_id = ""
    if staff is not None:
        staff.name = payload.name
        staff.phone = payload.phone
        staff.email = payload.email
        try:
            telegram_chat_id = ensure_staff_chat_id_available(
                db,
                payload.telegramChatId,
                exclude_staff_id=staff.id,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=str(exc)
            ) from exc
        staff.telegram_chat_id = telegram_chat_id
        staff.updated_at = _now()
    value = _upsert_setting(
        db,
        "admin_profile",
        {
            **payload.model_dump(),
            "telegramChatId": telegram_chat_id,
        },
    )
    db.commit()
    return AdminProfilePayload.model_validate(value)


@app.put("/api/settings/admin/notifications", response_model=AdminNotificationSettings)
def save_admin_notifications(
    payload: AdminNotificationSettings,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> AdminNotificationSettings:
    _ensure_staff_role(session_data, {"admin"})
    value = _upsert_setting(db, "admin_notification_settings", payload.model_dump())
    db.commit()
    return AdminNotificationSettings.model_validate(value)


@app.put("/api/settings/workers/{worker_id}/profile", response_model=WorkerPayload)
def save_worker_profile(
    worker_id: str,
    payload: WorkerProfilePayload,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> WorkerPayload:
    if session_data["role"] not in {"worker", "owner"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if session_data["role"] == "worker" and session_data["actorId"] != worker_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    worker = db.get(StaffUser, worker_id)
    if worker is None or worker.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found"
        )
    worker.name = payload.name
    worker.phone = payload.phone
    worker.email = payload.email
    worker.city = payload.city
    worker.experience = payload.experience
    worker.specialty = payload.specialty
    worker.about = payload.about
    worker.default_percent = clamp_worker_percent(payload.percent)
    worker.updated_at = _now()
    db.commit()
    db.refresh(worker)
    return _worker_payload(worker)


@app.put(
    "/api/settings/workers/{worker_id}/notifications",
    response_model=WorkerNotificationSettings,
)
def save_worker_notifications(
    worker_id: str,
    payload: WorkerNotificationSettings,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> WorkerNotificationSettings:
    if session_data["role"] not in {"worker", "owner"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if session_data["role"] == "worker" and session_data["actorId"] != worker_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    current = _setting(db, "worker_notification_settings", {})
    current[worker_id] = payload.model_dump()
    value = _upsert_setting(db, "worker_notification_settings", current)
    db.commit()
    return WorkerNotificationSettings.model_validate(value[worker_id])


@app.put("/api/settings/owner/company", response_model=OwnerCompanyPayload)
def save_owner_company(
    payload: OwnerCompanyPayload,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerCompanyPayload:
    _ensure_staff_role(session_data, {"owner"})
    value = _upsert_setting(db, "owner_company", payload.model_dump())
    db.commit()
    return OwnerCompanyPayload.model_validate(value)


@app.put("/api/settings/owner/notifications", response_model=OwnerNotificationSettings)
def save_owner_notifications(
    payload: OwnerNotificationSettings,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerNotificationSettings:
    _ensure_staff_role(session_data, {"owner"})
    value = _upsert_setting(db, "owner_notification_settings", payload.model_dump())
    db.commit()
    return OwnerNotificationSettings.model_validate(value)


@app.put("/api/settings/owner/integrations", response_model=OwnerIntegrationsPayload)
def save_owner_integrations(
    payload: OwnerIntegrationsPayload,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerIntegrationsPayload:
    _ensure_staff_role(session_data, {"owner"})
    value = _upsert_setting(db, "owner_integrations", payload.model_dump())
    db.commit()
    return OwnerIntegrationsPayload.model_validate(value)


@app.put("/api/settings/owner/security", response_model=OwnerSecurityPayload)
def save_owner_security(
    payload: OwnerSecurityPayload,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerSecurityPayload:
    _ensure_staff_role(session_data, {"owner"})
    owner = _primary_owner(db)
    if payload.twoFactor and (owner is None or not _safe_text(owner.telegram_chat_id).strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Сначала главный владелец должен открыть Mini App из Telegram, затем можно включать двухфакторную аутентификацию.",
        )
    value = _upsert_setting(db, "owner_security", payload.model_dump())
    db.commit()
    return OwnerSecurityPayload.model_validate(value)


@app.put("/api/workers/settings", response_model=list[WorkerPayload])
def save_worker_settings(
    payload: list[EmployeeSettingPayload],
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> list[WorkerPayload]:
    _ensure_staff_role(session_data, {"owner", "accountant"})
    workers = {
        worker.id: worker
        for worker in db.scalars(
            select(StaffUser).where(
                StaffUser.role.in_(("admin", "worker", "accountant"))
            )
        ).all()
    }
    for item in payload:
        worker = workers.get(item.id)
        if worker is None:
            continue
        worker.name = item.name
        worker.default_percent = clamp_worker_percent(item.percent)
        worker.salary_base = item.salaryBase
        if hasattr(worker, "salary_per_shift"):
            worker.salary_per_shift = max(0, item.salaryPerShift)
        worker.active = item.active
        worker.available = item.active
        try:
            worker.telegram_chat_id = ensure_staff_chat_id_available(
                db,
                item.telegramChatId,
                exclude_staff_id=worker.id,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=str(exc)
            ) from exc
        worker.updated_at = _now()
    db.commit()
    refreshed = db.scalars(
        select(StaffUser)
        .where(StaffUser.role.in_(("admin", "worker", "accountant")))
        .order_by(StaffUser.role.asc(), StaffUser.name.asc())
    ).all()
    payroll_summaries = _worker_payroll_summaries(
        db, refreshed, _complaints_by_worker(_load_penalties(db))
    )
    return [
        _worker_payload_with_payroll(worker, payroll_summaries) for worker in refreshed
    ]


@app.put("/api/admin/workers/payroll", response_model=list[WorkerPayload])
def save_admin_worker_payroll(
    payload: list[EmployeeSettingPayload],
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> list[WorkerPayload]:
    _ensure_staff_role(session_data, {"admin", "accountant"})
    workers = {
        worker.id: worker
        for worker in db.scalars(
            select(StaffUser).where(StaffUser.role == "worker")
        ).all()
    }
    for item in payload:
        worker = workers.get(item.id)
        if worker is None:
            continue
        worker.default_percent = clamp_worker_percent(item.percent)
        worker.salary_base = max(0, item.salaryBase)
        worker.active = item.active
        worker.available = item.active
        worker.updated_at = _now()
    db.commit()
    refreshed = db.scalars(
        select(StaffUser)
        .where(StaffUser.role == "worker")
        .order_by(StaffUser.name.asc())
    ).all()
    payroll_summaries = _worker_payroll_summaries(
        db, refreshed, _complaints_by_worker(_load_penalties(db))
    )
    return [
        _worker_payload_with_payroll(worker, payroll_summaries) for worker in refreshed
    ]


@app.post("/api/payroll/entries", response_model=WorkerPayload)
def create_payroll_entry(
    payload: PayrollEntryCreateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> WorkerPayload:
    _ensure_staff_role(session_data, {"admin", "owner", "accountant"})
    worker = db.get(StaffUser, payload.workerId)
    if worker is None or worker.role not in {"admin", "worker", "accountant"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Сотрудник не найден"
        )
    if session_data["role"] in {"admin", "accountant"} and worker.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Администратор может вести выплаты только по мастерам",
        )

    amount = int(payload.amount)
    if payload.kind == "adjustment":
        if amount == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Укажите сумму корректировки",
            )
    else:
        if amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Сумма должна быть больше нуля",
            )

    complaints_by_worker = _complaints_by_worker(_load_penalties(db))
    payroll_summaries = _worker_payroll_summaries(db, [worker], complaints_by_worker)
    worker_summary = payroll_summaries.get(worker.id)
    if (
        session_data["role"] in {"admin", "accountant"}
        and payload.kind == "advance"
        and (worker_summary is None or worker_summary.accruedFromBookings < 1000)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Администратор не может выдать аванс, пока мастер не заработал минимум 1000 ₽",
        )

    entry = PayrollEntry(
        id=f"pay-{uuid4()}",
        worker_id=worker.id,
        actor_id=session_data["actorId"],
        actor_role=session_data["role"],
        kind=payload.kind,
        amount=amount,
        note=payload.note.strip(),
        created_at=_now(),
    )
    db.add(entry)
    _notify_worker_about_payroll_entry(
        db,
        worker,
        actor_role=session_data["role"],
        actor_id=session_data["actorId"],
        kind=payload.kind,
        amount=amount,
        note=payload.note.strip(),
    )
    worker.updated_at = _now()
    db.commit()
    db.refresh(worker)
    payroll_summaries = _worker_payroll_summaries(db, [worker], complaints_by_worker)
    return _worker_payload_with_payroll(worker, payroll_summaries)


@app.put("/api/payroll/entries/{entry_id}", response_model=PayrollEntryPayload)
def update_payroll_entry(
    entry_id: str,
    payload: PayrollEntryUpdateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> PayrollEntryPayload:
    _ensure_staff_role(session_data, {"owner"})

    entry = db.get(PayrollEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    worker = db.get(StaffUser, entry.worker_id)
    if worker is None:
        raise HTTPException(status_code=404, detail="Сотрудник не найден")

    if payload.amount < 0:
        raise HTTPException(status_code=400, detail="Сумма не может быть отрицательной")

    entry.amount = payload.amount
    entry.note = payload.note.strip()
    entry.actor_id = session_data["actorId"]
    entry.actor_role = session_data["role"]
    db.commit()
    db.refresh(entry)

    actor = db.get(StaffUser, entry.actor_id)
    actor_name = actor.name if actor is not None else "Сотрудник"

    _notify_worker_about_payroll_entry(
        db,
        worker,
        actor_role=session_data["role"],
        actor_id=session_data["actorId"],
        kind=entry.kind,
        amount=entry.amount,
        note=f"Изменено: {payload.note.strip()}" if payload.note else "Изменено",
    )

    return _payroll_entry_payload(entry, actor_name)


# ── Salary detail (owner) ─────────────────────────────────────────────────

def _salary_date_range(period: str, ref: date | None = None) -> tuple[str, str]:
    """Возвращает (date_from, date_to) в формате DD.MM.YYYY."""
    ref = ref or date.today()
    if period == "day":
        return ref.strftime("%d.%m.%Y"), ref.strftime("%d.%m.%Y")
    elif period == "week":
        saturday = ref - timedelta(days=(ref.weekday() - 5) % 7)
        friday = saturday + timedelta(days=6)
        return saturday.strftime("%d.%m.%Y"), friday.strftime("%d.%m.%Y")
    elif period == "month":
        first = ref.replace(day=1)
        if ref.month == 12:
            last = ref.replace(year=ref.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            last = ref.replace(month=ref.month + 1, day=1) - timedelta(days=1)
        return first.strftime("%d.%m.%Y"), last.strftime("%d.%m.%Y")
    else:  # all
        return "01.01.2000", "31.12.2099"


def _resource_group_for_service(db: Session, service_id: str) -> str:
    svc = db.get(Service, service_id)
    return svc.resource_group if svc else "wash"


@app.get(
    "/api/owner/workers/{worker_id}/salary-detail",
    response_model=SalaryDetailResponse,
)
def owner_worker_salary_detail(
    worker_id: str,
    period: str = "month",
    segment: str = "all",
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> SalaryDetailResponse:
    _ensure_staff_role(session_data, {"owner"})

    if period not in ("day", "week", "month", "all"):
        raise HTTPException(status_code=400, detail="Invalid period")
    if segment not in ("all", "wash", "detailing"):
        raise HTTPException(status_code=400, detail="Invalid segment")

    worker = db.get(StaffUser, worker_id)
    if worker is None or worker.role != "worker":
        raise HTTPException(status_code=404, detail="Мастер не найден")

    date_from, date_to = _salary_date_range(period)

    date_from_key = date_from[6:10] + date_from[3:5] + date_from[0:2]  # DD.MM.YYYY → YYYYMMDD
    date_to_key = date_to[6:10] + date_to[3:5] + date_to[0:2]

    # ── Completed bookings within date range (convert date string for proper comparison) ──
    date_col_key = (
        func.substr(Booking.date, 7, 4).concat(
            func.substr(Booking.date, 4, 2)
        ).concat(
            func.substr(Booking.date, 1, 2)
        )
    )
    bookings_query = (
        select(Booking)
        .options(joinedload(Booking.worker_links))
        .join(BookingWorker)
        .where(
            BookingWorker.worker_id == worker_id,
            Booking.status == "completed",
            date_col_key >= date_from_key,
            date_col_key <= date_to_key,
        )
        .order_by(Booking.date.desc(), Booking.time.desc())
    )
    completed_bookings = db.scalars(bookings_query).unique().all()

    # ── Penalties (complaints) ──
    all_penalties = _load_penalties(db)
    complaints_by_worker = _complaints_by_worker(all_penalties)
    worker_complaints = complaints_by_worker.get(worker_id, [])

    # ── Build booking items ──
    booking_items: list[SalaryBookingItem] = []
    shift_dates: set[str] = set()
    total_earned = 0
    for b in completed_bookings:
        percent = adjusted_booking_percent(
            next(
                (link.percent for link in b.worker_links if link.worker_id == worker_id),
                worker.default_percent,
            ),
            worker_complaints,
            date_value=b.date,
            time_value=b.time,
            fallback=b.created_at,
        )
        rg = _resource_group_for_service(db, b.service_id)
        if segment != "all" and rg != segment:
            continue
        earned = round(b.price * percent / 100)
        total_earned += earned
        shift_dates.add(b.date)
        booking_items.append(
            SalaryBookingItem(
                id=b.id,
                date=b.date,
                time=b.time,
                service=b.service,
                box=b.box,
                price=b.price,
                earned=earned,
                percent=percent,
                resourceGroup=rg,
            )
        )

    # ── Payroll entries within date range ──
    all_entries = db.scalars(
        select(PayrollEntry).where(
            PayrollEntry.worker_id == worker_id,
            PayrollEntry.created_at >= datetime.strptime(date_from, "%d.%m.%Y").replace(tzinfo=timezone.utc),
            PayrollEntry.created_at <= datetime.strptime(date_to, "%d.%m.%Y").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc),
        )
        .order_by(PayrollEntry.created_at.desc())
    ).all()

    actors = {}
    if all_entries:
        actor_ids = {e.actor_id for e in all_entries}
        actors_list = db.scalars(
            select(StaffUser).where(StaffUser.id.in_(actor_ids))
        ).all()
        actors = {a.id: a.name for a in actors_list}

    payout_entries = [e for e in all_entries if e.kind == "payout"]
    payout_items = [
        SalaryPayoutItem(
            id=e.id,
            amount=e.amount,
            note=e.note,
            createdAt=e.created_at,
            createdBy=actors.get(e.actor_id, "Сотрудник"),
        )
        for e in payout_entries
    ]
    total_paid = sum(e.amount for e in payout_entries)

    entry_payloads = [
        _payroll_entry_payload(e, actors.get(e.actor_id, "Сотрудник"))
        for e in all_entries
    ]

    # ── Shift count ──
    salary_per_shift = getattr(worker, "salary_per_shift", 0) or 0
    if period == "all":
        inspections = _admin_shift_inspections_state(db)
        shift_count, _ = _compute_shift_attendance(
            inspections, worker.id, date(2000, 1, 1), date.today()
        )
    else:
        d_from = datetime.strptime(date_from, "%d.%m.%Y").date()
        d_to = datetime.strptime(date_to, "%d.%m.%Y").date()
        inspections = _admin_shift_inspections_state(db)
        shift_count, _ = _compute_shift_attendance(inspections, worker.id, d_from, d_to)

    return SalaryDetailResponse(
        workerId=worker.id,
        workerName=worker.name,
        salaryBase=worker.salary_base,
        salaryPerShift=salary_per_shift,
        defaultPercent=worker.default_percent,
        active=worker.active,
        totalEarned=total_earned,
        totalPaid=total_paid,
        balanceToPay=total_earned - total_paid,
        completedBookingsCount=len(booking_items),
        shiftCount=shift_count,
        bookings=booking_items,
        payouts=payout_items,
        entries=entry_payloads,
    )


@app.post(
    "/api/owner/workers/{worker_id}/pay-salary",
    response_model=PaySalaryResponse,
)
def owner_worker_pay_salary(
    worker_id: str,
    payload: PaySalaryRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> PaySalaryResponse:
    _ensure_staff_role(session_data, {"owner"})

    worker = db.get(StaffUser, worker_id)
    if worker is None or worker.role != "worker":
        raise HTTPException(status_code=404, detail="Мастер не найден")

    # Determine resource_group from segment
    if payload.segment == "detailing":
        resource_group = "detailing"
    else:
        resource_group = "wash"

    amount = payload.amount

    # 1. Create PayrollEntry
    entry = PayrollEntry(
        id=f"pay-{uuid4()}",
        worker_id=worker.id,
        actor_id=session_data["actorId"],
        actor_role=session_data["role"],
        kind="payout",
        amount=amount,
        note=payload.note.strip() or f"Выплата зарплаты ({payload.period})",
        created_at=_now(),
    )
    db.add(entry)

    # 2. Create Expense (auto-deduct from budget)
    today_str = date.today().strftime("%d.%m.%Y")
    expense = Expense(
        id=f"exp-{uuid4()}",
        title=f"Зарплата: {worker.name}",
        amount=amount,
        category="Зарплата",
        date=today_str,
        note=payload.note.strip() or f"Выплата зарплаты ({payload.period})",
        resource_group=resource_group,
        created_at=_now(),
    )
    db.add(expense)

    _notify_worker_about_payroll_entry(
        db,
        worker,
        actor_role=session_data["role"],
        actor_id=session_data["actorId"],
        kind="payout",
        amount=amount,
        note=payload.note.strip() or f"Выплата зарплаты ({payload.period})",
    )

    worker.updated_at = _now()
    db.commit()
    db.refresh(worker)

    # Recalculate balance
    all_penalties = _load_penalties(db)
    complaints_by_worker = _complaints_by_worker(all_penalties)
    payroll_summaries = _worker_payroll_summaries(db, [worker], complaints_by_worker)
    summary = payroll_summaries.get(worker.id)
    new_balance = summary.balance if summary else 0

    return PaySalaryResponse(
        message="Выплата проведена",
        payoutId=entry.id,
        newBalance=new_balance,
        expenseId=expense.id,
    )


@app.post("/api/workers", response_model=WorkerPayload)
def create_worker(
    payload: WorkerCreateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> WorkerPayload:
    _ensure_staff_role(session_data, {"owner"})
    name = payload.name.strip()
    login = payload.login.strip().lower()
    password = payload.password.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Укажите имя сотрудника"
        )
    if not login:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Укажите логин сотрудника"
        )
    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Введите пароль"
        )
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пароль должен содержать минимум 8 символов",
        )
    try:
        telegram_chat_id = ensure_staff_chat_id_available(db, payload.telegramChatId)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc

    existing = db.scalar(select(StaffUser).where(StaffUser.login == login))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Логин уже занят"
        )

    worker = StaffUser(
        id=f"w-{uuid4()}",
        login=login,
        password_hash=hash_password(password),
        role=payload.role,
        name=name,
        phone=payload.phone.strip(),
        email=payload.email.strip(),
        city="",
        experience="",
        specialty="",
        about="",
        telegram_chat_id=telegram_chat_id,
        is_primary_owner=False,
        default_percent=clamp_worker_percent(payload.percent),
        salary_base=max(0, payload.salaryBase),
        available=True,
        active=True,
    )
    db.add(worker)
    db.commit()
    db.refresh(worker)
    payroll_summaries = _worker_payroll_summaries(
        db, [worker], _complaints_by_worker(_load_penalties(db))
    )
    return _worker_payload_with_payroll(worker, payroll_summaries)


@app.post("/api/workers/{worker_id}/reset-password", response_model=GenericMessage)
def reset_worker_password(
    worker_id: str,
    payload: ResetPasswordRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    _ensure_staff_role(session_data, {"owner"})
    worker = db.get(StaffUser, worker_id)
    if worker is None or worker.role not in {"admin", "worker", "accountant"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found"
        )
    if worker.is_primary_owner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Primary owner password cannot be reset this way",
        )
    new_password = payload.newPassword.strip()
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Новый пароль должен содержать минимум 8 символов",
        )
    worker.password_hash = hash_password(new_password)
    worker.updated_at = _now()
    db.commit()
    return GenericMessage(message="Пароль сброшен")


@app.delete("/api/workers/{worker_id}", response_model=GenericMessage)
def fire_worker(
    worker_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    _ensure_staff_role(session_data, {"owner"})
    worker = db.get(StaffUser, worker_id)
    if worker is None or worker.role not in {"admin", "worker", "accountant"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found"
        )
    if worker.is_primary_owner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Primary owner cannot be dismissed",
        )

    now = _now()
    assigned_bookings: list[Booking] = []
    if worker.role == "worker":
        assigned_bookings = (
            db.scalars(
                select(Booking)
                .join(Booking.worker_links)
                .options(joinedload(Booking.worker_links))
                .where(
                    BookingWorker.worker_id == worker_id,
                    Booking.status.in_(tuple(BOOKING_ACTIVE_STATUSES)),
                )
                .order_by(Booking.date.asc(), Booking.time.asc())
            )
            .unique()
            .all()
        )
    in_progress_bookings = [
        booking for booking in assigned_bookings if booking.status == "in_progress"
    ]
    if in_progress_bookings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="У мастера есть активные записи. Сначала завершите их или снимите мастера с текущей работы.",
        )

    scheduled_count = 0
    for booking in assigned_bookings:
        if booking.status in {"new", "confirmed", "scheduled"}:
            scheduled_count += 1
        for link in list(booking.worker_links):
            if link.worker_id == worker_id:
                booking.worker_links.remove(link)

    db.execute(
        sa_delete(TelegramLinkCode).where(TelegramLinkCode.staff_id == worker_id)
    )

    employee_label = (
        "Администратор"
        if worker.role == "admin"
        else "Бухгалтер"
        if worker.role == "accountant"
        else "Мастер"
    )
    dismissed_role = f"dismissed_{worker.role}"
    previous_telegram_chat_id = worker.telegram_chat_id
    worker.role = dismissed_role
    worker.active = False
    worker.available = False
    worker.telegram_chat_id = ""
    worker.login = f"dismissed_{worker.id[-6:]}_{uuid4().hex[:8]}"
    worker.two_factor_code_hash = None
    worker.two_factor_expires_at = None
    worker.updated_at = now

    if scheduled_count > 0:
        db.add(
            Notification(
                id=f"n-{uuid4()}",
                recipient_role="admin",
                recipient_id=None,
                message=(
                    f"{employee_label} {worker.name} уволен. "
                    f"С него снято {scheduled_count} запланированных записей, их нужно переназначить."
                ),
                read=False,
                created_at=now,
            )
        )

    db.commit()
    _send_telegram_safe(
        previous_telegram_chat_id,
        "Доступ в CRM и Mini App отключён владельцем. Если это ошибка, свяжитесь с руководителем.",
    )
    return GenericMessage(message=f"{employee_label} {worker.name} уволен")


@app.post("/api/auth/change-password", response_model=GenericMessage)
def change_password(
    payload: ChangePasswordRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    if session_data["role"] == "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clients do not use password auth",
        )
    staff = db.get(StaffUser, session_data["actorId"])
    if staff is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    if not verify_password(payload.currentPassword, staff.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Текущий пароль неверный"
        )
    if len(payload.newPassword.strip()) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Новый пароль должен содержать минимум 8 символов",
        )
    staff.password_hash = hash_password(payload.newPassword)
    staff.updated_at = _now()
    db.commit()
    return GenericMessage(message="Пароль обновлён")
