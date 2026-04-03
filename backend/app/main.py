from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Thread
from typing import Any
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy import delete as sa_delete, inspect, or_, select
from sqlalchemy.orm import Session, joinedload

from .complaints import (
    COMPLAINT_DURATION_DAYS,
    COMPLAINT_PERCENT_DEDUCTION,
    COMPLAINT_THRESHOLD,
    adjusted_booking_percent,
    clamp_worker_percent,
    complaint_active_until,
    complaint_status_for_percent,
)
from .config import get_settings
from .database import Base, engine, get_db
from .exports import GeneratedExport, OwnerSummaryReport, build_owner_export, build_owner_summary_export, build_owner_summary_report
from .models import (
    AppSetting,
    Booking,
    BookingWorker,
    Box,
    Client,
    Expense,
    Notification,
    Penalty,
    AuthSession,
    ScheduleEntry,
    Service,
    StaffUser,
    StockItem,
    TelegramLinkCode,
)
from .schemas import (
    AdminNotificationSettings,
    AdminProfilePayload,
    AuthResponse,
    BookingCreateRequest,
    BookingPayload,
    BookingUpdateRequest,
    BookingWorkerPayload,
    BootstrapPayload,
    BoxPayload,
    ChangePasswordRequest,
    ClientAuthRequest,
    ClientCardUpdateRequest,
    ClientProfileInput,
    ClientProfilePayload,
    ClientSummaryPayload,
    EmployeeSettingPayload,
    ExpenseCreateRequest,
    ExpensePayload,
    GenericMessage,
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
    ReadAllNotificationsRequest,
    SchedulePayload,
    ServicePayload,
    SessionPayload,
    SettingsBundlePayload,
    StaffLoginRequest,
    StockItemCreateRequest,
    StockItemPayload,
    StockItemUpdateRequest,
    StockWriteOffRequest,
    normalize_plate,
    normalize_phone,
    normalize_phone_digits,
    normalize_vehicle_name,
    PenaltyCreateRequest,
    PenaltyPayload,
    TelegramLinkCodePayload,
    TelegramOwnerAuthRequest,
    WorkerNotificationSettings,
    WorkerPayload,
    WorkerCreateRequest,
    WorkerProfilePayload,
)
from .security import (
    create_session_token,
    decode_session_token,
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
        sync_telegram_webhook,
        telegram_webhook_secret,
    )
except ImportError:
    from bot import (
        process_telegram_update,
        run_polling,
        send_telegram_document,
        send_telegram_message,
        sync_telegram_webhook,
        telegram_webhook_secret,
    )


settings = get_settings()
logger = logging.getLogger(__name__)
frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
frontend_assets = frontend_dist / "assets"
bot_thread: Thread | None = None
PRIMARY_OWNER_ID = "owner-primary"
PRIMARY_OWNER_LOGIN = "creator_owner"
SECONDARY_OWNER_ID = "owner-1"
OWNER_DATABASE_RESET_SETTING_KEY = "owner_database_reset"
BOOKING_REMINDER_STATE_KEY = "booking_reminder_dispatch_state"
OWNER_DATABASE_RESET_CONFIRMATION_PHRASE = "ПОДТВЕРЖДАЮ ПОЛНУЮ ОЧИСТКУ"
OWNER_DATABASE_RESET_CODE_LIFETIME_MINUTES = 10
OWNER_DATABASE_RESET_DELAY_SECONDS = 10
BOOKING_ACTIVE_STATUSES = {"new", "confirmed", "scheduled", "in_progress"}
BOOKING_CLIENT_CANCELLABLE_STATUSES = {"new", "confirmed", "scheduled"}
BOOKING_REMINDER_ELIGIBLE_STATUSES = {"new", "confirmed", "scheduled"}
BOOKING_WORKER_MESSAGE_STATUSES = {"new", "confirmed", "scheduled", "in_progress", "admin_review"}

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    return FileResponse(index_file, headers=HTML_NO_CACHE_HEADERS)


@app.on_event("startup")
def on_startup() -> None:
    global bot_thread
    Base.metadata.create_all(bind=engine)
    _apply_runtime_migrations()
    db = next(get_db())
    try:
        seed_database(db)
        _ensure_owner_accounts(db)
        _repair_text_data(db)
        _normalize_worker_rules(db)
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
            logger.info("Telegram webhook synced for @%s -> %s", username, settings.telegram_webhook_path)
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
    forwarded_for = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    if forwarded_for:
        return forwarded_for
    if request.client is not None and request.client.host:
        return request.client.host
    return ""


def _client_by_phone(db: Session, phone: str) -> Client | None:
    target_phone = normalize_phone_digits(phone)
    for client in db.scalars(select(Client)).all():
        try:
            if normalize_phone_digits(client.phone) == target_phone:
                return client
        except ValueError:
            continue
    return None


def _owner_query():
    return select(StaffUser).where(StaffUser.role == "owner").order_by(StaffUser.created_at.asc(), StaffUser.id.asc())


def _primary_owner(db: Session) -> StaffUser | None:
    return db.scalar(
        select(StaffUser)
        .where(StaffUser.role == "owner", StaffUser.is_primary_owner.is_(True))
        .order_by(StaffUser.created_at.asc(), StaffUser.id.asc())
    )


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

    if not any(owner.id != primary_owner.id for owner in owners):
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


def _create_auth_session(db: Session, session_data: dict, request: Request) -> AuthSession:
    auth_session = AuthSession(
        id=str(uuid4()),
        actor_role=session_data["role"],
        actor_id=session_data["actorId"],
        login=session_data.get("login"),
        user_agent=request.headers.get("user-agent", ""),
        ip_address=_request_ip(request),
        created_at=_now(),
        last_seen_at=_now(),
    )
    db.add(auth_session)
    db.flush()
    return auth_session


def _active_sessions_payload(db: Session, session_data: dict) -> list[AuthSessionPayload]:
    sessions = db.scalars(
        select(AuthSession)
        .where(
            AuthSession.actor_role == session_data["role"],
            AuthSession.actor_id == session_data["actorId"],
            AuthSession.revoked_at.is_(None),
        )
        .order_by(AuthSession.last_seen_at.desc(), AuthSession.created_at.desc())
    ).all()
    current_session_id = session_data.get("sessionId")
    return [
        AuthSessionPayload(
            id=item.id,
            device=_device_label(item.user_agent),
            ipAddress=item.ip_address or "Неизвестный IP",
            createdAt=item.created_at,
            lastSeenAt=item.last_seen_at,
            current=item.id == current_session_id,
        )
        for item in sessions
    ]


def _apply_runtime_migrations() -> None:
    def ensure_postgres_varchar_length(table_name: str, column_name: str, minimum_length: int) -> None:
        if engine.dialect.name != "postgresql":
            return
        column = next(
            (item for item in inspect(engine).get_columns(table_name) if item["name"] == column_name),
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
            (item for item in inspect(engine).get_columns(table_name) if item["name"] == column_name),
            None,
        )
        if column is None:
            return
        if column["type"].__class__.__name__.lower() == "text":
            return
        with engine.begin() as connection:
            connection.exec_driver_sql(f"ALTER TABLE {table_name} ALTER COLUMN {column_name} TYPE TEXT")

    inspector = inspect(engine)
    client_columns = {column["name"] for column in inspector.get_columns("clients")}
    if "notes" not in client_columns:
        with engine.begin() as connection:
            connection.exec_driver_sql("ALTER TABLE clients ADD COLUMN notes TEXT DEFAULT ''")
    if "debt_balance" not in client_columns:
        with engine.begin() as connection:
            connection.exec_driver_sql("ALTER TABLE clients ADD COLUMN debt_balance INTEGER DEFAULT 0")
    if "clients" in inspector.get_table_names():
        ensure_postgres_varchar_length("clients", "id", 64)
    columns = {column["name"] for column in inspector.get_columns("staff_users")}
    if "staff_users" in inspector.get_table_names():
        ensure_postgres_varchar_length("staff_users", "id", 64)
    if "telegram_chat_id" not in columns:
        with engine.begin() as connection:
            connection.exec_driver_sql("ALTER TABLE staff_users ADD COLUMN telegram_chat_id VARCHAR(64) DEFAULT ''")
    if "is_primary_owner" not in columns:
        with engine.begin() as connection:
            connection.exec_driver_sql("ALTER TABLE staff_users ADD COLUMN is_primary_owner BOOLEAN DEFAULT 0")
    if "two_factor_code_hash" not in columns:
        with engine.begin() as connection:
            connection.exec_driver_sql("ALTER TABLE staff_users ADD COLUMN two_factor_code_hash VARCHAR(128)")
    if "two_factor_expires_at" not in columns:
        with engine.begin() as connection:
            connection.exec_driver_sql("ALTER TABLE staff_users ADD COLUMN two_factor_expires_at TIMESTAMP")
    if "telegram_link_codes" not in inspector.get_table_names():
        TelegramLinkCode.__table__.create(bind=engine)
    else:
        ensure_postgres_varchar_length("telegram_link_codes", "staff_id", 64)
    if "auth_sessions" not in inspector.get_table_names():
        AuthSession.__table__.create(bind=engine)
    else:
        ensure_postgres_varchar_length("auth_sessions", "actor_id", 64)
        ensure_postgres_text_column("auth_sessions", "user_agent")
    if "bookings" in inspector.get_table_names():
        ensure_postgres_varchar_length("bookings", "id", 64)
        ensure_postgres_varchar_length("bookings", "client_id", 64)
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
            connection.exec_driver_sql("ALTER TABLE penalties ADD COLUMN active_until TIMESTAMP")
    if "revoked_at" not in penalty_columns:
        with engine.begin() as connection:
            connection.exec_driver_sql("ALTER TABLE penalties ADD COLUMN revoked_at TIMESTAMP")
    if "revoked_by" not in penalty_columns:
        with engine.begin() as connection:
            connection.exec_driver_sql("ALTER TABLE penalties ADD COLUMN revoked_by VARCHAR(64)")


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


def _client_payload(client: Client | None) -> ClientProfilePayload | None:
    if client is None:
        return None
    return ClientProfilePayload(
        name=client.name,
        phone=client.phone,
        car=client.car or "",
        plate=client.plate or "",
        registered=client.registered,
    )


def _client_summary_payload(client: Client) -> ClientSummaryPayload:
    return ClientSummaryPayload(
        id=client.id,
        name=client.name,
        phone=client.phone,
        car=client.car or "",
        plate=client.plate or "",
        notes=client.notes or "",
        debtBalance=client.debt_balance,
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


def _booking_time_range(date_value: str, time_value: str, duration: int) -> tuple[datetime, datetime] | None:
    scheduled_at = _parse_booking_datetime(date_value, time_value)
    if scheduled_at is None or duration <= 0:
        return None
    return scheduled_at, scheduled_at + timedelta(minutes=duration)


def _time_ranges_overlap(start_at: datetime, end_at: datetime, other_start_at: datetime, other_end_at: datetime) -> bool:
    return start_at < other_end_at and end_at > other_start_at


def _ensure_booking_datetime_not_in_past(date_value: str, time_value: str) -> None:
    scheduled_at = _parse_booking_datetime(date_value, time_value)
    if scheduled_at is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Укажите корректные дату и время записи")
    current_local = datetime.now().replace(second=0, microsecond=0)
    if scheduled_at < current_local:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя записаться на прошедшее время")


def _ensure_booking_within_schedule(db: Session, date_value: str, time_value: str, duration: int) -> None:
    time_range = _booking_time_range(date_value, time_value, duration)
    if time_range is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Укажите корректные дату, время и длительность",
        )

    scheduled_at, _ = time_range
    day_schedule = db.scalar(select(ScheduleEntry).where(ScheduleEntry.day_index == scheduled_at.weekday()))
    if day_schedule is None or not day_schedule.active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="В этот день запись недоступна")

    open_minutes = _parse_time_to_minutes(day_schedule.open_time)
    close_minutes = _parse_time_to_minutes(day_schedule.close_time)
    start_minutes = _parse_time_to_minutes(time_value)
    if open_minutes is None or close_minutes is None or start_minutes is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Некорректно настроен график работы")

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
    )
    if booking_id is not None:
        query = query.where(Booking.id != booking_id)

    for existing in db.scalars(query).all():
        existing_range = _booking_time_range(existing.date, existing.time, existing.duration)
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
    preferred_box: str | None = None,
) -> str | None:
    active_box_names = [
        box.name
        for box in db.scalars(select(Box).where(Box.active.is_(True)).order_by(Box.name.asc())).all()
        if box.name.strip()
    ]
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
        )
    )
    if booking_id is not None:
        query = query.where(Booking.id != booking_id)

    for existing in db.scalars(query).unique().all():
        existing_range = _booking_time_range(existing.date, existing.time, existing.duration)
        if existing_range is None:
            continue
        existing_start_at, existing_end_at = existing_range
        if not _time_ranges_overlap(start_at, end_at, existing_start_at, existing_end_at):
            continue

        if box and existing.box == box:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Бокс {box} уже занят на это время",
            )

        overlapping_worker_names = sorted(
            {
                link.worker_name
                for link in existing.worker_links
                if link.worker_id in worker_ids
            }
        )
        if overlapping_worker_names:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Мастер уже занят: " + ", ".join(overlapping_worker_names),
            )


def _load_penalties(db: Session, *, worker_ids: set[str] | None = None) -> list[Penalty]:
    query = select(Penalty).options(joinedload(Penalty.worker)).order_by(Penalty.created_at.desc())
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
        name=worker.name,
        experience=worker.experience,
        defaultPercent=clamp_worker_percent(worker.default_percent),
        salaryBase=worker.salary_base,
        available=worker.available,
        active=worker.active,
        phone=worker.phone,
        email=worker.email,
        city=worker.city,
        specialty=worker.specialty,
        about=worker.about,
        telegramChatId=worker.telegram_chat_id or "",
    )


def _booking_payload(booking: Booking, complaints_by_worker: dict[str, list[Penalty]] | None = None) -> BookingPayload:
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
        createdAt=booking.created_at,
        notes=booking.notes,
        car=booking.car,
        plate=booking.plate,
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
        desc=service.description,
        active=service.active,
    )


def _box_payload(box: Box) -> BoxPayload:
    return BoxPayload(
        id=box.id,
        name=box.name,
        pricePerHour=box.price_per_hour,
        active=box.active,
        description=box.description,
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
    admin_profile_default = {"name": "Администратор", "email": "", "phone": "", "telegramChatId": ""}
    admin_notification_default = {"newBooking": True, "cancelled": True, "paymentDue": False, "workerAssigned": True, "reminders": True}
    owner_company_default = {"name": "ATMOSFERA", "legalName": "", "inn": "", "address": "", "phone": "", "email": ""}
    owner_notification_default = {"telegramBot": True, "emailReports": True, "smsReminders": False, "lowStock": True, "dailyReport": True, "weeklyReport": False, "bookingReminders": True}
    owner_integrations_default = {"telegram": True, "yookassa": False, "amoCrm": False, "googleCalendar": False}
    owner_security_default = {"twoFactor": False}
    worker_notification_default = {"newTask": True, "taskUpdate": True, "payment": True, "reminders": True, "sms": False}

    admin_profile = _merge_setting_dict(_setting(db, "admin_profile", admin_profile_default), admin_profile_default)
    admin_staff = db.scalar(select(StaffUser).where(StaffUser.role == "admin").order_by(StaffUser.created_at.asc()))
    owner_staff = _primary_owner(db)
    if admin_staff is not None:
        admin_profile = {
            **admin_profile,
            "name": admin_staff.name,
            "email": admin_staff.email,
            "phone": admin_staff.phone,
            "telegramChatId": admin_staff.telegram_chat_id or "",
        }
    owner_security = _merge_setting_dict(_setting(db, "owner_security", owner_security_default), owner_security_default)
    if owner_security.get("twoFactor") and not (owner_staff and owner_staff.telegram_chat_id.strip()):
        owner_security = {"twoFactor": False}
    raw_worker_notifications = _setting(db, "worker_notification_settings", {})
    if not isinstance(raw_worker_notifications, dict):
        raw_worker_notifications = {}
    return SettingsBundlePayload(
        adminProfile=AdminProfilePayload.model_validate(admin_profile),
        adminNotificationSettings=AdminNotificationSettings.model_validate(
            _merge_setting_dict(_setting(db, "admin_notification_settings", admin_notification_default), admin_notification_default)
        ),
        ownerCompany=OwnerCompanyPayload.model_validate(
            _merge_setting_dict(_setting(db, "owner_company", owner_company_default), owner_company_default)
        ),
        ownerNotificationSettings=OwnerNotificationSettings.model_validate(
            _merge_setting_dict(_setting(db, "owner_notification_settings", owner_notification_default), owner_notification_default)
        ),
        ownerIntegrations=OwnerIntegrationsPayload.model_validate(
            _merge_setting_dict(_setting(db, "owner_integrations", owner_integrations_default), owner_integrations_default)
        ),
        ownerSecurity=OwnerSecurityPayload.model_validate(owner_security),
        workerNotificationSettings={
            worker_id: WorkerNotificationSettings.model_validate(_merge_setting_dict(value, worker_notification_default))
            for worker_id, value in raw_worker_notifications.items()
        },
    )


def _empty_settings_payload() -> SettingsBundlePayload:
    return SettingsBundlePayload(
        adminProfile=AdminProfilePayload(name="", email="", phone="", telegramChatId=""),
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


def _scoped_settings_payload(db: Session, role: str, actor_id: str) -> SettingsBundlePayload:
    full = _settings_payload(db)
    if role == "owner":
        return full

    empty = _empty_settings_payload()
    if role == "admin":
        return SettingsBundlePayload(
            adminProfile=full.adminProfile,
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
        sessionId=session_data["sessionId"],
        login=session_data.get("login"),
        displayName=session_data["displayName"],
    )


def _mark_overdue_bookings_for_admin_review(db: Session) -> None:
    now_local = datetime.now().replace(second=0, microsecond=0)
    changed = False
    for booking in db.scalars(select(Booking).where(Booking.status.in_(tuple(BOOKING_ACTIVE_STATUSES)))).all():
        booking_range = _booking_time_range(booking.date, booking.time, booking.duration)
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
    boxes = db.scalars(select(Box).order_by(Box.name)).all()
    schedule = db.scalars(select(ScheduleEntry).order_by(ScheduleEntry.day_index)).all()
    workers = db.scalars(select(StaffUser).where(StaffUser.role == "worker").order_by(StaffUser.name)).all()
    all_penalties = _load_penalties(db)
    complaints_by_worker = _complaints_by_worker(all_penalties)
    clients: list[ClientSummaryPayload] = []

    bookings_query = select(Booking).options(joinedload(Booking.worker_links)).order_by(Booking.date.desc(), Booking.time.desc(), Booking.created_at.desc())
    notifications_query = select(Notification).order_by(Notification.created_at.desc())
    stock_query = select(StockItem).order_by(StockItem.name)
    expense_query = select(Expense).order_by(Expense.date.desc(), Expense.created_at.desc())

    client = None
    staff_profile = None
    penalties: list[PenaltyPayload] = []

    if role == "client":
        client = db.get(Client, actor_id)
        bookings_query = bookings_query.where(Booking.client_id == actor_id)
        notifications_query = notifications_query.where(Notification.recipient_role == "client", Notification.recipient_id == actor_id)
        stock_items = []
        expenses = []
    else:
        staff_profile = db.get(StaffUser, actor_id)
        if role == "worker":
            bookings_query = bookings_query.join(Booking.worker_links).where(BookingWorker.worker_id == actor_id)
            notifications_query = notifications_query.where(Notification.recipient_role == "worker", Notification.recipient_id == actor_id)
        elif role == "admin":
            notifications_query = notifications_query.where(
                Notification.recipient_role == "admin",
                or_(Notification.recipient_id.is_(None), Notification.recipient_id == actor_id),
            )
            clients = [_client_summary_payload(item) for item in db.scalars(select(Client).order_by(Client.updated_at.desc(), Client.created_at.desc())).all()]
        else:
            notifications_query = notifications_query.where(
                Notification.recipient_role == "owner",
                or_(Notification.recipient_id.is_(None), Notification.recipient_id == actor_id),
            )

        if role == "owner":
            clients = [_client_summary_payload(item) for item in db.scalars(select(Client).order_by(Client.updated_at.desc(), Client.created_at.desc())).all()]
            stock_items = [_stock_payload(item) for item in db.scalars(stock_query).all()]
            expenses = [_expense_payload(item) for item in db.scalars(expense_query).all()]
            penalties = [_penalty_payload(item) for item in all_penalties]
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

    bookings = [_booking_payload(item, complaints_by_worker) for item in db.scalars(bookings_query).unique().all()]
    notifications = [_notification_payload(item) for item in db.scalars(notifications_query).all()]

    return BootstrapPayload(
        session=_session_payload(session_data),
        clientProfile=_client_payload(client),
        staffProfile=_worker_payload(staff_profile) if staff_profile else None,
        clients=clients,
        bookings=bookings,
        notifications=notifications,
        stockItems=stock_items,
        expenses=expenses,
        penalties=penalties,
        workers=[_worker_payload(worker) for worker in workers] if role in {"admin", "owner"} else [],
        services=[_service_payload(service) for service in services],
        boxes=[_box_payload(box) for box in boxes],
        schedule=[_schedule_payload(entry) for entry in schedule],
        settings=_scoped_settings_payload(db, role, actor_id),
    )


def _auth_token(session_data: dict) -> str:
    return create_session_token(session_data, settings.app_secret)


def _issue_auth_response(db: Session, request: Request, session_data: dict) -> AuthResponse:
    auth_session = _create_auth_session(db, session_data, request)
    session_data["sessionId"] = auth_session.id
    db.commit()
    return AuthResponse(
        token=_auth_token(session_data),
        role=session_data["role"],
        actorId=session_data["actorId"],
        bootstrap=_build_bootstrap(db, session_data),
    )


def _require_session(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        session_data = decode_session_token(token, settings.app_secret)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    session_id = session_data.get("sessionId")
    if not isinstance(session_id, str) or not session_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session is not registered")
    auth_session = db.get(AuthSession, session_id)
    if auth_session is None or auth_session.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session has been closed")
    if auth_session.actor_role != session_data.get("role") or auth_session.actor_id != session_data.get("actorId"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session does not match user")
    if session_data.get("role") != "client":
        staff = db.get(StaffUser, session_data.get("actorId"))
        if staff is None or staff.role != session_data.get("role"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session does not match user")
        if not staff.active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступ к аккаунту отключён")
    now = _now()
    last_seen_at = _as_utc(auth_session.last_seen_at)
    if now - last_seen_at > timedelta(seconds=30):
        auth_session.last_seen_at = now
        db.commit()
    return session_data


def _ensure_staff_role(session_data: dict, allowed: set[str]) -> None:
    if session_data["role"] not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def _validated_booking_workers(db: Session, workers: list[BookingWorkerPayload]) -> list[BookingWorkerPayload]:
    if not workers:
        return []

    ordered_ids: list[str] = []
    worker_inputs: dict[str, BookingWorkerPayload] = {}
    for worker in workers:
        worker_id = worker.workerId.strip()
        if not worker_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Укажите мастера")
        if worker_id in worker_inputs:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Один и тот же мастер указан несколько раз")
        ordered_ids.append(worker_id)
        worker_inputs[worker_id] = worker

    db_workers = {
        worker.id: worker
        for worker in db.scalars(select(StaffUser).where(StaffUser.id.in_(ordered_ids))).all()
    }
    validated: list[BookingWorkerPayload] = []
    for worker_id in ordered_ids:
        worker = db_workers.get(worker_id)
        if worker is None or worker.role != "worker" or not worker.active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Мастер не найден или недоступен")
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


def _sync_booking_workers(db: Session, booking: Booking, workers: list[BookingWorkerPayload]) -> None:
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


def _telegram_user_from_init_data(init_data: str) -> tuple[str, dict]:
    if not settings.telegram_bot_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="TELEGRAM_BOT_TOKEN is not configured")
    try:
        validated = validate_telegram_init_data(init_data, settings.telegram_bot_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    telegram_user = validated.get("user") or {}
    telegram_id = str(telegram_user.get("id")) if telegram_user.get("id") is not None else ""
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Telegram user is missing in initData")
    return telegram_id, telegram_user


def _telegram_display_name(telegram_user: dict, fallback: str) -> str:
    first_name = str(telegram_user.get("first_name") or "").strip()
    last_name = str(telegram_user.get("last_name") or "").strip()
    return " ".join(part for part in [first_name, last_name] if part).strip() or fallback


def _staff_session_data(staff: StaffUser) -> dict:
    return {"role": staff.role, "actorId": staff.id, "login": staff.login, "displayName": staff.name}


def _client_session_data(client: Client) -> dict:
    return {"role": "client", "actorId": client.id, "displayName": client.name}


def _owner_two_factor_recipient(db: Session) -> StaffUser:
    owner = _primary_owner(db)
    if owner is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Главный владелец ещё не настроен. Перезапустите сервер и попробуйте снова.",
        )
    if not owner.telegram_chat_id.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Создатель ещё не открыл Mini App из Telegram. Сначала зайдите создателем через бота.",
        )
    return owner


def _owner_export_recipients(db: Session, actor_id: str) -> list[StaffUser]:
    recipients: list[StaffUser] = []
    current_owner = db.get(StaffUser, actor_id)
    if current_owner is not None and current_owner.role == "owner" and current_owner.telegram_chat_id.strip():
        recipients.append(current_owner)
    primary_owner = _owner_two_factor_recipient(db)
    if not any(item.id == primary_owner.id for item in recipients):
        recipients.append(primary_owner)
    return recipients


def _booking_reminder_target_date(days_ahead: int = 1) -> str:
    return (datetime.now() + timedelta(days=days_ahead)).strftime("%d.%m.%Y")


def _worker_notification_settings_map(db: Session) -> dict[str, dict[str, Any]]:
    return _setting(db, "worker_notification_settings", {})


def _booking_reminder_state(db: Session) -> dict[str, Any]:
    return _setting(db, BOOKING_REMINDER_STATE_KEY, {"deliveries": {}})


def _cleanup_booking_reminder_deliveries(deliveries: dict[str, Any]) -> dict[str, str]:
    threshold = _now() - timedelta(days=14)
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
        {"telegramBot": True, "emailReports": True, "smsReminders": False, "lowStock": True, "dailyReport": True, "weeklyReport": False, "bookingReminders": True},
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

    bookings = db.scalars(
        select(Booking)
        .options(joinedload(Booking.worker_links))
        .where(
            Booking.date == reminder_date,
            Booking.status.in_(tuple(BOOKING_REMINDER_ELIGIBLE_STATUSES)),
        )
        .order_by(Booking.time.asc(), Booking.created_at.asc())
    ).unique().all()

    worker_ids = {link.worker_id for booking in bookings for link in booking.worker_links}
    workers_map = {
        worker.id: worker
        for worker in db.scalars(select(StaffUser).where(StaffUser.id.in_(worker_ids))).all()
    } if worker_ids else {}

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


def _save_owner_database_reset_state(db: Session, value: dict[str, Any]) -> dict[str, Any]:
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
    *,
    current_session_id: str | None = None,
) -> OwnerDatabaseResetPreviewPayload:
    active_session_ids = db.scalars(select(AuthSession.id)).all()
    sessions_closed = len([item_id for item_id in active_session_ids if not current_session_id or item_id != current_session_id])
    return OwnerDatabaseResetPreviewPayload(
        ownersPreserved=len(db.scalars(select(StaffUser.id).where(StaffUser.role == "owner")).all()),
        employeesDeleted=len(db.scalars(select(StaffUser.id).where(StaffUser.role.in_(("admin", "worker")))).all()),
        clientsDeleted=len(db.scalars(select(Client.id)).all()),
        bookingsDeleted=len(db.scalars(select(Booking.id)).all()),
        notificationsDeleted=len(db.scalars(select(Notification.id)).all()),
        stockItemsDeleted=len(db.scalars(select(StockItem.id)).all()),
        expensesDeleted=len(db.scalars(select(Expense.id)).all()),
        penaltiesDeleted=len(db.scalars(select(Penalty.id)).all()),
        sessionsClosed=sessions_closed,
        servicesReset=len(db.scalars(select(Service.id)).all()),
        boxesReset=len(db.scalars(select(Box.id)).all()),
        scheduleReset=len(db.scalars(select(ScheduleEntry.id)).all()),
        settingsReset=len(db.scalars(select(AppSetting.key)).all()),
    )


def _owner_database_reset_warnings(preview: OwnerDatabaseResetPreviewPayload) -> list[str]:
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
        f"Сохранятся только аккаунты владельцев ({preview.ownersPreserved}) и текущая сессия инициатора.",
    ]


def _perform_owner_database_reset(db: Session, *, current_session_id: str | None) -> None:
    db.execute(sa_delete(TelegramLinkCode))
    if current_session_id:
        db.execute(sa_delete(AuthSession).where(AuthSession.id != current_session_id))
    else:
        db.execute(sa_delete(AuthSession))
    db.execute(sa_delete(Notification))
    db.execute(sa_delete(BookingWorker))
    db.execute(sa_delete(Booking))
    db.execute(sa_delete(Penalty))
    db.execute(sa_delete(Expense))
    db.execute(sa_delete(StockItem))
    db.execute(sa_delete(Client))
    db.execute(sa_delete(Service))
    db.execute(sa_delete(Box))
    db.execute(sa_delete(ScheduleEntry))
    db.execute(sa_delete(AppSetting))
    db.execute(sa_delete(StaffUser).where(StaffUser.role.in_(("admin", "worker"))))

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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found")
    if kind not in {"report", "pdf"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown export type")

    _mark_overdue_bookings_for_admin_review(db)

    company_settings = _setting(
        db,
        "owner_company",
        {"name": "ATMOSFERA", "legalName": "", "inn": "", "address": "", "phone": "", "email": ""},
    )
    bookings = db.scalars(
        select(Booking)
        .options(joinedload(Booking.worker_links))
        .order_by(Booking.date.desc(), Booking.time.desc(), Booking.created_at.desc())
    ).unique().all()
    expenses = db.scalars(select(Expense).order_by(Expense.created_at.desc(), Expense.date.desc())).all()
    penalties = _load_penalties(db)
    workers = db.scalars(select(StaffUser).where(StaffUser.role == "worker").order_by(StaffUser.name)).all()
    stock_items = db.scalars(select(StockItem).order_by(StockItem.name)).all()
    services = db.scalars(select(Service).order_by(Service.name)).all()
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
    )


def _download_response(export_file: GeneratedExport) -> Response:
    return Response(
        content=export_file.content,
        media_type=export_file.media_type,
        headers={"Content-Disposition": f'attachment; filename="{export_file.file_name}"'},
    )


def _send_export_to_telegram(db: Session, actor_id: str, export_file: GeneratedExport) -> OwnerExportDeliveryPayload:
    last_error: Exception | None = None
    for recipient in _owner_export_recipients(db, actor_id):
        try:
            send_telegram_document(
                recipient.telegram_chat_id,
                file_name=export_file.file_name,
                content=export_file.content,
                caption=export_file.telegram_caption,
                mime_type=export_file.media_type.split(";", 1)[0],
            )
            return OwnerExportDeliveryPayload(
                message=f"Файл отправлен в Telegram владельца ({recipient.telegram_chat_id}).",
                fileName=export_file.file_name,
                telegramSent=True,
                telegramChatId=recipient.telegram_chat_id,
            )
        except Exception as exc:
            last_error = exc
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"Не удалось отправить файл в Telegram: {last_error}",
    ) from last_error


def _owner_summary_report(db: Session, actor_id: str, period: str, segment: str) -> OwnerSummaryReport:
    owner = db.get(StaffUser, actor_id)
    if owner is None or owner.role != "owner":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found")
    if period not in {"daily", "weekly"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown report period")
    if segment not in {"wash", "detailing"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown report segment")

    _mark_overdue_bookings_for_admin_review(db)
    company_settings = _setting(
        db,
        "owner_company",
        {"name": "ATMOSFERA", "legalName": "", "inn": "", "address": "", "phone": "", "email": ""},
    )
    bookings = db.scalars(
        select(Booking)
        .options(joinedload(Booking.worker_links))
        .order_by(Booking.date.desc(), Booking.time.desc(), Booking.created_at.desc())
    ).unique().all()
    services = db.scalars(select(Service).order_by(Service.name)).all()
    return build_owner_summary_report(
        company_name=str(company_settings.get("name") or "ATMOSFERA"),
        bookings=bookings,
        services=services,
        period=period,
        segment=segment,
    )


def _owner_summary_export_file(db: Session, actor_id: str, period: str, segment: str) -> GeneratedExport:
    owner = db.get(StaffUser, actor_id)
    if owner is None or owner.role != "owner":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found")
    if period not in {"daily", "weekly"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown report period")
    if segment not in {"wash", "detailing"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown report segment")

    _mark_overdue_bookings_for_admin_review(db)
    company_settings = _setting(
        db,
        "owner_company",
        {"name": "ATMOSFERA", "legalName": "", "inn": "", "address": "", "phone": "", "email": ""},
    )
    bookings = db.scalars(
        select(Booking)
        .options(joinedload(Booking.worker_links))
        .order_by(Booking.date.desc(), Booking.time.desc(), Booking.created_at.desc())
    ).unique().all()
    services = db.scalars(select(Service).order_by(Service.name)).all()
    return build_owner_summary_export(
        owner=owner,
        company_name=str(company_settings.get("name") or "ATMOSFERA"),
        bookings=bookings,
        services=services,
        period=period,
        segment=segment,
    )


def _send_owner_summary_report(
    db: Session,
    actor_id: str,
    report: OwnerSummaryReport,
    export_file: GeneratedExport,
) -> GenericMessage:
    db.add(
        Notification(
            id=f"n-{uuid4()}",
            recipient_role="owner",
            recipient_id=actor_id,
            message=report.message,
            read=False,
            created_at=_now(),
        )
    )

    try:
        delivery = _send_export_to_telegram(db, actor_id, export_file)
    except HTTPException as exc:
        db.commit()
        return GenericMessage(message=f"{report.title} сформирован, но файл не отправлен в Telegram: {exc.detail}")

    db.commit()
    return GenericMessage(
        message=(
            f"{report.title} отправлен в Telegram файлом "
            f"{delivery.fileName} ({delivery.telegramChatId})."
        )
    )


def _booking_car_label(car: str | None, plate: str | None) -> str:
    car_value = (car or "").strip() or "Авто не указано"
    plate_value = (plate or "").strip()
    return f"{car_value}, {plate_value}" if plate_value else car_value


def _admin_booking_notification_title(client_name: str, car: str | None, plate: str | None) -> str:
    return f"{client_name} - {_booking_car_label(car, plate)}"


def _admin_booking_notification_text(client_name: str, car: str | None, plate: str | None, date: str, time: str) -> str:
    return f"{_admin_booking_notification_title(client_name, car, plate)} - {date} {time}"


def _notify_admins_about_booking(db: Session, booking: Booking) -> None:
    admins = db.scalars(select(StaffUser).where(StaffUser.role == "admin")).all()
    text = (
        "Новая запись\n"
        f"Клиент: {booking.client_name}\n"
        f"Авто: {_booking_car_label(booking.car, booking.plate)}\n"
        f"Услуга: {booking.service}\n"
        f"Дата: {booking.date} {booking.time}\n"
        f"Телефон: {booking.client_phone}"
    )
    for admin in admins:
        _send_telegram_safe(admin.telegram_chat_id, text)


def _notify_workers_about_assignment(db: Session, booking: Booking, worker_ids: set[str]) -> None:
    if not worker_ids:
        return
    workers = db.scalars(select(StaffUser).where(StaffUser.id.in_(worker_ids))).all()
    for worker in workers:
        worker_link = next((link for link in booking.worker_links if link.worker_id == worker.id), None)
        percent_label = f"{worker_link.percent}%" if worker_link is not None else "не указан"
        text = (
            "Вам назначена запись\n"
            f"Клиент: {booking.client_name}\n"
            f"Услуга: {booking.service}\n"
            f"Дата: {booking.date} {booking.time}\n"
            f"Бокс: {booking.box}\n"
            f"Процент: {percent_label}"
        )
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


@app.get("/api/health", response_model=GenericMessage)
def health() -> GenericMessage:
    return GenericMessage(message="ok")


@app.post(settings.telegram_webhook_path, response_model=GenericMessage)
def handle_telegram_webhook(
    payload: dict[str, Any],
    telegram_secret: str | None = Header(default=None, alias="X-Telegram-Bot-Api-Secret-Token"),
) -> GenericMessage:
    if not settings.telegram_bot_token:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Telegram bot is not configured")
    expected_secret = telegram_webhook_secret()
    if telegram_secret != expected_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram webhook secret")
    try:
        process_telegram_update(payload)
    except Exception:
        logger.exception("Telegram webhook handler failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to process Telegram update")
    return GenericMessage(message="ok")


@app.post("/api/telegram/webhook/sync", response_model=GenericMessage)
def resync_telegram_webhook(session_data: dict = Depends(_require_session)) -> GenericMessage:
    _ensure_staff_role(session_data, {"owner"})
    if settings.telegram_delivery_mode != "webhook":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Telegram delivery mode is not webhook")
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
    _ensure_staff_role(session_data, {"owner"})
    export_file = _owner_export_file(db, session_data["actorId"], kind)
    return _download_response(export_file)


@app.post("/api/owner/exports/{kind}/telegram", response_model=OwnerExportDeliveryPayload)
def send_owner_export_to_telegram(
    kind: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerExportDeliveryPayload:
    _ensure_staff_role(session_data, {"owner"})
    export_file = _owner_export_file(db, session_data["actorId"], kind)
    return _send_export_to_telegram(db, session_data["actorId"], export_file)


@app.post("/api/owner/reports/{period}/{segment}/telegram", response_model=GenericMessage)
def send_owner_summary_report_to_telegram(
    period: str,
    segment: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    _ensure_staff_role(session_data, {"owner"})
    report = _owner_summary_report(db, session_data["actorId"], period, segment)
    export_file = _owner_summary_export_file(db, session_data["actorId"], period, segment)
    return _send_owner_summary_report(db, session_data["actorId"], report, export_file)


@app.post("/api/owner/reminders/dispatch", response_model=OwnerReminderDispatchPayload)
def dispatch_owner_booking_reminders(
    payload: OwnerReminderDispatchRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerReminderDispatchPayload:
    _ensure_staff_role(session_data, {"owner"})
    response = _dispatch_booking_reminders(db, target_date=payload.targetDate, force=payload.force)
    db.commit()
    return response


@app.get("/api/cron/reminders", response_model=OwnerReminderDispatchPayload)
def run_booking_reminders_cron(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> OwnerReminderDispatchPayload:
    if settings.cron_secret and authorization != f"Bearer {settings.cron_secret}":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid cron secret")
    response = _dispatch_booking_reminders(db)
    db.commit()
    return response


@app.post("/api/owner/database-reset/start", response_model=OwnerDatabaseResetStartPayload)
def start_owner_database_reset(
    payload: OwnerDatabaseResetStartRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerDatabaseResetStartPayload:
    _ensure_staff_role(session_data, {"owner"})
    owner = db.get(StaffUser, session_data["actorId"])
    if owner is None or owner.role != "owner":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found")
    if not verify_password(payload.password, owner.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Текущий пароль неверный")

    recipient_owner = _owner_two_factor_recipient(db)
    generated_code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = _now() + timedelta(minutes=OWNER_DATABASE_RESET_CODE_LIFETIME_MINUTES)
    request_id = str(uuid4())
    preview = _owner_database_reset_preview(db, current_session_id=session_data.get("sessionId"))
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


@app.post("/api/owner/database-reset/approve", response_model=OwnerDatabaseResetApprovePayload)
def approve_owner_database_reset(
    payload: OwnerDatabaseResetApproveRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerDatabaseResetApprovePayload:
    _ensure_staff_role(session_data, {"owner"})
    state = _owner_database_reset_state(db)
    if state is None or state.get("requestId") != payload.requestId:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Запрос на очистку не найден. Начните заново.")
    if state.get("requestedBy") != session_data["actorId"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Этот запрос на очистку создан другим владельцем.")

    if _normalize_database_reset_phrase(payload.confirmationPhrase) != OWNER_DATABASE_RESET_CONFIRMATION_PHRASE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Введите фразу точно: {OWNER_DATABASE_RESET_CONFIRMATION_PHRASE}",
        )

    code_expires_at = _parse_state_datetime(state.get("codeExpiresAt"))
    code_hash = str(state.get("codeHash") or "")
    if not code_hash or code_expires_at is None or code_expires_at < _now():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Код создателя истёк. Запросите новый.")
    if not payload.creatorCode.strip().isdigit():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Введите 6-значный код от создателя.")
    if not verify_one_time_code(payload.creatorCode.strip(), code_hash, settings.app_secret):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Код создателя неверный.")

    finalize_after = _now() + timedelta(seconds=OWNER_DATABASE_RESET_DELAY_SECONDS)
    state["approvedAt"] = _serialize_state_datetime(_now())
    state["finalizeAfter"] = _serialize_state_datetime(finalize_after)
    state["codeHash"] = None
    state["codeExpiresAt"] = None
    _save_owner_database_reset_state(db, state)
    preview = _owner_database_reset_preview(db, current_session_id=session_data.get("sessionId"))
    warnings = _owner_database_reset_warnings(preview)
    db.commit()
    return OwnerDatabaseResetApprovePayload(
        requestId=payload.requestId,
        finalizeAfter=finalize_after,
        preview=preview,
        warnings=warnings,
        message="Финальный шаг разблокируется через 10 секунд. Ещё раз проверьте, что именно будет удалено.",
    )


@app.post("/api/owner/database-reset/execute", response_model=OwnerDatabaseResetExecutePayload)
def execute_owner_database_reset(
    payload: OwnerDatabaseResetExecuteRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerDatabaseResetExecutePayload:
    _ensure_staff_role(session_data, {"owner"})
    state = _owner_database_reset_state(db)
    if state is None or state.get("requestId") != payload.requestId:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Запрос на очистку не найден. Начните заново.")
    if state.get("requestedBy") != session_data["actorId"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Этот запрос на очистку создан другим владельцем.")

    finalize_after = _parse_state_datetime(state.get("finalizeAfter"))
    if finalize_after is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Сначала подтвердите пароль, код создателя и фразу.")
    if finalize_after > _now():
        seconds_left = max(1, int((finalize_after - _now()).total_seconds()) + 1)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Финальная кнопка ещё заблокирована. Подождите {seconds_left} сек.",
        )

    preview = _owner_database_reset_preview(db, current_session_id=session_data.get("sessionId"))
    _perform_owner_database_reset(db, current_session_id=session_data.get("sessionId"))
    db.commit()
    return OwnerDatabaseResetExecutePayload(
        message="Полная очистка CRM завершена. Владельцы сохранены, остальные данные сброшены до стартового состояния.",
        preview=preview,
    )


@app.post("/api/auth/client", response_model=AuthResponse)
def authenticate_client(payload: ClientAuthRequest, request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    telegram_id = None
    if payload.initData:
        telegram_id, _telegram_user = _telegram_user_from_init_data(payload.initData)
    elif not settings.allow_insecure_client_auth:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Telegram initData is required")
    try:
        normalized_car = normalize_vehicle_name(payload.profile.car)
        normalized_plate = normalize_plate(payload.profile.plate)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    client = None
    if telegram_id:
        client = db.scalar(select(Client).where(Client.telegram_id == telegram_id))
    phone_client = _client_by_phone(db, payload.profile.phone)
    if client is not None and phone_client is not None and phone_client.id != client.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Клиент с таким номером телефона уже зарегистрирован")
    if client is None and phone_client is not None:
        if telegram_id and phone_client.telegram_id and phone_client.telegram_id != telegram_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Клиент с таким номером телефона уже зарегистрирован")
        client = phone_client
    if client is None:
        client_payload = payload.profile.model_dump()
        client_payload["car"] = normalized_car
        client_payload["plate"] = normalized_plate
        client = Client(id=f"c-{uuid4()}", telegram_id=telegram_id, **client_payload)
        db.add(client)
    else:
        client.telegram_id = telegram_id or client.telegram_id
        client.name = payload.profile.name
        client.phone = payload.profile.phone
        client.car = normalized_car
        client.plate = normalized_plate
        client.registered = payload.profile.registered
        client.updated_at = _now()

    return _issue_auth_response(db, request, _client_session_data(client))


@app.post("/api/auth/telegram", response_model=AuthResponse)
def authenticate_via_telegram(
    payload: TelegramOwnerAuthRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthResponse:
    telegram_id, telegram_user = _telegram_user_from_init_data(payload.initData)

    matched_staff = db.scalars(
        select(StaffUser)
        .where(
            StaffUser.telegram_chat_id == telegram_id,
            StaffUser.active.is_(True),
            StaffUser.role.in_(("owner", "admin", "worker")),
        )
        .order_by(StaffUser.is_primary_owner.desc(), StaffUser.created_at.asc(), StaffUser.id.asc())
    ).all()
    if len(matched_staff) > 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Этот Telegram привязан сразу к нескольким сотрудникам. Исправьте привязку в CRM.",
        )
    staff = matched_staff[0] if matched_staff else None
    if staff is not None:
        if not staff.name.strip():
            staff.name = _telegram_display_name(telegram_user, "Сотрудник")
            staff.updated_at = _now()
        return _issue_auth_response(db, request, _staff_session_data(staff))

    client = db.scalar(select(Client).where(Client.telegram_id == telegram_id))
    if client is not None:
        return _issue_auth_response(db, request, _client_session_data(client))

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Аккаунт для этого Telegram ещё не привязан. Сначала завершите регистрацию или привязку профиля.",
    )


@app.post("/api/auth/telegram-owner", response_model=AuthResponse)
def authenticate_primary_owner_via_telegram(
    payload: TelegramOwnerAuthRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthResponse:
    telegram_id, telegram_user = _telegram_user_from_init_data(payload.initData)
    owner = _primary_owner(db)
    if owner is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Главный владелец не настроен")
    current_chat_id = owner.telegram_chat_id.strip()
    if not current_chat_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Telegram создателя ещё не привязан. Сначала войдите по логину и привяжите Telegram через CRM.",
        )
    if current_chat_id and current_chat_id != telegram_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Этот Telegram не привязан к создателю")
    if not owner.name.strip():
        owner.name = _telegram_display_name(telegram_user, "Создатель")
    return _issue_auth_response(db, request, _staff_session_data(owner))


@app.post("/api/auth/staff/login", response_model=AuthResponse)
def authenticate_staff(payload: StaffLoginRequest, request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    staff = db.scalar(select(StaffUser).where(StaffUser.login == payload.login.strip().lower()))
    if staff is None or not verify_password(payload.password, staff.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")
    if staff.role not in {"admin", "worker", "owner"} or not staff.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступ к аккаунту отключён")
    owner_security = _setting(db, "owner_security", {"twoFactor": False})
    two_factor_enabled = staff.role == "owner" and not staff.is_primary_owner and owner_security.get("twoFactor", False)
    if two_factor_enabled:
        recipient_owner = _owner_two_factor_recipient(db)
        two_factor_code = (payload.twoFactorCode or "").strip()
        if not two_factor_code:
            generated_code = f"{secrets.randbelow(1_000_000):06d}"
            staff.two_factor_code_hash = hash_one_time_code(generated_code, settings.app_secret)
            staff.two_factor_expires_at = _now() + timedelta(minutes=10)
            staff.updated_at = _now()
            db.commit()
            try:
                send_telegram_message(
                    recipient_owner.telegram_chat_id,
                    (
                        f"Код входа для второго владельца: {generated_code}\n"
                        f"Логин: {staff.login}\n"
                        "Код действует 10 минут."
                    ),
                )
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Не удалось отправить код создателю в Telegram. Проверьте доступность бота и Telegram создателя.",
                ) from exc
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Введите код из Telegram. Мы отправили его создателю.",
            )
        expires_at = _as_utc(staff.two_factor_expires_at) if staff.two_factor_expires_at is not None else None
        if (
            not staff.two_factor_code_hash
            or expires_at is None
            or expires_at < _now()
            or not verify_one_time_code(two_factor_code, staff.two_factor_code_hash, settings.app_secret)
        ):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный или просроченный код.")
        staff.two_factor_code_hash = None
        staff.two_factor_expires_at = None
        staff.updated_at = _now()
    return _issue_auth_response(db, request, _staff_session_data(staff))


@app.get("/api/auth/session", response_model=BootstrapPayload)
def get_session_bootstrap(session_data: dict = Depends(_require_session), db: Session = Depends(get_db)) -> BootstrapPayload:
    return _build_bootstrap(db, session_data)


@app.get("/api/auth/sessions", response_model=list[AuthSessionPayload])
def get_active_sessions(session_data: dict = Depends(_require_session), db: Session = Depends(get_db)) -> list[AuthSessionPayload]:
    return _active_sessions_payload(db, session_data)


@app.post("/api/auth/sessions/{session_id}/revoke", response_model=GenericMessage)
def revoke_active_session(
    session_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    auth_session = db.get(AuthSession, session_id)
    if auth_session is None or auth_session.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сессия не найдена")
    if auth_session.actor_role != session_data["role"] or auth_session.actor_id != session_data["actorId"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нельзя завершить чужую сессию")
    auth_session.revoked_at = _now()
    db.commit()
    return GenericMessage(message="Сессия завершена")


@app.post("/api/auth/logout", response_model=GenericMessage)
def logout(session_data: dict = Depends(_require_session), db: Session = Depends(get_db)) -> GenericMessage:
    auth_session = db.get(AuthSession, session_data["sessionId"])
    if auth_session is not None and auth_session.revoked_at is None:
        auth_session.revoked_at = _now()
        db.commit()
    return GenericMessage(message="Выход выполнен")


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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    try:
        normalized_car = normalize_vehicle_name(payload.car)
        normalized_plate = normalize_plate(payload.plate)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    phone_client = _client_by_phone(db, payload.phone)
    if phone_client is not None and phone_client.id != client.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Клиент с таким номером телефона уже зарегистрирован")
    client.name = payload.name
    client.phone = payload.phone
    client.car = normalized_car
    client.plate = normalized_plate
    client.registered = payload.registered
    client.updated_at = _now()
    db.commit()
    db.refresh(client)
    return _client_payload(client)  # type: ignore[return-value]


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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")
    updates = payload.model_dump(exclude_unset=True)
    if "notes" in updates and updates["notes"] is not None:
        client.notes = updates["notes"].strip()
    if "debtBalance" in updates and updates["debtBalance"] is not None:
        client.debt_balance = int(updates["debtBalance"])
    client.updated_at = _now()
    db.commit()
    db.refresh(client)
    return _client_summary_payload(client)


@app.delete("/api/clients/{client_id}", response_model=GenericMessage)
def delete_client(
    client_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    _ensure_staff_role(session_data, {"admin", "owner"})
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")
    db.execute(
        sa_delete(Notification).where(
            Notification.recipient_role == "client",
            Notification.recipient_id == client_id,
        )
    )
    db.execute(
        sa_delete(AuthSession).where(
            AuthSession.actor_role == "client",
            AuthSession.actor_id == client_id,
        )
    )
    client_bookings = db.scalars(
        select(Booking).options(joinedload(Booking.worker_links)).where(Booking.client_id == client_id)
    ).unique().all()
    for booking in client_bookings:
        db.delete(booking)
    db.delete(client)
    db.commit()
    return GenericMessage(message="Клиент удалён")


@app.post("/api/bookings", response_model=BookingPayload)
def create_booking(
    payload: BookingCreateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> BookingPayload:
    if session_data["role"] not in {"client", "admin", "owner"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    booking_service = payload.service
    booking_service_id = payload.serviceId
    booking_duration = payload.duration
    booking_price = payload.price

    if session_data["role"] == "client":
        client = db.get(Client, session_data["actorId"])
        if client is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
        service = db.get(Service, payload.serviceId)
        if service is None or not service.active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Услуга не найдена или недоступна")
        booking_client_name = client.name
        booking_client_phone = client.phone
        booking_car = client.car or ""
        booking_plate = client.plate or ""
        booking_service = service.name
        booking_service_id = service.id
        booking_duration = service.duration
        booking_price = service.price
    else:
        normalized_client_phone = normalize_phone(payload.clientPhone)
        client = db.get(Client, payload.clientId) if payload.clientId else None
        phone_client = _client_by_phone(db, normalized_client_phone)
        if client is not None and phone_client is not None and phone_client.id != client.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Клиент с таким номером уже зарегистрирован на другой профиль",
            )
        if client is None and phone_client is not None:
            client = phone_client
        if client is None:
            client = Client(
                id=payload.clientId or f"c-{uuid4()}",
                name=payload.clientName,
                phone=normalized_client_phone,
                car=payload.car or "",
                plate=payload.plate or "",
                registered=True,
            )
            db.add(client)
        else:
            client.name = payload.clientName
            client.phone = normalized_client_phone
            client.car = payload.car or ""
            client.plate = payload.plate or ""
            client.registered = True
            client.updated_at = _now()
        db.flush()
        booking_client_name = client.name
        booking_client_phone = client.phone
        booking_car = client.car or ""
        booking_plate = client.plate or ""

    booking_workers = [] if session_data["role"] == "client" else _validated_booking_workers(db, payload.workers)
    booking_status = "new" if session_data["role"] == "client" else payload.status

    _ensure_booking_datetime_not_in_past(payload.date, payload.time)
    _ensure_booking_within_schedule(db, payload.date, payload.time, booking_duration)
    booking_box = payload.box
    if session_data["role"] == "client":
        available_box = _pick_available_box(
            db,
            booking_id=None,
            date_value=payload.date,
            time_value=payload.time,
            duration=booking_duration,
            preferred_box=payload.box.strip() or None,
        )
        if available_box is None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="На это время нет свободных боксов")
        booking_box = available_box
    _ensure_booking_has_no_conflicts(
        db,
        booking_id=None,
        date_value=payload.date,
        time_value=payload.time,
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
        date=payload.date,
        time=payload.time,
        duration=booking_duration,
        price=booking_price,
        status=booking_status,
        box=booking_box,
        payment_type=payload.paymentType,
        notes=payload.notes,
        car=booking_car,
        plate=booking_plate,
        created_at=_now(),
    )
    db.add(booking)
    db.flush()
    _sync_booking_workers(db, booking, booking_workers)
    if session_data["role"] in {"admin", "owner"} and payload.notifyWorkers:
        _notify_workers_about_assignment(db, booking, {link.worker_id for link in booking.worker_links})
    if session_data["role"] == "client":
        db.add_all([
            Notification(
                id=f"n-{uuid4()}",
                recipient_role="client",
                recipient_id=client.id,
                message=f"Заявка на {booking_service} создана на {payload.date} в {payload.time}. Статус: {_booking_status_label(booking_status)}",
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
                    payload.date,
                    payload.time,
                ),
                read=False,
                created_at=_now(),
            ),
        ])
        _notify_admins_about_booking(db, booking)
    db.commit()
    db.refresh(booking)
    return _booking_payload_for_response(db, booking)


@app.patch("/api/bookings/{booking_id}", response_model=BookingPayload)
def update_booking(
    booking_id: str,
    payload: BookingUpdateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> BookingPayload:
    _ensure_staff_role(session_data, {"admin", "worker", "owner"})
    booking = db.scalar(select(Booking).options(joinedload(Booking.worker_links)).where(Booking.id == booking_id))
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    updates = payload.model_dump(exclude_unset=True, exclude={"workers"})
    previous_date = booking.date
    previous_time = booking.time
    previous_status = booking.status
    previous_service = booking.service
    previous_box = booking.box
    worker = db.get(StaffUser, session_data["actorId"]) if session_data["role"] == "worker" else None
    if session_data["role"] == "worker":
        assigned_worker_ids = {link.worker_id for link in booking.worker_links}
        if session_data["actorId"] not in assigned_worker_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        forbidden_fields = set(updates) - {"status", "price", "notes"}
        if payload.workers is not None:
            forbidden_fields.add("workers")
        if forbidden_fields:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Worker can update only own task status")

    if "serviceId" in updates:
        service = db.get(Service, updates["serviceId"])
        if service is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
        updates["service"] = service.name
        updates.setdefault("duration", service.duration)
        updates.setdefault("price", service.price)

    if booking.client_id and any(field in updates for field in ("clientName", "clientPhone", "car", "plate")):
        client = db.get(Client, booking.client_id)
        if client is not None:
            if "clientPhone" in updates:
                phone_client = _client_by_phone(db, updates["clientPhone"])
                if phone_client is not None and phone_client.id != client.id:
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Клиент с таким номером телефона уже зарегистрирован")
                client.phone = updates["clientPhone"]
            if "clientName" in updates:
                client.name = updates["clientName"]
            if "car" in updates:
                client.car = updates["car"] or ""
            if "plate" in updates:
                client.plate = updates["plate"] or ""
            client.registered = True
            client.updated_at = _now()

    next_date = updates.get("date", booking.date)
    next_time = updates.get("time", booking.time)
    next_duration = updates.get("duration", booking.duration)
    next_box = updates.get("box", booking.box)
    next_status = updates.get("status", booking.status)
    next_workers = _validated_booking_workers(db, payload.workers) if payload.workers is not None else [
        BookingWorkerPayload(
            workerId=link.worker_id,
            workerName=link.worker_name,
            percent=link.percent,
        )
        for link in booking.worker_links
    ]
    if any(field in updates for field in ("date", "time", "duration")):
        _ensure_booking_datetime_not_in_past(next_date, next_time)
    _ensure_booking_within_schedule(db, next_date, next_time, next_duration)
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

    for field, value in updates.items():
        target_field = {
            "clientName": "client_name",
            "clientPhone": "client_phone",
            "serviceId": "service_id",
            "paymentType": "payment_type",
        }.get(field, field)
        setattr(booking, target_field, value)

    previous_worker_ids = {link.worker_id for link in booking.worker_links}
    if payload.workers is not None:
        _sync_booking_workers(db, booking, next_workers)

    client_notification_parts: list[str] = []
    if booking.client_id:
        if booking.date != previous_date or booking.time != previous_time:
            client_notification_parts.append(f"Новые дата и время: {booking.date} {booking.time}")
        if booking.status != previous_status:
            client_notification_parts.append(f"Статус: {_booking_status_label(booking.status)}")
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

    if session_data["role"] == "worker" and previous_status != "completed" and booking.status == "completed":
        worker_name = worker.name if worker is not None else "Мастер"
        db.add(
            Notification(
                id=f"n-{uuid4()}",
                recipient_role="admin",
                recipient_id=None,
                message=(
                    f"{worker_name} завершил работу. Клиент: {booking.client_name}. "
                    f"Услуга: {booking.service}. Сумма: {booking.price:,} ₽".replace(",", " ")
                ),
                read=False,
                created_at=_now(),
            )
        )

    db.commit()
    db.refresh(booking)
    if payload.workers is not None and session_data["role"] in {"admin", "owner"}:
        current_worker_ids = {link.worker_id for link in booking.worker_links}
        if payload.notifyWorkers:
            _notify_workers_about_assignment(db, booking, current_worker_ids - previous_worker_ids)
    return _booking_payload_for_response(db, booking)


@app.delete("/api/bookings/{booking_id}", response_model=GenericMessage)
def delete_booking(
    booking_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    if session_data["role"] not in {"client", "admin", "owner"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if session_data["role"] == "client":
        if booking.client_id != session_data["actorId"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        if booking.status not in BOOKING_CLIENT_CANCELLABLE_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Клиент может отменить только новую, подтверждённую или запланированную запись",
            )
        db.add_all([
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
        ])
    db.delete(booking)
    db.commit()
    return GenericMessage(message="Запись удалена")


@app.post("/api/notifications", response_model=NotificationPayload)
def create_notification(
    payload: NotificationCreateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> NotificationPayload:
    if session_data["role"] not in {"admin", "worker", "owner"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if session_data["role"] == "worker":
        if payload.recipientRole != "client" or not payload.recipientId:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
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
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
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


@app.patch("/api/notifications/{notification_id}/read", response_model=NotificationPayload)
def mark_notification_read(
    notification_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> NotificationPayload:
    notification = db.get(Notification, notification_id)
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if notification.recipient_role != session_data["role"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if session_data["role"] in {"client", "worker"} and notification.recipient_id != session_data["actorId"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if session_data["role"] == "admin" and notification.recipient_id not in {None, session_data["actorId"]}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if session_data["role"] == "owner" and notification.recipient_id not in {None, session_data["actorId"]}:
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
    notifications = db.scalars(select(Notification)).all()
    for notification in notifications:
        if notification.recipient_role != payload.role:
            continue
        if payload.role in {"client", "worker"} and notification.recipient_id != session_data["actorId"]:
            continue
        if payload.role == "admin" and notification.recipient_id not in {None, session_data["actorId"]}:
            continue
        if payload.role == "owner" and notification.recipient_id not in {None, session_data["actorId"]}:
            continue
        notification.read = True
    db.commit()
    return GenericMessage(message="ok")


@app.post("/api/stock-items", response_model=StockItemPayload)
def create_stock_item(
    payload: StockItemCreateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> StockItemPayload:
    _ensure_staff_role(session_data, {"owner"})
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
    _ensure_staff_role(session_data, {"owner"})
    item = db.get(StockItem, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock item not found")
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
    _ensure_staff_role(session_data, {"owner"})
    item = db.get(StockItem, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock item not found")
    item.qty = max(0, item.qty - payload.qty)
    db.commit()
    db.refresh(item)
    return _stock_payload(item)


@app.post("/api/expenses", response_model=ExpensePayload)
def create_expense(
    payload: ExpenseCreateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> ExpensePayload:
    _ensure_staff_role(session_data, {"owner"})
    expense = Expense(
        id=f"e-{uuid4()}",
        title=payload.title,
        amount=payload.amount,
        category=payload.category,
        date=payload.date,
        note=payload.note,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return _expense_payload(expense)


@app.post("/api/penalties", response_model=PenaltyPayload)
def create_penalty(
    payload: PenaltyCreateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> PenaltyPayload:
    _ensure_staff_role(session_data, {"owner"})
    worker = db.get(StaffUser, payload.workerId)
    if worker is None or worker.role != "worker":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
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
    complaint_status = complaint_status_for_percent(worker.default_percent, worker_penalties, at=created_at)
    if complaint_status.reduction_active and complaint_status.reduction_until is not None:
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
    penalty = db.scalar(select(Penalty).options(joinedload(Penalty.worker)).where(Penalty.id == penalty.id))
    if penalty is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Penalty was not saved")
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
    penalty = db.scalar(select(Penalty).options(joinedload(Penalty.worker)).where(Penalty.id == penalty_id))
    if penalty is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    now = _now()
    active_until = penalty.active_until or complaint_active_until(penalty.created_at)
    if penalty.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Complaint already revoked")
    if now >= _as_utc(active_until):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Complaint already expired")

    worker = penalty.worker or db.get(StaffUser, penalty.worker_id)
    penalty_title = penalty.title
    penalty.revoked_at = now
    penalty.revoked_by = session_data["actorId"]
    db.flush()

    worker_penalties = _load_penalties(db, worker_ids={penalty.worker_id})
    complaint_status = complaint_status_for_percent(worker.default_percent if worker else 0, worker_penalties, at=now)
    if complaint_status.reduction_active and complaint_status.reduction_until is not None:
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


@app.post("/api/workers/{worker_id}/penalties/revoke-all", response_model=GenericMessage)
def revoke_all_worker_penalties(
    worker_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    _ensure_staff_role(session_data, {"owner"})
    worker = db.get(StaffUser, worker_id)
    if worker is None or worker.role not in {"worker", "dismissed_worker"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    now = _now()
    penalties = db.scalars(
        select(Penalty)
        .options(joinedload(Penalty.worker))
        .where(Penalty.worker_id == worker_id)
        .order_by(Penalty.created_at.desc())
    ).all()
    revoked_count = 0
    for penalty in penalties:
        active_until = penalty.active_until or complaint_active_until(penalty.created_at)
        if penalty.revoked_at is not None or now >= _as_utc(active_until):
            continue
        penalty.revoked_at = now
        penalty.revoked_by = session_data["actorId"]
        revoked_count += 1
    db.flush()

    if revoked_count == 0:
        return GenericMessage(message="Активных жалоб у мастера нет")

    worker_penalties = _load_penalties(db, worker_ids={worker_id})
    complaint_status = complaint_status_for_percent(worker.default_percent, worker_penalties, at=now)
    if complaint_status.reduction_active and complaint_status.reduction_until is not None:
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
    _ensure_staff_role(session_data, {"admin", "worker", "owner"})
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
    for item in payload:
        box = existing.get(item.id)
        if box is None:
            box = Box(id=item.id)
            db.add(box)
        box.name = item.name
        box.price_per_hour = item.pricePerHour
        box.active = item.active
        box.description = item.description
    for box_id, box in existing.items():
        if box_id not in submitted_ids:
            db.delete(box)
    db.commit()
    boxes = db.scalars(select(Box).order_by(Box.name)).all()
    return [_box_payload(box) for box in boxes]


@app.put("/api/settings/schedule", response_model=list[SchedulePayload])
def save_schedule(
    payload: list[SchedulePayload],
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> list[SchedulePayload]:
    _ensure_staff_role(session_data, {"admin", "owner"})
    existing = {entry.day_index: entry for entry in db.scalars(select(ScheduleEntry)).all()}
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
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
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


@app.put("/api/settings/workers/{worker_id}/notifications", response_model=WorkerNotificationSettings)
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
    if payload.twoFactor and (owner is None or not owner.telegram_chat_id.strip()):
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
    _ensure_staff_role(session_data, {"owner"})
    workers = {worker.id: worker for worker in db.scalars(select(StaffUser).where(StaffUser.role == "worker")).all()}
    for item in payload:
        worker = workers.get(item.id)
        if worker is None:
            continue
        worker.name = item.name
        worker.default_percent = clamp_worker_percent(item.percent)
        worker.salary_base = item.salaryBase
        worker.active = item.active
        worker.available = item.active
        try:
            worker.telegram_chat_id = ensure_staff_chat_id_available(
                db,
                item.telegramChatId,
                exclude_staff_id=worker.id,
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
        worker.updated_at = _now()
    db.commit()
    refreshed = db.scalars(select(StaffUser).where(StaffUser.role == "worker").order_by(StaffUser.name)).all()
    return [_worker_payload(worker) for worker in refreshed]


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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Укажите имя сотрудника")
    if not login:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Укажите логин сотрудника")
    if not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Укажите пароль сотрудника")
    try:
        telegram_chat_id = ensure_staff_chat_id_available(db, payload.telegramChatId)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    existing = db.scalar(select(StaffUser).where(StaffUser.login == login))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Логин уже занят")

    worker = StaffUser(
        id=f"w-{uuid4()}",
        login=login,
        password_hash=hash_password(password),
        role="worker",
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
    return _worker_payload(worker)


@app.delete("/api/workers/{worker_id}", response_model=GenericMessage)
def fire_worker(
    worker_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    _ensure_staff_role(session_data, {"owner"})
    worker = db.get(StaffUser, worker_id)
    if worker is None or worker.role != "worker":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    if worker.is_primary_owner:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Primary owner cannot be dismissed")

    now = _now()
    assigned_bookings = db.scalars(
        select(Booking)
        .join(Booking.worker_links)
        .options(joinedload(Booking.worker_links))
        .where(
            BookingWorker.worker_id == worker_id,
            Booking.status.in_(tuple(BOOKING_ACTIVE_STATUSES)),
        )
        .order_by(Booking.date.asc(), Booking.time.asc())
    ).unique().all()
    in_progress_bookings = [booking for booking in assigned_bookings if booking.status == "in_progress"]
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

    for auth_session in db.scalars(
        select(AuthSession).where(
            AuthSession.actor_role == "worker",
            AuthSession.actor_id == worker_id,
            AuthSession.revoked_at.is_(None),
        )
    ).all():
        auth_session.revoked_at = now

    db.execute(sa_delete(TelegramLinkCode).where(TelegramLinkCode.staff_id == worker_id))

    worker.role = "dismissed_worker"
    worker.active = False
    worker.available = False
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
                    f"Мастер {worker.name} уволен. "
                    f"С него снято {scheduled_count} запланированных записей, их нужно переназначить."
                ),
                read=False,
                created_at=now,
            )
        )

    db.commit()
    _send_telegram_safe(
        worker.telegram_chat_id,
        "Доступ в CRM и Mini App отключён владельцем. Если это ошибка, свяжитесь с руководителем.",
    )
    return GenericMessage(message=f"Мастер {worker.name} уволен")


@app.post("/api/auth/change-password", response_model=GenericMessage)
def change_password(
    payload: ChangePasswordRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    if session_data["role"] == "client":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Clients do not use password auth")
    staff = db.get(StaffUser, session_data["actorId"])
    if staff is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not verify_password(payload.currentPassword, staff.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Текущий пароль неверный")
    if len(payload.newPassword.strip()) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Новый пароль должен содержать минимум 8 символов")
    staff.password_hash = hash_password(payload.newPassword)
    staff.updated_at = _now()
    db.commit()
    return GenericMessage(message="Пароль обновлён")

