from __future__ import annotations



import hmac as hmac_mod
import html
import os

import logging

import re

import secrets

import base64

import sys

import zlib

from datetime import date, datetime, timedelta, timezone

from decimal import Decimal

from pathlib import Path

from threading import Thread

from typing import Any

from uuid import uuid4

from pydantic import ValidationError


from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, UploadFile, status
from fastapi.exceptions import RequestValidationError

from fastapi.middleware.cors import CORSMiddleware


from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from fastapi.encoders import jsonable_encoder

from math import isinf as _math_isinf

from sqlalchemy import String, and_, cast, delete as sa_delete, inspect, or_, select, func, update as sa_update

from sqlalchemy.exc import IntegrityError

from sqlalchemy.orm import Session, joinedload, selectinload

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
from .date_utils import parse_date_param, parse_dmy, validate_range
from .finance import money_int, salary_base_for_period
from .finance_sync import sync_expense_piggy_transaction

from .google_calendar import (
    GOOGLE_CALENDAR_INVITES_KEY,
    GOOGLE_CALENDAR_LAST_SYNC_KEY,
    OWNER_CONNECTION_ID,
    build_auth_url,
    clear_credentials,
    clear_invites,
    clear_tokens,
    consume_invite,
    create_invite,
    delete_connection,
    exchange_code,
    extract_account_email,
    get_connection,
    is_configured,
    list_connections,
    load_credentials,
    pull_calendar_changes,
    save_credentials,
    sync_booking_to_calendar,
    upsert_connection,
)

from .database import Base, engine, get_db

from .exports import (

    GeneratedExport,

    OwnerSummaryReport,

    build_owner_export,

    build_owner_summary_export,

    build_owner_summary_report,

    build_piggy_bank_export,

)

from .models import (

    AdditionalServiceWorker,

    AppSetting,

    Booking,

    BookingAdditionalService,

    BookingWorker,

    Box,

    Client,

    DataConsent,

    Expense,

    Income,

    Notification,

    OwnerProfitShare,

    Penalty,

    PayrollEntry,

    PiggyBankTransaction,

    ScheduleEntry,

    Service,

    StaffUser,

    StockItem,

    StockCategory,

    StockWriteOff,

    BookingMaterial,

    TelegramLinkCode,

    UploadedFile,

    WeeklyArchive,

    DepositTransaction,

    DepositMonth,

    DEFAULT_SHIFT_PAY,

)

from .schemas import (

    AdditionalServicePayload,

    AdditionalServiceWorkerPayload,

    AddAdditionalServiceRequest,

    UpdateAdditionalServiceRequest,

    AdminNotificationSettings,

    AdminShiftInspectionPayload,

    AdminShiftInspectionReviewRequest,

    AdminShiftInspectionSubmitRequest,

    AdminProfilePayload,

    OwnerShiftOpeningRequest,

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

    StaffLoginRequest,

    OwnerDatabaseResetStartPayload,

    OwnerDatabaseResetStartRequest,

    OwnerExportDeliveryPayload,

    GoogleCredentialsPayload,

    GoogleInvitePayload,

    OwnerIntegrationsPayload,

    OwnerNotificationSettings,

    AuthSessionPayload,

    OwnerProfitShareItem,

    OwnerProfitShareSummary,

    OwnerSalaryDetailResponse,

    OwnerSecurityPayload,

    PayOwnerSalaryRequest,

    PayOwnerSalaryResponse,

    PiggyBankDetailingBreakdown,

    PiggyBankResponse,

    PiggyBankAdjustRequest,

    PiggyBankSpenderDebt,

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

    StockWriteOffPayload,

    StockCategoryPayload,

    StockCategoryCreateRequest,

    StockCategoryUpdateRequest,

    BookingMaterialPayload,

    BookingHistoryItem,
    BookingHistoryTotals,

    BookingTotalsPiggyItem,

    BookingTotalsWorkerItem,

    BookingTotalsOwnerItem,

    BookingAdditionalServiceItem,

    BookingAsvcPiggyItem,

    BookingAsvcWorkerItem,

    BookingMoneySplitDetail,

    BookingMoneySplitOwnerItem,

    BookingMoneySplitUpdateRequest,

    BookingMoneySplitWorkerItem,

    BookingPiggyTxItem,

    MoneyFlowDistribution,
    MoneyFlowDistributionOwnerItem,
    MoneyFlowDistributionWorkerItem,
    MoneyFlowEntry,
    MoneyFlowPersonItem,
    MoneyFlowResponse,
    MoneyFlowSummary,

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

    WorkerCalendarBookingPayload,

    ContentPayload,

    ContentAboutPayload,

    ContentServicePayload,

    ContentHeroPayload,

    ContactPayload,

    ResetPasswordRequest,

    OverrideEarnedRequest,

    WalletResponse,

    WeeklyArchivePayload,

    ArchiveBookingItem,

    ArchiveBookingWorkerItem,

    ArchiveAdditionalServiceItem,

    ArchivePayrollItem,

    ArchiveOwnerItem,

    ArchiveSummary,

    ArchiveResponse,

    DepositSubscriptionUpdateRequest,

    DepositTopUpRequest,

    DepositAdjustRequest,

    DepositWashRequest,

    DepositSettleRequest,

    DepositTransactionPayload,

    DepositMonthPayload,

    DepositStats,

    DepositMonthBreakdown,

    DepositOverview,

    DepositSummaryItem,

)

from .security import (

    hash_one_time_code,

    hash_password,

    validate_telegram_init_data,

    verify_password,

)

from .seed import seed_database

from .telegram_linking import create_link_code, ensure_staff_chat_id_available

from .error_notifier import install_error_notifying, unhandled_exception_handler



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

# Периодическая обратная синхронизация Google Calendar -> CRM.
GOOGLE_SYNC_INTERVAL_SECONDS = 300
google_sync_thread: Thread | None = None

PRIMARY_OWNER_ID = "owner-primary"

PRIMARY_OWNER_LOGIN = "creator_owner"

SECONDARY_OWNER_ID = "owner-1"

# Explicitly configured owners; no Telegram identifiers are stored in source.

# Format: (database id, login, Telegram id, display name).

PERMANENT_TELEGRAM_OWNERS = settings.permanent_telegram_owners

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

BOOKING_CLIENT_CANCELLABLE_STATUSES = {"new", "confirmed", "scheduled", "admin_review"}

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

# SECURITY: небезопасный режим аутентификации позволяет войти любым
# telegram_id без подписи initData. Конфигурация принудительно выключает
# его в production/staging; если предупреждение видно в проде —
# деплой сконфигурирован неверно и должен быть остановлен.
if settings.allow_insecure_client_auth:
    logger.warning(
        "SECURITY: ALLOW_INSECURE_CLIENT_AUTH=true — неподписанный Telegram "
        "initData принимается как любой user.id. Запрещено публиковать такой "
        "бэкенд наружу (туннели, прод-домены)."
    )



# Глобальные уведомления об ошибках в Telegram (backend/app/error_notifier.py):

# - logging-handler пересылает ERROR/CRITICAL из любого модуля бэкенда;

# - exception-handler ловит все несловленные исключения в HTTP-роутах (500).

install_error_notifying()

app.add_exception_handler(Exception, unhandled_exception_handler)


@app.exception_handler(RequestValidationError)
async def _validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """422 с сериализуемым телом.

    Pydantic v2 включает в ошибку исходное значение поля (input). Для
    NaN/Infinity это ломает JSON-сериализацию ответа (ValueError → 500 вместо
    422), поэтому такие значения заменяются строковым представлением.
    """
    errors = exc.errors()
    for error in errors:
        value = error.get("input")
        if isinstance(value, float) and (value != value or _math_isinf(value)):
            error["input"] = repr(value)
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(errors)})



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


SECURITY_HEADERS = {
    "Content-Security-Policy": (
        "default-src 'self'; img-src 'self' data: blob: https:; "
        "style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://telegram.org; "
        "connect-src 'self' https: wss:; frame-ancestors 'self' https://web.telegram.org"
    ),
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection": "0",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    for key, value in SECURITY_HEADERS.items():
        response.headers[key] = value
    if request.url.path.startswith("/api/") and not request.url.path.startswith("/api/uploads/"):
        response.headers.setdefault("Cache-Control", "no-store")
    if settings.is_production and request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # Явный charset для JSON — чинит mojibake в iPhone/Telegram WebView когда клиент гадает кодировку
    ctype = response.headers.get("content-type", "")
    if ctype.startswith("application/json") and "charset" not in ctype.lower():
        response.headers["content-type"] = "application/json; charset=utf-8"
    return response


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

        response = FileResponse(candidate, headers=headers)
        for key, value in SECURITY_HEADERS.items():
            response.headers[key] = value
        return response

    response = FileResponse(index_file, headers=HTML_NO_CACHE_HEADERS)
    for key, value in SECURITY_HEADERS.items():
        response.headers[key] = value
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

        _apply_default_shift_pay(db)

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

    start_google_sync_thread()


def start_google_sync_thread() -> None:
    """Запускает фоновый цикл синхронизации «Google Calendar -> CRM» (daemon-поток).

    Поток нужен только при настроенной интеграции: учётные данные OAuth-клиента
    могут прийти из env или из БД (владелец ввёл их через UI). Если нигде не
    заданы — поток не стартует, чтобы не заваливать логи ошибками.
    """
    global google_sync_thread
    configured = False
    try:
        db = next(get_db())
        try:
            configured = is_configured(settings, db)
        finally:
            db.close()
    except Exception:  # noqa: BLE001 — БД может быть ещё не готова на старте
        configured = bool(
            settings.google_calendar_client_id
            and settings.google_calendar_client_secret
        )
    if google_sync_thread is None and configured:
        google_sync_thread = Thread(
            target=_google_sync_loop, name="google-sync", daemon=True
        )
        google_sync_thread.start()





def _now() -> datetime:

    return datetime.now(timezone.utc)


def _local_day_bounds(date_str: str) -> tuple[datetime, datetime]:
    """Границы локального дня (DD.MM.YYYY) в UTC: (00:00, 23:59:59) местного времени.

    Периоды ЗП считаются по локальному календарю, а created_at хранится в UTC —
    иначе записи, созданные ночью, попадают не в тот день."""
    local_tz = datetime.now().astimezone().tzinfo or timezone.utc
    day = datetime.strptime(date_str, "%d.%m.%Y")
    start = day.replace(tzinfo=local_tz).astimezone(timezone.utc)
    end = day.replace(hour=23, minute=59, second=59, tzinfo=local_tz).astimezone(timezone.utc)
    return start, end





def _as_utc(value: datetime) -> datetime:

    if value.tzinfo is None:

        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def _format_moscow_dt(dt: datetime | None) -> str:

    if dt is None:
        return ""
    msk = dt.astimezone(timezone(timedelta(hours=3)))
    return msk.strftime("%H:%M %d.%m.%Y")





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





def _owner_master_condition() -> Any:

    """Владелец, которому дополнительно выдана роль мастера (extra_roles != []).

    Такие владельцы попадают в списки мастеров: назначение на записи,

    зарплатная ведомость и зарплатное меню (выплаты/премии/штрафы).

    """

    return and_(StaffUser.role == "owner", cast(StaffUser.extra_roles, String) != "[]")




def _is_owner_master(worker: StaffUser) -> bool:

    return worker.role == "owner" and bool(worker.extra_roles)




def _ensure_permanent_telegram_owners(db: Session) -> None:

    """Upsert explicitly configured owners without reassigning existing rows."""

    for staff_id, login, chat_id, owner_name in PERMANENT_TELEGRAM_OWNERS:

        owner = db.get(StaffUser, staff_id)

        chat_owner = db.scalar(

            select(StaffUser).where(StaffUser.telegram_chat_id == chat_id)

        )

        if chat_owner is not None and chat_owner.id != staff_id:

            logger.warning(

                "Configured permanent Telegram owner %s conflicts with existing staff %s; preserving database assignment",

                staff_id,

                chat_owner.id,

            )

            continue

        if owner is None:

            owner = StaffUser(

                id=staff_id,

                login=login,

                password_hash=hash_password(secrets.token_urlsafe(32)),

                role="owner",

                name=owner_name,

                phone="",

                email="",

                city="",

                experience="",

                specialty="",

                about="Владелец, настроенный через защищённую конфигурацию Telegram.",

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

            if owner.telegram_chat_id and owner.telegram_chat_id != chat_id:

                logger.warning(

                    "Configured permanent owner %s already has a different Telegram id; preserving database assignment",

                    staff_id,

                )

                continue

            owner.login = login

            owner.role = "owner"

            owner.name = owner_name

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

    from sqlalchemy import text

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

    piggy_columns = {
        column["name"] for column in inspector.get_columns("piggy_bank_transactions")
    }
    if "expense_id" not in piggy_columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE piggy_bank_transactions ADD COLUMN expense_id VARCHAR(64)"
            )
        piggy_columns.add("expense_id")
    if "spent_by_id" not in piggy_columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE piggy_bank_transactions ADD COLUMN spent_by_id VARCHAR(64)"
            )
    if "spent_by_name" not in piggy_columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE piggy_bank_transactions ADD COLUMN spent_by_name VARCHAR(120)"
            )
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE UNIQUE INDEX IF NOT EXISTS ux_piggy_bank_transactions_expense_id "
            "ON piggy_bank_transactions (expense_id)"
        )
        # Link only exact one-to-one legacy candidates; ambiguous pairs stay untouched.
        connection.execute(text("""
            UPDATE piggy_bank_transactions AS p
            SET expense_id = (
                SELECT e.id FROM expenses AS e
                WHERE p.date = e.date
                  AND p.resource_group = e.resource_group
                  AND p.purpose = 'Расход: ' || e.title
                  AND p.amount = -e.amount
            )
            WHERE p.transaction_type = 'expense'
              AND p.expense_id IS NULL
              AND 1 = (
                  SELECT COUNT(*) FROM expenses AS e
                  WHERE p.date = e.date
                    AND p.resource_group = e.resource_group
                    AND p.purpose = 'Расход: ' || e.title
                    AND p.amount = -e.amount
              )
              AND 1 = (
                  SELECT COUNT(*) FROM piggy_bank_transactions AS p2
                  WHERE p2.transaction_type = 'expense'
                    AND p2.expense_id IS NULL
                    AND p2.date = p.date
                    AND p2.resource_group = p.resource_group
                    AND p2.purpose = p.purpose
                    AND p2.amount = p.amount
              )
        """))

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

    if "plate_type" not in client_columns:

        with engine.begin() as connection:

            connection.exec_driver_sql(

                "ALTER TABLE clients ADD COLUMN plate_type VARCHAR(16) NOT NULL DEFAULT 'russian'"

            )

    if "deposit_active" not in client_columns:

        with engine.begin() as connection:

            connection.exec_driver_sql(

                f"ALTER TABLE clients ADD COLUMN deposit_active BOOLEAN DEFAULT {boolean_default_sql(False)}"

            )

    if "deposit_monthly" not in client_columns:

        with engine.begin() as connection:

            connection.exec_driver_sql(

                "ALTER TABLE clients ADD COLUMN deposit_monthly INTEGER DEFAULT 0"

            )

    if "deposit_start_month" not in client_columns:

        with engine.begin() as connection:

            connection.exec_driver_sql(

                "ALTER TABLE clients ADD COLUMN deposit_start_month VARCHAR(16) DEFAULT ''"

            )

    if "deposit_plan" not in client_columns:

        with engine.begin() as connection:

            connection.exec_driver_sql(

                "ALTER TABLE clients ADD COLUMN deposit_plan VARCHAR(16) DEFAULT 'fee'"

            )

    if "deposit_washes_included" not in client_columns:

        with engine.begin() as connection:

            connection.exec_driver_sql(

                "ALTER TABLE clients ADD COLUMN deposit_washes_included INTEGER DEFAULT 0"

            )

    if "deposit_washes_carryover" not in client_columns:

        with engine.begin() as connection:

            connection.exec_driver_sql(

                f"ALTER TABLE clients ADD COLUMN deposit_washes_carryover BOOLEAN DEFAULT {boolean_default_sql(False)}"

            )

    if "deposit_min_balance" not in client_columns:

        with engine.begin() as connection:

            connection.exec_driver_sql(

                "ALTER TABLE clients ADD COLUMN deposit_min_balance INTEGER DEFAULT 0"

            )

    if "deposit_billing_day" not in client_columns:

        with engine.begin() as connection:

            connection.exec_driver_sql(

                "ALTER TABLE clients ADD COLUMN deposit_billing_day INTEGER DEFAULT 1"

            )

    if "deposit_wash_price" not in client_columns:

        with engine.begin() as connection:

            connection.exec_driver_sql(

                "ALTER TABLE clients ADD COLUMN deposit_wash_price INTEGER DEFAULT 0"

            )

    deposit_month_columns = (
        {column["name"] for column in inspector.get_columns("deposit_months")}
        if "deposit_months" in inspector.get_table_names()
        else set()
    )

    if "carryover_washes" not in deposit_month_columns:

        with engine.begin() as connection:

            connection.exec_driver_sql(

                "ALTER TABLE deposit_months ADD COLUMN carryover_washes INTEGER DEFAULT 0"

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

                f"ALTER TABLE bookings ADD COLUMN payment_settled BOOLEAN DEFAULT {boolean_default_sql(False)}"

            )

    if "services" not in booking_columns and "bookings" in inspector.get_table_names():

        with engine.begin() as connection:

            connection.exec_driver_sql(

                "ALTER TABLE bookings ADD COLUMN services TEXT DEFAULT '[]'"

            )

    if "plate_type" not in booking_columns:

        with engine.begin() as connection:

            connection.exec_driver_sql(

                "ALTER TABLE bookings ADD COLUMN plate_type VARCHAR(16) DEFAULT NULL"

            )

    if "booking_workers" in inspector.get_table_names():

        ensure_postgres_varchar_length("booking_workers", "booking_id", 64)

        ensure_postgres_varchar_length("booking_workers", "worker_id", 64)

        bw_cols = {col["name"] for col in inspector.get_columns("booking_workers")}

        if "pay_type" not in bw_cols:
            with engine.connect() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE booking_workers ADD COLUMN pay_type VARCHAR(16) NOT NULL DEFAULT 'percent'"
                    )
                )
                conn.commit()

        if "fixed_amount" not in bw_cols:
            with engine.connect() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE booking_workers ADD COLUMN fixed_amount INTEGER DEFAULT NULL"
                    )
                )
                conn.commit()

        if "override_earned" not in bw_cols:
            with engine.connect() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE booking_workers ADD COLUMN override_earned INTEGER DEFAULT NULL"
                    )
                )
                conn.commit()

    if "additional_service_workers" in inspector.get_table_names():

        asw_cols = {col["name"] for col in inspector.get_columns("additional_service_workers")}
        if "pay_type" not in asw_cols:
            with engine.connect() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE additional_service_workers ADD COLUMN pay_type VARCHAR(16) NOT NULL DEFAULT 'percent'"
                    )
                )
                conn.commit()

        if "fixed_amount" not in asw_cols:
            with engine.connect() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE additional_service_workers ADD COLUMN fixed_amount INTEGER DEFAULT NULL"
                    )
                )
                conn.commit()

    if "booking_additional_services" in inspector.get_table_names():
        bas_cols = {col["name"] for col in inspector.get_columns("booking_additional_services")}
        if "price_mode" not in bas_cols:
            with engine.connect() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE booking_additional_services ADD COLUMN price_mode VARCHAR(8) NOT NULL DEFAULT 'add'"
                    )
                )
                conn.commit()
        if "is_outsource" not in bas_cols:
            with engine.connect() as conn:
                if engine.dialect.name == "postgresql":
                    conn.execute(
                        text(
                            "ALTER TABLE booking_additional_services ADD COLUMN is_outsource BOOLEAN NOT NULL DEFAULT FALSE"
                        )
                    )
                else:
                    conn.execute(
                        text(
                            "ALTER TABLE booking_additional_services ADD COLUMN is_outsource BOOLEAN NOT NULL DEFAULT 0"
                        )
                    )
                conn.commit()
        if "outsource_amount" not in bas_cols:
            with engine.connect() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE booking_additional_services ADD COLUMN outsource_amount INTEGER DEFAULT NULL"
                    )
                )
                conn.commit()

    if "owner_profit_shares" in inspector.get_table_names():
        ops_cols = {col["name"] for col in inspector.get_columns("owner_profit_shares")}
        if "paid_at" not in ops_cols:
            with engine.connect() as conn:
                conn.execute(
                    text("ALTER TABLE owner_profit_shares ADD COLUMN paid_at TIMESTAMP DEFAULT NULL")
                )
                conn.commit()

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



    payroll_columns = (
        {column["name"] for column in inspector.get_columns("payroll_entries")}
        if "payroll_entries" in inspector.get_table_names()
        else set()
    )

    if "expense_id" not in payroll_columns and "payroll_entries" in inspector.get_table_names():

        with engine.begin() as connection:

            connection.exec_driver_sql(
                "ALTER TABLE payroll_entries ADD COLUMN expense_id VARCHAR(64) DEFAULT NULL"
            )

    if "income_id" not in payroll_columns and "payroll_entries" in inspector.get_table_names():

        with engine.begin() as connection:

            connection.exec_driver_sql(
                "ALTER TABLE payroll_entries ADD COLUMN income_id VARCHAR(64) DEFAULT NULL"
            )

    if "entry_date" not in payroll_columns and "payroll_entries" in inspector.get_table_names():

        with engine.begin() as connection:

            connection.exec_driver_sql(
                "ALTER TABLE payroll_entries ADD COLUMN entry_date VARCHAR(10) DEFAULT NULL"
            )

    if "request_key" not in payroll_columns and "payroll_entries" in inspector.get_table_names():

        with engine.begin() as connection:

            connection.exec_driver_sql(
                "ALTER TABLE payroll_entries ADD COLUMN request_key VARCHAR(64) DEFAULT NULL"
            )
            # Уникальный индекс — жёсткая защита от двойной выплаты: повторный
            # INSERT с тем же ключом получит IntegrityError и будет превращён
            # в идемпотентный replay-ответ. NULL-ключи индексом не считаются.
            connection.exec_driver_sql(
                "CREATE UNIQUE INDEX IF NOT EXISTS ux_payroll_entries_request_key "
                "ON payroll_entries (request_key)"
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



    # Миграция: фиксированная оплата мастеру для услуги (флаг is_fixed_master)
    service_columns = (
        {column["name"] for column in inspector.get_columns("services")}
        if "services" in inspector.get_table_names()
        else set()
    )

    if "is_fixed_master" not in service_columns and "services" in inspector.get_table_names():
        with engine.begin() as connection:
            if engine.dialect.name == "postgresql":
                connection.exec_driver_sql(
                    "ALTER TABLE services ADD COLUMN is_fixed_master BOOLEAN NOT NULL DEFAULT FALSE"
                )
            else:
                connection.exec_driver_sql(
                    "ALTER TABLE services ADD COLUMN is_fixed_master BOOLEAN NOT NULL DEFAULT 0"
                )

        # Seed: услуга "подготовка к полировке" получает фикс-оплату мастеру
        with engine.begin() as connection:
            from sqlalchemy import text as _text

            connection.execute(
                _text(
                    "UPDATE services SET is_fixed_master = :val WHERE lower(trim(name)) = :name"
                ),
                {"val": True, "name": FIXED_MASTER_SERVICE_NAME},
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

        if "material_consumption" not in service_columns:

            with engine.begin() as connection:

                connection.exec_driver_sql(

                    "ALTER TABLE services ADD COLUMN material_consumption INTEGER"

                )



    # Миграция: поля настраиваемого расчёта для услуг

    if "services" in inspector.get_table_names():

        svc_cols = {col["name"] for col in inspector.get_columns("services")}

        for col, col_type, col_default in [

            ("master_pay_type", "VARCHAR(16)", "''"),

            ("master_pay_value", "INTEGER", "0"),

            ("piggy_pay_type", "VARCHAR(16)", "''"),

            ("piggy_pay_value", "INTEGER", "0"),

            ("owner_pay_type", "VARCHAR(16)", "''"),

            ("owner_pay_value", "INTEGER", "0"),

            ("owner_split_enabled", "BOOLEAN", "TRUE"),

            ("materials", "JSON", "'[]'"),

            ("split_order", "JSON", "'[]'"),

            ("piggy_target", "VARCHAR(16)", "''"),

        ]:

            if col not in svc_cols:

                with engine.begin() as connection:

                    try:

                        connection.exec_driver_sql(

                            f"ALTER TABLE services ADD COLUMN {col} {col_type} NOT NULL DEFAULT {col_default}"

                        )

                    except Exception:

                        connection.exec_driver_sql(

                            f"ALTER TABLE services ADD COLUMN {col} {col_type} NOT NULL DEFAULT 1"

                        )



    # Миграция: таблица долей прибыли владельцев

    if "owner_profit_shares" not in inspector.get_table_names():

        OwnerProfitShare.__table__.create(bind=engine)

    if "stock_categories" not in inspector.get_table_names():
        StockCategory.__table__.create(bind=engine)

    stock_columns = {col["name"] for col in inspector.get_columns("stock_items")} if "stock_items" in inspector.get_table_names() else set()
    if "category_id" not in stock_columns and "stock_items" in inspector.get_table_names():
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE stock_items ADD COLUMN category_id VARCHAR(64)"
            )

    if "booking_materials" not in inspector.get_table_names():
        BookingMaterial.__table__.create(bind=engine)

    # Миграция: override распределения денег по записи (JSON: {materialsCost})
    if "bookings" in inspector.get_table_names():
        booking_columns = {col["name"] for col in inspector.get_columns("bookings")}
        if "money_split_overrides" not in booking_columns:
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    "ALTER TABLE bookings ADD COLUMN money_split_overrides "
                    + ("JSONB DEFAULT NULL" if engine.dialect.name == "postgresql" else "TEXT DEFAULT NULL")
                )
        elif engine.dialect.name == "postgresql":
            column_type = next(
                col["type"].__class__.__name__.lower()
                for col in inspector.get_columns("bookings")
                if col["name"] == "money_split_overrides"
            )
            if column_type == "text":
                with engine.begin() as connection:
                    connection.exec_driver_sql(
                        "ALTER TABLE bookings ALTER COLUMN money_split_overrides "
                        "TYPE JSONB USING money_split_overrides::jsonb"
                    )

    # Миграция: поля Google Calendar интеграции на записи
    if "bookings" in inspector.get_table_names():
        booking_gc_columns = {col["name"] for col in inspector.get_columns("bookings")}
        if "google_event_id" not in booking_gc_columns:
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    "ALTER TABLE bookings ADD COLUMN google_event_id VARCHAR(256) DEFAULT NULL"
                )
        if "google_updated_at" not in booking_gc_columns:
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    "ALTER TABLE bookings ADD COLUMN google_updated_at TIMESTAMP"
                )
        if "source" not in booking_gc_columns:
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    "ALTER TABLE bookings ADD COLUMN source VARCHAR(32) DEFAULT NULL"
                )
        if "referral_source" not in booking_gc_columns:
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    "ALTER TABLE bookings ADD COLUMN referral_source VARCHAR(64) DEFAULT ''"
                )
        if "is_repeat_visit" not in booking_gc_columns:
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    "ALTER TABLE bookings ADD COLUMN is_repeat_visit BOOLEAN NOT NULL DEFAULT FALSE"
                )
        # Карта событий по каждому подключённому Google-календарю
        # (мультиподключение): {connection_id: event_id}.
        if "google_event_ids" not in booking_gc_columns:
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    "ALTER TABLE bookings ADD COLUMN google_event_ids "
                    + ("JSONB DEFAULT NULL" if engine.dialect.name == "postgresql" else "TEXT DEFAULT NULL")
                )

    # Миграция: привязка расхода к записи (списание материалов)
    if "expenses" in inspector.get_table_names():
        expense_columns = {col["name"] for col in inspector.get_columns("expenses")}
        if "booking_id" not in expense_columns:
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    "ALTER TABLE expenses ADD COLUMN booking_id VARCHAR(64) DEFAULT NULL"
                )
                connection.exec_driver_sql(
                    "UPDATE expenses SET booking_id = ("
                    "SELECT b.id FROM bookings b WHERE b.deleted_at IS NULL"
                    " AND expenses.title = 'Списание материалов: ' || b.service || ' (' || b.client_name || ')'"
                    " LIMIT 1) WHERE expenses.category = 'Расходные материалы'"
                )

    # Миграция: справочные поля записи в списаниях материалов
    if "stock_write_offs" in inspector.get_table_names():
        write_off_columns = {col["name"] for col in inspector.get_columns("stock_write_offs")}
        for column, column_type in (
            ("booking_service", "VARCHAR(120)"),
            ("booking_client_name", "VARCHAR(120)"),
            ("booking_date", "VARCHAR(16)"),
            ("booking_worker_names", "VARCHAR(300)"),
        ):
            if column not in write_off_columns:
                with engine.begin() as connection:
                    connection.exec_driver_sql(
                        f"ALTER TABLE stock_write_offs ADD COLUMN {column} {column_type} DEFAULT NULL"
                    )
    # Горячие индексы (AUDIT-16): create_all их не добавляет в существующие БД.
    # CREATE INDEX IF NOT EXISTS валиден и в SQLite, и в PostgreSQL.
    for index_statement in (
        "CREATE INDEX IF NOT EXISTS ix_bookings_date ON bookings (date)",
        "CREATE INDEX IF NOT EXISTS ix_bookings_status ON bookings (status)",
        "CREATE INDEX IF NOT EXISTS ix_bookings_client_id ON bookings (client_id)",
        "CREATE INDEX IF NOT EXISTS ix_bookings_deleted_at ON bookings (deleted_at)",
        "CREATE INDEX IF NOT EXISTS ix_notifications_recipient ON notifications (recipient_role, recipient_id)",
        "CREATE INDEX IF NOT EXISTS ix_expenses_date ON expenses (date)",
        "CREATE INDEX IF NOT EXISTS ix_incomes_date ON incomes (date)",
    ):
        try:
            with engine.begin() as connection:
                connection.exec_driver_sql(index_statement)
        except Exception:
            logger.warning("Index creation skipped: %s", index_statement)



def _apply_default_shift_pay(db: Session) -> None:

    """Один раз выставляет оклад за смену DEFAULT_SHIFT_PAY сотрудникам

    (кроме владельцев), у которых ставка не задана (0).

    Выполняется только при первом старте после внедрения правила

    «выход на смену = 1000 ₽ в ЗП»; повторно не трогает ставки.

    """

    if db.get(AppSetting, "shift_pay_default_applied") is not None:

        return

    db.execute(

        sa_update(StaffUser)

        .where(StaffUser.role != "owner", StaffUser.salary_per_shift == 0)

        .values(salary_per_shift=DEFAULT_SHIFT_PAY)

    )

    _upsert_setting(db, "shift_pay_default_applied", {"applied": True})



def _repair_text_value(value: str) -> str:
    if not value:
        return value
    # Ремонтируем только явный mojibake, не трогаем корректную кириллицу
    # Маркеры: "Ð","Ñ" = utf-8 -> latin1, "вЂ","в€","â€","Ã","Â" = utf-8 -> cp1251 / windows-1252
    markers = ["Ð", "Ñ", "вЂ", "в€", "â€", "Ã", "Â"]
    if not any(m in value for m in markers):
        return value
    # Гибридный ремонт: поддержка смешанного mojibake + корректных символов (напр. "ÐŸÑ€Ð¸Ð²ÐµÑ‚ •")
    # Для каждого символа пробуем закодировать через enc (если он mojibake-байт), иначе как utf-8.
    # Это чинит случаи когда часть строки — mojibake latin1/cp1251, а часть — корректный "•"/"—"/кириллица.
    for enc in ("cp1251", "latin1"):
        try:
            byte_arr = bytearray()
            for ch in value:
                try:
                    byte_arr.extend(ch.encode(enc))
                except UnicodeEncodeError:
                    byte_arr.extend(ch.encode("utf-8"))
            fixed = byte_arr.decode("utf-8")
        except UnicodeError:
            continue
        if fixed == value:
            continue
        if any(m in fixed for m in markers):
            continue
        return fixed
    # Пробуем оба источника mojibake: cp1251 и latin1 (windows-1252) — классический путь
    for enc in ("cp1251", "latin1"):
        try:
            fixed = value.encode(enc).decode("utf-8")
        except UnicodeError:
            continue
        if fixed == value:
            continue
        # Успешный ремонт должен убрать маркеры и/или дать кириллицу/символы
        if any(m in fixed for m in markers):
            # частично починился, но остались маркеры — пробуем другую кодировку
            # если другая кодировка не сработает, вернём лучший вариант ниже
            continue
        return fixed
    # Фолбэк: если обе кодировки дали маркеры, пробуем вернуть любой отличающийся результат
    for enc in ("cp1251", "latin1"):
        try:
            fixed = value.encode(enc).decode("utf-8")
        except UnicodeError:
            continue
        if fixed != value:
            return fixed
    return value





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

    vehicles: list[ClientVehiclePayload] | list[dict[str, Any]] | None,

    *,

    fallback_car: str = "",

    fallback_plate: str = "",

) -> list[ClientVehiclePayload]:

    normalized: list[ClientVehiclePayload] = []

    has_main = False

    for item in vehicles or []:

        if isinstance(item, dict):

            car = item.get("car", "")

            plate = item.get("plate", "")

            plate_type = item.get("plateType", "russian")

            is_main = item.get("isMain", False)

        else:

            car = item.car

            plate = item.plate

            plate_type = item.plateType

            is_main = item.isMain

        car = normalize_vehicle_name(car) if car.strip() else ""

        plate = normalize_plate(plate, plate_type) if plate.strip() else ""

        if not car and not plate:

            continue

        if is_main and has_main:

            is_main = False

        if is_main:

            has_main = True

        normalized.append(ClientVehiclePayload(car=car, plate=plate, plateType=plate_type, isMain=is_main))

    if not normalized and (fallback_car.strip() or fallback_plate.strip()):

        try:

            normalized.append(ClientVehiclePayload(car=fallback_car, plate=fallback_plate))

        except ValueError:

            # Legacy-??????? ????? ?? ????????? ???????????? ("***", "###").

            # ???????????? ????????? ClientProfilePayload ??? ????? ????????????

            # ??????, ??????? ????? ??????????? ? bootstrap ?? ?????? ??????

            # (test_generic_telegram_auth_tolerates_legacy_client_profile_data).

            normalized.append(

                ClientVehiclePayload.model_construct(car="", plate="", plateType="russian", isMain=True)

            )

    deduped: list[ClientVehiclePayload] = []

    seen: set[tuple[str, str]] = set()

    main_vehicle: ClientVehiclePayload | None = None

    for item in normalized:

        key = (item.car, item.plate)

        if key in seen:

            continue

        seen.add(key)

        if item.isMain:

            main_vehicle = item

        else:

            deduped.append(item)

    if main_vehicle:

        deduped.insert(0, main_vehicle)

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

    normalized = _normalize_client_vehicles(vehicles)

    updated = {k: v for k, v in current.items()}

    updated[client_id] = [item.model_dump() for item in normalized]

    _upsert_setting(db, "client_vehicles", updated)





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

        plateType=client.plate_type or "russian",

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

        plateType=client.plate_type or "russian",

        vehicles=vehicles,

        notes=client.notes or "",

        debtBalance=client.debt_balance,

        adminRating=max(0, min(5, client.admin_rating or 0)),

        adminNote=client.admin_note or "",

        referralSource=client.referral_source or "",
        depositActive=bool(client.deposit_active),
        depositMonthly=int(client.deposit_monthly or 0),
        depositStartMonth=client.deposit_start_month or "",
        depositPlan=_deposit_plan_key(client.deposit_plan or ""),
        depositWashesIncluded=int(client.deposit_washes_included or 0),
        depositWashesCarryover=bool(client.deposit_washes_carryover),
        depositMinBalance=int(client.deposit_min_balance or 0),
        depositBillingDay=int(client.deposit_billing_day or 1),
        depositWashPrice=int(client.deposit_wash_price or 0),
        createdAt=client.created_at,

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

    # Конвенция day_index (сид и фронт getScheduleDayIndex=(getDay()+1)%7): Сб=0, Вс=1, Пн=2..Пт=6.
    # Python weekday(): Пн=0..Вс=6 → сдвиг +2. fffb46 ошибочно вернул identity,
    # из-за чего вторник проверялся по неактивному «Вс», а часы — по чужим дням.
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

        amount=money_int(entry.amount),

        note=entry.note or "",

        createdAt=entry.created_at,

        createdByRole=entry.actor_role,  # type: ignore[arg-type]

        createdByName=actor_name,

        entryDate=entry.entry_date,

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
            .options(
                joinedload(Booking.worker_links),
                joinedload(Booking.additional_services).joinedload(BookingAdditionalService.worker_links),
            )
            .where(
                Booking.status == "completed",
                or_(
                    Booking.worker_links.any(BookingWorker.worker_id.in_(worker_ids)),
                    Booking.additional_services.any(
                        BookingAdditionalService.worker_links.any(
                            AdditionalServiceWorker.worker_id.in_(worker_ids)
                        )
                    ),
                ),
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
    return _worker_payroll_summaries_from_data(
        db, workers, completed_bookings, entries, complaints_by_worker
    )


def _worker_payroll_summaries_from_data(
    db: Session,
    workers: list[StaffUser],
    completed_bookings: list[Booking],
    entries: list[PayrollEntry],
    complaints_by_worker: dict[str, list[Penalty]],
    shift_from: date | None = None,
    shift_to: date | None = None,
    period: str = "all",
) -> dict[str, WorkerPayrollSummaryPayload]:
    if not workers:
        return {}
    # Владельцы-мастера (extra_roles) остаются в расчётке — регрессия e4674679:
    # фильтр исключал и их, из-за чего правки ЗП из архива не меняли страницу «Зарплаты».
    workers = [
        worker for worker in workers if worker.role != "owner" or _is_owner_master(worker)
    ]
    if not workers:
        return {}
    worker_ids = [worker.id for worker in workers]
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
        split = _booking_money_split(db, booking, complaints_by_worker)
        master_by_worker = split["master_by_worker"]
        
        # Track which workers we've already added via worker_links
        processed_workers = set()
        
        for link in booking.worker_links:
            if link.worker_id not in booking_items_by_worker:
                continue
            processed_workers.add(link.worker_id)
            percent = adjusted_booking_percent(
                link.percent,
                complaints_by_worker.get(link.worker_id, []),
                date_value=booking.date,
                time_value=booking.time,
                fallback=booking.created_at,
            )
            earned = master_by_worker.get(link.worker_id, 0)
            if link.override_earned is not None:
                earned = int(link.override_earned)
            booking_items_by_worker[link.worker_id].append(
                WorkerPayrollBookingPayload(
                    bookingId=booking.id,
                    service=booking.service,
                    date=booking.date,
                    time=booking.time,
                    price=booking.price,
                    percent=percent,
                    earned=earned,
                    overrideEarned=link.override_earned,
                    car=booking.car,
                    plate=booking.plate,
                )
            )
        
        # Now add workers who are ONLY on additional services
        for asvc in booking.additional_services or []:
            for alink in asvc.worker_links:
                if alink.worker_id in booking_items_by_worker and alink.worker_id not in processed_workers:
                    # This worker is on additional service but NOT on main service
                    earned = master_by_worker.get(alink.worker_id, 0)
                    percent = adjusted_booking_percent(
                        alink.percent,
                        complaints_by_worker.get(alink.worker_id, []),
                        date_value=booking.date,
                        time_value=booking.time,
                        fallback=booking.created_at,
                    )
                    booking_items_by_worker[alink.worker_id].append(
                        WorkerPayrollBookingPayload(
                            bookingId=booking.id,
                            service=booking.service,
                            date=booking.date,
                            time=booking.time,
                            price=booking.price,
                            percent=percent,
                            earned=earned,
                            overrideEarned=None,
                            car=booking.car,
                            plate=booking.plate,
                        )
                    )
                    processed_workers.add(alink.worker_id)
    entry_payloads_by_worker: dict[str, list[PayrollEntryPayload]] = {
        worker_id: [] for worker_id in worker_ids
    }
    for entry in entries:
        entry_payloads_by_worker.setdefault(entry.worker_id, []).append(
            _payroll_entry_payload(entry, actors.get(entry.actor_id, "Сотрудник"))
        )
    result: dict[str, WorkerPayrollSummaryPayload] = {}
    from datetime import date as _date
    # Инспекции смен не зависят от мастера — вычисляем один раз для всех,
    # а не повторно на каждого мастера (иначе лишние чтения настроек в БД).
    inspections = _admin_shift_inspections_state(db)
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
        shift_count, _shift_dates = _compute_shift_attendance(
            inspections,
            worker.id,
            shift_from or _date(2000, 1, 1),
            shift_to or _date.today(),
        )
        salary_per_shift = getattr(worker, "salary_per_shift", 0) or 0
        shift_pay_total = shift_count * salary_per_shift
        base_from = shift_from or _date.today().replace(day=1)
        base_to = shift_to or _date.today()
        period_base_salary = money_int(
            salary_base_for_period(
                worker.salary_base, base_from, base_to, period=period
            )
        )
        total_accrued = (
            accrued_from_bookings
            + period_base_salary
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
            baseSalary=period_base_salary,
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

            price=float(s.get('price', 0)),

            duration=int(s.get('duration', 30)),

        )

        for s in svc_list

    ]

    additional_services = [

        AdditionalServicePayload(

            id=asvc.id,

            serviceId=asvc.service_id,

            name=asvc.name,

            price=asvc.price,

            duration=asvc.duration,

            status=asvc.status,

            priceMode=asvc.price_mode or "add",

            isOutsource=asvc.is_outsource,

            outsourceAmount=asvc.outsource_amount,

            createdAt=asvc.created_at,

            workers=[

                AdditionalServiceWorkerPayload(

                    workerId=w.worker_id,

                    workerName=w.worker_name,

                    percent=w.percent,
                    payType=w.pay_type or "percent",
                    fixedAmount=w.fixed_amount,

                )

                for w in asvc.worker_links

            ],

        )

        for asvc in booking.additional_services

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
                payType=link.pay_type or "percent",
                fixedAmount=link.fixed_amount,

            )

            for link in booking.worker_links

        ],

        box=booking.box,

        paymentType={"card": "transfer", "online": "invoice"}.get(booking.payment_type, booking.payment_type),

        paymentSettled=booking.payment_settled,

        createdAt=booking.created_at,

        notes=booking.notes,

        car=booking.car,

        plate=booking.plate,

        plateType=booking.plate_type or "russian",

        services=booking_services,

        additionalServices=additional_services,
        materials=[
            BookingMaterialPayload(
                id=mat.id,
                stockItemId=mat.stock_item_id,
                name=mat.name,
                qty=mat.qty,
                unit=mat.unit,
                unitPrice=mat.unit_price,
            )
            for mat in booking.materials
        ],
        materialsWrittenOff=booking.materials_written_off,
        startedAt=booking.started_at,
        completedAt=booking.completed_at,
        source=getattr(booking, "source", None),
        referralSource=getattr(booking, "referral_source", None) or "",
        isRepeatVisit=bool(getattr(booking, "is_repeat_visit", False)),
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
        categoryId=item.category_id,
    )





def _expense_payload(expense: Expense) -> ExpensePayload:

    return ExpensePayload(

        id=expense.id,

        title=expense.title,

        amount=money_int(expense.amount),

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

        materialConsumption=service.material_consumption,

        isFixedMaster=service.is_fixed_master,
        masterPayType=service.master_pay_type or "",
        masterPayValue=service.master_pay_value or 0,
        piggyPayType=service.piggy_pay_type or "",
        piggyPayValue=service.piggy_pay_value or 0,
        ownerPayType=service.owner_pay_type or "",
        ownerPayValue=service.owner_pay_value or 0,
        ownerSplitEnabled=service.owner_split_enabled if service.owner_split_enabled is not None else True,
        materials=service.materials or [],
        splitOrder=service.split_order or [],
        piggyTarget=service.piggy_target or "",

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

        "operatingMode": "open",

    }

    owner_notification_default = {

        "telegramBot": True,

        "emailReports": True,

        "smsReminders": False,

        "lowStock": True,

        "dailyReport": True,

        "weeklyReport": False,

        "bookingReminders": True,

        "bookingReminderHours": 24,

        "bookingReminderDays": 1,

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

            bookingReminderHours=24,

            bookingReminderDays=1,

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

    owner_ids = [sid for sid, _, _, _ in PERMANENT_TELEGRAM_OWNERS]

    workers = db.scalars(

        select(StaffUser)

        .where(
            StaffUser.role.in_(("admin", "worker", "accountant"))
            | StaffUser.id.in_(owner_ids)
            | _owner_master_condition()
        )

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

        .options(

            joinedload(Booking.worker_links),

            joinedload(Booking.additional_services).joinedload(BookingAdditionalService.worker_links),

        )

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

            # Мастер видит записи, где он назначен на основную услугу ИЛИ
            # участвует в доп. услуге (AdditionalServiceWorker).
            bookings_query = bookings_query.where(
                or_(
                    Booking.worker_links.any(BookingWorker.worker_id == actor_id),
                    Booking.additional_services.any(
                        BookingAdditionalService.worker_links.any(
                            AdditionalServiceWorker.worker_id == actor_id
                        )
                    ),
                )
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



        if role in {"admin", "owner", "accountant"}:

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
        stockCategories=[
            StockCategoryPayload(
                id=cat.id,
                name=cat.name,
                parentId=cat.parent_id,
            )
            for cat in db.scalars(select(StockCategory).order_by(StockCategory.name)).all()
        ],
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

        validated = validate_telegram_init_data(
            authorization,
            settings.telegram_bot_token,
            max_age_seconds=settings.telegram_init_data_max_age_seconds,
            future_skew_seconds=settings.telegram_init_data_future_skew_seconds,
        )

    except ValueError:

        if settings.allow_insecure_client_auth:

            try:

                validated = validate_telegram_init_data(

                    authorization,

                    settings.telegram_bot_token,

                    skip_validation=True,

                    max_age_seconds=settings.telegram_init_data_max_age_seconds,

                    future_skew_seconds=settings.telegram_init_data_future_skew_seconds,

                )

            except ValueError:

                return None

        else:

            return None

    telegram_user = validated.get("user") or {}

    telegram_id = str(telegram_user.get("id")) if telegram_user.get("id") is not None else ""

    if not telegram_id:

        return None

    staff_matches = db.scalars(

        select(StaffUser).where(

            StaffUser.telegram_chat_id == telegram_id,

            StaffUser.active.is_(True),

        )

    ).all()

    if len(staff_matches) > 1:

        # Дубль привязки: молча выбрать первого — отдать сессию не тому сотруднику.

        raise HTTPException(

            status_code=status.HTTP_409_CONFLICT,

            detail="Telegram привязан к нескольким сотрудникам — обратитесь к владельцу",

        )

    staff = staff_matches[0] if staff_matches else None

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


def _extract_telegram_id_from_init_data(authorization: str) -> str:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing initData")
    try:
        validated = validate_telegram_init_data(
            authorization,
            settings.telegram_bot_token,
            max_age_seconds=settings.telegram_init_data_max_age_seconds,
            future_skew_seconds=settings.telegram_init_data_future_skew_seconds,
        )
    except ValueError:
        if settings.allow_insecure_client_auth:
            logger.warning(
                "SECURITY: подпись initData не прошла проверку — принят "
                "непроверенный fallback (ALLOW_INSECURE_CLIENT_AUTH=true)"
            )
            try:
                validated = validate_telegram_init_data(
                    authorization,
                    settings.telegram_bot_token,
                    skip_validation=True,
                    max_age_seconds=settings.telegram_init_data_max_age_seconds,
                    future_skew_seconds=settings.telegram_init_data_future_skew_seconds,
                )
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid initData"
                )
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid initData")
    telegram_user = validated.get("user") or {}
    telegram_id = str(telegram_user.get("id")) if telegram_user.get("id") is not None else ""
    if not telegram_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Telegram user is missing"
        )
    return telegram_id


@app.post("/api/auth/client", response_model=BootstrapPayload)
def register_or_login_client(
    payload: ClientRegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> BootstrapPayload:
    authorization = (request.headers.get("authorization") or "").strip()
    if not authorization:
        authorization = (payload.initData or "").strip()
    if not authorization:
        if settings.allow_insecure_client_auth:
            telegram_id = ""
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing initData"
            )
    else:
        telegram_id = _extract_telegram_id_from_init_data(authorization)

    if telegram_id:
        existing = db.scalar(
            select(Client).where(
                Client.telegram_id == telegram_id,
                Client.deleted_at.is_(None),
            )
        )
        if existing is not None:
            if payload.phone:
                phone_client = _client_by_phone(db, payload.phone)
                if (
                    phone_client is not None
                    and phone_client.id != existing.id
                    and telegram_id != (phone_client.telegram_id or "")
                ):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Этот Telegram уже привязан к другому клиенту",
                    )
            if payload.name:
                existing.name = payload.name
            if payload.car:
                existing.car = payload.car
            if payload.plate:
                existing.plate = payload.plate
            existing.updated_at = _now()
            db.commit()
            db.refresh(existing)
            return _build_bootstrap(
                db,
                {
                    "role": "client",
                    "actorId": existing.id,
                    "displayName": existing.name,
                    "sessionId": "",
                },
            )

    if payload.phone:
        phone_owner = _client_by_phone(db, payload.phone)
        if phone_owner is not None:
            # Повторное использование записи. Конфликт только если телефон
            # принадлежит клиенту с ДРУГИМ уже привязанным Telegram
            # (test_client_registration_rejects_same_phone_for_different_telegram_ids).
            existing_tid = (phone_owner.telegram_id or "").strip()
            if telegram_id and existing_tid and telegram_id != existing_tid:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Этот телефон уже привязан к другому клиенту",
                )
            if telegram_id and not existing_tid:
                # Привязка вручную созданной записи ТОЛЬКО после того, как
                # этот Telegram подтвердил номер через бота (шаринг своего
                # контакта). Иначе знание телефона жертвы позволило бы
                # перехватить её профиль.
                _require_client_phone_verification(db, telegram_id, payload.phone)
                phone_owner.telegram_id = telegram_id
                phone_owner.updated_at = _now()
                db.commit()
                db.refresh(phone_owner)
            return _build_bootstrap(
                db,
                {
                    "role": "client",
                    "actorId": phone_owner.id,
                    "displayName": phone_owner.name,
                    "sessionId": "",
                },
            )

    client = Client(
        id=f"c-{uuid4()}",
        telegram_id=telegram_id or None,
        name=payload.name,
        phone=payload.phone,
        car=payload.car or "",
        plate=payload.plate or "",
        plate_type=payload.plateType,
        registered=True,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return _build_bootstrap(
        db,
        {
            "role": "client",
            "actorId": client.id,
            "displayName": client.name,
            "sessionId": "",
        },
    )


@app.post("/api/auth/staff/login")
def staff_login(
    payload: StaffLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Парольный логин персонала — только для dev/test-окружения.

    В production/staging ALLOW_INSECURE_CLIENT_AUTH принудительно выключен
    конфигурацией (см. config.py), поэтому роут отвечает 404: персонал входит
    исключительно через Telegram initData. Токен ответа — initData-совместимая
    строка, которую _require_session резолвит в сессию сотрудника.
    """
    if not settings.allow_insecure_client_auth:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)
    staff = db.scalar(select(StaffUser).where(StaffUser.login == payload.login.strip()))
    if (
        staff is None
        or not staff.active
        or not verify_password(payload.password, staff.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль.",
        )
    if not (staff.telegram_chat_id or "").strip():
        # Детерминированный dev-идентификатор: hash() рандомизирован между
        # процессами и мутировал бы привязку при каждом рестарте. Значение
        # обязано оставаться числовым — оно вкладывается в initData-совместимый
        # токен вида user={"id":<chat_id>} и матчится по telegram_chat_id.
        staff.telegram_chat_id = f"91{zlib.crc32(staff.login.encode('utf-8')) % 10 ** 8}"
        db.commit()
    session_data = {
        "role": staff.role,
        "actorId": staff.id,
        "login": staff.login,
        "displayName": staff.name,
        "sessionId": "",
    }
    token = f"user=%7B%22id%22%3A{staff.telegram_chat_id}%7D"
    return {
        "token": token,
        "role": staff.role,
        "actorId": staff.id,
        "session": session_data,
    }


@app.post("/api/auth/telegram", response_model=BootstrapPayload)
async def authenticate_via_telegram(
    request: Request,
    db: Session = Depends(get_db),
) -> BootstrapPayload:
    authorization = (request.headers.get("authorization") or "").strip()
    if not authorization:
        try:
            body_data = await request.json()
        except ValueError:
            body_data = {}
        if isinstance(body_data, dict):
            authorization = (body_data.get("initData") or "").strip()
    session_data = _resolve_user_from_init_data(authorization, db)
    if session_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Аккаунт для этого Telegram ещё не привязан. Сначала завершите регистрацию или привязку профиля.",
        )
    return _build_bootstrap(db, session_data)


@app.post("/api/auth/staff/link", response_model=BootstrapPayload)
def link_staff_account(
    payload: StaffLinkRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> BootstrapPayload:
    client_ip = request.client.host if request.client else "unknown"
    # Брутфорс-защита: как в /api/auth/staff/login.
    _check_rate_limit(client_ip)
    authorization = (request.headers.get("authorization") or "").strip()
    telegram_id = _extract_telegram_id_from_init_data(authorization)
    staff = db.scalar(
        select(StaffUser).where(StaffUser.login == payload.login.strip().lower())
    )
    if staff is None or not verify_password(payload.password, staff.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль"
        )
    if staff.role not in {"admin", "worker", "owner", "accountant"} or not staff.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Доступ к аккаунту отключён"
        )
    current_chat_id = (staff.telegram_chat_id or "").strip()
    if current_chat_id and current_chat_id != telegram_id:
        # Не перезаписываем существующую привязку: иначе знание пароля
        # позволило бы перехватить аккаунт у легитимного Telegram.
        logger.warning(
            "SECURITY: отказ в перепривязке staff=%s: уже привязан к другому Telegram (ip=%s)",
            staff.login,
            client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Этот аккаунт уже привязан к другому Telegram. Обратитесь к администратору.",
        )
    staff.telegram_chat_id = telegram_id
    staff.updated_at = _now()
    db.commit()
    return _build_bootstrap(
        db,
        {
            "role": staff.role,
            "actorId": staff.id,
            "login": staff.login,
            "displayName": staff.name,
            "sessionId": "",
        },
    )


@app.post("/api/auth/telegram-owner", response_model=BootstrapPayload)
def authenticate_primary_owner_via_telegram(
    request: Request,
    db: Session = Depends(get_db),
) -> BootstrapPayload:
    authorization = (request.headers.get("authorization") or "").strip()
    telegram_id = _extract_telegram_id_from_init_data(authorization)
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
        owner.name = _telegram_display_name(telegram_user={}, fallback="Создатель")
        db.commit()
    return _build_bootstrap(
        db,
        {
            "role": owner.role,
            "actorId": owner.id,
            "login": owner.login,
            "displayName": owner.name,
            "sessionId": "",
        },
    )


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
    return _build_bootstrap(
        db,
        {
            "role": payload.targetRole,
            "actorId": staff.id,
            "login": staff.login,
            "displayName": staff.name,
            "sessionId": "",
        },
    )


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

        if worker is None or worker.role not in ("worker", "owner") or not worker.active:

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
                payType=worker_input.payType or "percent",
                fixedAmount=worker_input.fixedAmount,

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
                pay_type=worker.payType or "percent",
                fixed_amount=worker.fixedAmount,

            )

        )

    db.flush()



def _sync_booking_materials(
    db: Session, booking: Booking, materials: list[BookingMaterialPayload]
) -> None:
    booking.materials.clear()
    for mat in materials:
        booking.materials.append(
            BookingMaterial(
                id=f"bm-{uuid4()}",
                stock_item_id=mat.stockItemId,
                name=mat.name,
                qty=mat.qty,
                unit=mat.unit,
                unit_price=mat.unitPrice,
            )
        )
    db.flush()



def _send_telegram_safe(chat_id: str | None, text: str) -> None:

    if not chat_id:

        logger.warning("Пропущена отправка Telegram-уведомления: у получателя нет chat_id")

        return

    try:

        send_telegram_message(chat_id, text)

    except Exception as exc:

        logger.warning("Ошибка отправки Telegram-уведомления (chat_id=%s): %s", chat_id, exc)





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


def _get_booking_reminder_hours(owner_settings: dict[str, Any]) -> int:
    """Вытащить из настроек владельца за сколько часов слать напоминание (1..168)."""
    raw = owner_settings.get("bookingReminderHours")
    if raw is not None:
        try:
            hours = int(raw)
            return max(1, min(168, hours))
        except Exception:
            pass
    # fallback старый ключ в днях
    raw_days = owner_settings.get("bookingReminderDays")
    if raw_days is not None:
        try:
            return max(1, min(168, int(raw_days) * 24))
        except Exception:
            pass
    return 24





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

    shift_dates: set[date] = set()



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



        shift_dates.add(inspection_date)



    # Сортируем по убыванию и форматируем

    shift_dates_str = [d.strftime("%d.%m.%Y") for d in sorted(shift_dates, reverse=True)]



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

    add_block = _additional_services_block(booking)

    return (

        "Напоминание о записи\n"

        f"Услуга: {booking.service}{add_block}\n"

        f"Дата: {booking.date} {booking.time}\n"

        f"Бокс: {booking.box}\n"

        "Если планы изменились, пожалуйста, предупредите заранее."

    )





def _booking_worker_reminder_message(booking: Booking, worker_name: str) -> str:

    add_block = _additional_services_block(booking)

    return (

        f"Напоминание мастеру {worker_name}\n"

        f"Клиент: {booking.client_name}\n"

        f"Услуга: {booking.service}{add_block}\n"

        f"Дата: {booking.date} {booking.time}\n"

        f"Бокс: {booking.box}"

    )





def _dispatch_booking_reminders(

    db: Session,

    *,

    target_date: str | None = None,

    force: bool = False,

) -> OwnerReminderDispatchPayload:

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

            "bookingReminderHours": 24,

            "bookingReminderDays": 1,

        },

    )

    # интервал напоминания: от 1 часа до 7 дней (1..168 часов)
    reminder_hours = _get_booking_reminder_hours(owner_settings)

    # ручной вызов с явной датой — сохраняет старое поведение (по дате)
    explicit_date = (target_date or "").strip()
    if explicit_date:
        reminder_date = explicit_date
        use_date_filter = True
        target_dt = None
        window = None
    else:
        # автоматический режим (cron / без даты) — учитываем настройки интервала
        if reminder_hours >= 24 and reminder_hours % 24 == 0:
            days = reminder_hours // 24
            reminder_date = _booking_reminder_target_date(days_ahead=days)
            use_date_filter = True
            target_dt = None
            window = None
        else:
            # часовой режим: напоминание за N часов до точного времени записи
            now = datetime.now()
            target_dt = now + timedelta(hours=reminder_hours)
            reminder_date = target_dt.strftime("%d.%m.%Y")
            use_date_filter = False
            # окно ±40 минут, чтобы часовой cron (раз в час) гарантированно поймал запись
            window = timedelta(minutes=40)

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



    # выборка записей: по дате (дни) или по точному времени (часы)
    if use_date_filter:
        bookings = (
            db.scalars(
                select(Booking)
                .options(joinedload(Booking.worker_links), joinedload(Booking.additional_services).joinedload(BookingAdditionalService.worker_links))
                .where(
                    Booking.date == reminder_date,
                    Booking.status.in_(tuple(BOOKING_REMINDER_ELIGIBLE_STATUSES)),
                )
                .order_by(Booking.time.asc(), Booking.created_at.asc())
            )
            .unique()
            .all()
        )
    else:
        # часовой режим: ищем записи где точное время записи ≈ now + reminder_hours (± window)
        assert target_dt is not None and window is not None
        all_candidates = (
            db.scalars(
                select(Booking)
                .options(joinedload(Booking.worker_links), joinedload(Booking.additional_services).joinedload(BookingAdditionalService.worker_links))
                .where(Booking.status.in_(tuple(BOOKING_REMINDER_ELIGIBLE_STATUSES)))
                .order_by(Booking.time.asc(), Booking.created_at.asc())
            )
            .unique()
            .all()
        )
        bookings = []
        for cand in all_candidates:
            dt = _parse_booking_datetime(cand.date, cand.time)
            if dt is None:
                continue
            # _parse_booking_datetime возвращает naive local; сравниваем с naive target_dt
            delta = abs((dt - target_dt).total_seconds())
            if delta <= window.total_seconds():
                bookings.append(cand)

    worker_ids = {

        link.worker_id for booking in bookings for link in booking.worker_links

    } | {

        link.worker_id for booking in bookings for asvc in (booking.additional_services or []) for link in (asvc.worker_links or [])

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

        if use_date_filter:
            client_key = f"client:{booking.id}:{reminder_date}"
        else:
            client_key = f"client:{booking.id}:{booking.date}:{booking.time}:{reminder_hours}h"

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

            if use_date_filter:
                worker_key = f"worker:{link.worker_id}:{booking.id}:{reminder_date}"
            else:
                worker_key = f"worker:{link.worker_id}:{booking.id}:{booking.date}:{booking.time}:{reminder_hours}h"

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

                                "qty": float(item.get("qty") or 0),

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

    db.execute(sa_delete(PiggyBankTransaction))

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



    seed_database(
        db,
        # Сброс = чистый лист: демо-персонал не пересоздаём (контракт теста
        # test_owner_database_reset_clears_operational_data_and_preserves_owners),
        # остаются только владельцы. Сервисы/боксы/расписание сидируются.
        include_demo_staff=False,
        is_production=settings.is_production,
    )

    _ensure_owner_accounts(db)

    _repair_text_data(db)

    _normalize_worker_rules(db)

    _clear_owner_database_reset_state(db)





@app.post("/api/owner/database-reset/start", response_model=OwnerDatabaseResetStartPayload)
def start_owner_database_reset(
    payload: OwnerDatabaseResetStartRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerDatabaseResetStartPayload:
    """Шаг 1 сброса базы: подтверждение паролем, код уходит владельцу в Telegram."""
    _ensure_staff_role(session_data, {"owner"})
    staff = db.get(StaffUser, session_data["actorId"])
    if staff is None or not verify_password(payload.password, staff.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный пароль"
        )
    recipient = _primary_owner(db)
    if recipient is None or not _safe_text(recipient.telegram_chat_id).strip():
        recipient = _owner_two_factor_recipient(db)
    chat_id = _safe_text(recipient.telegram_chat_id).strip() if recipient is not None else ""
    if not chat_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram владельца не привязан — подтвердить сброс невозможно",
        )
    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = _now() + timedelta(minutes=OWNER_DATABASE_RESET_CODE_LIFETIME_MINUTES)
    request_id = f"odr-{uuid4()}"
    preview = _owner_database_reset_preview(db)
    _save_owner_database_reset_state(
        db,
        {
            "requestId": request_id,
            "codeHash": hash_one_time_code(code, settings.app_secret),
            "codeExpiresAt": expires_at.isoformat(),
            "confirmationPhrase": _normalize_database_reset_phrase(
                OWNER_DATABASE_RESET_CONFIRMATION_PHRASE
            ),
            "approved": False,
            "requestedAt": _now().isoformat(),
        },
    )
    db.commit()
    send_telegram_message(
        chat_id,
        f"Код подтверждения: {code}\n"
        f"Действует {OWNER_DATABASE_RESET_CODE_LIFETIME_MINUTES} мин. "
        f"Без него сброс базы невозможен.",
    )
    return OwnerDatabaseResetStartPayload(
        requestId=request_id,
        creatorCodeExpiresAt=expires_at,
        confirmationPhrase=OWNER_DATABASE_RESET_CONFIRMATION_PHRASE,
        preview=preview,
        warnings=_owner_database_reset_warnings(preview),
        message="Код подтверждения отправлен в Telegram владельца",
    )


@app.post("/api/owner/database-reset/approve", response_model=OwnerDatabaseResetApprovePayload)
def approve_owner_database_reset(
    payload: OwnerDatabaseResetApproveRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerDatabaseResetApprovePayload:
    """Шаг 2: проверка кода из Telegram и фразы-подтверждения."""
    _ensure_staff_role(session_data, {"owner"})
    state = _owner_database_reset_state(db)
    if (
        state is None
        or state.get("requestId") != payload.requestId
        or not state.get("codeHash")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Заявка на сброс не найдена — начните заново",
        )
    expires_raw = state.get("codeExpiresAt")
    try:
        expires_at = datetime.fromisoformat(str(expires_raw))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Заявка повреждена")
    if expires_at.tzinfo is not None:
        expires_at = expires_at.astimezone(timezone.utc)
    if _now() > expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Код истёк — начните заново")
    expected_hash = str(state.get("codeHash"))
    provided_hash = hash_one_time_code(payload.creatorCode.strip(), settings.app_secret)
    if not hmac_mod.compare_digest(expected_hash, provided_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный код")
    if (
        _normalize_database_reset_phrase(payload.confirmationPhrase)
        != state.get("confirmationPhrase")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Фраза подтверждения не совпадает",
        )
    finalize_after = _now() + timedelta(seconds=OWNER_DATABASE_RESET_DELAY_SECONDS)
    state["approved"] = True
    state["finalizeAfter"] = finalize_after.isoformat()
    _save_owner_database_reset_state(db, state)
    db.commit()
    preview = _owner_database_reset_preview(db)
    return OwnerDatabaseResetApprovePayload(
        requestId=payload.requestId,
        finalizeAfter=finalize_after,
        preview=preview,
        warnings=_owner_database_reset_warnings(preview),
        message="Сброс подтверждён — выполнение разблокировано",
    )


@app.post("/api/owner/database-reset/execute", response_model=OwnerDatabaseResetExecutePayload)
def execute_owner_database_reset(
    payload: OwnerDatabaseResetExecuteRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerDatabaseResetExecutePayload:
    """Шаг 3: запуск очистки (не раньше finalizeAfter из approve)."""
    _ensure_staff_role(session_data, {"owner"})
    state = _owner_database_reset_state(db)
    if (
        state is None
        or state.get("requestId") != payload.requestId
        or not state.get("approved", False)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Сброс не подтверждён — выполните шаг подтверждения",
        )
    finalize_raw = state.get("finalizeAfter")
    try:
        finalize_after = datetime.fromisoformat(str(finalize_raw))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Заявка повреждена")
    if finalize_after.tzinfo is not None:
        finalize_after = finalize_after.astimezone(timezone.utc)
    if _now() < finalize_after:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Подтверждено — кнопка выполнения станет доступна через {OWNER_DATABASE_RESET_DELAY_SECONDS} c",
        )
    preview = _owner_database_reset_preview(db)
    _perform_owner_database_reset(db)
    db.commit()
    return OwnerDatabaseResetExecutePayload(message="База очищена", preview=preview)


def _parse_date(s: str) -> date | None:

    if "." in s:

        parts = s.split(".")

        try:

            return date(int(parts[2]), int(parts[1]), int(parts[0]))

        except (ValueError, IndexError):

            return None

    try:

        return date.fromisoformat(s)

    except (ValueError, TypeError):

        return None





def _owner_export_file(

    db: Session,

    actor_id: str,

    kind: str,

    segment: str = "all",

    date_from: str | None = None,

    date_to: str | None = None,

) -> GeneratedExport:

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

    piggy_transactions = db.scalars(

        select(PiggyBankTransaction).order_by(PiggyBankTransaction.created_at.desc())

    ).all()



    # Filter by segment

    if segment in ("wash", "detailing"):

        service_map = {s.id: s for s in services}

        from .exports import _booking_matches_segment

        bookings = [

            b for b in bookings

            if _booking_matches_segment(b, service_map.get(b.service_id), segment)

        ]



    # Filter by date range

    if date_from or date_to:

        parsed_from = _parse_date(date_from) if date_from else None

        parsed_to = _parse_date(date_to) if date_to else None

        def _in_range(d: str | None) -> bool:

            if not d:

                return True

            parsed = _parse_date(d)

            if not parsed:

                return True

            if parsed_from and parsed < parsed_from:

                return False

            if parsed_to and parsed > parsed_to:

                return False

            return True

        bookings = [b for b in bookings if _in_range(b.date)]

        expenses = [e for e in expenses if _in_range(e.date)]

        incomes = [i for i in incomes if _in_range(i.date)]



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

        piggy_transactions=list(piggy_transactions),

        db=db,

    )



def _piggy_bank_export_file(

    db: Session,

    actor_id: str,

    date_from: str | None = None,

    date_to: str | None = None,

) -> GeneratedExport:

    owner = db.get(StaffUser, actor_id)

    if owner is None or owner.role not in {"owner", "accountant"}:

        raise HTTPException(

            status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found"

        )

    company_settings = _setting(

        db,

        "owner_company",

        {"name": "ATMOSFERA"},

    )

    piggy_transactions = db.scalars(

        select(PiggyBankTransaction).order_by(PiggyBankTransaction.created_at.desc())

    ).all()

    return build_piggy_bank_export(

        company_name=str(company_settings.get("name") or "ATMOSFERA"),

        piggy_transactions=list(piggy_transactions),

        date_from=date_from,

        date_to=date_to,

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

    if delivered == 0 and not telegram_recipients:

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

        db=db,

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

    if delivered == 0 and not telegram_recipients:

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


@app.get("/api/owner/exports/{kind}")
def download_owner_export(
    kind: str,
    segment: str = "all",
    date_from: str | None = None,
    date_to: str | None = None,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> Response:
    if kind == "piggy-bank":
        _ensure_staff_role(session_data, {"owner", "accountant"})
        export_file = _piggy_bank_export_file(
            db,
            session_data["actorId"],
            date_from=date_from,
            date_to=date_to,
        )
        return _download_response(export_file)
    _ensure_staff_role(session_data, {"owner"})
    export_file = _owner_export_file(
        db,
        session_data["actorId"],
        kind,
        segment=segment,
        date_from=date_from,
        date_to=date_to,
    )
    return _download_response(export_file)


@app.post("/api/owner/exports/{kind}/telegram", response_model=OwnerExportDeliveryPayload)
def send_owner_export_to_telegram(
    kind: str,
    segment: str = "all",
    date_from: str | None = None,
    date_to: str | None = None,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerExportDeliveryPayload:
    if kind == "piggy-bank":
        _ensure_staff_role(session_data, {"owner", "accountant"})
        export_file = _piggy_bank_export_file(
            db,
            session_data["actorId"],
            date_from=date_from,
            date_to=date_to,
        )
        return _send_export_to_telegram(db, session_data["actorId"], export_file)
    _ensure_staff_role(session_data, {"owner"})
    export_file = _owner_export_file(
        db,
        session_data["actorId"],
        kind,
        segment=segment,
        date_from=date_from,
        date_to=date_to,
    )
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





def _additional_services_block(booking: Booking) -> str:
    """Форматирует блок доп. услуг для вставки в Telegram/внутренние сообщения."""
    services = getattr(booking, "additional_services", None) or []
    if not services:
        return ""
    lines: list[str] = []
    for asvc in services:
        try:
            name = (getattr(asvc, "name", "") or "").strip() or "Доп. услуга"
            price_val = int(getattr(asvc, "price", 0) or 0)
            price_str = f"{price_val:,}".replace(",", " ") + " ₽"
            if getattr(asvc, "price_mode", "add") == "subtract":
                price_str = f"−{price_str} (вычет)"
            dur = getattr(asvc, "duration", None)
            dur_str = f", {int(dur)} мин" if dur else ""
            out_str = " · аутсорс" if getattr(asvc, "is_outsource", False) else ""
            lines.append(f"• {name} — {price_str}{dur_str}{out_str}")
        except Exception:
            lines.append(f"• {(getattr(asvc, 'name', '') or 'Доп. услуга').strip()}")
    return "\nДоп. услуги:\n" + "\n".join(lines)



def _booking_all_worker_ids(booking: Booking) -> set[str]:
    """Все мастера записи: основная услуга + доп. услуги."""
    ids: set[str] = {link.worker_id for link in (booking.worker_links or [])}
    for asvc in (getattr(booking, "additional_services", None) or []):
        for link in (getattr(asvc, "worker_links", None) or []):
            if getattr(link, "worker_id", None):
                ids.add(link.worker_id)
    return ids

def _notify_admins_about_booking(db: Session, booking: Booking) -> None:

    admins = db.scalars(

        select(StaffUser).where(StaffUser.role == "admin", StaffUser.active.is_(True))

    ).all()

    add_block = _additional_services_block(booking)

    text = (

        "Новая запись\n"

        f"Клиент: {booking.client_name}\n"

        f"Авто: {_booking_car_label(booking.car, booking.plate)}\n"

        f"Услуга: {booking.service}{add_block}\n"

        f"Дата: {_booking_datetime_label(booking.date, booking.time)}\n"

        f"Телефон: {booking.client_phone}"

    )

    for admin in admins:

        _send_telegram_safe(admin.telegram_chat_id, text)





def _notify_owners_about_booking(db: Session, booking: Booking) -> None:

    owners = _all_owner_telegram_recipients(db)

    add_block = _additional_services_block(booking)

    text = (

        "Новая запись\n"

        f"Клиент: {booking.client_name}\n"

        f"Авто: {_booking_car_label(booking.car, booking.plate)}\n"

        f"Услуга: {booking.service}{add_block}\n"

        f"Дата: {_booking_datetime_label(booking.date, booking.time)}\n"

        f"Телефон: {booking.client_phone}"

    )

    for owner in owners:

        _send_telegram_safe(owner.telegram_chat_id, text)





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

    # Группа ресурсов услуг больше не привязывается к категории принудительно.

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

        "transfer": "Перевод",

        "invoice": "По счёту",

        "credit": "В долг (депозит)",

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

    add_block = _additional_services_block(booking)

    return (

        "Чек по записи\n"

        f"Клиент: {booking.client_name}\n"

        f"Услуга: {booking.service}{add_block}\n"

        f"Дата: {booking.date} {booking.time}\n"

        f"Бокс: {booking.box}\n"

        f"Сумма: {booking.price:,} ₽\n".replace(",", " ")

        + f"Оплата: {_booking_payment_label(booking)}\n"

        + (f"Завершение: {_format_moscow_dt(booking.completed_at)}\n" if booking.completed_at else "")

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

    event_time = (
        f"\nНачало: {_format_moscow_dt(booking.started_at)}"
        if event_label == "начал" and booking.started_at
        else f"\nЗавершение: {_format_moscow_dt(booking.completed_at)}"
        if event_label == "завершил" and booking.completed_at
        else ""
    )

    add_block = _additional_services_block(booking)

    _notify_owners(

        db,

        (

            f"Мастер {event_label} работу по записи\n"

            f"Мастер: {worker_name}\n"

            f"Клиент: {booking.client_name}\n"

            f"Услуга: {booking.service}{add_block}\n"

            f"Дата: {_booking_datetime_label(booking.date, booking.time)}\n"

            f"Бокс: {booking.box}"

            f"{event_time}"
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

        add_block = _additional_services_block(booking)

        text = (

            "Вам назначена запись\n"

            f"Клиент: {booking.client_name}\n"

            f"Услуга: {booking.service}{add_block}\n"

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





def _notify_workers_about_additional_service(

    db: Session, booking: Booking, asvc: BookingAdditionalService

) -> None:

    if getattr(asvc, "is_outsource", False):

        return

    worker_ids = {link.worker_id for link in asvc.worker_links}

    if not worker_ids:

        return

    workers = db.scalars(select(StaffUser).where(StaffUser.id.in_(worker_ids))).all()

    for worker in workers:

        link = next(

            (item for item in asvc.worker_links if item.worker_id == worker.id), None

        )

        pay_label = "не указана"

        if link is not None:

            if (link.pay_type or "percent") == "fixed":

                pay_label = (

                    f"фикс {link.fixed_amount} ₽"

                    if link.fixed_amount is not None

                    else "фикс"

                )

            else:

                pay_label = f"{link.percent:g}%"

        car_part = ""

        if booking.car:

            car_part = f"\nАвто: {booking.car}"

            if booking.plate:

                car_part += f" ({booking.plate})"

        text = (

            "Вам назначена доп. услуга\n"

            f"Клиент: {booking.client_name}\n"

            f"Доп. услуга: {asvc.name}\n"

            f"Дата: {booking.date} {booking.time}\n"

            f"Бокс: {booking.box}\n"

            f"Оплата: {pay_label}"

        )

        if car_part:

            text += car_part

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

        add_block = _additional_services_block(booking)

        text = (

            "Администратор обновил примечание к вашей записи\n"

            f"Клиент: {booking.client_name}\n"

            f"Услуга: {booking.service}{add_block}\n"

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

        add_block = _additional_services_block(booking)

        text = (

            "Администратор перенёс вашу запись\n"

            f"Клиент: {booking.client_name}\n"

            f"Услуга: {booking.service}{add_block}"

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


@app.patch("/api/clients/me", response_model=ClientProfilePayload)
def update_client_me(
    payload: ClientProfileInput,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> ClientProfilePayload:
    _ensure_staff_role(session_data, {"client"})

    client = db.get(Client, session_data["actorId"])
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    if payload.name is not None:
        client.name = payload.name
    if payload.phone is not None:
        new_phone = payload.phone.strip()

        def _safe_digits(value: str) -> str:
            try:
                return normalize_phone_digits(value)
            except ValueError:
                return ""

        current_digits = _safe_digits(client.phone or "")
        new_digits = _safe_digits(new_phone)
        if new_phone and new_digits and new_digits != current_digits:
            # Нельзя забрать телефон другого клиента (409,
            # test_client_profile_cannot_take_phone_of_another_client)
            for other in db.scalars(
                select(Client).where(
                    Client.id != client.id,
                    Client.deleted_at.is_(None),
                )
            ):
                if other.phone and _safe_digits(other.phone) == new_digits:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Этот телефон уже привязан к другому клиенту",
                    )
        client.phone = payload.phone

    if payload.vehicles is not None:
        _save_client_vehicles(db, client.id, payload.vehicles)

        vehicles = _client_vehicles_payload(db, client)
        if vehicles:
            client.car = vehicles[0].car
            client.plate = vehicles[0].plate
            client.plate_type = vehicles[0].plateType or "russian"
        else:
            client.car = payload.car or ""
            client.plate = payload.plate or ""
            client.plate_type = payload.plateType or "russian"
    else:
        if payload.car is not None:
            client.car = payload.car
        if payload.plate is not None:
            client.plate = payload.plate
        if payload.plateType is not None:
            client.plate_type = payload.plateType

    client.updated_at = _now()
    db.commit()
    db.refresh(client)

    vehicles = _client_vehicles_payload(db, client)
    phone_verified = _client_phone_is_verified(db, client.telegram_id, client.phone)
    return ClientProfilePayload(
        name=client.name,
        phone=client.phone,
        car=client.car or "",
        plate=client.plate or "",
        plateType=client.plate_type or "russian",
        vehicles=vehicles,
        registered=client.registered,
        phoneVerified=phone_verified,
    )



@app.delete("/api/clients/{client_id}", response_model=GenericMessage)
def delete_client(
    client_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    """Удаляет клиента вместе с его бронями (FK CASCADE) и уведомлениями.

    Доступ — admin/owner. Сессии клиента безтокеновые (initData), поэтому
    отдельный отзыв не нужен: резолвер больше не найдёт этого клиента.
    """
    _ensure_staff_role(session_data, {"admin", "owner"})
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Client not found"
        )
    # Core-уровень: БД сама каскадит bookings -> booking_workers/additional_services
    # (ORM-удаление вместо этого пыталось занулить NOT NULL booking.client_id).
    db.execute(sa_delete(Notification).where(Notification.recipient_id == client_id))
    db.execute(sa_delete(Client).where(Client.id == client_id))
    db.commit()
    return GenericMessage(message="Клиент удалён")


@app.patch("/api/clients/{client_id}/card", response_model=ClientSummaryPayload)

def update_client_card(

    client_id: str,
    payload: ClientCardUpdateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),

) -> ClientSummaryPayload:

    _ensure_staff_role(session_data, {"owner", "admin"})

    client = db.get(Client, client_id)

    if client is None:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    if payload.name is not None:

        client.name = payload.name

    if payload.phone is not None:

        client.phone = payload.phone

    if payload.car is not None:

        client.car = payload.car

    if payload.plate is not None:

        client.plate = payload.plate

    if payload.plateType is not None:

        client.plate_type = payload.plateType

    if payload.notes is not None:

        client.notes = payload.notes

    if payload.debtBalance is not None:

        client.debt_balance = payload.debtBalance

    if payload.adminRating is not None:

        client.admin_rating = payload.adminRating

    if payload.adminNote is not None:

        client.admin_note = payload.adminNote

    if payload.referralSource is not None:

        client.referral_source = payload.referralSource

    if payload.depositActive is not None:

        client.deposit_active = payload.depositActive

    if payload.depositMonthly is not None:

        client.deposit_monthly = payload.depositMonthly

    if payload.depositStartMonth is not None:

        client.deposit_start_month = payload.depositStartMonth

    if payload.vehicles is not None:

        _save_client_vehicles(db, client_id, payload.vehicles)

        vehicles = _client_vehicles_payload(db, client)

        if vehicles:

            client.car = vehicles[0].car

            client.plate = vehicles[0].plate

            client.plate_type = vehicles[0].plateType or "russian"

        else:

            client.car = ""

            client.plate = ""

    client.updated_at = _now()

    db.commit()

    db.refresh(client)

    return _client_summary_payload(client, db)


@app.post("/api/clients", response_model=ClientSummaryPayload, status_code=status.HTTP_200_OK)

def create_client(

    payload: ClientCreateRequest,

    session_data: dict = Depends(_require_session),

    db: Session = Depends(get_db),

) -> ClientSummaryPayload:

    _ensure_staff_role(session_data, {"owner", "admin"})

    existing = _client_by_phone(db, payload.phone)

    if existing is not None:

        raise HTTPException(

            status_code=status.HTTP_409_CONFLICT,

            detail="Клиент с таким номером телефона уже существует",

        )

    client = Client(

        id=f"c-{uuid4()}",

        name=payload.name,

        phone=payload.phone,

        car=payload.car,

        plate=payload.plate,

        plate_type=payload.plateType,

        notes=payload.notes,

        referral_source=payload.referralSource,

        registered=True,

    )

    db.add(client)

    db.commit()

    db.refresh(client)

    return _client_summary_payload(client, db)

@app.get("/api/health", response_model=GenericMessage)


def health() -> GenericMessage:

    return GenericMessage(message="ok")


@app.get("/api/debug/encoding")
def debug_encoding() -> dict:
    """Временная диагностика кодировки — без БД, просто тест."""
    return {"ok": True, "test": "Привет мир", "test_hex": "Привет мир".encode("utf-8").hex(), "static": "АТМОСФЕРА"}


@app.get("/api/debug/db")
def debug_db(db: Session = Depends(get_db)) -> dict:
    """Диагностика БД — первые 3 staff/service с hex."""
    try:
        from sqlalchemy import select

        staff = []
        for s in db.scalars(select(StaffUser).limit(3)).all():
            staff.append(
                {
                    "id": s.id,
                    "login": s.login,
                    "name": s.name,
                    "name_hex": (s.name or "").encode("utf-8").hex(),
                    "city": s.city,
                    "city_hex": (s.city or "").encode("utf-8").hex() if s.city else "",
                }
            )
        services = []
        for svc in db.scalars(select(Service).limit(3)).all():
            services.append({"id": svc.id, "name": svc.name, "hex": (svc.name or "").encode("utf-8").hex()})
        return {"ok": True, "staff": staff, "services": services}
    except Exception as e:
        import traceback

        return {"ok": False, "error": str(e), "trace": traceback.format_exc()[:3000]}





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





def _normalize_legacy_content(value: dict) -> dict:
    """Мигрирует старый формат контента (hero.title строкой + hero.titleHighlight)
    в новый (hero.title => {before, highlight, after})."""
    hero = value.get("hero")
    if not isinstance(hero, dict):
        return value
    title_val = hero.get("title")
    if not isinstance(title_val, str):
        return value
    highlight = hero.get("titleHighlight") or ""
    before, after = "", ""
    if highlight and highlight in title_val:
        idx = title_val.index(highlight)
        before, after = title_val[:idx], title_val[idx + len(highlight):]
    else:
        before = title_val
    hero["title"] = {"before": before, "highlight": highlight, "after": after}
    hero.pop("titleHighlight", None)
    return value


def _get_or_create_content(db: Session) -> ContentPayload:

    row = db.get(AppSetting, "content")

    if row is None or not isinstance(row.value, dict):

        default = _default_content()

        db.add(AppSetting(key="content", value=default.model_dump()))

        db.flush()

        return default

    try:

        return ContentPayload.model_validate(row.value)

    except ValidationError:

        normalized = _normalize_legacy_content(dict(row.value))

        try:

            content = ContentPayload.model_validate(normalized)

        except ValidationError:

            content = _default_content()

        row.value = content.model_dump()

        db.commit()

        return content





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





ALLOWED_UPLOAD_TYPES = {
    ".jpg": ("jpeg", "image/jpeg"),
    ".jpeg": ("jpeg", "image/jpeg"),
    ".png": ("png", "image/png"),
    ".gif": ("gif", "image/gif"),
    ".webp": ("webp", "image/webp"),
}
UPLOAD_CHUNK_SIZE = 64 * 1024


def _detected_image_format(header: bytes) -> str | None:
    if header.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if header.startswith((b"GIF87a", b"GIF89a")):
        return "gif"
    if len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "webp"
    return None


def _upload_headers(filename: str) -> dict[str, str]:
    return {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": f'inline; filename="{filename}"',
        "X-Content-Type-Options": "nosniff",
    }


@app.post("/api/upload")
async def upload_file(
    file: UploadFile = ...,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> dict:
    if not getattr(settings, "uploads_enabled", True):
        raise HTTPException(status_code=503, detail="Uploads require persistent external storage")
    _ensure_staff_role(session_data, {"admin", "owner"})
    ext = Path(file.filename or "").suffix.lower()
    expected = ALLOWED_UPLOAD_TYPES.get(ext)
    if expected is None:
        raise HTTPException(status_code=400, detail=f"Недопустимый формат файла: {ext}")

    unique_name = f"{uuid4().hex}{ext}"
    dest = UPLOAD_DIR / unique_name
    temp_path = UPLOAD_DIR / f".{unique_name}.tmp"
    total = 0
    header = bytearray()
    try:
        with temp_path.open("xb") as output:
            while chunk := await file.read(UPLOAD_CHUNK_SIZE):
                total += len(chunk)
                if total > settings.upload_max_bytes:
                    raise HTTPException(status_code=413, detail="Файл слишком большой")
                if len(header) < 16:
                    header.extend(chunk[: 16 - len(header)])
                output.write(chunk)
            output.flush()
            os.fsync(output.fileno())
        if not total or _detected_image_format(bytes(header)) != expected[0]:
            raise HTTPException(status_code=400, detail="Содержимое файла не соответствует формату")
        os.replace(temp_path, dest)
        db.add(
            UploadedFile(
                id=Path(unique_name).stem,
                filename=file.filename or unique_name,
                mime_type=expected[1],
                data=b"",
            )
        )
        db.commit()
    except Exception:
        temp_path.unlink(missing_ok=True)
        dest.unlink(missing_ok=True)
        db.rollback()
        raise
    finally:
        await file.close()
    return {"url": f"/api/uploads/{unique_name}"}


@app.get("/api/uploads/{filename}")
async def serve_upload(filename: str, db: Session = Depends(get_db)) -> Response:
    if "/" in filename or "\\" in filename or Path(filename).name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    ext = Path(filename).suffix.lower()
    allowed = ALLOWED_UPLOAD_TYPES.get(ext)
    if allowed is None:
        raise HTTPException(status_code=404, detail="File not found")
    headers = _upload_headers(filename)
    dest = UPLOAD_DIR / filename
    if dest.is_file():
        return FileResponse(dest, media_type=allowed[1], headers=headers)
    record = db.get(UploadedFile, Path(filename).stem)
    if record is not None and record.data:
        return Response(content=record.data, media_type=allowed[1], headers=headers)
    raise HTTPException(status_code=404, detail="File not found")





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

        parts.append(f"<b>Имя:</b> {html.escape(name)}")

    if phone:

        parts.append(f"<b>Телефон:</b> {html.escape(phone)}")

    if service:

        parts.append(f"<b>Услуга:</b> {html.escape(service)}")

    if message_text:

        parts.append(f"<b>Сообщение:</b> {html.escape(message_text)}")

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

    return GenericMessage(message=f"Telegram webhook синхронизирован для @{username}")





# ── Stock Categories helpers (unlimited nesting) ──
def _stock_category_descendant_ids(db: Session, root_id: str) -> set[str]:
    """Собрать все id потомков категории root_id (BFS, безлимитная глубина)."""
    descendants: set[str] = set()
    queue: list[str] = [root_id]
    visited: set[str] = set()
    while queue:
        current = queue.pop(0)
        if current in visited:
            continue
        visited.add(current)
        children = db.scalars(select(StockCategory.id).where(StockCategory.parent_id == current)).all()
        for child_id in children:
            if child_id not in descendants:
                descendants.add(child_id)
                queue.append(child_id)
    return descendants


def _normalize_parent_id(value: str | None) -> str | None:
    if value is None or (isinstance(value, str) and value.strip() == ""):
        return None
    return value


def _validate_stock_category_parent(db: Session, category_id: str | None, new_parent_id: str | None) -> None:
    new_parent_id = _normalize_parent_id(new_parent_id)
    if new_parent_id is None:
        return
    if category_id is not None and new_parent_id == category_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Категория не может быть родителем самой себя")
    parent = db.get(StockCategory, new_parent_id)
    if parent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Родительская категория не найдена")
    if category_id is not None:
        # запрет цикла: новый родитель не должен быть потомком текущей категории
        descendants = _stock_category_descendant_ids(db, category_id)
        if new_parent_id in descendants:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя переместить категорию в собственного потомка (цикл)")


# ── Stock Categories CRUD ──


@app.get("/api/stock-categories", response_model=list[StockCategoryPayload])
def list_stock_categories(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> list[StockCategoryPayload]:
    _ensure_staff_role(session_data, {"owner", "admin", "accountant", "worker"})
    categories = db.scalars(select(StockCategory).order_by(StockCategory.name)).all()
    return [
        StockCategoryPayload(id=cat.id, name=cat.name, parentId=cat.parent_id)
        for cat in categories
    ]


@app.post("/api/stock-categories", response_model=StockCategoryPayload)
def create_stock_category(
    payload: StockCategoryCreateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> StockCategoryPayload:
    _ensure_staff_role(session_data, {"admin", "owner", "accountant"})
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Название категории не может быть пустым")
    if len(name) > 120:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Название категории слишком длинное (макс. 120)")
    normalized_parent = _normalize_parent_id(payload.parentId)
    _validate_stock_category_parent(db, None, normalized_parent)
    cat = StockCategory(
        id=f"sc-{uuid4()}",
        name=name,
        parent_id=normalized_parent,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return StockCategoryPayload(id=cat.id, name=cat.name, parentId=cat.parent_id)


@app.patch("/api/stock-categories/{category_id}", response_model=StockCategoryPayload)
def update_stock_category(
    category_id: str,
    payload: StockCategoryUpdateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> StockCategoryPayload:
    _ensure_staff_role(session_data, {"admin", "owner", "accountant"})
    cat = db.get(StockCategory, category_id)
    if cat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Название категории не может быть пустым")
        if len(name) > 120:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Название категории слишком длинное (макс. 120)")
        cat.name = name
    if "parentId" in data:
        new_parent_id = _normalize_parent_id(data["parentId"])
        _validate_stock_category_parent(db, category_id, new_parent_id)
        cat.parent_id = new_parent_id
    # поддержка snake_case если вдруг прилетит
    if "parent_id" in data and "parentId" not in data:
        new_parent_id = _normalize_parent_id(data["parent_id"])
        _validate_stock_category_parent(db, category_id, new_parent_id)
        cat.parent_id = new_parent_id
    db.commit()
    db.refresh(cat)
    return StockCategoryPayload(id=cat.id, name=cat.name, parentId=cat.parent_id)


@app.delete("/api/stock-categories/{category_id}", response_model=GenericMessage)
def delete_stock_category(
    category_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    _ensure_staff_role(session_data, {"admin", "owner", "accountant"})
    cat = db.get(StockCategory, category_id)
    if cat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    # Собрать всё поддерево (категория + все потомки любой глубины) — безлимитное удаление
    all_ids = {category_id} | _stock_category_descendant_ids(db, category_id)
    # Сбросить category_id у всех товаров, которые ссылаются на удаляемые категории
    if all_ids:
        for item in db.scalars(select(StockItem).where(StockItem.category_id.in_(list(all_ids)))).all():
            item.category_id = None
        # Удалить категории поддерева (сначала листья, затем корни — bulk delete)
        # Используем ORM удаление по одному для корректного каскада, но достаточно bulk
        for cid in all_ids:
            obj = db.get(StockCategory, cid)
            if obj is not None and obj.id != category_id:
                db.delete(obj)
        name = cat.name
        db.delete(cat)
    else:
        name = cat.name
        db.delete(cat)
    db.commit()
    return GenericMessage(message=f"Категория «{name}» удалена")


# ── Shift Checklists ──


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





def _google_sync_booking(db, booking, *, action="upsert") -> None:
    """Best-effort синхронизация записи с Google Calendar.

    No-op, если интеграция не настроена или токены не привязаны. Ошибки
    Google API логируются модулем google_calendar и не ломают бронирование.
    """
    if not is_configured(settings, db):
        return
    _, ok = sync_booking_to_calendar(db, settings, booking, action=action)
    db.flush()


def _google_sync_loop() -> None:
    """Фоновый цикл обратной синхронизации «Google Calendar -> CRM».

    Запускается daemon-потоком при старте приложения. No-op, если интеграция
    не настроена или токены не привязаны. Ошибки логируются и не роняют цикл.
    """
    while True:
        try:
            db = next(get_db())
            try:
                pull_calendar_changes(db, settings)
                db.commit()
            finally:
                db.close()
        except Exception:  # noqa: BLE001
            logger.exception("Google Calendar background sync iteration failed")
        time_module.sleep(GOOGLE_SYNC_INTERVAL_SECONDS)


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

        # Ограничение на существование/активность услуги снято: клиент может
        # записаться даже если услуги нет в каталоге или она неактивна.

        booking_client_name = client.name

        booking_client_phone = client.phone

        booking_car = payload.car or client.car or ""

        booking_plate = payload.plate or client.plate or ""

        booking_plate_type = payload.plateType or client.plate_type or "russian"

        booking_service = service.name if service is not None else (payload.service or "")

        booking_service_id = service.id if service is not None else (payload.serviceId or "")

        booking_duration = service.duration if service is not None else payload.duration

        booking_price = service.price if service is not None else payload.price

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

        if client is None and phone_client is not None:

            client = phone_client

        if (
            client is not None
            and phone_client is not None
            and phone_client.id != client.id
        ):
            # clientId и телефон принадлежат разным клиентам — молча
            # перезаписывать нельзя (409, conflicting_client_and_phone).
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Указанный телефон принадлежит другому клиенту",
            )

        if client is None:

            client = Client(

                id=payload.clientId or f"c-{uuid4()}",

                name=normalized_client_name,

                phone=normalized_client_phone,

                car=payload.car or "",

                plate=payload.plate or "",

                plate_type=payload.plateType,
                referral_source=payload.referralSource or "",

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

                client.plate_type = payload.plateType

            if payload.referralSource:
                client.referral_source = payload.referralSource

            client.registered = True

            client.updated_at = _now()

        db.flush()

        booking_client_name = client.name

        booking_client_phone = client.phone

        booking_car = client.car or ""

        booking_plate = client.plate or ""

        booking_plate_type = client.plate_type or payload.plateType

        if service is not None:

            booking_service = service.name

            booking_service_id = service.id



    booking_workers = (

        []

        if session_data["role"] == "client"

        else _validated_booking_workers(db, payload.workers)

    )

    booking_status = "admin_review" if session_data["role"] == "client" else payload.status



    # Статусы из BOOKING_ACTIVE_STATUSES (включая "scheduled") требуют валидный слот при создании —
    # иначе PATCH /api/bookings/{id} впоследствии не сможет перевести такую запись в другой активный
    # статус (400 «Укажите дату и время записи»). Раньше "scheduled" был исключением из проверки,
    # из-за чего появлялись записи без даты/времени, которые нельзя было редактировать.
    requires_scheduled_slot = _booking_requires_scheduled_slot(booking_status)

    # Клиент всегда выбирает дату/время в интерфейсе — даже для записи «на уточнении»
    # сохраняем проверки слота (не в прошлом, в графике работы, свободный бокс)
    if session_data["role"] == "client":
        requires_scheduled_slot = True

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

        source="bot" if session_data["role"] == "client" else "manual",

        services=[],

        notes=payload.notes,

        car=booking_car,

        plate=booking_plate,

        plate_type=booking_plate_type,

        referral_source=payload.referralSource or "",

        is_repeat_visit=payload.isRepeatVisit,

        created_at=_now(),

    )

    db.add(booking)

    db.flush()

    _sync_booking_workers(db, booking, booking_workers)

    if payload.materials:
        _sync_booking_materials(db, booking, payload.materials)

    if session_data["role"] in {"admin", "owner"} and payload.notifyWorkers:

        _notify_workers_about_assignment(

            db, booking, {link.worker_id for link in booking.worker_links}

        )

    if session_data["role"] in {"admin", "owner"}:

        admin_message = f"Новая запись: {booking_client_name} — {_booking_datetime_label(booking_date, booking_time)}"

        db.add(

            Notification(

                id=f"n-{uuid4()}",

                recipient_role="admin",

                recipient_id=None,

                message=admin_message,

                read=False,

                created_at=_now(),

            )

        )

        _notify_admins_about_booking(db, booking)

        _notify_owners_about_booking(db, booking)

    if session_data["role"] == "client":

        client_message = f"Заявка на {booking_service} создана на {booking_date} в {booking_time}. Статус: {_booking_status_label(booking_status)}"

        admin_booking_text = _admin_booking_notification_text(

            booking_client_name,

            booking_car,

            booking_plate,

            booking_date,

            booking_time,

        )

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

                    message=admin_booking_text,

                    read=False,

                    created_at=_now(),

                ),

                Notification(

                    id=f"n-{uuid4()}",

                    recipient_role="owner",

                    recipient_id=None,

                    message=admin_booking_text,

                    read=False,

                    created_at=_now(),

                ),

            ]

        )

        _notify_admins_about_booking(db, booking)

        _notify_owners_about_booking(db, booking)

    db.commit()

    db.refresh(booking)

    _google_sync_booking(db, booking, action="upsert")

    return _booking_payload_for_response(db, booking)





def _write_off_booking_materials(db: Session, booking: Booking) -> None:

    if booking.materials_written_off:
        print(f"[WRITE_OFF] skip booking {booking.id[:8]} — already written off")
        return

    print(f"[WRITE_OFF] booking {booking.id[:8]} materials_written_off=False, {len(booking.materials)} materials")

    service = db.get(Service, booking.service_id) if booking.service_id else None
    rg = _service_resource_group(service)

    if not booking.materials and service and (service.materials or []):
        for mat in service.materials:
            si = db.get(StockItem, mat.get("stockItemId")) if mat.get("stockItemId") else None
            if not si:
                print(f"[WRITE_OFF] service material '{mat.get('name')}' stock item NOT FOUND — skipped")
                continue
            booking.materials.append(
                BookingMaterial(
                    id=f"bm-{uuid4()}",
                    stock_item_id=si.id,
                    name=si.name,
                    qty=float(mat.get("qty") or 0),
                    unit=si.unit,
                    unit_price=si.unit_price,
                )
            )
        db.flush()
        print(f"[WRITE_OFF] auto-filled {len(booking.materials)} materials from service '{service.name}'")

    total_cost = 0
    material_details = []

    for bm in booking.materials:
        print(f"[WRITE_OFF] material '{bm.name}' stock_item_id={bm.stock_item_id} qty={bm.qty} unit_price={bm.unit_price}")
        if bm.stock_item_id:
            stock_item = db.get(StockItem, bm.stock_item_id)
            if stock_item:
                print(f"[WRITE_OFF] stock '{stock_item.name}' before={stock_item.qty}, deducting {bm.qty}")
                stock_item.qty = max(0, stock_item.qty - bm.qty)
                line_total = bm.qty * float(bm.unit_price)
                total_cost += line_total
                material_details.append(f"{bm.name} x{bm.qty} {bm.unit}")
                worker_names = ", ".join(w.worker_name for w in booking.worker_links) if booking.worker_links else None
                db.add(StockWriteOff(
                    id=f"swo-{uuid4()}",
                    stock_item_id=bm.stock_item_id,
                    stock_item_name=bm.name,
                    qty=bm.qty,
                    unit=bm.unit,
                    unit_price=bm.unit_price,
                    total_cost=line_total,
                    source="booking",
                    booking_id=booking.id,
                    booking_service=booking.service,
                    booking_client_name=booking.client_name,
                    booking_date=booking.date,
                    booking_worker_names=worker_names,
                    created_at=_now(),
                ))
            else:
                print(f"[WRITE_OFF] stock_item {bm.stock_item_id} NOT FOUND")
        else:
            print(f"[WRITE_OFF] material '{bm.name}' has NO stock_item_id — skipped")

    if total_cost > 0 and material_details:
        db.add(
            Expense(
                id=f"e-{uuid4()}",
                title=f"Списание материалов: {booking.service} ({booking.client_name})",
                amount=total_cost,
                category="Расходные материалы",
                date=booking.date,
                note=", ".join(material_details),
                resource_group=rg,
                booking_id=booking.id,
                created_at=_now(),
            )
        )
        print(f"[WRITE_OFF] expense created: {total_cost} ₽ ({', '.join(material_details)})")
    else:
        print(f"[WRITE_OFF] no expense — total_cost={total_cost}")

    booking.materials_written_off = True
    db.flush()
    print(f"[WRITE_OFF] booking {booking.id[:8]} done, materials_written_off=True")


def _booking_materials_cost(db: Session, booking: Booking) -> int:
    """Фактическая стоимость материалов по записи; fallback — материалы услуги со склада."""
    override = (booking.money_split_overrides or {}).get("materialsCost")
    if override is not None:
        return max(0, int(override))
    return _booking_materials_cost_actual(db, booking)


def _booking_materials_cost_actual(db: Session, booking: Booking) -> int:
    """Фактическая стоимость материалов по записи; fallback — материалы услуги со склада."""
    materials_cost = 0
    for bm in (booking.materials or []):
        materials_cost += int(round((bm.qty or 0) * float(bm.unit_price or 0)))
    if materials_cost > 0:
        return materials_cost
    svc = db.get(Service, booking.service_id) if booking.service_id else None
    if svc:
        for mat in (svc.materials or []):
            si = db.get(StockItem, mat.get("stockItemId")) if mat.get("stockItemId") else None
            if si:
                materials_cost += int(round((mat.get("qty") or 0) * float(si.unit_price or 0)))
        if materials_cost > 0:
            return materials_cost
        return int(svc.material_consumption or 0)
    return 0


def _asvc_paid_amount(asvc: BookingAdditionalService) -> int:
    """Сколько уходит с доп. услуги: аутсорсеру или мастерам (фикс/процент)."""
    if asvc.is_outsource:
        return int(asvc.outsource_amount or 0)
    total = 0
    for alink in asvc.worker_links:
        if alink.pay_type == "fixed":
            total += int(alink.fixed_amount or 0)
        else:
            total += round(asvc.price * (alink.percent or 0) / 100)
    return total


def _booking_money_split(
    db: Session,
    booking: Booking,
    complaints_by_worker: dict[str, list] | None = None,
) -> dict:
    """Единая модель распределения денег по записи.

    Порядок: цена → материалы → мастера → копилка → владельцы.
    Фикс/процент мастера — общая сумма на услугу и делится между мастерами
    пропорционально их процентам из профиля (новичок с меньшим % получает меньше).
    """
    svc = db.get(Service, booking.service_id) if booking.service_id else None

    # Кэш услуг доп. услуг в рамках одного вызова: избегаем N+1 при пакетной
    # обработке завершённых записей на странице зарплат.
    _asvc_svc_cache: dict[str, Service | None] = {}

    def _asvc_service(asvc):
        if asvc.service_id is None:
            return None
        if asvc.service_id not in _asvc_svc_cache:
            _asvc_svc_cache[asvc.service_id] = db.get(Service, asvc.service_id)
        return _asvc_svc_cache[asvc.service_id]

    rg = _service_resource_group(svc)

    additional_total = sum(
        asvc.price
        for asvc in (booking.additional_services or [])
        if asvc.price_mode != "subtract"
    )
    main_price = max(0, booking.price - additional_total)
    materials_cost = _booking_materials_cost(db, booking)
    net = max(0, main_price - materials_cost)
    # Вычитаемые доп услуги уменьшают базу расчёта зп мастера/копилки/владельцев
    subtract_total = sum(
        asvc.price
        for asvc in (booking.additional_services or [])
        if asvc.price_mode == "subtract"
    )
    split_base = max(0, net - subtract_total)

    master_pay_type = svc.master_pay_type if svc else ""
    master_pay_value = int(svc.master_pay_value or 0) if svc else 0
    piggy_pay_type = svc.piggy_pay_type if svc else ""
    piggy_pay_value = int(svc.piggy_pay_value or 0) if svc else 0
    owner_pay_type = svc.owner_pay_type if svc else ""
    owner_pay_value = int(svc.owner_pay_value or 0) if svc else 0
    owner_split_enabled = svc.owner_split_enabled if svc else True

    complaints_map = complaints_by_worker or {}

    def _compute_master(base: int) -> tuple[dict[str, int], int, int]:
        """Доля мастеров: явные суммы (override/fixed) + сервисный режим/проценты профиля от base.
        Возвращает (master_by_worker, master_total, main_master_total), где main_master_total —
        оплата только мастеров основной услуги (без оплат мастеров доп услуг)."""
        master_by_worker: dict[str, int] = {}
        weighted_workers: list[tuple[str, int]] = []
        explicit_total = 0
        has_service_master_mode = bool(master_pay_type)

        for link in booking.worker_links:
            if link.override_earned is not None:
                amount = int(link.override_earned)
                master_by_worker[link.worker_id] = master_by_worker.get(link.worker_id, 0) + amount
                explicit_total += amount
            elif link.pay_type == "fixed":
                amount = int(link.fixed_amount or 0)
                master_by_worker[link.worker_id] = master_by_worker.get(link.worker_id, 0) + amount
                explicit_total += amount
            elif has_service_master_mode:
                # Вес в сервисном режиме тоже учитывает комплайнты (как и в обычном)
                adjusted_percent = adjusted_booking_percent(
                    link.percent,
                    complaints_map.get(link.worker_id, []),
                    date_value=booking.date,
                    time_value=booking.time,
                    fallback=booking.created_at,
                )
                weighted_workers.append((link.worker_id, max(0, int(adjusted_percent))))
            else:
                percent = adjusted_booking_percent(
                    link.percent,
                    complaints_map.get(link.worker_id, []),
                    date_value=booking.date,
                    time_value=booking.time,
                    fallback=booking.created_at,
                )
                if _is_fixed_master_service_db(db, booking.service_id, booking.service):
                    amount = FIXED_MASTER_EARNED
                else:
                    amount = money_int(base * percent / 100)
                master_by_worker[link.worker_id] = master_by_worker.get(link.worker_id, 0) + amount
                explicit_total += amount

        if has_service_master_mode and weighted_workers:
            if master_pay_type == "fixed":
                total_master_pay = master_pay_value
            elif master_pay_type == "percent":
                total_master_pay = money_int(base * master_pay_value / 100)
            else:
                total_master_pay = 0
            if total_master_pay > 0:
                weight_sum = sum(weight for _, weight in weighted_workers)
                if weight_sum <= 0:
                    share = total_master_pay // len(weighted_workers)
                    remainder = total_master_pay - share * len(weighted_workers)
                    for index, (worker_id, _weight) in enumerate(weighted_workers):
                        amount = share + (1 if index < remainder else 0)
                        master_by_worker[worker_id] = master_by_worker.get(worker_id, 0) + amount
                        explicit_total += amount
                else:
                    allocated = 0
                    for index, (worker_id, weight) in enumerate(weighted_workers):
                        if index == len(weighted_workers) - 1:
                            amount = total_master_pay - allocated
                        else:
                            amount = money_int(total_master_pay * weight / weight_sum)
                            allocated += amount
                        master_by_worker[worker_id] = master_by_worker.get(worker_id, 0) + amount
                        explicit_total += amount

        master_total = explicit_total
        main_master_total = explicit_total

        # Дополнительные услуги (оплата работникам)
        for asvc in (booking.additional_services or []):
            for alink in asvc.worker_links:
                if alink.pay_type == "fixed":
                    amount = int(alink.fixed_amount or 0)
                else:
                    amount = money_int(asvc.price * (alink.percent or 0) / 100)
                master_by_worker[alink.worker_id] = master_by_worker.get(alink.worker_id, 0) + amount
                master_total += amount

        return master_by_worker, master_total, main_master_total

    # Остаток вычитаемых доп услуг (цена − оплата мастеров на них) уходит
    # в копилку ресурсной группы этой услуги (carve-out, не из пула)
    asvc_piggy_deposits: list[dict] = []
    for asvc in (booking.additional_services or []):
        if asvc.price_mode != "subtract":
            continue
        asvc_pays = _asvc_paid_amount(asvc)
        asvc_deposit = max(0, int(asvc.price) - asvc_pays)
        if asvc_deposit > 0:
            asvc_svc = _asvc_service(asvc)
            asvc_rg = _service_resource_group(asvc_svc)
            asvc_piggy_deposits.append(
                {
                    "name": asvc.name,
                    "resource_group": asvc_rg,
                    "amount": asvc_deposit,
                    "label": f"остаток от «{asvc.name}»",
                }
            )

    # Не-вычитаемые доп услуги: остаток (цена − оплата мастеров) →
    # 24% в копилку своей категории, остальное — владельцам (доп. доля 50/50)
    asvc_owner_extra_total = 0
    for asvc in (booking.additional_services or []):
        if asvc.price_mode == "subtract":
            continue
        asvc_pays = _asvc_paid_amount(asvc)
        asvc_remainder = max(0, int(asvc.price) - asvc_pays)
        if asvc_remainder <= 0:
            continue
        asvc_piggy_24 = money_int(asvc_remainder * 24 / 100)
        if asvc_piggy_24 > 0:
            asvc_svc = _asvc_service(asvc)
            asvc_rg = _service_resource_group(asvc_svc)
            asvc_piggy_deposits.append(
                {
                    "name": asvc.name,
                    "resource_group": asvc_rg,
                    "amount": asvc_piggy_24,
                    "label": f"24% от остатка «{asvc.name}»",
                }
            )
        asvc_owner_extra_total += asvc_remainder - asvc_piggy_24

    asvc_piggy_total = sum(d["amount"] for d in asvc_piggy_deposits)

    split_order = [s for s in (svc.split_order or []) if s in ("materials", "master", "piggy", "owners")] if svc else []
    pipeline_mode = bool(split_order) and split_order != ["materials", "master", "piggy", "owners"]

    def _compute_piggy(base: int) -> int:
        if piggy_pay_type == "fixed":
            return piggy_pay_value
        if piggy_pay_type == "percent":
            return money_int(base * piggy_pay_value / 100)
        if piggy_pay_type == "rest":
            return base
        if piggy_pay_type == "none":
            return 0
        if rg in ("detailing", "wash"):
            return money_int(base * 24 / 100)
        return 0

    def _allocate_owners(claimed: int, limit: int) -> tuple[int, dict[str, int]]:
        owner_by_owner: dict[str, int] = {}
        if claimed <= 0 or not owner_split_enabled:
            return 0, owner_by_owner
        owners_total = max(0, min(claimed, limit))
        if owners_total > 0:
            owner_ids = [sid for sid, _, _, _ in PERMANENT_TELEGRAM_OWNERS]
            owners = db.scalars(
                select(StaffUser).where(
                    StaffUser.id.in_(owner_ids),
                    StaffUser.active.is_(True),
                )
            ).all()
            owners_sorted = sorted(owners, key=lambda owner: owner.id)
            if len(owners_sorted) == 1:
                # Один активный владелец получает всю долю
                owner_by_owner[owners_sorted[0].id] = owners_total
            elif len(owners_sorted) >= 2:
                first_share = owners_total // 2
                owner_by_owner[owners_sorted[0].id] = first_share
                owner_by_owner[owners_sorted[1].id] = owners_total - first_share
        return owners_total, owner_by_owner

    if pipeline_mode:
        # Конвейер: каждый шаг забирает свою сумму из текущего остатка
        pool = max(0, main_price - subtract_total)
        pool_start = pool
        materials_deducted = 0
        master_by_worker: dict[str, int] = {}
        master_total = 0
        main_master_total = 0
        piggy_deposit = 0
        owners_total = 0
        owner_by_owner: dict[str, int] = {}
        for index, step in enumerate(split_order):
            if step == "materials":
                materials_deducted = min(materials_cost, pool)
                pool = max(0, pool - materials_deducted)
            elif step == "master":
                master_by_worker, master_total, main_master_total = _compute_master(pool)
                pool = max(0, pool - main_master_total)
            elif step == "piggy":
                piggy_deposit = max(0, min(_compute_piggy(pool), pool))
                pool = max(0, pool - piggy_deposit)
            elif step == "owners":
                is_last = index == len(split_order) - 1
                if asvc_owner_extra_total > 0:
                    # Доп. доля владельцев от остатка не-вычитаемых доп услуг
                    pool += asvc_owner_extra_total
                if owner_pay_type == "percent":
                    claimed = money_int(pool * owner_pay_value / 100)
                elif is_last:
                    claimed = pool
                else:
                    claimed = money_int(pool * 50 / 100)
                owners_total, owner_by_owner = _allocate_owners(claimed, pool)
                pool = max(0, pool - owners_total)
        # Вклады вычитаемых доп услуг — из их carve-out, пул не затрагивают
        piggy_deposit += asvc_piggy_total
        # База отчёта = пул минус фактически ушедшее на шаге материалов
        split_base_report = pool_start - materials_deducted
    else:
        # Классический порядок: материалы → мастера → копилка → владельцы
        split_base_report = split_base
        master_by_worker, master_total, main_master_total = _compute_master(split_base)
        if piggy_pay_type == "rest":
            # Остаток после мастеров не может быть отрицательным (владелец забирает всё)
            main_piggy = max(0, split_base - main_master_total)
        else:
            # Кламп: мастер + копилка не могут вместе превысить базу сплита,
            # иначе при override/fixed > базы копилка получала бы 24% сверху,
            # и распределённая сумма превышала бы чек (AUDIT-06).
            main_piggy = max(0, min(_compute_piggy(split_base), split_base - main_master_total))
        # Вклад доп услуг в копилку — из carve-out цены доп услуги, долю владельцев не уменьшает
        piggy_deposit = main_piggy + asvc_piggy_total
        remaining = split_base - main_master_total - main_piggy
        claimed = remaining if owner_pay_type != "percent" else money_int(remaining * owner_pay_value / 100)
        # Доп. доля владельцев от остатка не-вычитаемых доп услуг (после 24% в копилку)
        if asvc_owner_extra_total > 0:
            remaining += asvc_owner_extra_total
            claimed += asvc_owner_extra_total
        owners_total, owner_by_owner = _allocate_owners(claimed, remaining)

    return {
        "resource_group": rg,
        "main_price": main_price,
        "materials_cost": materials_cost,
        "net": net,
        "split_base": split_base_report,
        "master_total": master_total,
        "master_by_worker": master_by_worker,
        "asvc_master_pay": master_total - main_master_total,
        "asvc_piggy_deposits": asvc_piggy_deposits,
        "asvc_owner_extra": asvc_owner_extra_total,
        "piggy_deposit": piggy_deposit,
        "owners_total": owners_total,
        "owner_by_owner": owner_by_owner,
        "master_pay_type": master_pay_type,
        "piggy_pay_type": piggy_pay_type,
        "has_custom": bool(master_pay_type) or bool(piggy_pay_type) or pipeline_mode,
    }


ASVC_PIGGY_PURPOSE_PREFIX = "Доп. услуга:"


def _process_piggy_bank_for_booking(db: Session, booking: Booking) -> None:

    """Auto-deposit 24% into piggy bank for detailing bookings and repay material withdrawals for any service."""

    print(f"[PIGGY_DEBUG] booking.id={booking.id} booking.service_id={booking.service_id!r} booking.status={booking.status} booking.payment_settled={booking.payment_settled}")

    service = db.get(Service, booking.service_id) if booking.service_id else None

    if service is None:
        print(f"[PIGGY_DEBUG] service is None — no service with id={booking.service_id!r}")
    else:
        print(f"[PIGGY_DEBUG] service.id={service.id} service.name={service.name!r} piggy_pay_type={service.piggy_pay_type!r} piggy_pay_value={service.piggy_pay_value} master_pay_type={service.master_pay_type!r} master_pay_value={service.master_pay_value} owner_split_enabled={service.owner_split_enabled}")

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



    # 2. Deposit into piggy bank (based on service settings, or default 24% for detailing/wash)
    # Сплит с учётом жалоб — ровно как в деталях сплита и расчётке ЗП:
    # фактические проводки не должны расходиться с отображаемым расчётом.
    split = _booking_money_split(
        db, booking, _complaints_by_worker(_load_penalties(db))
    )

    piggy_type = split["piggy_pay_type"]
    piggy_val = split["piggy_deposit"]

    print(f"[PIGGY_DEBUG] piggy_type={piggy_type!r} piggy_val={piggy_val} rg={rg!r} net={split['net']} materials_cost={split['materials_cost']}")

    deposit_amount = piggy_val

    print(f"[PIGGY_DEBUG] deposit_amount={deposit_amount} booking.price={booking.price}")

    # Вклады доп услуг депозитируются отдельными транзакциями в свои группы —
    # из основной суммы их вычитаем, чтобы не задвоить
    asvc_piggy_sum = sum(int(d["amount"]) for d in split.get("asvc_piggy_deposits") or [])
    deposit_amount = max(0, deposit_amount - asvc_piggy_sum)

    print(f"[PIGGY_DEBUG] deposit_amount_after_asvc={deposit_amount} asvc_piggy_sum={asvc_piggy_sum}")

    # Идемпотентность: повторный триггер (например, toggle paymentSettled false→true)
    # не должен дублировать вклады. Main-депозит и вклады доп. услуг проверяем отдельно.
    existing_deposits = db.scalars(
        select(PiggyBankTransaction).where(
            PiggyBankTransaction.booking_id == booking.id,
            PiggyBankTransaction.transaction_type == "deposit_24percent",
        )
    ).all()
    existing_purposes = {t.purpose or "" for t in existing_deposits}
    main_deposit_exists = any(
        not (purpose or "").startswith(ASVC_PIGGY_PURPOSE_PREFIX)
        for purpose in existing_purposes
    )

    if booking.payment_type == "credit":
        print(f"[PIGGY_DEBUG] credit booking {booking.id} — 24% deposit deferred to month settle")
        return

    if deposit_amount > 0 and not main_deposit_exists:

        svc_for_piggy = db.get(Service, booking.service_id) if booking.service_id else None
        piggy_percent_value = int(svc_for_piggy.piggy_pay_value or 0) if svc_for_piggy else 0
        piggy_fixed_value = piggy_percent_value
        piggy_target = (svc_for_piggy.piggy_target or "").strip() if svc_for_piggy else ""
        if piggy_target not in ("detailing", "wash", "general"):
            piggy_target = ""

        if split["piggy_pay_type"] == "fixed":

            purpose = f"Фикс {piggy_fixed_value}₽ в копилку: {booking.service} ({booking.client_name})"

        elif split["piggy_pay_type"] == "percent":

            purpose = f"{piggy_percent_value}% от заказа в копилку: {booking.service} ({booking.client_name})"

        elif split["piggy_pay_type"] == "rest":

            purpose = f"Остаток в копилку: {booking.service} ({booking.client_name})"

        else:

            purpose = f"24% от заказа {booking.service} ({booking.client_name})"

        print(f"[PIGGY_DEBUG] ADDING deposit amount={deposit_amount} purpose={purpose!r} target={piggy_target or rg}")

        db.add(

            PiggyBankTransaction(

                id=f"pb-{uuid4()}",

                booking_id=booking.id,

                amount=deposit_amount,

                transaction_type="deposit_24percent",

                purpose=purpose,

                material_name=None,

                material_cost=None,

                date=date_str,

                resource_group=piggy_target or rg,

                created_at=_now(),

            )

        )

    # 3. Остаток вычитаемых доп услуг → в копилку ресурсной группы услуги

    dep_labels = {"wash": "мойки", "detailing": "детейлинга", "general": "общей копилки"}

    for dep in split.get("asvc_piggy_deposits") or []:

        dep_group = dep.get("resource_group") or rg

        dep_label = dep_labels.get(dep_group, dep_group)

        dep_name = dep.get("label") or f"остаток от «{dep.get('name', 'доп. услуги')}»"

        dep_purpose = f"Доп. услуга: {dep_name} в копилку {dep_label} ({booking.client_name})"

        if dep_purpose in existing_purposes:
            print(f"[PIGGY_DEBUG] SKIP asvc deposit (already exists): {dep_purpose!r}")
            continue

        print(f"[PIGGY_DEBUG] ADDING asvc deposit amount={dep['amount']} purpose={dep_purpose!r} group={dep_group}")

        db.add(

            PiggyBankTransaction(

                id=f"pb-{uuid4()}",

                booking_id=booking.id,

                amount=int(dep["amount"]),

                transaction_type="deposit_24percent",

                purpose=dep_purpose,

                material_name=None,

                material_cost=None,

                date=date_str,

                resource_group=dep_group,

                created_at=_now(),

            )

        )



def _process_owner_profit_share(db: Session, booking: Booking) -> None:

    """Расчёт доли владельцев: цена → материалы → мастера → копилка → остаток владельцам (50/50)."""

    if booking.payment_type == "credit":
        print(f"[PROFIT_DEBUG] credit booking {booking.id} — owner share deferred to month settle")
        return

    # Сплит с учётом жалоб — доли владельцев должны сходиться с расчёткой
    # мастеров и деталями сплита (master + piggy + owners = база).
    split = _booking_money_split(
        db, booking, _complaints_by_worker(_load_penalties(db))
    )

    print(f"[PROFIT_DEBUG] booking.id={booking.id} rg={split['resource_group']} net={split['net']} materials_cost={split['materials_cost']} total_master={split['master_total']} piggy_deposit={split['piggy_deposit']} owners_total={split['owners_total']} owner_split={split['has_custom'] or split['resource_group'] in ('detailing', 'wash')}")

    # Only process for detailing/wash or services with custom piggy/master settings

    if split["resource_group"] not in ("detailing", "wash") and not split["has_custom"]:
        print(f"[PROFIT_DEBUG] early return: rg={split['resource_group']} has_custom={split['has_custom']}")
        return

    if split["owners_total"] <= 0:
        print(f"[PROFIT_DEBUG] owners_total={split['owners_total']} — nothing to distribute")
        return

    # Check if already processed

    existing = db.scalars(

        select(OwnerProfitShare).where(

            OwnerProfitShare.booking_id == booking.id,

        )

    ).all()

    if existing:
        print(f"[PROFIT_DEBUG] already processed: {len(existing)} existing records")
        return

    for owner_id, amt in split["owner_by_owner"].items():

        if amt <= 0:

            continue

        print(f"[PROFIT_DEBUG] creating OwnerProfitShare owner_id={owner_id} amount={amt}")

        db.add(

            OwnerProfitShare(

                id=f"ops-{uuid4()}",

                booking_id=booking.id,

                owner_id=owner_id,

                amount=amt,

                status="pending",

                date=booking.date,

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



    updates = payload.model_dump(exclude_unset=True, exclude={"workers", "materials"})

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

        # ???????????? ???? ?????? ???????????????? ??? ????? serviceId:
        # ???????????? ? ???? ??????? ?? ???????, ???? ?? ?????? ????.
        updates.setdefault("duration", service.duration)
        updates.setdefault("price", int(service.price or 0))

    else:

        service = db.get(Service, booking.service_id) if booking.service_id else None



    if booking.client_id and any(

        field in updates for field in ("clientName", "clientPhone", "car", "plate", "plateType", "referralSource")

    ):

        client = db.get(Client, booking.client_id)

        if client is not None:

            if "clientPhone" in updates:

                client.phone = updates["clientPhone"]

            if "clientName" in updates:

                client.name = updates["clientName"]

            if "car" in updates:

                client.car = updates["car"] or ""

            if "plate" in updates:

                client.plate = updates["plate"] or ""

            if "plateType" in updates:

                client.plate_type = updates["plateType"]

            if "referralSource" in updates:

                client.referral_source = updates["referralSource"] or ""

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
                payType=link.pay_type or "percent",
                fixedAmount=link.fixed_amount,

            )

            for link in booking.worker_links

        ]

    )

    slot_fields_updated = _booking_slot_fields_changed(booking, updates)

    # Активные статусы (BOOKING_ACTIVE_STATUSES) всегда требуют заполненный слот.
    # Изменение слота валидируем только пока он остаётся заполненным: перевод записи
    # в неактивный статус (admin_review/cancelled/no_show/completed) вправе ОЧИСТИТЬ
    # дату/время (фронтенд так делает для детейлинг-заявок «на уточнении») — раньше
    # такой запрос падал с 400 «Укажите дату и время записи», хотя дата/время были
    # видны в форме и намеренно сбрасывались.
    next_requires_slot = _booking_requires_scheduled_slot(next_status)

    has_candidate_slot = bool(next_date and next_time)

    if next_requires_slot and not has_candidate_slot:

        raise HTTPException(

            status_code=status.HTTP_400_BAD_REQUEST,

            detail="Укажите дату и время записи",

        )

    if slot_fields_updated and has_candidate_slot:

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

            "plateType": "plate_type",

            "isOutsource": "is_outsource",

            "outsourceAmount": "outsource_amount",

            "referralSource": "referral_source",

            "isRepeatVisit": "is_repeat_visit",

        }.get(field, field)

        setattr(booking, target_field, value)

    if payload.isOutsource is False:

        booking.is_outsource = False

        booking.outsource_amount = None



    previous_worker_ids = _booking_all_worker_ids(booking)

    if payload.workers is not None:

        if not payload.workers and previous_worker_ids:

            logger.warning(

                "Booking %s: empty workers list provided, clearing %d worker assignments",

                booking.id,

                len(previous_worker_ids),

            )

        _sync_booking_workers(db, booking, next_workers)

    next_materials = (
        payload.materials
        if payload.materials is not None
        else [
            BookingMaterialPayload(
                id=mat.id,
                stockItemId=mat.stock_item_id,
                name=mat.name,
                qty=mat.qty,
                unit=mat.unit,
                unitPrice=mat.unit_price,
            )
            for mat in booking.materials
        ]
    )

    if payload.materials is not None:
        _sync_booking_materials(db, booking, next_materials)


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

        add_block_client = _additional_services_block(booking)
        if add_block_client:
            dop_line = add_block_client.replace("\n", ", ").strip()
            client_notification_parts.append(dop_line)

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

    if booking_just_completed or payment_just_settled:

        print(f"[PROFIT_DEBUG] === CONDITION MET === booking_just_completed={booking_just_completed} payment_just_settled={payment_just_settled} next_payment_settled={next_payment_settled}")

        _write_off_booking_materials(db, booking)

        _process_piggy_bank_for_booking(db, booking)

        _process_owner_profit_share(db, booking)



    db.commit()

    db.refresh(booking)

    current_worker_ids = _booking_all_worker_ids(booking)

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

            booking.started_at = _now()

            _notify_owner_about_worker_booking_event(

                db, booking, worker_name=worker.name, event_label="начал"

            )

            wrote_worker_notifications = True

        if booking.status == "completed":

            booking.completed_at = _now()

            _notify_owner_about_worker_booking_event(

                db, booking, worker_name=worker.name, event_label="завершил"

            )

            _notify_booking_completion_receipt(db, booking, worker_name=worker.name)

            wrote_worker_notifications = True

    if wrote_worker_notifications:

        db.commit()

    _google_sync_booking(db, booking, action="upsert")

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

                detail="Клиент может отменить только новую, подтверждённую, запланированную запись или запись на уточнении",

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

    _google_sync_booking(db, booking, action="delete")

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

    db.commit()

    db.refresh(booking)

    return _booking_payload_for_response(db, booking)





@app.post(

    "/api/bookings/{booking_id}/additional-services",

    response_model=BookingPayload,

)

def add_booking_additional_service(

    booking_id: str,

    payload: AddAdditionalServiceRequest,

    session_data: dict = Depends(_require_session),

    db: Session = Depends(get_db),

) -> BookingPayload:

    if session_data["role"] not in {"admin", "owner", "accountant"}:

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    # Validate: if not outsource, must have at least one worker
    if not payload.isOutsource and not payload.workers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нужно выбрать хотя бы одного мастера или отметить услугу как аутсорс"
        )

    booking = db.scalar(

        select(Booking)

        .options(

            joinedload(Booking.worker_links),

            joinedload(Booking.additional_services).joinedload(BookingAdditionalService.worker_links),

        )

        .where(Booking.id == booking_id)

    )

    if booking is None:

        raise HTTPException(

            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"

        )
    asvc = BookingAdditionalService(

        id=str(uuid4()),

        booking_id=booking_id,

        service_id=payload.serviceId,

        name=payload.name,

        price=payload.price,

        duration=payload.duration,

        status="pending",

        price_mode=payload.priceMode or "add",

        is_outsource=payload.isOutsource,

        outsource_amount=payload.outsourceAmount,

        created_at=_now(),

    )

    if not payload.isOutsource:

        for w in payload.workers:

            asvc.worker_links.append(

                AdditionalServiceWorker(

                    worker_id=w.workerId,

                    worker_name=w.workerName,

                    percent=clamp_worker_percent(w.percent),

                    pay_type=w.payType or "percent",

                    fixed_amount=w.fixedAmount,

                )

            )
    db.add(asvc)
    if not payload.isOutsource:

        _notify_workers_about_additional_service(db, booking, asvc)

    if (payload.priceMode or "add") != "subtract":

        booking.price = (booking.price or 0) + payload.price

    booking.duration = (booking.duration or 0) + payload.duration

    db.commit()

    db.refresh(booking)

    return _booking_payload_for_response(db, booking)





@app.delete(

    "/api/bookings/{booking_id}/additional-services/{additional_service_id}",

    response_model=BookingPayload,

)

def remove_booking_additional_service(

    booking_id: str,

    additional_service_id: str,

    session_data: dict = Depends(_require_session),

    db: Session = Depends(get_db),

) -> BookingPayload:

    if session_data["role"] not in {"admin", "owner", "accountant"}:

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    booking = db.scalar(

        select(Booking)

        .options(

            joinedload(Booking.worker_links),

            joinedload(Booking.additional_services).joinedload(BookingAdditionalService.worker_links),

        )

        .where(Booking.id == booking_id)

    )

    if booking is None:

        raise HTTPException(

            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"

        )

    asvc = db.get(BookingAdditionalService, additional_service_id)

    if asvc is None or asvc.booking_id != booking_id:

        raise HTTPException(

            status_code=status.HTTP_404_NOT_FOUND, detail="Additional service not found"

        )

    if asvc.price_mode != "subtract":
        booking.price = max(0, (booking.price or 0) - asvc.price)

    booking.duration = max(0, (booking.duration or 0) - asvc.duration)

    db.delete(asvc)

    db.commit()

    db.refresh(booking)

    return _booking_payload_for_response(db, booking)


@app.patch(
    "/api/bookings/{booking_id}/additional-services/{additional_service_id}",
    response_model=BookingPayload,
)

def update_booking_additional_service(
    booking_id: str,
    additional_service_id: str,
    payload: UpdateAdditionalServiceRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> BookingPayload:
    if session_data["role"] not in {"admin", "owner", "accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    # Validate: if explicitly setting outsource=false with empty workers, reject
    if payload.isOutsource is False and payload.workers is not None and not payload.workers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нужно выбрать хотя бы одного мастера или отметить услугу как аутсорс"
        )

    booking = db.scalar(
        select(Booking)
        .options(
            joinedload(Booking.worker_links),
            joinedload(Booking.additional_services).joinedload(BookingAdditionalService.worker_links),
        )
        .where(Booking.id == booking_id)
    )
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
        )

    asvc = db.get(BookingAdditionalService, additional_service_id)
    if asvc is None or asvc.booking_id != booking_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Additional service not found"
        )

    if payload.isOutsource is not None:
        asvc.is_outsource = payload.isOutsource
        if payload.isOutsource:
            asvc.worker_links.clear()
    if payload.outsourceAmount is not None:
        asvc.outsource_amount = payload.outsourceAmount

    if payload.workers is not None:
        asvc.worker_links.clear()
        if not asvc.is_outsource:
            for w in payload.workers:
                asvc.worker_links.append(
                    AdditionalServiceWorker(
                        worker_id=w.workerId,
                        worker_name=w.workerName,
                        percent=clamp_worker_percent(w.percent),
                        pay_type=w.payType or "percent",
                        fixed_amount=w.fixedAmount,
                    )
                )

    if payload.name is not None:
        asvc.name = payload.name
    if payload.duration is not None:
        booking.duration = max(0, (booking.duration or 0) - asvc.duration + payload.duration)
        asvc.duration = payload.duration
    if payload.price is not None or payload.priceMode is not None:
        old_effect = 0 if asvc.price_mode == "subtract" else asvc.price
        new_mode = payload.priceMode or asvc.price_mode
        new_price = payload.price if payload.price is not None else asvc.price
        new_effect = 0 if new_mode == "subtract" else new_price
        booking.price = max(0, (booking.price or 0) - old_effect + new_effect)
    if payload.price is not None:
        asvc.price = payload.price
    if payload.priceMode is not None:
        asvc.price_mode = payload.priceMode

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

    _ensure_staff_role(session_data, {"admin", "owner", "accountant"})

    item = StockItem(
        id=f"st-{uuid4()}",
        name=payload.name,
        qty=payload.qty,
        unit=payload.unit,
        unit_price=payload.unitPrice,
        category=payload.category,
        category_id=payload.categoryId,
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

    _ensure_staff_role(session_data, {"admin", "owner", "accountant"})

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

    _ensure_staff_role(session_data, {"admin", "owner", "accountant"})

    item = db.get(StockItem, item_id)

    if item is None:

        raise HTTPException(

            status_code=status.HTTP_404_NOT_FOUND, detail="Stock item not found"

        )

    item.qty = max(0, item.qty - payload.qty)

    total_cost = payload.qty * float(item.unit_price)

    db.add(StockWriteOff(
        id=f"swo-{uuid4()}",
        stock_item_id=item.id,
        stock_item_name=item.name,
        qty=payload.qty,
        unit=item.unit,
        unit_price=item.unit_price,
        total_cost=total_cost,
        source="manual",
        created_at=_now(),
    ))

    db.commit()

    db.refresh(item)

    return _stock_payload(item)


@app.get("/api/stock/write-off-history", response_model=list[StockWriteOffPayload])
def get_write_off_history(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> list[StockWriteOffPayload]:
    _ensure_staff_role(session_data, {"admin", "owner", "accountant"})
    rows = db.scalars(
        select(StockWriteOff).order_by(StockWriteOff.created_at.desc()).limit(200)
    ).all()
    return [
        StockWriteOffPayload(
            id=r.id,
            stockItemId=r.stock_item_id,
            stockItemName=r.stock_item_name,
            qty=r.qty,
            unit=r.unit,
            unitPrice=r.unit_price,
            totalCost=r.total_cost,
            source=r.source,
            bookingId=r.booking_id,
            bookingService=r.booking_service,
            bookingClientName=r.booking_client_name,
            bookingDate=r.booking_date,
            bookingWorkerNames=r.booking_worker_names,
            note=r.note,
            createdAt=r.created_at.isoformat() if r.created_at else "",
        )
        for r in rows
    ]


@app.delete("/api/stock-items/{item_id}", response_model=GenericMessage)

def delete_stock_item(

    item_id: str,

    session_data: dict = Depends(_require_session),

    db: Session = Depends(get_db),

) -> GenericMessage:

    _ensure_staff_role(session_data, {"admin", "owner", "accountant"})

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

        actual_qty = float(submitted_map.get(stock_item.id, stock_item.qty))

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

            "qty": float(item.get("qty") or 0),

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




@app.post("/api/owner/shift-openings", response_model=AdminShiftInspectionPayload)

def open_shift_for_masters(

    payload: OwnerShiftOpeningRequest,

    session_data: dict = Depends(_require_session),

    db: Session = Depends(get_db),

) -> AdminShiftInspectionPayload:

    """Владелец открывает смену для мастеров без фото-чеклиста.

    Запись сразу сохраняется как подтверждённая (владелец — финальный

    решающий), попадает в посещаемость мастеров и общий список смен.

    """

    _ensure_staff_role(session_data, {"owner"})

    owner = db.get(StaffUser, session_data["actorId"])

    if owner is None:

        raise HTTPException(

            status_code=status.HTTP_404_NOT_FOUND, detail="Владелец не найден"

        )

    requested_ids = set(payload.masterIds)

    if not requested_ids:

        raise HTTPException(

            status_code=status.HTTP_400_BAD_REQUEST, detail="Отметьте мастеров на смене"

        )

    masters = db.scalars(

        select(StaffUser)

        .where(StaffUser.role == "worker", StaffUser.active.is_(True))

        .order_by(StaffUser.name.asc())

    ).all()

    selected_ids = {worker.id for worker in masters} & requested_ids

    if not selected_ids:

        raise HTTPException(

            status_code=status.HTTP_400_BAD_REQUEST, detail="Отметьте мастеров на смене"

        )

    masters_payload = [

        {

            "workerId": worker.id,

            "workerName": worker.name,

            "checked": worker.id in selected_ids,

        }

        for worker in masters

    ]

    entries = _admin_shift_inspections_state(db)

    now_iso = _serialize_state_datetime(_now())

    entry = {

        "id": f"owner-shift-{uuid4()}",

        "adminId": owner.id,

        "adminName": owner.name,

        "status": "approved",

        "createdAt": now_iso,

        "reviewedAt": now_iso,

        "floorPhotoUrl": "",

        "clothsReady": False,

        "suppliesChecked": False,

        "note": payload.note.strip(),

        "issueNote": "",

        "ownerDecisionBy": owner.id,

        "supplies": [],

        "masters": masters_payload,

    }

    entries.append(entry)

    _upsert_setting(db, ADMIN_SHIFT_INSPECTIONS_KEY, entries[-200:])

    db.commit()

    return _admin_shift_inspection_payload(entry)





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

    sync_expense_piggy_transaction(db, expense)

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

    # Обратная синхронизация: прямое редактирование расхода бюджета обновляет
    # связанную зарплатную операцию (иначе бюджет и ведомость расходятся).
    linked_entry = db.scalar(
        select(PayrollEntry).where(PayrollEntry.expense_id == expense.id).limit(1)
    )
    if linked_entry is not None and payload.amount is not None:
        linked_entry.amount = abs(expense.amount)

    sync_expense_piggy_transaction(db, expense)

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

            amount=money_int(income.amount),

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

        amount=money_int(income.amount),

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

    # Обратная синхронизация: прямое редактирование дохода бюджета обновляет
    # связанную зарплатную операцию (иначе бюджет и ведомость расходятся).
    # deduction хранит положительную сумму; отрицательная корректировка —
    # отрицательную (доход зеркалится с abs()).
    linked_entry = db.scalar(
        select(PayrollEntry).where(PayrollEntry.income_id == income.id).limit(1)
    )
    if linked_entry is not None and payload.amount is not None:
        if linked_entry.kind == "adjustment":
            linked_entry.amount = -abs(income.amount)
        else:
            linked_entry.amount = abs(income.amount)

    db.commit()

    db.refresh(income)

    return IncomePayload(

        id=income.id,

        amount=money_int(income.amount),

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

    # keep full list for debt aggregation before filtering
    full_all_tx_for_debt = list(all_tx)

    # Filter transactions by date for display only

    if booking_id:

        all_tx = [t for t in all_tx if t.booking_id == booking_id]

    filtered_tx = [t for t in all_tx if _in_range(t.date)]

    transaction_payloads = []

    for t in filtered_tx:

        booking_info = None

        b = None

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

                bookingClientName=b.client_name if b else None,

                bookingService=b.service if b else None,

                bookingDate=b.date if b else None,

                bookingTime=b.time if b else None,

                bookingCar=b.car if b else None,

                bookingPlate=b.plate if b else None,

                bookingPrice=b.price if b else None,

                bookingStatus=b.status if b else None,

                spentById=getattr(t, "spent_by_id", None),

                spentByName=getattr(t, "spent_by_name", None),

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

        shift_count, shift_dates = _compute_shift_attendance(inspections, w.id, sd, ed)

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



    deposits_24 = sum(t.amount for t in all_tx if t.transaction_type == "deposit_24percent" and t.resource_group == "detailing")

    withdrawals = sum(abs(t.amount) for t in all_tx if t.transaction_type in ("material_withdrawal", "other_withdrawal") and t.amount < 0 and t.resource_group == "detailing")

    repayments = sum(t.amount for t in all_tx if t.transaction_type == "material_repayment" and t.resource_group == "detailing")

    net_piggy = deposits_24 + repayments - withdrawals

    # Wash net piggy (from actual transactions, same methodology)
    wash_deposits_24 = sum(t.amount for t in all_tx if t.transaction_type == "deposit_24percent" and t.resource_group == "wash")
    wash_withdrawals = sum(abs(t.amount) for t in all_tx if t.transaction_type in ("material_withdrawal", "other_withdrawal") and t.amount < 0 and t.resource_group == "wash")
    wash_repayments = sum(t.amount for t in all_tx if t.transaction_type == "material_repayment" and t.resource_group == "wash")
    wash_net_piggy = wash_deposits_24 + wash_repayments - wash_withdrawals

    # General piggy bank (deposits targeted to "general")
    general_deposits_24 = sum(t.amount for t in all_tx if t.transaction_type == "deposit_24percent" and t.resource_group == "general")
    general_withdrawals = sum(abs(t.amount) for t in all_tx if t.transaction_type in ("material_withdrawal", "other_withdrawal") and t.amount < 0 and t.resource_group == "general")
    general_repayments = sum(t.amount for t in all_tx if t.transaction_type == "material_repayment" and t.resource_group == "general")
    general_net_piggy = general_deposits_24 + general_repayments - general_withdrawals

    # Manual adjustments (transaction_type == "adjust") — affect every bucket
    detailing_adjustments = sum(t.amount for t in all_tx if t.transaction_type == "adjust" and t.resource_group == "detailing")
    wash_adjustments = sum(t.amount for t in all_tx if t.transaction_type == "adjust" and t.resource_group == "wash")
    general_adjustments = sum(t.amount for t in all_tx if t.transaction_type == "adjust" and t.resource_group == "general")

    remaining = remaining + wash_adjustments
    net_piggy = net_piggy + detailing_adjustments
    wash_net_piggy = wash_net_piggy + wash_adjustments
    general_net_piggy = general_net_piggy + general_adjustments

    combined_balance = remaining + net_piggy + general_net_piggy

    # Weekly archives

    archives_db = db.scalars(

        select(WeeklyArchive).order_by(WeeklyArchive.week_start.desc())

    ).all()



    # Owner profit shares

    owner_ids_for_pb = [sid for sid, _, _, _ in PERMANENT_TELEGRAM_OWNERS]

    all_owner_shares = db.scalars(

        select(OwnerProfitShare).where(

            OwnerProfitShare.owner_id.in_(owner_ids_for_pb),

        ).order_by(OwnerProfitShare.created_at.desc())

    ).all()

    owner_share_items = []

    owner_total_accrued = 0

    owner_total_paid = 0

    for s in all_owner_shares:

        if not _in_range(s.date):

            continue

        b = db.get(Booking, s.booking_id)

        owner_share_items.append(

            OwnerProfitShareItem(

                id=s.id,

                bookingId=s.booking_id,

                service=b.service if b else "",

                clientName=b.client_name if b else "",

                date=s.date,

                price=b.price if b else 0,

                amount=s.amount,

                status=s.status,

                createdAt=s.created_at,

            )

        )

        if s.status == "pending":

            owner_total_accrued += s.amount

        else:

            owner_total_paid += s.amount

    # --- Debts: сумма списаний по каждому кто покупал (spent_by) ---
    # Каждый чек из копилки фиксирует кто покупал, долг вешается именно на него
    # и отражается в зарплате (PayrollEntry deduction). Выбор в форме теперь влияет.
    debt_map: dict[str, dict] = {}
    for tx in full_all_tx_for_debt:
        if tx.transaction_type not in ("material_withdrawal", "other_withdrawal"):
            continue
        if tx.amount >= 0:
            continue
        name = (getattr(tx, "spent_by_name", None) or "").strip()
        sid = getattr(tx, "spent_by_id", None)
        if not name and not sid:
            continue
        key = sid or f"name:{name}"
        if key not in debt_map:
            debt_map[key] = {"spentById": sid, "spentByName": name or (sid or "Неизвестно"), "totalSpent": 0.0, "count": 0}
        if name:
            debt_map[key]["spentByName"] = name
        debt_map[key]["totalSpent"] += abs(float(tx.amount))
        debt_map[key]["count"] += 1
    spender_debts = [
        PiggyBankSpenderDebt(spentById=v["spentById"], spentByName=v["spentByName"], totalSpent=v["totalSpent"], count=v["count"])
        for v in debt_map.values()
    ]
    spender_debts.sort(key=lambda x: x.totalSpent, reverse=True)

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

            washNetPiggy=wash_net_piggy,

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

        combinedBalance=combined_balance,

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

        ownerProfitShares=owner_share_items,

        ownerProfitTotal=owner_total_accrued,

        ownerProfitPaid=owner_total_paid,

        ownerProfitBalance=owner_total_accrued - owner_total_paid,

        spenderDebts=spender_debts,

    )





@app.post("/api/owner/piggy-bank/withdraw", response_model=PiggyBankTransactionPayload)

def piggy_bank_withdraw(

    payload: PiggyBankWithdrawRequest,

    session_data: dict = Depends(_require_session),

    db: Session = Depends(get_db),

) -> PiggyBankTransactionPayload:

    _ensure_staff_role(session_data, {"owner", "accountant"})



    booking: Booking | None = None

    if payload.bookingId:

        booking = db.get(Booking, payload.bookingId)

        if booking is None:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND, detail="Запись не найдена"

            )



    # Копилка-источник: из записи (старое поведение) или выбранная вручную

    if booking is not None:

        service = db.get(Service, booking.service_id) if booking.service_id else None

        rg = _service_resource_group(service)

    else:

        rg = (payload.resourceGroup or "").strip()

        if rg not in {"wash", "detailing", "general"}:

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Укажите копилку списания (мойка или детейлинг) либо запись",

            )



    is_other = payload.withdrawKind == "other"

    transaction_type = "other_withdrawal" if is_other else "material_withdrawal"

    expense_category = "Прочие расходы" if is_other else "Материалы"

    purpose = payload.purpose.strip()

    if not purpose:

        if is_other:

            purpose = f"Прочие расходы: {payload.materialName}"

        elif booking is not None:

            purpose = f"Закупка {payload.materialName} для {booking.service}"

        else:

            purpose = f"Закупка: {payload.materialName}"

    # --- Кто потратил (долг покупателя) ---
    spent_by_id: str | None = None
    spent_by_name: str | None = None
    if payload.spentById:
        staff = db.get(StaffUser, payload.spentById)
        if staff is not None:
            spent_by_id = staff.id
            spent_by_name = staff.name
        elif payload.spentByName:
            spent_by_name = payload.spentByName.strip() or None
        else:
            # если id не найден — считаем что имя передано в spentByName или игнор
            spent_by_name = payload.spentByName.strip() if payload.spentByName else None
    elif payload.spentByName:
        spent_by_name = payload.spentByName.strip() or None
    else:
        # fallback: текущий пользователь (тот кто нажал "снять")
        actor = db.get(StaffUser, session_data.get("actorId"))
        if actor is not None:
            spent_by_id = actor.id
            spent_by_name = actor.name

    transaction = PiggyBankTransaction(

        id=f"pb-{uuid4()}",

        booking_id=payload.bookingId,

        amount=-payload.materialCost,

        transaction_type=transaction_type,

        purpose=purpose,

        material_name=payload.materialName,

        material_cost=payload.materialCost,

        date=payload.date,

        resource_group=rg,

        spent_by_id=spent_by_id,

        spent_by_name=spent_by_name,

        created_at=_now(),

    )

    db.add(transaction)



    expense_note = purpose

    if booking is not None:

        expense_note = (

            f"Закупка для заказа {booking.service} ({booking.client_name}). "

            f"{payload.purpose}".strip()

        )



    expense_prefix = "Прочие расходы" if is_other else "Материалы"

    expense = Expense(

        id=f"e-{uuid4()}",

        title=f"{expense_prefix}: {payload.materialName}",

        amount=payload.materialCost,

        category=expense_category,

        date=payload.date,

        note=expense_note,

        resource_group=rg,

        created_at=_now(),

    )

    db.add(expense)

    # Связываем зеркальную транзакцию копилки с расходом бюджета:
    # иначе при редактировании этого расхода (PATCH /api/expenses/{id})
    # sync_expense_piggy_transaction не найдёт связанную транзакцию и
    # создаст второе зеркало — списание из копилки задвоится.
    transaction.expense_id = expense.id

    # --- Долг в зарплате: потраченная сумма отражается как удержание у того кто покупал ---
    # Если выбран конкретный сотрудник/владелец (spent_by_id) — создаём PayrollEntry deduction,
    # который виден в зарплатной ведомости и уменьшает баланс к выплате.
    if spent_by_id:
        _staff_for_salary = db.get(StaffUser, spent_by_id)
        if _staff_for_salary is not None:
            try:
                payroll_debt = PayrollEntry(
                    id=f"pay-{uuid4()}",
                    worker_id=_staff_for_salary.id,
                    actor_id=session_data.get("actorId", ""),
                    actor_role=session_data.get("role", "owner"),
                    kind="deduction",
                    amount=payload.materialCost,
                    note=f"Списание из копилки ({rg}): {payload.materialName}",
                    created_at=_now(),
                )
                db.add(payroll_debt)
            except Exception:
                pass

    db.commit()

    db.refresh(transaction)



    booking_info = (

        f"{booking.service} — {booking.client_name} ({booking.date})"

        if booking is not None

        else None

    )

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

        bookingClientName=booking.client_name if booking else None,

        bookingService=booking.service if booking else None,

        bookingDate=booking.date if booking else None,

        bookingTime=booking.time if booking else None,

        bookingCar=booking.car if booking else None,

        bookingPlate=booking.plate if booking else None,

        bookingPrice=booking.price if booking else None,

        bookingStatus=booking.status if booking else None,

        spentById=getattr(transaction, "spent_by_id", None),

        spentByName=getattr(transaction, "spent_by_name", None),

    )





@app.post("/api/owner/piggy-bank/adjust", response_model=PiggyBankTransactionPayload)

def piggy_bank_adjust(

    payload: PiggyBankAdjustRequest,

    session_data: dict = Depends(_require_session),

    db: Session = Depends(get_db),

) -> PiggyBankTransactionPayload:

    _ensure_staff_role(session_data, {"owner", "accountant"})



    if payload.amount == 0:

        raise HTTPException(

            status_code=status.HTTP_400_BAD_REQUEST,

            detail="Сумма корректировки не может быть равна нулю",

        )



    date = payload.date or datetime.now().strftime("%d.%m.%Y")



    transaction = PiggyBankTransaction(

        id=f"pb-{uuid4()}",

        booking_id=None,

        amount=payload.amount,

        transaction_type="adjust",

        purpose=payload.purpose.strip() or "Корректировка копилки",

        material_name=None,

        material_cost=None,

        date=date,

        resource_group=payload.resourceGroup,

        created_at=_now(),

    )



    db.add(transaction)

    db.commit()

    db.refresh(transaction)



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

        bookingInfo=None,

        bookingClientName=None,

        bookingService=None,

        bookingDate=None,

        bookingTime=None,

        bookingCar=None,

        bookingPlate=None,

        bookingPrice=None,

        bookingStatus=None,

    )





# ---------------------------------------------------------------------------

# Deposit Endpoints (абонентенты/цех малярка)

# ---------------------------------------------------------------------------

def _deposit_balance(db: Session, client_id: str) -> Decimal:
    return sum(
        (
            t.amount
            for t in db.scalars(
                select(DepositTransaction).where(DepositTransaction.client_id == client_id)
            ).all()
        ),
        Decimal(0),
    )


def _deposit_add_transaction(
    db: Session,
    client_id: str,
    txn_type: str,
    amount: float,
    description: str,
    *,
    date: str,
    booking_id: str | None = None,
    created_by_id: str | None = None,
) -> DepositTransaction:
    amount_dec = Decimal(str(amount))
    balance_after = _deposit_balance(db, client_id) + amount_dec
    txn = DepositTransaction(
        id=f"dep-{uuid4()}",
        client_id=client_id,
        date=date,
        transaction_type=txn_type,
        amount=amount_dec,
        balance_after=balance_after,
        description=description,
        booking_id=booking_id,
        created_by_id=created_by_id,
        created_at=_now(),
    )
    db.add(txn)
    return txn


def _deposit_txn_payload(db: Session, txn: DepositTransaction) -> DepositTransactionPayload:
    car, plate = "", ""
    if txn.booking_id:
        booking = db.get(Booking, txn.booking_id)
        if booking is not None:
            car = booking.car or ""
            plate = booking.plate or ""
    return DepositTransactionPayload(
        id=txn.id,
        clientId=txn.client_id,
        date=txn.date,
        transaction_type=txn.transaction_type,
        amount=txn.amount,
        balance_after=txn.balance_after,
        description=txn.description or "",
        bookingId=txn.booking_id,
        createdById=txn.created_by_id,
        createdAt=txn.created_at,
        car=car,
        plate=plate,
    )


def _deposit_month_label() -> str:
    return datetime.now().strftime("%m.%Y")
def _deposit_month_of(date_str: str) -> str:
    parts = (date_str or "").split(".")
    if len(parts) == 3:
        return f"{parts[1]}.{parts[2]}"
    return ""


def _deposit_month_wash_total_for(db: Session, client_id: str, month: str) -> float:
    total = 0.0
    rows = db.scalars(
        select(Booking).where(
            Booking.client_id == client_id,
            Booking.payment_type == "credit",
            Booking.status == "completed",
            Booking.deleted_at.is_(None),
        )
    ).all()
    for booking in rows:
        if _deposit_month_of(booking.date) == month:
            total += float(booking.price)
    return total


def _deposit_plan_key(value: str | None) -> str:
    plan = (value or "").strip() or "fee"
    return plan if plan in {"fee", "washes", "per_wash", "unlimited"} else "fee"


def _deposit_prev_month(month: str) -> str:
    try:
        m, y = month.split(".")
        yi = int(y) - (1 if int(m) == 1 else 0)
        mi = 12 if int(m) == 1 else int(m) - 1
        return f"{mi:02d}.{yi}"
    except (ValueError, TypeError):
        return ""


def _deposit_month_wash_count_for(db: Session, client_id: str, month: str) -> int:
    rows = db.scalars(
        select(Booking).where(
            Booking.client_id == client_id,
            Booking.payment_type == "credit",
            Booking.status == "completed",
            Booking.deleted_at.is_(None),
        )
    ).all()
    return sum(1 for booking in rows if _deposit_month_of(booking.date) == month)


def _deposit_carried_washes(db: Session, client: Client, month: str) -> int:
    prev = _deposit_prev_month(month)
    row = db.scalar(
        select(DepositMonth).where(
            DepositMonth.client_id == client.id,
            DepositMonth.month == prev,
        )
    )
    return int(row.carryover_washes or 0) if row else 0


def _deposit_wash_limit(db: Session, client: Client, month: str) -> int:
    """Лимит моек по плану 'washes' (включённые + перенесённые)."""
    if _deposit_plan_key(client.deposit_plan or "") != "washes":
        return 0
    included = int(client.deposit_washes_included or 0)
    if not bool(client.deposit_washes_carryover):
        return included
    return included + _deposit_carried_washes(db, client, month)


def _deposit_month_wash_extra(db: Session, client: Client, month: str) -> float:
    """Сумма цен моек сверх включённого лимита по плану 'washes'."""
    if _deposit_plan_key(client.deposit_plan or "") != "washes":
        return 0.0
    limit = _deposit_wash_limit(db, client, month)
    rows = db.scalars(
        select(Booking).where(
            Booking.client_id == client.id,
            Booking.payment_type == "credit",
            Booking.status == "completed",
            Booking.deleted_at.is_(None),
        )
    ).all()
    month_rows = [
        b
        for b in rows
        if _deposit_month_of(b.date) == month
    ]
    if limit <= 0:
        return float(sum(b.price for b in month_rows))
    total = 0.0
    for used, booking in enumerate(
        sorted(month_rows, key=lambda b: (b.date or "", b.completed_at or b.created_at or _now()))
    ):
        if used >= limit:
            total += float(booking.price)
    return total


def _deposit_month_payable(db: Session, client: Client, month: str) -> float:
    """Сколько клиент должен заплатить за месяц по своему типу абонемента."""
    plan = _deposit_plan_key(client.deposit_plan or "")
    subscription = float(client.deposit_monthly or 0)
    wash_total = _deposit_month_wash_total_for(db, client.id, month)
    wash_count = _deposit_month_wash_count_for(db, client.id, month)
    if plan == "per_wash":
        unit = float(client.deposit_wash_price or 0)
        return float(float(wash_count * unit) if unit > 0 else wash_total)
    if plan == "washes":
        limit = _deposit_wash_limit(db, client, month)
        unit = float(client.deposit_wash_price or 0)
        if unit <= 0:
            unit = subscription / limit if limit > 0 else 0.0
        covered = float(min(wash_count, limit)) * unit
        extra = float(max(0, wash_count - limit)) * unit
        return max(0.0, subscription - covered) + extra
    return max(0.0, subscription - wash_total)


def _deposit_months_active(start_month: str) -> int:
    match = re.fullmatch(r"(\d{2})\.(\d{4})", (start_month or "").strip())
    if not match:
        return 0
    start_total = int(match.group(2)) * 12 + int(match.group(1))
    now = datetime.now()
    return max(0, (now.year * 12 + now.month) - start_total + 1)


def _deposit_month_rows(
    db: Session,
    client: Client,
    transactions: list[DepositTransaction],
    closed_months: list[DepositMonth],
) -> list[DepositMonthBreakdown]:
    client_id = client.id
    months: set[str] = {
        _deposit_month_of(t.date) for t in transactions if _deposit_month_of(t.date)
    }
    months.update(row.month for row in closed_months)
    rows: list[DepositMonthBreakdown] = []
    for month in sorted(months, reverse=True):
        month_txns = [t for t in transactions if _deposit_month_of(t.date) == month]
        balance_before = sum(
            t.amount
            for t in transactions
            if _deposit_month_of(t.date) and _deposit_month_of(t.date) < month
        )
        closed_row = next((r for r in closed_months if r.month == month), None)
        rows.append(
            DepositMonthBreakdown(
                month=month,
                washTotal=_deposit_month_wash_total_for(db, client_id, month),
                washCount=_deposit_month_wash_count_for(db, client_id, month),
                subscription=float(client.deposit_monthly or 0),
                washLimit=_deposit_wash_limit(db, client, month),
                carriedWashes=(
                    int(closed_row.carryover_washes or 0)
                    if closed_row
                    else _deposit_carried_washes(db, client, month)
                ),
                topUp=sum(t.amount for t in month_txns if t.transaction_type == "topup"),
                adjust=sum(t.amount for t in month_txns if t.transaction_type == "adjust"),
                closed=closed_row is not None,
                balanceStart=balance_before,
                balanceAfter=balance_before + sum(t.amount for t in month_txns),
            )
        )
    return rows


def _deposit_overview(
    db: Session, client_id: str, client: Client
) -> DepositOverview:
    month = _deposit_month_label()
    wash_total = _deposit_month_wash_total_for(db, client_id, month)
    wash_count = _deposit_month_wash_count_for(db, client_id, month)
    month_subscription = float(client.deposit_monthly or 0)
    month_payable = _deposit_month_payable(db, client, month)
    balance = _deposit_balance(db, client_id)
    plan = _deposit_plan_key(client.deposit_plan or "")
    wash_limit = _deposit_wash_limit(db, client, month)
    carried = _deposit_carried_washes(db, client, month)
    min_balance = int(client.deposit_min_balance or 0)

    transactions = db.scalars(
        select(DepositTransaction)
        .where(DepositTransaction.client_id == client_id)
        .order_by(DepositTransaction.created_at.asc())
    ).all()

    closed_months = db.scalars(
        select(DepositMonth)
        .where(DepositMonth.client_id == client_id)
        .order_by(DepositMonth.month.desc())
    ).all()

    total_topups = sum(t.amount for t in transactions if t.transaction_type == "topup")
    total_wash_debits = sum(
        t.amount for t in transactions if t.transaction_type == "wash_deduction"
    )
    total_wash_count = sum(
        1 for t in transactions if t.transaction_type == "wash_deduction"
    )
    avg_wash = abs(total_wash_debits) / total_wash_count if total_wash_count else 0.0

    return DepositOverview(
        clientId=client.id,
        clientName=client.name,
        depositActive=bool(client.deposit_active),
        balance=balance,
        depositMonthly=int(client.deposit_monthly or 0),
        depositStartMonth=client.deposit_start_month or "",
        depositPlan=plan,
        depositWashesIncluded=int(client.deposit_washes_included or 0),
        depositWashesCarryover=bool(client.deposit_washes_carryover),
        depositMinBalance=min_balance,
        depositBillingDay=int(client.deposit_billing_day or 1),
        depositWashPrice=int(client.deposit_wash_price or 0),
        monthLabel=month,
        monthWashTotal=wash_total,
        monthWashCount=wash_count,
        monthSubscription=month_subscription,
        monthPayable=month_payable,
        planWashLimit=wash_limit,
        washesLeft=max(0, wash_limit - wash_count) if wash_limit else 0,
        carriedWashes=carried,
        needsTopUp=bool(min_balance > 0 and balance < min_balance),
        monthPending=not any(dm.month == month for dm in closed_months),
        stats=DepositStats(
            totalTopUps=float(total_topups),
            totalWashDebits=float(abs(total_wash_debits)),
            totalAdjustments=float(
                sum(
                    t.amount
                    for t in transactions
                    if t.transaction_type in ("adjust", "month_return") and t.amount < 0
                )
            ),
            totalWashCount=total_wash_count,
            avgWashPrice=round(float(avg_wash), 2),
            monthsActive=_deposit_months_active(client.deposit_start_month or ""),
            startMonth=client.deposit_start_month or "",
        ),
        transactions=[_deposit_txn_payload(db, t) for t in reversed(transactions)],
        closedMonths=[
            DepositMonthPayload(
                id=dm.id,
                clientId=dm.client_id,
                month=dm.month,
                subscription=dm.subscription or 0,
                washTotal=dm.wash_total or 0,
                balanceAfter=dm.balance_after or 0,
                carryoverWashes=int(dm.carryover_washes or 0),
                closedAt=dm.closed_at,
            )
            for dm in closed_months
        ],
        monthRows=_deposit_month_rows(db, client, transactions, closed_months),
    )


@app.get("/api/owner/deposits", response_model=list[DepositSummaryItem])
def list_deposit_clients(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> list[DepositSummaryItem]:
    _ensure_staff_role(session_data, {"owner", "admin", "accountant"})
    clients = db.scalars(
        select(Client).where(Client.deleted_at.is_(None)).order_by(Client.name.asc())
    ).all()
    month = _deposit_month_label()
    items: list[DepositSummaryItem] = []
    for c in clients:
        if not c.deposit_active:
            continue
        balance = _deposit_balance(db, c.id)
        min_balance = int(c.deposit_min_balance or 0)
        wash_count = _deposit_month_wash_count_for(db, c.id, month)
        limit = _deposit_wash_limit(db, c, month)
        closed = db.scalar(
            select(DepositMonth).where(
                DepositMonth.client_id == c.id,
                DepositMonth.month == month,
            )
        )
        items.append(
            DepositSummaryItem(
                clientId=c.id,
                clientName=c.name,
                depositMonthly=int(c.deposit_monthly or 0),
                balance=balance,
                active=True,
                depositPlan=_deposit_plan_key(c.deposit_plan or ""),
                monthLabel=month,
                monthWashCount=wash_count,
                planWashLimit=limit,
                washesLeft=max(0, limit - wash_count) if limit else 0,
                needsTopUp=bool(min_balance > 0 and balance < min_balance),
                monthPending=closed is None,
                startMonth=c.deposit_start_month or "",
            )
        )
    return items


@app.patch("/api/owner/deposits/{client_id}", response_model=DepositOverview)
def update_deposit_subscription(
    client_id: str,
    payload: DepositSubscriptionUpdateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> DepositOverview:
    _ensure_staff_role(session_data, {"owner", "admin"})
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    if payload.depositActive is not None:
        client.deposit_active = payload.depositActive
    if payload.depositMonthly is not None:
        client.deposit_monthly = payload.depositMonthly
    if payload.depositStartMonth:
        client.deposit_start_month = payload.depositStartMonth
    if payload.depositPlan:
        client.deposit_plan = payload.depositPlan
    if payload.depositWashesIncluded is not None:
        client.deposit_washes_included = payload.depositWashesIncluded
    if payload.depositWashesCarryover is not None:
        client.deposit_washes_carryover = payload.depositWashesCarryover
    if payload.depositMinBalance is not None:
        client.deposit_min_balance = payload.depositMinBalance
    if payload.depositBillingDay is not None:
        client.deposit_billing_day = payload.depositBillingDay
    if payload.depositWashPrice is not None:
        client.deposit_wash_price = payload.depositWashPrice
    client.updated_at = _now()
    db.commit()
    db.refresh(client)
    return _deposit_overview(db, client_id, client)


@app.post("/api/owner/deposits/{client_id}/topup", response_model=DepositTransactionPayload)
def deposit_topup(
    client_id: str,
    payload: DepositTopUpRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> DepositTransactionPayload:
    _ensure_staff_role(session_data, {"owner", "admin", "accountant"})
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    if not client.deposit_active:
        raise HTTPException(status_code=400, detail="Клиент не является абонентом депозита")
    date = payload.date or datetime.now().strftime("%d.%m.%Y")
    txn = _deposit_add_transaction(
        db,
        client_id,
        "topup",
        float(payload.amount),
        payload.note.strip() or "Пополнение депозита",
        date=date,
    )
    db.commit()
    db.refresh(txn)
    return _deposit_txn_payload(db, txn)


@app.post("/api/owner/deposits/{client_id}/adjust", response_model=DepositOverview)
def deposit_adjust(
    client_id: str,
    payload: DepositAdjustRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> DepositOverview:
    _ensure_staff_role(session_data, {"owner", "admin"})
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    if not client.deposit_active:
        raise HTTPException(status_code=400, detail="Клиент не является абонентом депозита")
    date = payload.date or datetime.now().strftime("%d.%m.%Y")
    _deposit_add_transaction(
        db,
        client_id,
        "adjust",
        float(payload.amount),
        payload.note.strip() or "Корректировка депозита",
        date=date,
    )
    db.commit()
    return _deposit_overview(db, client_id, client)


@app.get("/api/owner/deposits/export-all.xlsx", response_model=None)
def deposit_export_all_excel(
    date_from: str | None = None,
    date_to: str | None = None,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> Response:
    _ensure_staff_role(session_data, {"owner", "admin", "accountant"})
    from .exports import build_deposit_export_all

    export_file = build_deposit_export_all(
        db,
        date_from=date_from,
        date_to=date_to,
    )
    return _download_response(export_file)


@app.post("/api/owner/deposits/export-all.xlsx/telegram", response_model=OwnerExportDeliveryPayload)
def deposit_export_all_excel_telegram(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerExportDeliveryPayload:
    _ensure_staff_role(session_data, {"owner", "admin"})
    from .exports import build_deposit_export_all

    export_file = build_deposit_export_all(db)
    return _send_export_to_telegram(db, session_data["actorId"], export_file)


@app.post("/api/owner/deposits/{client_id}/export.xlsx/telegram", response_model=OwnerExportDeliveryPayload)
def deposit_export_excel_telegram(
    client_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerExportDeliveryPayload:
    _ensure_staff_role(session_data, {"owner", "admin"})
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    from .exports import build_deposit_export

    export_file = build_deposit_export(
        db, client, _deposit_overview(db, client_id, client)
    )
    return _send_export_to_telegram(db, session_data["actorId"], export_file)


@app.get("/api/owner/deposits/{client_id}", response_model=DepositOverview)
def get_deposit_overview(
    client_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> DepositOverview:
    _ensure_staff_role(session_data, {"owner", "admin", "accountant"})
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    return _deposit_overview(db, client_id, client)


@app.post("/api/owner/deposits/{client_id}/washes", response_model=DepositOverview)
def deposit_record_wash(
    client_id: str,
    payload: DepositWashRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> DepositOverview:
    _ensure_staff_role(session_data, {"owner", "admin"})
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    if not client.deposit_active:
        raise HTTPException(status_code=400, detail="Клиент не является абонентом депозита")

    service_name = payload.service.strip() or "Мойка"
    service_id = payload.serviceId or ""
    booking_date = payload.date or datetime.now().strftime("%d.%m.%Y")
    booking_time = payload.time or datetime.now().strftime("%H:%M")

    plan = _deposit_plan_key(client.deposit_plan or "")
    tariff = float(client.deposit_wash_price or 0)
    charge = float(payload.price)
    charge_note = ""
    if plan == "per_wash" and tariff > 0:
        charge = tariff
        charge_note = f" (тариф {int(tariff)} ₽ за мойку)"

    booking = Booking(
        id=f"b-{uuid4()}",
        client_id=client.id,
        client_name=client.name,
        client_phone=client.phone,
        service=service_name,
        service_id=service_id,
        date=booking_date,
        time=booking_time,
        duration=max(1, int(payload.duration or 30)),
        price=int(charge),
        status="completed",
        box="",
        payment_type="credit",
        payment_settled=True,
        notes="Запись через депозит (цех малярка)",
        car=payload.car,
        plate=payload.plate,
        plate_type=payload.plateType or "russian",
        completed_at=_now(),
        source="manual",
    )
    db.add(booking)
    db.flush()

    if payload.workerId:
        db.add(
            BookingWorker(
                booking_id=booking.id,
                worker_id=payload.workerId,
                worker_name=payload.workerName or "Мастер",
                percent=max(0, min(100, int(payload.workerPercent))),
                pay_type="percent",
                fixed_amount=None,
            )
        )

    txn = _deposit_add_transaction(
        db,
        client_id,
        "wash_deduction",
        -charge,
        f"Мойка {payload.plate or payload.car or 'авто'} ({booking_date}){charge_note}",
        date=booking_date,
        booking_id=booking.id,
    )
    txn.created_by_id = session_data["actorId"]

    db.commit()
    return _deposit_overview(db, client_id, client)


@app.post("/api/owner/deposits/{client_id}/settle-month", response_model=DepositOverview)
def deposit_settle_month(
    client_id: str,
    payload: DepositSettleRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> DepositOverview:
    _ensure_staff_role(session_data, {"owner", "admin"})
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    month = payload.month
    existing = db.scalar(
        select(DepositMonth).where(
            DepositMonth.client_id == client_id,
            DepositMonth.month == month,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=400, detail="Месяц уже закрыт")

    wash_total = _deposit_month_wash_total_for(db, client_id, month)
    subscription = float(client.deposit_monthly or 0)

    carryover_washes = 0
    if (
        _deposit_plan_key(client.deposit_plan or "") == "washes"
        and bool(client.deposit_washes_carryover)
    ):
        limit = _deposit_wash_limit(db, client, month)
        used = _deposit_month_wash_count_for(db, client_id, month)
        carryover_washes = max(0, limit - used)

    db.add(
        DepositMonth(
            id=f"dm-{uuid4()}",
            client_id=client_id,
            month=month,
            subscription=subscription,
            wash_total=wash_total,
            balance_after=_deposit_balance(db, client_id),
            carryover_washes=carryover_washes,
            closed_at=_now(),
            created_at=_now(),
        )
    )

    # Возврат моек в копилку мойки (24% не вносился при мойке — возвращаем выручку целиком)
    # Планы: fee/unlimited — возврат всей суммы; washes — только включённые мойки
    # (сверх лимита остаются списанными); per_wash — возврат не делается (оплата за мойку).
    refund = wash_total
    if _deposit_plan_key(client.deposit_plan or "") == "per_wash":
        refund = 0.0
    elif _deposit_plan_key(client.deposit_plan or "") == "washes":
        refund = max(0.0, wash_total - _deposit_month_wash_extra(db, client, month))

    if refund > 0:
        db.add(
            PiggyBankTransaction(
                id=f"pb-{uuid4()}",
                booking_id=None,
                amount=refund,
                transaction_type="deposit_return",
                purpose=f"Депозит {client.name}: возврат моек за {month} в копилку мойки",
                material_name=None,
                material_cost=None,
                date=datetime.now().strftime("%d.%m.%Y"),
                resource_group="wash",
                created_at=_now(),
            )
        )
        _deposit_add_transaction(
            db,
            client_id,
            "month_return",
            refund,
            f"Закрытие {month}: возврат моек в копилку",
            date=datetime.now().strftime("%d.%m.%Y"),
        )

    db.commit()
    return _deposit_overview(db, client_id, client)


@app.get("/api/owner/deposits/{client_id}/export.xlsx")
def deposit_export_excel(
    client_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> Response:
    _ensure_staff_role(session_data, {"owner", "admin", "accountant"})
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    from .exports import build_deposit_export

    export_file = build_deposit_export(
        db, client, _deposit_overview(db, client_id, client)
    )
    return _download_response(export_file)


# ---------------------------------------------------------------------------

# Wallet Endpoints

# ---------------------------------------------------------------------------





def _week_bounds() -> tuple[date, date]:

    today = date.today()

    saturday = today - timedelta(days=(today.weekday() - 5) % 7)

    friday = saturday + timedelta(days=6)

    return saturday, friday


def _dmy(d: date) -> str:

    return f"{d.day:02d}.{d.month:02d}.{d.year}"


def _dmy_to_date(s: str) -> date:

    return parse_dmy(s)


def _stored_date_in_range(value: str, date_from: date, date_to: date) -> bool:
    try:
        parsed = parse_dmy(value)
    except (TypeError, ValueError):
        return False
    return date_from <= parsed <= date_to





@app.get("/api/owner/wallet", response_model=WalletResponse)

def get_wallet(
    date_from: str | None = None,
    date_to: str | None = None,

    session_data: dict = Depends(_require_session),

    db: Session = Depends(get_db),

) -> WalletResponse:

    _ensure_staff_role(session_data, {"owner", "accountant"})



    saturday, friday = _week_bounds()
    if date_from:
        saturday = _dmy_to_date(_parse_booking_date_param(date_from))
    if date_to:
        friday = _dmy_to_date(_parse_booking_date_param(date_to))
    try:
        validate_range(saturday, friday)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    week_start_str = _dmy(saturday)

    week_end_str = _dmy(friday)

    week_start_iso = saturday.isoformat()

    week_end_iso = friday.isoformat()

    # DD.MM.YYYY -> YYYYMMDD ????? ? SQL (AUDIT-07): ?? ????? ??? ???????
    # ? ?????? ???? ??????? ?? ??????. ???????? ? SQLite ? PostgreSQL.
    def _stored_date_iso_expr(column):
        # "||" ? ????????????; "+" ?? ????????? ???????? ? SQLite ??? ?? ????? ?????
        return (
            func.substr(column, 7, 4)
            .op("||")(func.substr(column, 4, 2))
            .op("||")(func.substr(column, 1, 2))
        )

    week_iso_min = min(week_start_iso, week_end_iso).replace("-", "")
    week_iso_max = max(week_start_iso, week_end_iso).replace("-", "")

    incomes = db.scalars(
        select(Income)
        .where(
            Income.date.is_not(None),
            _stored_date_iso_expr(Income.date) >= week_iso_min,
            _stored_date_iso_expr(Income.date) <= week_iso_max,
        )
        .order_by(Income.date.desc(), Income.created_at.desc())
    ).all()

    expenses = db.scalars(
        select(Expense)
        .where(
            Expense.date.is_not(None),
            _stored_date_iso_expr(Expense.date) >= week_iso_min,
            _stored_date_iso_expr(Expense.date) <= week_iso_max,
        )
        .order_by(Expense.date.desc(), Expense.created_at.desc())
    ).all()

    completed_bookings = db.scalars(
        select(Booking).where(
            Booking.status == "completed",
            Booking.deleted_at.is_(None),
            Booking.date.is_not(None),
            _stored_date_iso_expr(Booking.date) >= week_iso_min,
            _stored_date_iso_expr(Booking.date) <= week_iso_max,
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

                amount=money_int(i.amount),

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

                amount=money_int(e.amount),

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



@app.get(

    "/api/worker/calendar",

    response_model=list[WorkerCalendarBookingPayload],

)

def get_worker_calendar_bookings(

    session_data: dict = Depends(_require_session),

    db: Session = Depends(get_db),

) -> list[WorkerCalendarBookingPayload]:

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



    bookings = db.scalars(

        select(Booking)

        .options(selectinload(Booking.worker_links))

        .where(

            Booking.deleted_at.is_(None),

            Booking.status != "cancelled",

        )

        .order_by(Booking.date.asc(), Booking.time.asc())

    ).all()



    return [

        WorkerCalendarBookingPayload(

            id=booking.id,

            clientName=_safe_text(booking.client_name),

            service=_safe_text(booking.service),

            serviceId=booking.service_id or "",

            date=_safe_text(booking.date),

            time=_safe_text(booking.time),

            duration=int(booking.duration or 0),

            status=booking.status,

            box=_safe_text(booking.box),

            workers=[

                BookingWorkerPayload(

                    workerId=link.worker_id,

                    workerName=_safe_text(link.worker_name),

                )

                for link in booking.worker_links

            ],

            car=_safe_text(booking.car) or None,

            plate=_safe_text(booking.plate) or None,

            source=getattr(booking, "source", None) or None,

            referralSource=getattr(booking, "referral_source", None) or "",

            isRepeatVisit=bool(getattr(booking, "is_repeat_visit", False)),

        )

        for booking in bookings

    ]




_SEARCH_LATIN_TO_CYRILLIC = {
    "a": "а",
    "b": "в",
    "c": "с",
    "e": "е",
    "h": "н",
    "k": "к",
    "m": "м",
    "o": "о",
    "p": "р",
    "t": "т",
    "x": "х",
    "y": "у",
}


def _search_text_normalize(value: str) -> str:
    return value.strip().lower().replace(" ", "").replace("-", "")


def _search_plate_normalize(value: str) -> str:
    return "".join(_SEARCH_LATIN_TO_CYRILLIC.get(char, char) for char in _search_text_normalize(value))


@app.get(
    "/api/worker/cars/search",
    response_model=list[WorkerCalendarBookingPayload],
)
def search_worker_cars(
    q: str = "",
    date: str | None = None,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> list[WorkerCalendarBookingPayload]:
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

    query = (
        select(Booking)
        .options(selectinload(Booking.worker_links))
        .where(
            Booking.deleted_at.is_(None),
            Booking.status != "cancelled",
        )
    )

    normalized = _search_text_normalize(q)
    if normalized:
        pass
    elif date and date.strip():
        query = query.where(Booking.date == date.strip())
    else:
        query = query.where(Booking.date == datetime.now().strftime("%d.%m.%Y"))

    bookings = db.scalars(
        query.order_by(Booking.date.desc(), Booking.time.desc()).limit(500)
    ).all()

    if normalized:
        plate_pattern = _search_plate_normalize(normalized)
        bookings = [
            booking
            for booking in bookings
            if plate_pattern in _search_plate_normalize(booking.plate or "")
            or normalized in _search_text_normalize(booking.car or "")
            or normalized in _search_text_normalize(booking.client_name or "")
        ]

    return [
        WorkerCalendarBookingPayload(
            id=booking.id,
            clientName=_safe_text(booking.client_name),
            service=_safe_text(booking.service),
            serviceId=booking.service_id or "",
            date=_safe_text(booking.date),
            time=_safe_text(booking.time),
            duration=int(booking.duration or 0),
            status=booking.status,
            box=_safe_text(booking.box),
            workers=[
                BookingWorkerPayload(
                    workerId=link.worker_id,
                    workerName=_safe_text(link.worker_name),
                )
                for link in booking.worker_links
            ],
            car=_safe_text(booking.car) or None,
            plate=_safe_text(booking.plate) or None,
            referralSource=getattr(booking, "referral_source", None) or "",
            isRepeatVisit=bool(getattr(booking, "is_repeat_visit", False)),
        )
        for booking in bookings
    ]




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

        # Группа ресурсов сохраняется как запрошено, без привязки к категории.

        service.resource_group = _resource_group_key(item.resourceGroup)

        service.wash_type = item.washType or ""

        service.description = item.desc

        service.active = item.active

        service.material_consumption = item.materialConsumption

        service.is_fixed_master = item.isFixedMaster
        service.master_pay_type = item.masterPayType
        service.master_pay_value = item.masterPayValue
        service.piggy_pay_type = item.piggyPayType
        service.piggy_pay_value = item.piggyPayValue
        service.owner_pay_type = item.ownerPayType
        service.owner_pay_value = item.ownerPayValue
        service.owner_split_enabled = item.ownerSplitEnabled
        service.materials = item.materials or []
        service.split_order = item.splitOrder or []
        service.piggy_target = item.piggyTarget or ""

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






def _google_callback_uri(request: Request) -> str:
    """Google OAuth redirect URI на основе хоста текущего запроса.

    Используется как fallback, когда redirect_uri не задан ни в env, ни в БД
    (владелец подключает календарь через UI с того же хоста, где крутится API).
    """
    base = str(request.base_url).rstrip("/")
    return f"{base}/api/owner/integrations/google/callback"


@app.get("/api/owner/integrations/google/auth-url")
def get_google_calendar_auth_url(
    request: Request,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> dict:
    """Вернуть OAuth-URL для подключения Google Calendar владельца."""
    _ensure_staff_role(session_data, {"owner"})
    if not is_configured(settings, db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar не настроен на сервере (нет GOOGLE_CALENDAR_CLIENT_ID/SECRET)",
        )
    state = secrets.token_urlsafe(32)
    _upsert_setting(db, "google_calendar_oauth_state", {"state": state})
    db.commit()
    auth_url = build_auth_url(
        settings, state, db, fallback_redirect_uri=_google_callback_uri(request)
    )
    return {"authUrl": auth_url}


def _google_callback_page(ok: bool, text: str, hint: str = "") -> HTMLResponse:
    """Простая HTML-страница результата Google OAuth для браузера владельца.

    После OAuth Google редиректит браузер на callback, и голый JSON
    выглядит как «пустое окно». Страница объясняет, что делать дальше.
    """

    def esc(value: str) -> str:
        return (
            value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        )

    color = "#22C55E" if ok else "#EF4444"
    icon = "✓" if ok else "✕"
    lines = [esc(text)]
    if hint:
        lines.append(esc(hint))
    body = "<br>".join(lines)
    return HTMLResponse(
        f"""<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Подключение Google Календаря</title></head>
<body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
background:#0F172A;display:flex;align-items:center;justify-content:center;min-height:100vh">
<div style="background:#1E293B;border-radius:16px;padding:32px;max-width:380px;width:88%;
text-align:center;color:#E2E8F0">
<div style="font-size:40px;color:{color}">{icon}</div>
<div style="font-size:17px;font-weight:600;margin:14px 0 8px">{body}</div>
<div style="font-size:13px;color:#94A3B8;margin-top:12px">Можно закрыть это окно и вернуться в Telegram.</div>
</div></body></html>"""
    )


def _state_is_pending_invite(db: Session, state: str) -> bool:
    """Проверить, что OAuth-state принадлежит приглашению (не потребляя его).

    Приглашение расходуется позже, после успешного exchange_code, — здесь
    только валидация, что state из ссылки-приглашения, а не подделка.
    """
    if not state:
        return False
    invites = _setting(db, GOOGLE_CALENDAR_INVITES_KEY, {})
    items = invites.get("invites") if isinstance(invites, dict) else None
    return bool(
        isinstance(items, list)
        and any(isinstance(i, dict) and i.get("state") == state for i in items)
    )


@app.get("/api/owner/integrations/google/callback")
def google_calendar_callback(
    code: str = "",
    state: str = "",
    error: str | None = None,
    request: Request = None,  # type: ignore[assignment]  # FastAPI инжектит Request
    db: Session = Depends(get_db),
) -> Response:
    """Callback от Google после OAuth. Сохраняет токены и включает интеграцию.

    Endpoint публичный (браузер перенаправляется Google), поэтому защищаемся
    параметром state, сохранённым при запросе auth-url. Для браузера отдаём
    человекочитаемую HTML-страницу, для остальных клиентов — JSON.
    """
    saved = _setting(db, "google_calendar_oauth_state", {})
    error_text: str | None = None
    if error:
        error_text = f"google_error:{error}"
    elif not code:
        error_text = "missing_code"
    elif not _state_is_pending_invite(db, state) and (saved or {}).get("state") != state:
        # state может быть либо от владельца (/auth-url), либо от приглашения.
        error_text = "state_mismatch"
    elif not is_configured(settings, db):
        error_text = "not_configured"

    tokens: dict | None = None
    if error_text is None:
        try:
            tokens = exchange_code(settings, code, db)
        except Exception:
            logger.exception("Google OAuth token exchange failed")
            error_text = "exchange_failed"

    want_html = bool(request) and "text/html" in (request.headers.get("accept", "") or "").lower()
    if error_text is not None:
        if want_html:
            return _google_callback_page(
                False,
                "Не удалось подключить Google Календарь",
                f"Код ошибки: {error_text}. Вернитесь в Telegram и попробуйте ещё раз.",
            )
        return {"ok": False, "error": error_text}

    account_email = extract_account_email(tokens)
    # id_token в хранилище не нужен — email уже извлечён.
    storable_tokens = {
        key: value for key, value in dict(tokens or {}).items() if key != "id_token"
    }
    invite_label = consume_invite(db, state) if state else None
    if invite_label:
        # Подключение приглашённого человека (ссылка-приглашение владельца).
        connection = {
            "id": f"gc-{uuid4()}",
            "name": str(invite_label.get("label") or "Участник"),
            "email": account_email,
            "tokens": storable_tokens,
            "sync_token": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    else:
        # Обычный поток владельца: обновляем его подключение (или создаём).
        connection = get_connection(db, OWNER_CONNECTION_ID) or {
            "id": OWNER_CONNECTION_ID,
            "name": "Владелец",
            "email": "",
            "tokens": {},
            "sync_token": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        connection["tokens"] = storable_tokens
        if account_email:
            connection["email"] = account_email
    upsert_connection(db, connection)

    # Сразу после подключения выполняем первый pull: события из Google
    # появляются в CRM (source="google"), ошибки не блокируют OAuth.
    try:
        pull_calendar_changes(db, settings)
    except Exception:
        logger.exception("Initial Google Calendar pull after OAuth failed")

    integrations = _merge_setting_dict(
        _setting(db, "owner_integrations", {}),
        {"telegram": True, "yookassa": False, "amoCrm": False, "googleCalendar": False},
    )
    integrations["googleCalendar"] = bool(list_connections(db))
    _upsert_setting(db, "owner_integrations", integrations)
    db.commit()
    if want_html:
        return _google_callback_page(
            True,
            "Google Календарь подключён!",
            "Синхронизация уже запущена. Вернитесь в Telegram.",
        )
    return {"ok": True}


@app.post("/api/owner/integrations/google/disconnect")
def disconnect_google_calendar(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> dict:
    """Отключить Google Calendar полностью: удалить все подключения и флаг."""
    _ensure_staff_role(session_data, {"owner"})
    clear_tokens(db)
    clear_invites(db)
    integrations = _merge_setting_dict(
        _setting(db, "owner_integrations", {}),
        {"telegram": True, "yookassa": False, "amoCrm": False, "googleCalendar": False},
    )
    integrations["googleCalendar"] = False
    _upsert_setting(db, "owner_integrations", integrations)
    db.commit()
    return {"ok": True}


@app.get("/api/owner/integrations/google/status")
def get_google_calendar_status(
    request: Request,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> dict:
    """Статус готовности Google Calendar: настроен ли OAuth-клиент и откуда.

    source: "db" — учётные данные введены владельцем через UI,
            "env" — заданы переменными окружения на сервере,
            None — не настроено (фронт показывает мастер подключения).
    redirectUri — куда Google должен вернуть после OAuth (нужно вписать
    в Google Cloud Console как Authorized redirect URI).
    connections — список подключённых календарей людей (без токенов).
    """
    _ensure_staff_role(session_data, {"owner"})
    creds = load_credentials(db)
    db_configured = bool(
        creds.get("client_id") and creds.get("client_secret")
    )
    env_configured = is_configured(settings)
    redirect_uri = (
        str(creds.get("redirect_uri") or "").strip()
        or (settings.google_calendar_redirect_uri or "").strip()
        or _google_callback_uri(request)
    )
    connections = list_connections(db)
    return {
        "configured": env_configured or db_configured,
        "source": "db" if db_configured else ("env" if env_configured else None),
        "redirectUri": redirect_uri,
        "hasDbCredentials": db_configured,
        "connections": connections,
        "connectionsCount": len(connections),
    }


@app.post("/api/owner/integrations/google/invites")
def create_google_calendar_invite(
    payload: GoogleInvitePayload,
    request: Request,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> dict:
    """Создать ссылку-приглашение для подключения календаря другого человека.

    Владелец указывает имя человека, получает OAuth-ссылку и пересылает её
    (Telegram и т.п.). Человек открывает ссылку, входит в СВОЙ Google-аккаунт
    и подтверждает доступ — после этого его календарь появляется в списке
    подключённых и получает все записи.
    """
    _ensure_staff_role(session_data, {"owner"})
    if not is_configured(settings, db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar не настроен на сервере (нет GOOGLE_CALENDAR_CLIENT_ID/SECRET)",
        )
    label = payload.label.strip()[:120]
    if not label:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Укажите имя человека",
        )
    state = secrets.token_urlsafe(32)
    create_invite(db, label, state)
    auth_url = build_auth_url(
        settings, state, db, fallback_redirect_uri=_google_callback_uri(request)
    )
    db.commit()
    return {"inviteUrl": auth_url, "label": label, "state": state}


@app.delete("/api/owner/integrations/google/connections/{connection_id}")
def delete_google_calendar_connection(
    connection_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> dict:
    """Отключить один календарь (человека), не трогая остальные подключения."""
    _ensure_staff_role(session_data, {"owner"})
    removed = delete_connection(db, connection_id)
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подключение не найдено",
        )
    remaining = list_connections(db)
    if not remaining:
        integrations = _merge_setting_dict(
            _setting(db, "owner_integrations", {}),
            {"telegram": True, "yookassa": False, "amoCrm": False, "googleCalendar": False},
        )
        integrations["googleCalendar"] = False
        _upsert_setting(db, "owner_integrations", integrations)
    db.commit()
    return {"ok": True, "connectionsCount": len(remaining)}


@app.put("/api/owner/integrations/google/credentials")
def save_google_calendar_credentials(
    payload: GoogleCredentialsPayload,
    request: Request,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> dict:
    """Сохранить учётные данные Google OAuth, введённые владельцем через UI.

    Позволяет подключить Google Calendar без правки .env: client_id/secret
    хранятся в БД и перекрывают env при построении OAuth-запросов.
    """
    _ensure_staff_role(session_data, {"owner"})
    client_id = payload.clientId.strip()
    client_secret = payload.clientSecret.strip()
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Укажите Client ID и Client Secret",
        )
    redirect_uri = payload.redirectUri.strip() or _google_callback_uri(request)
    save_credentials(
        db,
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
        },
    )
    db.commit()
    return {"ok": True, "source": "db", "redirectUri": redirect_uri}


@app.delete("/api/owner/integrations/google/credentials")
def delete_google_calendar_credentials(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> dict:
    """Удалить учётные данные Google OAuth, введённые через UI."""
    _ensure_staff_role(session_data, {"owner"})
    clear_credentials(db)
    db.commit()
    return {"ok": True}


@app.post("/api/owner/integrations/google/sync")
def sync_google_calendar_now(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> dict:
    """Ручная обратная синхронизация «Google Calendar -> CRM».

    Импортирует события, созданные/изменённые в Google, в записи CRM
    (source="google"), переносит правки времени в существующие записи и
    отменяет записи, события которых удалены. Возвращает статистику и
    время последней синхронизации.
    """
    _ensure_staff_role(session_data, {"owner"})
    if not is_configured(settings, db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar не настроен на сервере (нет GOOGLE_CALENDAR_CLIENT_ID/SECRET)",
        )
    result = pull_calendar_changes(db, settings)
    db.commit()
    last = _setting(db, GOOGLE_CALENDAR_LAST_SYNC_KEY, {})
    return {**result, "lastSyncAt": last.get("at")}


@app.get("/api/cron/google-sync")
def run_google_calendar_sync_cron(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Cron-эндпоинт Vercel: обратная синхронизация Google Calendar -> CRM.

    Вызывается каждые 5 минут (vercel.json -> crons). Защищён CRON_SECRET:
    запрос без секрета получает 503/401, как и остальные cron-эндпоинты.
    """
    if not settings.cron_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRON_SECRET is not configured",
        )
    if not authorization or not hmac_mod.compare_digest(authorization, f"Bearer {settings.cron_secret}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid cron secret",
        )
    result = pull_calendar_changes(db, settings)
    db.commit()
    return result


@app.get("/api/cron/reminders", response_model=OwnerReminderDispatchPayload)
def run_reminders_cron(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> OwnerReminderDispatchPayload:
    """Cron-роут Vercel: напоминания о ближайших записях и повторных визитах.

    Требует CRON_SECRET (см. vercel.json -> crons). Без настроенного секрета
    возвращает 503/401, чтобы не обрабатывать посторонние cron-запросы.
    """
    if not settings.cron_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRON_SECRET is not configured",
        )
    if not authorization or not hmac_mod.compare_digest(authorization, f"Bearer {settings.cron_secret}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid cron secret",
        )
    dispatch = _dispatch_booking_reminders(db)
    return_visits = _dispatch_return_visit_reminders(db)
    db.commit()
    return OwnerReminderDispatchPayload(
        message=dispatch.message,
        targetDate=dispatch.targetDate,
        clientReminders=dispatch.clientReminders + return_visits,
        workerReminders=dispatch.workerReminders,
        telegramDelivered=dispatch.telegramDelivered + return_visits,
    )


@app.post("/api/owner/inactive-clients/remind-admin", response_model=GenericMessage)
def remind_admin_about_inactive_clients(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    """Сообщает администратору о клиентах без завершённых визитов дольше двух
    недель: уведомление в CRM + Telegram админу
    (test_owner_can_notify_admin_about_inactive_clients)."""
    _ensure_staff_role(session_data, {"owner", "admin"})
    latest_by_client: dict[str, Booking] = {}
    for booking in db.scalars(
        select(Booking)
        .where(Booking.status == "completed", Booking.client_id.is_not(None))
        .order_by(Booking.created_at.desc())
    ):
        if booking.client_id and booking.client_id not in latest_by_client:
            latest_by_client[booking.client_id] = booking
    stale_names: list[str] = []
    for client_id, booking in latest_by_client.items():
        client = db.get(Client, client_id)
        if client is None or client.deleted_at is not None:
            continue
        last_visit = _parse_booking_datetime(booking.date, booking.time)
        if last_visit is None:
            continue
        if last_visit > datetime.now() - timedelta(days=14):
            continue
        stale_names.append(client.name or client_id)
    if not stale_names:
        return GenericMessage(message="Неактивных клиентов нет")
    listing = "; ".join(stale_names[:10])
    admin_message = (
        f"Неактивные клиенты (не были более двух недель): {listing}. "
        "Стоит напомнить о себе."
    )
    admins = db.scalars(
        select(StaffUser).where(
            StaffUser.role == "admin",
            StaffUser.active.is_(True),
        )
    ).all()
    for admin in admins:
        db.add(
            Notification(
                id=f"n-{uuid4()}",
                recipient_role="admin",
                recipient_id=admin.id,
                message=admin_message,
                read=False,
                created_at=_now(),
            )
        )
        if admin.telegram_chat_id:
            send_telegram_message(admin.telegram_chat_id, admin_message)
    db.commit()
    return GenericMessage(message="Админу отправлено напоминание")


@app.post("/api/owner/reminders/dispatch", response_model=OwnerReminderDispatchPayload)
def dispatch_owner_booking_reminders(
    payload: OwnerReminderDispatchRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> OwnerReminderDispatchPayload:
    _ensure_staff_role(session_data, {"owner", "admin"})
    dispatch = _dispatch_booking_reminders(db, target_date=payload.targetDate)
    return_visits = _dispatch_return_visit_reminders(db)
    db.commit()
    return OwnerReminderDispatchPayload(
        message=dispatch.message,
        targetDate=dispatch.targetDate,
        clientReminders=dispatch.clientReminders + return_visits,
        workerReminders=dispatch.workerReminders,
        telegramDelivered=dispatch.telegramDelivered + return_visits,
    )


@app.get("/api/cron/reports")
def run_reports_cron(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Cron-роут Vercel: ежедневные сводные отчёты владельцам с Telegram.

    Требует CRON_SECRET. Для каждого владельца с привязанным Telegram
    отправляет daily-отчёт по сегментам wash и detailing; сбой одного
    получателя не прерывает рассылку остальным.
    """
    if not settings.cron_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRON_SECRET is not configured",
        )
    if not authorization or not hmac_mod.compare_digest(authorization, f"Bearer {settings.cron_secret}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid cron secret",
        )
    recipients = _all_owner_telegram_recipients(db)
    sent = 0
    failed = 0
    seen_owner_ids: set[str] = set()
    for recipient in recipients:
        if recipient.id in seen_owner_ids:
            continue
        seen_owner_ids.add(recipient.id)
        for segment in ("wash", "detailing"):
            try:
                report = _owner_summary_report(db, recipient.id, "daily", segment)
                export_file = _owner_summary_export_file(db, recipient.id, "daily", segment)
                _send_owner_summary_report(db, recipient.id, report, export_file)
                sent += 1
            except Exception:
                logger.exception(
                    "Daily report delivery failed for owner %s segment %s",
                    recipient.id,
                    segment,
                )
                failed += 1
    db.commit()
    return {"owners": len(seen_owner_ids), "reportsSent": sent, "reportsFailed": failed}


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






@app.get("/api/admin/workers/payroll", response_model=list[WorkerPayload])
def get_admin_workers_payroll(
    period: str = "month",
    date_from: str | None = None,
    date_to: str | None = None,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> list[WorkerPayload]:
    _ensure_staff_role(session_data, {"admin", "accountant", "owner"})
    valid_periods = {"day", "week", "month", "all", "custom"}
    if period not in valid_periods:
        raise HTTPException(status_code=400, detail="Invalid period")
    if period == "custom":
        if not date_from or not date_to:
            raise HTTPException(status_code=400, detail="date_from and date_to are required for custom period")
        # Convert YYYY-MM-DD from frontend to DD.MM.YYYY
        date_from = _parse_booking_date_param(date_from)
        date_to = _parse_booking_date_param(date_to)
    else:
        date_from, date_to = _salary_date_range(period, custom_from=date_from, custom_to=date_to)
    date_from_key = date_from[6:10] + date_from[3:5] + date_from[0:2]
    date_to_key = date_to[6:10] + date_to[3:5] + date_to[0:2]
    workers_list = db.scalars(
        select(StaffUser)
        .where(or_(StaffUser.role == "worker", _owner_master_condition()))
        .order_by(StaffUser.name.asc())
    ).all()
    worker_ids = [w.id for w in workers_list]
    if period == "all":
        completed_bookings = db.scalars(
            select(Booking)
            .options(
                joinedload(Booking.worker_links),
                joinedload(Booking.additional_services).joinedload(BookingAdditionalService.worker_links),
            )
            .where(
                Booking.status == "completed",
                or_(
                    Booking.worker_links.any(BookingWorker.worker_id.in_(worker_ids)),
                    Booking.additional_services.any(
                        BookingAdditionalService.worker_links.any(
                            AdditionalServiceWorker.worker_id.in_(worker_ids)
                        )
                    ),
                ),
            )
            .order_by(Booking.date.desc(), Booking.time.desc(), Booking.created_at.desc())
        ).unique().all()
    else:
        date_col_key = (
            func.substr(Booking.date, 7, 4).concat(
                func.substr(Booking.date, 4, 2)
            ).concat(
                func.substr(Booking.date, 1, 2)
            )
        )
        completed_bookings = db.scalars(
            select(Booking)
            .options(
                joinedload(Booking.worker_links),
                joinedload(Booking.additional_services).joinedload(BookingAdditionalService.worker_links),
            )
            .where(
                Booking.status == "completed",
                or_(
                    Booking.worker_links.any(BookingWorker.worker_id.in_(worker_ids)),
                    Booking.additional_services.any(
                        BookingAdditionalService.worker_links.any(
                            AdditionalServiceWorker.worker_id.in_(worker_ids)
                        )
                    ),
                ),
                date_col_key >= date_from_key,
                date_col_key <= date_to_key,
            )
            .order_by(Booking.date.desc(), Booking.time.desc(), Booking.created_at.desc())
        ).unique().all()
    entries_query = select(PayrollEntry).where(PayrollEntry.worker_id.in_(worker_ids))
    if period != "all":
        entries_query = entries_query.where(
            _payroll_entry_period_condition(
                PayrollEntry.worker_id.in_(worker_ids), date_from, date_to
            )
        )
    entries = db.scalars(entries_query.order_by(PayrollEntry.created_at.desc())).all()
    if period == "all":
        shift_from: date | None = None
        shift_to: date | None = None
    else:
        shift_from = datetime.strptime(date_from, "%d.%m.%Y").date()
        shift_to = datetime.strptime(date_to, "%d.%m.%Y").date()
    payroll_summaries = _worker_payroll_summaries_from_data(
        db, workers_list, completed_bookings, entries, _complaints_by_worker(_load_penalties(db)),
        shift_from=shift_from, shift_to=shift_to, period=period,
    )
    return [
        _worker_payload_with_payroll(w, payroll_summaries) for w in workers_list
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
            select(StaffUser).where(or_(StaffUser.role == "worker", _owner_master_condition()))
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

        .where(or_(StaffUser.role == "worker", _owner_master_condition()))

        .order_by(StaffUser.name.asc())

    ).all()

    payroll_summaries = _worker_payroll_summaries(

        db, refreshed, _complaints_by_worker(_load_penalties(db))

    )

    return [

        _worker_payload_with_payroll(worker, payroll_summaries) for worker in refreshed

    ]




@app.get("/api/owner/outsource/payroll")
def get_owner_outsource_payroll(
    period: str = "month",
    date_from: str | None = None,
    date_to: str | None = None,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> dict:
    """Сумма, потраченная на аутсорс-исполнителей доп. услуг за период (по услугам).

    Учитываются только завершённые записи (status=completed) и доп. услуги
    с флагом is_outsource. Потраченная сумма = outsource_amount услуги.
    """
    _ensure_staff_role(session_data, {"owner", "admin", "accountant"})
    valid_periods = {"day", "week", "month", "all", "custom"}
    if period not in valid_periods:
        raise HTTPException(status_code=400, detail="Invalid period")
    if period == "custom":
        if not date_from or not date_to:
            raise HTTPException(status_code=400, detail="date_from and date_to are required for custom period")
        date_from = _parse_booking_date_param(date_from)
        date_to = _parse_booking_date_param(date_to)
    else:
        date_from, date_to = _salary_date_range(period, custom_from=date_from, custom_to=date_to)
    date_from_key = date_from[6:10] + date_from[3:5] + date_from[0:2]
    date_to_key = date_to[6:10] + date_to[3:5] + date_to[0:2]

    bookings_q = (
        select(Booking)
        .options(
            joinedload(Booking.additional_services)
            .joinedload(BookingAdditionalService.worker_links)
        )
        .where(
            Booking.status == "completed",
            Booking.additional_services.any(BookingAdditionalService.is_outsource.is_(True)),
        )
    )
    if period == "all":
        bookings = db.scalars(bookings_q).unique().all()
    else:
        date_col_key = (
            func.substr(Booking.date, 7, 4)
            .concat(func.substr(Booking.date, 4, 2))
            .concat(func.substr(Booking.date, 1, 2))
        )
        bookings = db.scalars(
            bookings_q.where(date_col_key >= date_from_key, date_col_key <= date_to_key)
        ).unique().all()

    agg: dict[str, dict] = {}
    for booking in bookings:
        for asvc in booking.additional_services or []:
            if not asvc.is_outsource:
                continue
            amount = int(asvc.outsource_amount or 0)
            row = agg.setdefault(asvc.name, {"name": asvc.name, "count": 0, "total": 0})
            row["count"] += 1
            row["total"] += amount

    rows = sorted(agg.values(), key=lambda r: r["total"], reverse=True)
    return {
        "name": "Аутсорс",
        "total": sum(r["total"] for r in rows),
        "rows": rows,
    }




@app.post("/api/payroll/entries", response_model=WorkerPayload)

def create_payroll_entry(

    payload: PayrollEntryCreateRequest,

    session_data: dict = Depends(_require_session),

    db: Session = Depends(get_db),

) -> WorkerPayload:

    _ensure_staff_role(session_data, {"admin", "owner", "accountant"})

    worker = db.get(StaffUser, payload.workerId)

    if worker is None or (
        worker.role not in {"admin", "worker", "accountant"} and not _is_owner_master(worker)
    ):

        raise HTTPException(

            status_code=status.HTTP_404_NOT_FOUND, detail="Сотрудник не найден"

        )

    if session_data["role"] in {"admin", "accountant"} and not (
        worker.role == "worker" or _is_owner_master(worker)
    ):

        raise HTTPException(

            status_code=status.HTTP_403_FORBIDDEN,

            detail="Администратор может вести выплаты только по мастерам",

        )



    amount = float(payload.amount)

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



    # Дата периода, к которому относится операция (конец выбранного периода).
    # Операция без периода (или период "all") учитывается по дате создания.
    entry_date = None
    if payload.period in ("day", "week", "month", "custom"):
        if payload.period == "custom":
            if not payload.dateFrom or not payload.dateTo:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="dateFrom и dateTo обязательны для периода custom",
                )
            cf = _parse_booking_date_param(payload.dateFrom)
            ct = _parse_booking_date_param(payload.dateTo)
        else:
            cf = ct = None
        _df, _dt = _salary_date_range(payload.period, custom_from=cf, custom_to=ct)
        entry_date = _dt

    entry = PayrollEntry(

        id=f"pay-{uuid4()}",

        worker_id=worker.id,

        actor_id=session_data["actorId"],

        actor_role=session_data["role"],

        kind=payload.kind,

        amount=amount,

        note=payload.note.strip(),

        entry_date=entry_date,

        request_key=payload.clientRequestId,

        created_at=_now(),

    )

    db.add(entry)

    # Budget integration: bonus/advance → expense, deduction → income, adjustment by sign
    op_date = entry_date or date.today().strftime("%d.%m.%Y")
    created_expense_id = None
    created_income_id = None
    if payload.kind in ("bonus", "advance"):
        expense = Expense(
            id=f"exp-{uuid4()}",
            title=f"{'Премия' if payload.kind == 'bonus' else 'Аванс'}: {worker.name}",
            amount=amount,
            category="Зарплата",
            date=op_date,
            note=payload.note.strip() or ("Премия" if payload.kind == "bonus" else "Аванс"),
            resource_group="wash",
            created_at=_now(),
        )
        db.add(expense)
        created_expense_id = expense.id
    elif payload.kind == "payout":
        # Выплата должна так же списываться из бюджета, как и через
        # pay-salary (иначе ведомость и бюджет расходятся).
        expense = Expense(
            id=f"exp-{uuid4()}",
            title=f"Выплата: {worker.name}",
            amount=amount,
            category="Зарплата",
            date=op_date,
            note=payload.note.strip() or "Выплата",
            resource_group="wash",
            created_at=_now(),
        )
        db.add(expense)
        created_expense_id = expense.id
    elif payload.kind == "deduction":
        income = Income(
            id=str(uuid4()),
            amount=amount,
            source=f"Штраф: {worker.name}",
            note=payload.note.strip() or "Штраф",
            created_by_id=session_data["actorId"],
            date=op_date,
            resource_group="wash",
            created_at=_now(),
        )
        db.add(income)
        created_income_id = income.id
    elif payload.kind == "adjustment":
        if amount > 0:
            expense = Expense(
                id=f"exp-{uuid4()}",
                title=f"Корректировка: {worker.name}",
                amount=amount,
                category="Зарплата",
                date=op_date,
                note=payload.note.strip() or "Корректировка",
                resource_group="wash",
                created_at=_now(),
            )
            db.add(expense)
            created_expense_id = expense.id
        elif amount < 0:
            income = Income(
                id=str(uuid4()),
                amount=abs(amount),
                source=f"Корректировка: {worker.name}",
                note=payload.note.strip() or "Корректировка",
                created_by_id=session_data["actorId"],
                date=op_date,
                resource_group="wash",
                created_at=_now(),
            )
            db.add(income)
            created_income_id = income.id

    if created_expense_id is not None:
        entry.expense_id = created_expense_id
    if created_income_id is not None:
        entry.income_id = created_income_id

    worker.updated_at = _now()

    try:

        db.commit()

    except IntegrityError:

        # Гонка/повторная отправка: операция с тем же clientRequestId уже
        # проведена — возвращаем результат первой, дубликат не создаём.
        db.rollback()
        if payload.clientRequestId:
            winner = db.scalar(
                select(PayrollEntry).where(
                    PayrollEntry.request_key == payload.clientRequestId,
                    PayrollEntry.worker_id == worker.id,
                )
            )
            if winner is not None:
                db.refresh(worker)
                payroll_summaries = _worker_payroll_summaries(
                    db, [worker], complaints_by_worker
                )
                return _worker_payload_with_payroll(worker, payroll_summaries)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Операция с тем же ключом уже существует",
        )

    db.refresh(worker)

    # Уведомление — только после успешного коммита, иначе воркер получит
    # сообщение об операции, которая не сохранилась (например, при гонке).
    _notify_worker_about_payroll_entry(

        db,

        worker,

        actor_role=session_data["role"],

        actor_id=session_data["actorId"],

        kind=payload.kind,

        amount=amount,

        note=payload.note.strip(),

    )

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



    # Отрицательные суммы допустимы только для корректировок (adjustment):
    # положительная корректировка даёт Expense, отрицательная — Income
    # (та же логика, что и при создании операции).
    if payload.amount < 0 and entry.kind != "adjustment":

        raise HTTPException(status_code=400, detail="Сумма не может быть отрицательной для этого типа операции")



    entry.amount = payload.amount

    entry.note = payload.note.strip()

    # Не перезаписываем автора операции при редактировании — сохраняем
    # исходный аудиторский след (кто провёл операцию изначально).



    # Синхронизация бюджета: тип бюджетной записи определяется видом операции
    # и знаком суммы. При смене знака корректировки запись переводится между
    # Expense и Income, не создавая задвоения.
    new_amount = abs(payload.amount)
    want_income = entry.kind == "deduction" or (
        entry.kind == "adjustment" and payload.amount < 0
    )

    linked_expense = db.get(Expense, entry.expense_id) if entry.expense_id else None
    linked_income = db.get(Income, entry.income_id) if entry.income_id else None
    op_date = entry.entry_date or _now().strftime("%d.%m.%Y")

    if want_income:
        if linked_expense is not None:
            db.delete(linked_expense)
            entry.expense_id = None
        if linked_income is not None:
            linked_income.amount = new_amount
            linked_income.note = payload.note.strip() or linked_income.note
        else:
            if entry.kind == "deduction":
                source = f"Штраф: {worker.name}"
                note = payload.note.strip() or "Штраф"
            else:
                source = f"Корректировка: {worker.name}"
                note = payload.note.strip() or "Корректировка"
            income = Income(
                id=str(uuid4()),
                amount=new_amount,
                source=source,
                note=note,
                created_by_id=session_data["actorId"],
                date=op_date,
                resource_group="wash",
                created_at=_now(),
            )
            db.add(income)
            entry.income_id = income.id
    else:
        if linked_income is not None:
            db.delete(linked_income)
            entry.income_id = None
        if linked_expense is not None:
            linked_expense.amount = new_amount
            linked_expense.note = payload.note.strip() or linked_expense.note
        else:
            if entry.kind == "adjustment":
                title = f"Корректировка: {worker.name}"
                note = payload.note.strip() or "Корректировка"
            elif entry.kind == "bonus":
                title = f"Премия: {worker.name}"
                note = payload.note.strip() or "Премия"
            elif entry.kind == "advance":
                title = f"Аванс: {worker.name}"
                note = payload.note.strip() or "Аванс"
            else:  # payout
                title = f"Выплата: {worker.name}"
                note = payload.note.strip() or "Выплата"
            expense = Expense(
                id=f"exp-{uuid4()}",
                title=title,
                amount=new_amount,
                category="Зарплата",
                date=op_date,
                note=note,
                resource_group="wash",
                created_at=_now(),
            )
            db.add(expense)
            entry.expense_id = expense.id

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


@app.delete("/api/payroll/entries/{entry_id}", response_model=GenericMessage)

def delete_payroll_entry(

    entry_id: str,

    session_data: dict = Depends(_require_session),

    db: Session = Depends(get_db),

) -> GenericMessage:

    _ensure_staff_role(session_data, {"owner"})



    entry = db.get(PayrollEntry, entry_id)

    if entry is None:

        raise HTTPException(status_code=404, detail="Запись не найдена")



    worker = db.get(StaffUser, entry.worker_id)

    if worker is None:

        raise HTTPException(status_code=404, detail="Сотрудник не найден")



    # Удаляем связанные бюджетные записи (расход для выплаты/премии/аванса,
    # доход для штрафа/отрицательной корректировки), чтобы бюджет остался согласованным
    if entry.expense_id:

        linked_expense = db.get(Expense, entry.expense_id)

        if linked_expense is not None:

            db.delete(linked_expense)

    if entry.income_id:

        linked_income = db.get(Income, entry.income_id)

        if linked_income is not None:

            db.delete(linked_income)



    kind_label = _payroll_entry_label(entry.kind)

    kind_value = entry.kind

    amount_value = int(entry.amount)

    worker.updated_at = _now()

    db.delete(entry)

    db.commit()

    # Уведомление — только после успешного удаления: иначе воркер получит
    # «Операция удалена» об операции, которая на самом деле не удалилась.
    _notify_worker_about_payroll_entry(

        db,

        worker,

        actor_role=session_data["role"],

        actor_id=session_data["actorId"],

        kind=kind_value,

        amount=amount_value,

        note="Операция удалена",

    )



    return GenericMessage(message=f"{kind_label.capitalize()} удалена")



@app.put("/api/payroll/booking-workers/{link_id}/override-earned")

def update_booking_worker_override_earned(

    link_id: int,

    payload: OverrideEarnedRequest,

    session_data: dict = Depends(_require_session),

    db: Session = Depends(get_db),

) -> dict:

    _ensure_staff_role(session_data, {"admin", "owner"})

    link = db.get(BookingWorker, link_id)

    if link is None:

        raise HTTPException(status_code=404, detail="Связь не найдена")

    booking = db.get(Booking, link.booking_id)

    if booking and booking.status not in ("completed", "confirmed"):

        raise HTTPException(status_code=400, detail="Нельзя изменить заработок для незавершённой записи")

    link.override_earned = payload.overrideEarned

    db.commit()

    return {"message": "Заработок обновлён", "overrideEarned": payload.overrideEarned}



# ── Booking money split (owner, история записей) ─────────────────────────



def _parse_booking_date_param(value: str) -> str:
    """Принимает YYYY-MM-DD или DD.MM.YYYY, возвращает DD.MM.YYYY."""
    if value and len(value) == 10 and value[2] == ".":
        return value
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        raise HTTPException(status_code=422, detail="Дата должна быть в формате YYYY-MM-DD")
    return parsed.strftime("%d.%m.%Y")



def _booking_money_split_detail(db: Session, booking: Booking) -> BookingMoneySplitDetail:
    """Полная деталь распределения денег по записи: авто-расчёт + фактические значения."""
    penalties = _load_penalties(db)
    complaints_by_worker = _complaints_by_worker(penalties)
    split = _booking_money_split(db, booking, complaints_by_worker)

    overrides = booking.money_split_overrides or {}
    materials_auto = _booking_materials_cost_actual(db, booking)

    workers: list[BookingMoneySplitWorkerItem] = []
    master_effective_total = 0
    master_by_worker_auto = split["master_by_worker"]
    for link in booking.worker_links:
        earned_auto = master_by_worker_auto.get(link.worker_id, 0)
        earned = int(link.override_earned) if link.override_earned is not None else earned_auto
        master_effective_total += earned
        workers.append(
            BookingMoneySplitWorkerItem(
                linkId=link.id,
                workerId=link.worker_id,
                workerName=link.worker_name,
                percent=float(link.percent or 0),
                payType=link.pay_type or "percent",
                fixedAmount=link.fixed_amount,
                earned=earned,
                overrideEarned=link.override_earned,
            )
        )

    all_txs = db.scalars(
        select(PiggyBankTransaction)
        .where(PiggyBankTransaction.booking_id == booking.id)
        .order_by(PiggyBankTransaction.created_at.asc())
    ).all()
    deposit_txs = [t for t in all_txs if t.transaction_type == "deposit_24percent"]
    piggy_effective = int(sum(t.amount for t in deposit_txs)) if deposit_txs else split["piggy_deposit"]

    owner_shares: list[BookingMoneySplitOwnerItem] = []
    owner_by_owner_effective: dict[str, int] = {}
    shares = db.scalars(
        select(OwnerProfitShare)
        .where(OwnerProfitShare.booking_id == booking.id)
        .order_by(OwnerProfitShare.created_at.asc())
    ).all()
    for share in shares:
        owner = db.get(StaffUser, share.owner_id) if share.owner_id else None
        owner_shares.append(
            BookingMoneySplitOwnerItem(
                ownerId=share.owner_id,
                ownerName=owner.name if owner else "Владелец",
                amount=int(share.amount),
                status=share.status,
                shareId=share.id,
            )
        )
        owner_by_owner_effective[share.owner_id] = owner_by_owner_effective.get(share.owner_id, 0) + int(share.amount)
    owners_effective = sum(owner_by_owner_effective.values()) if owner_shares else split["owners_total"]

    piggy_svc = db.get(Service, booking.service_id) if booking.service_id else None
    piggy_target = (piggy_svc.piggy_target or "").strip() if piggy_svc else ""
    if piggy_target not in ("detailing", "wash", "general"):
        piggy_target = split["resource_group"]

    add_services = sorted(
        (booking.additional_services or []),
        key=lambda a: a.created_at or datetime.min,
    )
    asvc_workers: list[BookingAsvcWorkerItem] = []
    for asvc in add_services:
        for alink in asvc.worker_links:
            if alink.pay_type == "fixed":
                earned = int(alink.fixed_amount or 0)
            else:
                earned = money_int(asvc.price * (alink.percent or 0) / 100)
            asvc_workers.append(
                BookingAsvcWorkerItem(
                    linkId=alink.id,
                    workerId=alink.worker_id,
                    workerName=alink.worker_name,
                    percent=float(alink.percent or 0),
                    payType=alink.pay_type or "percent",
                    fixedAmount=alink.fixed_amount,
                    earned=earned,
                    additionalServiceName=asvc.name,
                )
            )
    additional_total = sum(a.price for a in add_services if a.price_mode != "subtract")
    subtract_total = sum(a.price for a in add_services if a.price_mode == "subtract")
    main_price = max(0, int(booking.price) - additional_total)
    split_base = int(split.get("split_base", max(0, split["net"] - subtract_total)))

    link_worker_ids = {link.worker_id for link in booking.worker_links}
    master_effective_total += sum(
        w.earned for w in asvc_workers if w.workerId not in link_worker_ids
    )

    return BookingMoneySplitDetail(
        id=booking.id,
        clientName=booking.client_name,
        clientPhone=booking.client_phone,
        service=booking.service,
        serviceId=booking.service_id,
        date=booking.date,
        time=booking.time,
        box=booking.box,
        price=int(booking.price),
        status=booking.status,
        paymentType=booking.payment_type,
        paymentSettled=booking.payment_settled,
        resourceGroup=split["resource_group"],
        mainPrice=main_price,
        additionalServices=[
            BookingAdditionalServiceItem(
                name=a.name,
                price=int(a.price),
                priceMode=a.price_mode or "add",
                duration=a.duration or 0,
                isOutsource=a.is_outsource,
                outsourceAmount=a.outsource_amount,
            )
            for a in add_services
        ],
        additionalTotal=additional_total,
        subtractTotal=subtract_total,
        splitBase=split_base,
        materialsCost=split["materials_cost"],
        materialsCostAuto=materials_auto,
        materialsCostOverride=overrides.get("materialsCost"),
        net=split["net"],
        masterTotal=master_effective_total,
        masterTotalAuto=split["master_total"],
        masterByWorker=master_by_worker_auto,
        asvcMasterPayTotal=int(split.get("asvc_master_pay", 0)),
        asvcOwnerExtra=int(split.get("asvc_owner_extra", 0)),
        asvcPiggyDeposits=[
            BookingAsvcPiggyItem(
                name=d["name"],
                resourceGroup=d["resource_group"],
                amount=int(d["amount"]),
            )
            for d in split.get("asvc_piggy_deposits", [])
        ],
        asvcWorkers=asvc_workers,
        piggyDeposit=piggy_effective,
        piggyDepositAuto=split["piggy_deposit"],
        ownersTotal=owners_effective,
        ownersTotalAuto=split["owners_total"],
        ownerByOwner=owner_by_owner_effective,
        ownerByOwnerAuto=split["owner_by_owner"],
        masterPayType=split["master_pay_type"],
        masterPayValue=int(piggy_svc.master_pay_value or 0) if piggy_svc else 0,
        piggyPayType=split["piggy_pay_type"],
        piggyPayValue=int(piggy_svc.piggy_pay_value or 0) if piggy_svc else 0,
        piggyTarget=piggy_target,
        hasCustom=split["has_custom"],
        workers=workers,
        piggyTransactions=[
            BookingPiggyTxItem(
                id=t.id,
                amount=t.amount,
                transactionType=t.transaction_type,
                purpose=t.purpose,
                resourceGroup=t.resource_group or "",
                date=t.date or "",
            )
            for t in all_txs
        ],
        ownerShares=owner_shares,
        canEdit=booking.status in ("completed", "confirmed"),
    )



@app.get("/api/owner/bookings-history", response_model=list[BookingHistoryItem])
def get_owner_bookings_history(
    date_from: str | None = None,
    date_to: str | None = None,
    status: str | None = None,
    q: str | None = None,
    limit: int = Query(default=500, ge=1, le=5000),
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> list[BookingHistoryItem]:
    _ensure_staff_role(session_data, {"owner"})
    try:
        parsed_from = parse_date_param(date_from) if date_from else None
        parsed_to = parse_date_param(date_to) if date_to else None
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if parsed_from and parsed_to:
        try:
            validate_range(parsed_from, parsed_to)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc


    query = (
        select(Booking)
        .options(joinedload(Booking.worker_links))
        .where(Booking.deleted_at.is_(None))
        .order_by(Booking.date.desc(), Booking.time.desc(), Booking.created_at.desc())
    )

    if status:
        query = query.where(Booking.status == status)
    if q and q.strip():
        needle = q.strip().lower()
        query = query.where(
            or_(
                func.lower(Booking.client_name).like(f"%{needle}%"),
                func.lower(Booking.client_phone).like(f"%{needle}%"),
                func.lower(Booking.service).like(f"%{needle}%"),
                func.lower(Booking.car).like(f"%{needle}%"),
                func.lower(Booking.plate).like(f"%{needle}%"),
            )
        )

    if parsed_from or parsed_to:
        # DD.MM.YYYY -> YYYYMMDD ????? ? SQL (AUDIT-07)
        def _iso_expr(col):
            return (
                func.substr(col, 7, 4)
                .op("||")(func.substr(col, 4, 2))
                .op("||")(func.substr(col, 1, 2))
            )
        lower = (parsed_from or date.min).strftime("%Y%m%d")
        upper = (parsed_to or date.max).strftime("%Y%m%d")
        query = query.where(_iso_expr(Booking.date) >= lower, _iso_expr(Booking.date) <= upper)
    bookings = db.scalars(query.limit(limit)).unique().all()

    return [
        BookingHistoryItem(
            id=b.id,
            date=b.date,
            time=b.time,
            service=b.service,
            clientName=b.client_name,
            car=b.car,
            plate=b.plate,
            box=b.box,
            price=int(b.price),
            status=b.status,
            paymentType=b.payment_type,
            paymentSettled=b.payment_settled,
            workers=[
                BookingWorkerPayload(
                    workerId=w.worker_id,
                    workerName=w.worker_name,
                    percent=float(w.percent or 0),
                    payType=w.pay_type or "percent",
                    fixedAmount=w.fixed_amount,
                )
                for w in b.worker_links
            ],
            createdAt=b.created_at,
        )
        for b in bookings
    ]


@app.get("/api/owner/bookings-history/totals", response_model=BookingHistoryTotals)
def get_owner_bookings_history_totals(
    date_from: str | None = None,
    date_to: str | None = None,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> BookingHistoryTotals:
    """Итоги за период из расчётки: по каждому мастеру — начисления/вычеты по компонентам,
    владельцам — доли прибыли (к выплате / выплачено), копилкам — вклады по банкам."""
    _ensure_staff_role(session_data, {"owner"})
    try:
        parsed_from = parse_date_param(date_from) if date_from else None
        parsed_to = parse_date_param(date_to) if date_to else None
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if parsed_from and parsed_to:
        try:
            validate_range(parsed_from, parsed_to)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc


    completed_query = (
        select(Booking)
        .options(joinedload(Booking.worker_links))
        .where(Booking.deleted_at.is_(None), Booking.status == "completed")
    )
    bookings = db.scalars(completed_query).unique().all()
    if parsed_from or parsed_to:
        lower = parsed_from or date.min
        upper = parsed_to or date.max
        bookings = [b for b in bookings if _stored_date_in_range(b.date, lower, upper)]

    # ── Расчётка мастеров: записи + оклад + смены + бонусы + поправки − авансы/вычеты/выплаты ──
    workers_list = db.scalars(
        select(StaffUser).where(StaffUser.role == "worker").order_by(StaffUser.name.asc())
    ).all()
    worker_ids = [w.id for w in workers_list]
    worker_bookings = [
        b for b in bookings
        if any(link.worker_id in worker_ids for link in b.worker_links)
        or any(
            alink.worker_id in worker_ids
            for asvc in (b.additional_services or [])
            for alink in asvc.worker_links
        )
    ]
    entries_query = select(PayrollEntry).where(PayrollEntry.worker_id.in_(worker_ids))
    if date_from and date_to:
        dt_from, dt_to = _local_day_bounds(date_from)[0], _local_day_bounds(date_to)[1]
        entries_query = entries_query.where(
            PayrollEntry.created_at >= dt_from,
            PayrollEntry.created_at <= dt_to,
        )
        shift_from = datetime.strptime(date_from, "%d.%m.%Y").date()
        shift_to = datetime.strptime(date_to, "%d.%m.%Y").date()
    else:
        shift_from = None
        shift_to = None
    entries = db.scalars(entries_query.order_by(PayrollEntry.created_at.desc())).all()
    payroll_summaries = _worker_payroll_summaries_from_data(
        db,
        workers_list,
        worker_bookings,
        entries,
        _complaints_by_worker(_load_penalties(db)),
        shift_from=shift_from,
        shift_to=shift_to,
        period="custom" if shift_from and shift_to else "all",
    )

    workers = [
        BookingTotalsWorkerItem(
            workerId=worker.id,
            workerName=worker.name,
            bookingCount=summary.completedBookings,
            accruedFromBookings=summary.accruedFromBookings,
            baseSalary=summary.baseSalary,
            shiftPayTotal=summary.shiftPayTotal,
            shiftCount=summary.shiftCount,
            bonusTotal=summary.bonusTotal,
            adjustmentTotal=summary.adjustmentTotal,
            advanceTotal=summary.advanceTotal,
            deductionTotal=summary.deductionTotal,
            payoutTotal=summary.payoutTotal,
            totalAccrued=summary.totalAccrued,
            totalDeducted=summary.totalDeducted,
            balance=summary.balance,
        )
        for worker in workers_list
        for summary in [payroll_summaries.get(worker.id)]
        if summary is not None
        and (
            summary.completedBookings > 0
            or summary.balance != 0
            or summary.baseSalary > 0
            or summary.shiftPayTotal > 0
            or summary.bonusTotal > 0
            or summary.adjustmentTotal != 0
        )
    ]
    workers.sort(key=lambda item: item.balance, reverse=True)

    # ── Владельцы: доли прибыли по завершённым записям периода (к выплате / выплачено) ──
    owner_totals: dict[str, dict] = {}
    booking_ids = [b.id for b in bookings]
    if booking_ids:
        all_shares = db.scalars(
            select(OwnerProfitShare).where(OwnerProfitShare.booking_id.in_(booking_ids))
        ).all()
        for share in all_shares:
            entry = owner_totals.setdefault(share.owner_id, {"name": "", "accrued": 0, "paid": 0, "count": 0})
            amt = int(share.amount or 0)
            if share.status == "paid":
                entry["paid"] += amt
            else:
                entry["accrued"] += amt
            entry["count"] += 1

    owner_name_by_id: dict[str, str] = {}
    if owner_totals:
        staff = db.scalars(
            select(StaffUser).where(StaffUser.id.in_(set(owner_totals)))
        ).all()
        owner_name_by_id = {item.id: item.name for item in staff}

    owners = [
        BookingTotalsOwnerItem(
            ownerId=owner_id,
            ownerName=data["name"] or owner_name_by_id.get(owner_id, owner_id),
            totalAccrued=data["accrued"],
            totalPaid=data["paid"],
            bookingCount=data["count"],
        )
        for owner_id, data in sorted(
            owner_totals.items(), key=lambda kv: -(kv[1]["accrued"] + kv[1]["paid"])
        )
    ]

    # ── Копилка: вклады по банкам (основной вклад + вклады доп. услуг) ──
    piggy_totals: dict[str, dict] = {}
    penalties = _load_penalties(db)
    complaints_by_worker = _complaints_by_worker(penalties)
    for booking in bookings:
        split = _booking_money_split(db, booking, complaints_by_worker)
        asvc_sum = sum(int(d.get("amount") or 0) for d in split.get("asvc_piggy_deposits") or [])
        main_dep = max(0, int(split.get("piggy_deposit") or 0) - asvc_sum)
        if main_dep > 0:
            svc_for_piggy = db.get(Service, booking.service_id) if booking.service_id else None
            piggy_target = (svc_for_piggy.piggy_target or "").strip() if svc_for_piggy else ""
            if piggy_target not in ("detailing", "wash", "general"):
                piggy_target = ""
            bank = piggy_target or split.get("resource_group") or "general"
            entry = piggy_totals.setdefault(bank, {"amount": 0, "booking_ids": set()})
            entry["amount"] += main_dep
            entry["booking_ids"].add(booking.id)
        for dep in split.get("asvc_piggy_deposits") or []:
            bank = dep.get("resource_group") or split.get("resource_group") or "general"
            entry = piggy_totals.setdefault(bank, {"amount": 0, "booking_ids": set()})
            entry["amount"] += int(dep.get("amount") or 0)
            entry["booking_ids"].add(booking.id)

    piggy = [
        BookingTotalsPiggyItem(
            resourceGroup=bank,
            amount=data["amount"],
            bookingCount=len(data["booking_ids"]),
        )
        for bank, data in sorted(piggy_totals.items(), key=lambda kv: -kv[1]["amount"])
    ]
    return BookingHistoryTotals(workers=workers, owners=owners, piggy=piggy)


@app.get("/api/owner/archive", response_model=ArchiveResponse)
def get_owner_archive(
    date_from: str | None = None,
    date_to: str | None = None,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> ArchiveResponse:
    """Архив — главная библиотека за период: записи с расчёткой, доходы, расходы,
    движения копилки, расчётка мастеров и доли владельцев."""
    _ensure_staff_role(session_data, {"owner"})

    date_from_dmy = _parse_booking_date_param(date_from) if date_from else None
    date_to_dmy = _parse_booking_date_param(date_to) if date_to else None
    parsed_from = parse_dmy(date_from_dmy) if date_from_dmy else None
    parsed_to = parse_dmy(date_to_dmy) if date_to_dmy else None
    if parsed_from and parsed_to:
        try:
            validate_range(parsed_from, parsed_to)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    def _in_range(d: str | None) -> bool:
        if not d:
            return not (parsed_from or parsed_to)
        if not (parsed_from or parsed_to):
            return True
        return _stored_date_in_range(d, parsed_from or date.min, parsed_to or date.max)

    # ── Записи (завершённые) с лёгкой расчёткой ──
    booking_query = (
        select(Booking)
        .options(joinedload(Booking.worker_links))
        .where(Booking.deleted_at.is_(None), Booking.status == "completed")
        .order_by(Booking.date.desc(), Booking.time.desc(), Booking.created_at.desc())
    )
    if parsed_from or parsed_to:
        # DD.MM.YYYY -> YYYYMMDD ? SQL (AUDIT-07): ?????? ?? ???????? ?????.
        def _archive_iso_expr(col):
            return (
                func.substr(col, 7, 4)
                .op("||")(func.substr(col, 4, 2))
                .op("||")(func.substr(col, 1, 2))
            )
        lower_iso = (parsed_from or date.min).strftime("%Y%m%d")
        upper_iso = (parsed_to or date.max).strftime("%Y%m%d")
        booking_query = booking_query.where(
            _archive_iso_expr(Booking.date) >= lower_iso,
            _archive_iso_expr(Booking.date) <= upper_iso,
        )
    bookings = db.scalars(booking_query).unique().all()

    penalties = _load_penalties(db)
    complaints_by_worker = _complaints_by_worker(penalties)

    archive_bookings: list[ArchiveBookingItem] = []
    summary = ArchiveSummary()
    for b in bookings:
        detail = _booking_money_split_detail(db, b)
        archive_bookings.append(
            ArchiveBookingItem(
                id=b.id,
                date=b.date,
                time=b.time,
                service=b.service,
                clientName=b.client_name,
                clientPhone=b.client_phone or "",
                clientId=b.client_id or None,
                car=b.car,
                plate=b.plate,
                box=b.box,
                price=int(b.price or 0),
                net=detail.net,
                status=b.status,
                paymentType=b.payment_type or "",
                paymentSettled=bool(b.payment_settled),
                resourceGroup=detail.resourceGroup,
                masterTotal=detail.masterTotal,
                piggyDeposit=detail.piggyDeposit,
                ownersTotal=detail.ownersTotal,
                materialsCost=detail.materialsCost,
                workers=[
                    ArchiveBookingWorkerItem(
                        workerId=w.workerId,
                        workerName=w.workerName,
                        percent=w.percent,
                        payType=w.payType,
                        fixedAmount=w.fixedAmount,
                        earned=w.earned,
                    )
                    for w in detail.workers
                ],
                asvcWorkers=[
                    ArchiveBookingWorkerItem(
                        workerId=w.workerId,
                        workerName=w.workerName,
                        percent=w.percent,
                        payType=w.payType,
                        fixedAmount=w.fixedAmount,
                        earned=w.earned,
                        additionalServiceName=w.additionalServiceName,
                    )
                    for w in detail.asvcWorkers
                ],
                additionalServices=[
                    ArchiveAdditionalServiceItem(
                        name=a.name,
                        price=a.price,
                        priceMode=a.priceMode,
                    )
                    for a in detail.additionalServices
                ],
                createdAt=b.created_at,
            )
        )
        summary.revenue += int(b.price or 0)
        summary.net += detail.net
        summary.masterTotal += detail.masterTotal
        summary.piggyDeposit += detail.piggyDeposit

    summary.bookingCount = len(bookings)

    # ── Доходы и расходы за период ──
    incomes = db.scalars(select(Income)).all()
    incomes = [i for i in incomes if i.date and _in_range(i.date)]
    incomes.sort(key=lambda i: (i.date, i.created_at), reverse=True)
    expenses = db.scalars(select(Expense)).all()
    expenses = [e for e in expenses if e.date and _in_range(e.date)]
    expenses.sort(key=lambda e: (e.date, e.created_at), reverse=True)

    summary.totalIncome = int(sum(i.amount for i in incomes))
    summary.totalExpense = int(sum(e.amount for e in expenses))
    summary.incomeCount = len(incomes)
    summary.expenseCount = len(expenses)

    archive_incomes = [
        IncomePayload(
            id=i.id,
            amount=money_int(i.amount),
            source=i.source,
            note=i.note,
            createdById=i.created_by_id,
            date=i.date,
            resourceGroup=i.resource_group,
            createdAt=i.created_at,
        )
        for i in incomes
    ]
    archive_expenses = [
        ExpensePayload(
            id=e.id,
            title=e.title,
            amount=money_int(e.amount),
            category=e.category,
            date=e.date,
            note=e.note,
            resourceGroup=e.resource_group,
        )
        for e in expenses
    ]

    # ── Движения копилки за период ──
    piggy_txs = db.scalars(
        select(PiggyBankTransaction).order_by(PiggyBankTransaction.created_at.desc())
    ).all()
    piggy_txs = [t for t in piggy_txs if _in_range(t.date)]
    summary.piggyTxCount = len(piggy_txs)

    piggy_payloads = []
    for t in piggy_txs:
        b = db.get(Booking, t.booking_id) if t.booking_id else None
        piggy_payloads.append(
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
                bookingInfo=f"{b.service} — {b.client_name} ({b.date})" if b else None,
                bookingClientName=b.client_name if b else None,
                bookingService=b.service if b else None,
                bookingDate=b.date if b else None,
                bookingTime=b.time if b else None,
                bookingCar=b.car if b else None,
                bookingPlate=b.plate if b else None,
                bookingPrice=float(b.price or 0) if b else None,
                bookingStatus=b.status if b else None,
            )
        )

    # ── Расчётка мастеров за период ──
    # Владельцы с доп. ролью мастера тоже попадают в расчётку архива
    # (как на странице «Зарплаты» и в списках мастеров).
    workers_list = db.scalars(
        select(StaffUser)
        .where(or_(StaffUser.role == "worker", _owner_master_condition()))
        .order_by(StaffUser.name.asc())
    ).all()
    worker_ids = [w.id for w in workers_list]
    worker_bookings = [
        b for b in bookings
        if any(link.worker_id in worker_ids for link in b.worker_links)
        or any(
            alink.worker_id in worker_ids
            for asvc in (b.additional_services or [])
            for alink in asvc.worker_links
        )
    ]
    entries = []
    shift_from = None
    shift_to = None
    if date_from_dmy and date_to_dmy:
        entries = db.scalars(
            select(PayrollEntry)
            .where(PayrollEntry.worker_id.in_(worker_ids))
            .order_by(PayrollEntry.created_at.desc())
        ).all()
        shift_from = _dmy_to_date(date_from_dmy)
        shift_to = _dmy_to_date(date_to_dmy)
    payroll_summaries = _worker_payroll_summaries_from_data(
        db,
        workers_list,
        worker_bookings,
        entries,
        complaints_by_worker,
        shift_from=shift_from,
        shift_to=shift_to,
        period="custom" if shift_from and shift_to else "all",
    )
    archive_payroll = [
        ArchivePayrollItem(
            workerId=worker.id,
            workerName=worker.name,
            bookingCount=summary_row.completedBookings,
            accruedFromBookings=summary_row.accruedFromBookings,
            baseSalary=summary_row.baseSalary,
            shiftPayTotal=summary_row.shiftPayTotal,
            shiftCount=summary_row.shiftCount,
            bonusTotal=summary_row.bonusTotal,
            adjustmentTotal=summary_row.adjustmentTotal,
            advanceTotal=summary_row.advanceTotal,
            deductionTotal=summary_row.deductionTotal,
            payoutTotal=summary_row.payoutTotal,
            totalAccrued=summary_row.totalAccrued,
            totalDeducted=summary_row.totalDeducted,
            balance=summary_row.balance,
        )
        for worker in workers_list
        for summary_row in [payroll_summaries.get(worker.id)]
        if summary_row is not None
        and (
            summary_row.completedBookings > 0
            or summary_row.balance != 0
            or summary_row.baseSalary > 0
            or summary_row.shiftPayTotal > 0
            or summary_row.bonusTotal > 0
            or summary_row.adjustmentTotal != 0
        )
    ]
    archive_payroll.sort(key=lambda item: item.balance, reverse=True)

    # ── Доли владельцев по записям периода ──
    owner_totals: dict[str, dict] = {}
    booking_ids = [b.id for b in bookings]
    if booking_ids:
        all_shares = db.scalars(
            select(OwnerProfitShare).where(OwnerProfitShare.booking_id.in_(booking_ids))
        ).all()
        for share in all_shares:
            entry = owner_totals.setdefault(share.owner_id, {"name": "", "accrued": 0, "paid": 0, "count": 0})
            amt = int(share.amount or 0)
            if share.status == "paid":
                entry["paid"] += amt
            else:
                entry["accrued"] += amt
            entry["count"] += 1
    owner_name_by_id: dict[str, str] = {}
    if owner_totals:
        staff = db.scalars(
            select(StaffUser).where(StaffUser.id.in_(set(owner_totals)))
        ).all()
        owner_name_by_id = {item.id: item.name for item in staff}
    archive_owners = [
        ArchiveOwnerItem(
            ownerId=oid,
            ownerName=owner_name_by_id.get(oid, "Владелец"),
            totalAccrued=data["accrued"],
            totalPaid=data["paid"],
            bookingCount=data["count"],
        )
        for oid, data in owner_totals.items()
    ]
    summary.ownersAccrued = sum(o.totalAccrued for o in archive_owners)
    summary.ownersPaid = sum(o.totalPaid for o in archive_owners)

    summary.profit = summary.net + summary.totalIncome - summary.totalExpense

    return ArchiveResponse(
        dateFrom=date_from_dmy or "",
        dateTo=date_to_dmy or "",
        summary=summary,
        bookings=archive_bookings,
        incomes=archive_incomes,
        expenses=archive_expenses,
        piggyTransactions=piggy_payloads,
        payroll=archive_payroll,
        owners=archive_owners,
    )


@app.get("/api/owner/money-flow", response_model=MoneyFlowResponse)
def get_owner_money_flow(
    date_from: str | None = None,
    date_to: str | None = None,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> MoneyFlowResponse:
    """Единый журнал движения денег за период: приходы → распределения → выплаты.

    Правила исключения двойного учёта:
    - Income/Expense, зеркалящие зарплатные проводки (expense_id/income_id у
      PayrollEntry), не попадают в итоги приходов/расходов;
    - вклады копилки из брони видны внутри распределения записи;
    - снятия из копилки идут как «move» — сам расход уже учтён в Expense;
    - оплаты с депозита (payment_type=credit) не считаются приходом кассы:
      деньги пришли ранее как пополнение депозита.
    """
    _ensure_staff_role(session_data, {"owner"})
    try:
        parsed_from = parse_date_param(date_from) if date_from else None
        parsed_to = parse_date_param(date_to) if date_to else None
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if parsed_from and parsed_to:
        try:
            validate_range(parsed_from, parsed_to)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    def _in_range(d: str | None) -> bool:
        if not d:
            return not (parsed_from or parsed_to)
        if not (parsed_from or parsed_to):
            return True
        return _stored_date_in_range(d, parsed_from or date.min, parsed_to or date.max)

    payment_labels = {
        "cash": "Наличные",
        "transfer": "Перевод",
        "invoice": "По счёту",
        "credit": "С депозита",
    }

    def _sort_dt(value: datetime | None) -> datetime:
        if value is None:
            return datetime.min.replace(tzinfo=timezone.utc)
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    def _entry_date_str(p: PayrollEntry) -> str:
        if p.entry_date:
            return p.entry_date
        return p.created_at.strftime("%d.%m.%Y") if p.created_at else ""

    def _date_sort_key(entry: MoneyFlowEntry) -> tuple[str, str]:
        """DD.MM.YYYY или YYYY-MM-DD -> сортируемый YYYY-MM-DD (без datetime)."""
        raw = (entry.date or "").strip()
        parts = raw.split(".")
        if len(parts) == 3 and len(parts[0]) == 2 and len(parts[2]) == 4:
            iso = f"{parts[2]}-{parts[1]}-{parts[0]}"
        elif len(raw) == 10 and raw[4] == "-" and raw[7] == "-":
            iso = raw
        else:
            iso = raw
        return (iso, entry.time or "")

    entries: list[MoneyFlowEntry] = []
    summary = MoneyFlowSummary()

    penalties = _load_penalties(db)
    complaints_by_worker = _complaints_by_worker(penalties)
    staff_by_id = {s.id: s for s in db.scalars(select(StaffUser)).all()}

    # Зеркала зарплатных проводок: исключаем из доходов/расходов, чтобы не задваивать
    payroll_expense_ids = {
        e.expense_id
        for e in db.scalars(
            select(PayrollEntry).where(PayrollEntry.expense_id.is_not(None))
        ).all()
        if e.expense_id
    }
    payroll_income_ids = {
        e.income_id
        for e in db.scalars(
            select(PayrollEntry).where(PayrollEntry.income_id.is_not(None))
        ).all()
        if e.income_id
    }

    # ── 1. Завершённые записи: приход выручки + распределение ──
    booking_query = (
        select(Booking)
        .options(
            joinedload(Booking.worker_links),
            joinedload(Booking.additional_services),
        )
        .where(Booking.deleted_at.is_(None), Booking.status == "completed")
        .order_by(Booking.date.desc(), Booking.time.desc(), Booking.created_at.desc())
    )
    bookings = db.scalars(booking_query).unique().all()
    bookings = [b for b in bookings if _in_range(b.date)]

    period_booking_ids: set[str] = set()
    for b in bookings:
        period_booking_ids.add(b.id)
        detail = _booking_money_split_detail(db, b)
        outsource_total = sum(
            int(a.outsource_amount or 0)
            for a in (b.additional_services or [])
            if a.is_outsource
        )
        distribution = MoneyFlowDistribution(
            materialsCost=int(detail.materialsCost or 0),
            masterTotal=int(detail.masterTotal or 0),
            piggyDeposit=int(detail.piggyDeposit or 0),
            ownersTotal=int(detail.ownersTotal or 0),
            outsourceTotal=outsource_total,
            workers=[
                MoneyFlowDistributionWorkerItem(
                    workerId=w.workerId,
                    workerName=w.workerName,
                    earned=int(w.earned or 0),
                )
                for w in detail.workers
            ]
            + [
                MoneyFlowDistributionWorkerItem(
                    workerId=w.workerId,
                    workerName=w.workerName,
                    earned=int(w.earned or 0),
                )
                for w in detail.asvcWorkers
                if w.workerId not in {x.workerId for x in detail.workers}
            ],
            owners=[
                MoneyFlowDistributionOwnerItem(
                    ownerId=o.ownerId,
                    ownerName=o.ownerName,
                    amount=int(o.amount or 0),
                    status=o.status,
                )
                for o in detail.ownerShares
            ]
            or [
                MoneyFlowDistributionOwnerItem(
                    ownerId=oid,
                    ownerName=(staff_by_id.get(oid).name if staff_by_id.get(oid) else "Владелец"),
                    amount=int(amount),
                    status="pending",
                )
                for oid, amount in (detail.ownerByOwnerAuto or {}).items()
            ],
        )

        settled_cash = bool(b.payment_settled) and b.payment_type != "credit"
        if settled_cash:
            kind, etype = "in", "booking_payment"
        elif b.payment_type == "credit":
            kind, etype = "allocation", "booking_deposit_payment"
        else:
            kind, etype = "allocation", "booking_unpaid"

        method_key = b.payment_type or ""
        entries.append(
            MoneyFlowEntry(
                id=f"mf-b:{b.id}",
                kind=kind,
                type=etype,
                date=b.date,
                time=b.time or "",
                title=f"{b.service} — {b.client_name}",
                amount=int(b.price or 0),
                counterparty=b.client_name or "",
                method=method_key,
                methodLabel=payment_labels.get(method_key, ""),
                note=(
                    ""
                    if settled_cash
                    else (
                        "Оплачено с депозита клиента"
                        if b.payment_type == "credit"
                        else "Не оплачено (долг)"
                    )
                ),
                bookingId=b.id,
                distribution=distribution,
                createdAt=b.created_at,
            )
        )
        summary.bookingCount += 1
        if settled_cash:
            summary.bookingRevenue += int(b.price or 0)
        summary.allocatedWorkers += int(detail.masterTotal or 0)
        summary.allocatedPiggy += int(detail.piggyDeposit or 0)
        summary.allocatedOwners += int(detail.ownersTotal or 0)
        summary.allocatedMaterials += int(detail.materialsCost or 0)
        summary.allocatedOutsource += outsource_total

    # ── 2. Прочие доходы ──
    incomes = [i for i in db.scalars(select(Income)).all() if i.date and _in_range(i.date)]
    for i in sorted(incomes, key=lambda x: (x.date, _sort_dt(x.created_at)), reverse=True):
        if i.id in payroll_income_ids:
            continue  # зеркало вычета из зарплаты — не реальный приход
        amount = int(i.amount or 0)
        entries.append(
            MoneyFlowEntry(
                id=f"mf-i:{i.id}",
                kind="in",
                type="income",
                date=i.date,
                title=i.source or "Прочий доход",
                amount=amount,
                counterparty=i.source or "",
                note=i.note or "",
                createdAt=i.created_at,
            )
        )
        summary.otherIncome += amount

    # ── 3. Расходы ──
    expenses = [e for e in db.scalars(select(Expense)).all() if e.date and _in_range(e.date)]
    for e in sorted(expenses, key=lambda x: (x.date, _sort_dt(x.created_at)), reverse=True):
        if e.id in payroll_expense_ids:
            continue  # зеркало премии/аванса/корректировки — учтено в выплатах
        amount = int(e.amount or 0)
        entries.append(
            MoneyFlowEntry(
                id=f"mf-e:{e.id}",
                kind="out",
                type="expense",
                date=e.date,
                title=e.title or "Расход",
                amount=amount,
                counterparty=e.category or "",
                note=e.note or "",
                createdAt=e.created_at,
            )
        )
        summary.expensesTotal += amount

    # ── 4. Зарплатные проводки: выплаты/авансы (касса) и начисления (справочно) ──
    workers_list = db.scalars(
        select(StaffUser).where(StaffUser.role == "worker").order_by(StaffUser.name.asc())
    ).all()
    worker_ids = [w.id for w in workers_list]
    entries_query = select(PayrollEntry)
    shift_from: date | None = None
    shift_to: date | None = None
    if date_from and date_to:
        dt_from, dt_to = _local_day_bounds(_parse_booking_date_param(date_from))[0], _local_day_bounds(_parse_booking_date_param(date_to))[1]
        entries_query = entries_query.where(
            PayrollEntry.created_at >= dt_from,
            PayrollEntry.created_at <= dt_to,
        )
        shift_from = parsed_from
        shift_to = parsed_to
    payroll_entries = db.scalars(
        entries_query.order_by(PayrollEntry.created_at.desc())
    ).all()

    for p in payroll_entries:
        person = staff_by_id.get(p.worker_id)
        person_name = person.name if person else "Сотрудник"
        amount = int(abs(p.amount or 0))
        base = {"personId": p.worker_id, "createdAt": p.created_at}
        if p.kind == "payout":
            is_owner = bool(person and person.role == "owner")
            entries.append(
                MoneyFlowEntry(
                    id=f"mf-p:{p.id}",
                    kind="out",
                    type="payout_owner" if is_owner else "payout_worker",
                    date=_entry_date_str(p),
                    title="Выплата владельцу" if is_owner else f"Выплата зарплаты: {person_name}",
                    amount=amount,
                    counterparty=person_name,
                    note=p.note or "",
                    **base,
                )
            )
            if is_owner:
                summary.ownerPayouts += amount
            else:
                # мастера и прочие сотрудники (админ/бухгалтер)
                summary.workerPayouts += amount
        elif p.kind == "advance":
            entries.append(
                MoneyFlowEntry(
                    id=f"mf-p:{p.id}",
                    kind="out",
                    type="advance",
                    date=_entry_date_str(p),
                    title=f"Аванс: {person_name}",
                    amount=amount,
                    counterparty=person_name,
                    note=p.note or "",
                    **base,
                )
            )
            summary.advances += amount
        elif p.kind in ("bonus", "deduction", "adjustment"):
            titles = {
                "bonus": f"Премия: {person_name}",
                "deduction": f"Вычет из зарплаты: {person_name}",
                "adjustment": f"Корректировка зарплаты: {person_name}",
            }
            entries.append(
                MoneyFlowEntry(
                    id=f"mf-p:{p.id}",
                    kind="allocation",
                    type=f"salary_{p.kind}",
                    date=_entry_date_str(p),
                    title=titles[p.kind],
                    amount=amount,
                    counterparty=person_name,
                    note=p.note or ("со знаком минус в расчётке" if p.kind == "deduction" else ""),
                    **base,
                )
            )

    # ── 5. Депозиты клиентов: пополнения = предоплата ──
    deposit_txs = [
        t for t in db.scalars(select(DepositTransaction)).all() if t.date and _in_range(t.date)
    ]
    client_names = {
        c.id: c.name for c in db.scalars(select(Client)).all()
    }
    for t in sorted(deposit_txs, key=lambda x: (x.date, _sort_dt(x.created_at)), reverse=True):
        amount = int(abs(t.amount or 0))
        cname = client_names.get(t.client_id, t.client_id)
        ttype = t.transaction_type or ""
        if ttype == "topup":
            entries.append(
                MoneyFlowEntry(
                    id=f"mf-d:{t.id}",
                    kind="in",
                    type="deposit_topup",
                    date=t.date,
                    title=f"Пополнение депозита: {cname}",
                    amount=amount,
                    counterparty=cname,
                    note=(t.description or "") + " · предоплата",
                    createdAt=t.created_at,
                )
            )
            summary.depositTopups += amount
        elif ttype == "adjust" and amount > 0:
            sign_positive = (t.amount or 0) > 0
            entries.append(
                MoneyFlowEntry(
                    id=f"mf-d:{t.id}",
                    kind="in" if sign_positive else "move",
                    type="deposit_adjust",
                    date=t.date,
                    title=f"Корректировка депозита: {cname}",
                    amount=amount,
                    counterparty=cname,
                    note=t.description or "",
                    createdAt=t.created_at,
                )
            )
            if sign_positive:
                summary.depositTopups += amount
        # wash_deduction / month_return — внутренние движения баланса клиента,
        # деньги уже учтены при пополнении; в журнал не добавляем.

    # ── 6. Копилка: внутренние перемещения (расход уже учтён в Expense) ──
    piggy_move_types = {
        "material_withdrawal": "piggy_withdrawal",
        "other_withdrawal": "piggy_withdrawal",
        "adjust": "piggy_adjust",
        "material_repayment": "piggy_repayment",
        "deposit_return": "piggy_deposit_return",
    }
    piggy_txs = [
        t for t in db.scalars(select(PiggyBankTransaction)).all() if t.date and _in_range(t.date)
    ]
    for t in sorted(piggy_txs, key=lambda x: (x.date, _sort_dt(x.created_at)), reverse=True):
        mapped = piggy_move_types.get(t.transaction_type or "")
        if mapped is None:
            continue  # deposit_24percent — внутри распределения записей; expense — зеркало Expense
        titles = {
            "piggy_withdrawal": "Снятие из копилки",
            "piggy_adjust": "Корректировка копилки",
            "piggy_repayment": "Возврат материалов в копилку",
            "piggy_deposit_return": "Возврат депозитных моек в копилку",
        }
        entries.append(
            MoneyFlowEntry(
                id=f"mf-pb:{t.id}",
                kind="move",
                type=mapped,
                date=t.date,
                title=titles[mapped],
                amount=int(abs(t.amount or 0)),
                counterparty=t.resource_group or "",
                note=t.purpose or "",
                createdAt=t.created_at,
            )
        )

    # Итоги
    summary.totalIn = summary.bookingRevenue + summary.otherIncome + summary.depositTopups
    summary.totalOut = (
        summary.workerPayouts + summary.ownerPayouts + summary.advances + summary.expensesTotal
    )
    summary.cashBalance = summary.totalIn - summary.totalOut
    summary.entryCount = len(entries)

    # ── 7. Люди: кому сколько начислено и выплачено ──
    people: list[MoneyFlowPersonItem] = []

    worker_bookings = [
        b for b in bookings
        if any(link.worker_id in worker_ids for link in b.worker_links)
        or any(
            alink.worker_id in worker_ids
            for asvc in (b.additional_services or [])
            for alink in asvc.worker_links
        )
    ]
    all_worker_entries = [
        p for p in db.scalars(select(PayrollEntry)).all() if p.worker_id in worker_ids
    ] if not (date_from and date_to) else payroll_entries
    payroll_summaries = _worker_payroll_summaries_from_data(
        db,
        workers_list,
        worker_bookings,
        all_worker_entries,
        complaints_by_worker,
        shift_from=shift_from,
        shift_to=shift_to,
        period="custom" if shift_from and shift_to else "all",
    )
    for worker in workers_list:
        s = payroll_summaries.get(worker.id)
        if s is None:
            continue
        if (
            s.completedBookings <= 0
            and s.balance == 0
            and s.baseSalary <= 0
            and s.shiftPayTotal <= 0
            and s.bonusTotal <= 0
            and s.adjustmentTotal == 0
            and s.payoutTotal <= 0
            and s.advanceTotal <= 0
        ):
            continue
        people.append(
            MoneyFlowPersonItem(
                personId=worker.id,
                personName=worker.name,
                role="worker",
                accrued=int(s.totalAccrued or 0),
                paid=int((s.payoutTotal or 0) + (s.advanceTotal or 0)),
                balance=int(s.balance or 0),
            )
        )

    owner_totals: dict[str, dict] = {}
    if period_booking_ids:
        shares = db.scalars(
            select(OwnerProfitShare).where(
                OwnerProfitShare.booking_id.in_(period_booking_ids)
            )
        ).all()
        for share in shares:
            row = owner_totals.setdefault(share.owner_id, {"accrued": 0, "paid": 0})
            amt = int(share.amount or 0)
            if share.status == "paid":
                row["paid"] += amt
            else:
                row["accrued"] += amt
    for owner_id, data in owner_totals.items():
        person = staff_by_id.get(owner_id)
        people.append(
            MoneyFlowPersonItem(
                personId=owner_id,
                personName=person.name if person else "Владелец",
                role="owner",
                accrued=data["accrued"],
                paid=data["paid"],
                balance=data["accrued"] - data["paid"],
            )
        )

    people.sort(key=lambda p: (0 if p.role == "worker" else 1, -(abs(p.accrued) + abs(p.paid))))

    entries.sort(key=_date_sort_key, reverse=True)

    date_from_dmy = _parse_booking_date_param(date_from) if date_from else ""
    date_to_dmy = _parse_booking_date_param(date_to) if date_to else ""
    return MoneyFlowResponse(
        dateFrom=date_from_dmy,
        dateTo=date_to_dmy,
        summary=summary,
        people=people,
        entries=entries,
    )


@app.get("/api/owner/bookings/{booking_id}/money-split", response_model=BookingMoneySplitDetail)
def get_owner_booking_money_split(
    booking_id: str,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> BookingMoneySplitDetail:
    _ensure_staff_role(session_data, {"owner"})
    booking = db.get(Booking, booking_id)
    if booking is None or booking.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    return _booking_money_split_detail(db, booking)



@app.put("/api/owner/bookings/{booking_id}/money-split", response_model=BookingMoneySplitDetail)
def update_owner_booking_money_split(
    booking_id: str,
    payload: BookingMoneySplitUpdateRequest,
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> BookingMoneySplitDetail:
    _ensure_staff_role(session_data, {"owner"})
    booking = db.get(Booking, booking_id)
    if booking is None or booking.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    if booking.status not in ("completed", "confirmed"):
        raise HTTPException(status_code=400, detail="Нельзя менять распределение для незавершённой записи")
    # Пре-валидация ДО любых мутаций: нельзя менять уже выплаченные доли владельцев.
    # Иначе исключение посреди изменений оставляло бы сессию в грязном состоянии,
    # и целостность держалась только на неявном rollback при закрытии сессии (AUDIT-14).
    if payload.owners:
        pre_shares = {
            share.owner_id: share
            for share in db.scalars(
                select(OwnerProfitShare).where(OwnerProfitShare.booking_id == booking.id)
            ).all()
        }
        for owner_update in payload.owners:
            pre_share = pre_shares.get(owner_update.ownerId)
            if pre_share is not None and pre_share.status == "paid":
                raise HTTPException(status_code=400, detail="Нельзя изменить выплаченную долю владельца")

    for worker_update in payload.workers:
        link = db.get(BookingWorker, worker_update.linkId)
        if link is None or link.booking_id != booking.id:
            raise HTTPException(status_code=400, detail=f"Мастер не найден (linkId={worker_update.linkId})")
        link.override_earned = worker_update.overrideEarned

    overrides = dict(booking.money_split_overrides or {})
    if payload.materialsCost is not None:
        overrides["materialsCost"] = int(payload.materialsCost)
    else:
        overrides.pop("materialsCost", None)
    booking.money_split_overrides = overrides or None

    target_materials = int(payload.materialsCost) if payload.materialsCost is not None else _booking_materials_cost_actual(db, booking)
    write_offs = db.scalars(select(StockWriteOff).where(StockWriteOff.booking_id == booking.id)).all()
    if len(write_offs) == 1 and payload.materialsCost is not None:
        # Ручной перерасчёт: единственная строка списания берёт всю целевую сумму.
        # При нескольких строках не переписываем — распределить сумму однозначно нельзя.
        write_offs[0].total_cost = target_materials
    for expense in db.scalars(select(Expense).where(Expense.booking_id == booking.id)).all():
        expense.amount = target_materials

    deposit_txs = db.scalars(
        select(PiggyBankTransaction).where(
            PiggyBankTransaction.booking_id == booking.id,
            PiggyBankTransaction.transaction_type == "deposit_24percent",
        )
    ).all()
    # Сплит с учётом жалоб: авто-пересчёт депозита при сохранении должен
    # совпадать с расчётом на странице ЗП и деталями сплита.
    split = _booking_money_split(
        db, booking, _complaints_by_worker(_load_penalties(db))
    )
    # Депозиты доп услуг (остаток от вычитаемых доп услуг) — авто-вклад в свою
    # копилку, при ручной правке копилки их не трогаем
    asvc_purpose_prefix = ASVC_PIGGY_PURPOSE_PREFIX
    asvc_sum = sum(int(d["amount"]) for d in split.get("asvc_piggy_deposits") or [])
    asvc_txs = [t for t in deposit_txs if (t.purpose or "").startswith(asvc_purpose_prefix)]
    main_txs = [t for t in deposit_txs if not (t.purpose or "").startswith(asvc_purpose_prefix)]

    def _apply_main_deposit(amount: int) -> None:
        if main_txs:
            if amount > 0:
                main_txs[0].amount = amount
                for extra in main_txs[1:]:
                    db.delete(extra)
            else:
                for tx in main_txs:
                    db.delete(tx)
        elif amount > 0:
            db.add(
                PiggyBankTransaction(
                    id=f"pb-{uuid4()}",
                    booking_id=booking.id,
                    amount=amount,
                    transaction_type="deposit_24percent",
                    purpose=f"Скорректированное распределение по записи {booking.service} ({booking.client_name})",
                    material_name=None,
                    material_cost=None,
                    date=booking.date,
                    resource_group=split["resource_group"],
                    created_at=_now(),
                )
            )

    if payload.piggyDeposit is not None:
        _apply_main_deposit(max(0, int(payload.piggyDeposit) - asvc_sum))
    else:
        auto_deposit = max(0, int(split["piggy_deposit"]) - asvc_sum)
        _apply_main_deposit(auto_deposit)

    if payload.owners:
        existing_shares = {
            share.owner_id: share
            for share in db.scalars(
                select(OwnerProfitShare).where(OwnerProfitShare.booking_id == booking.id)
            ).all()
        }
        seen_owner_ids: set[str] = set()
        for owner_update in payload.owners:
            if owner_update.ownerId in seen_owner_ids:
                continue
            seen_owner_ids.add(owner_update.ownerId)
            share = existing_shares.get(owner_update.ownerId)
            amount = round(owner_update.amount)
            if share is not None and share.status == "paid":
                raise HTTPException(status_code=400, detail="Нельзя изменить уже выплаченную долю владельца")
            if share is not None:
                if amount > 0:
                    share.amount = amount
                else:
                    db.delete(share)
            elif amount > 0:
                owner = db.get(StaffUser, owner_update.ownerId)
                if owner is None or owner.role != "owner":
                    raise HTTPException(status_code=400, detail="Владелец не найден")
                db.add(
                    OwnerProfitShare(
                        id=f"ops-{uuid4()}",
                        booking_id=booking.id,
                        owner_id=owner_update.ownerId,
                        amount=amount,
                        status="pending",
                        date=booking.date,
                        created_at=_now(),
                    )
                )

    db.commit()
    db.refresh(booking)
    return _booking_money_split_detail(db, booking)



# ── Salary detail (owner) ─────────────────────────────────────────────────



def _salary_date_range(period: str, ref: date | None = None, custom_from: str | None = None, custom_to: str | None = None) -> tuple[str, str]:

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

    elif period == "custom":

        cf = custom_from or ref.strftime("%d.%m.%Y")

        ct = custom_to or ref.strftime("%d.%m.%Y")

        return cf, ct

    else:  # all

        return "01.01.2000", "31.12.2099"





FIXED_MASTER_SERVICE_NAME = "подготовка к полировке"

FIXED_MASTER_EARNED = 1200





def is_fixed_master_service(name: str | None) -> bool:

    return bool(name) and name.strip().lower() == FIXED_MASTER_SERVICE_NAME


def _is_fixed_master_service_db(db: Session, service_id: str | None, service_name: str | None) -> bool:
    """Определяет, оплачивается ли услуга мастеру фиксированно.

    Привязка СТРОГО ПО НАЗВАНИЮ: услуга "подготовка к полировке" всегда фиксированная
    (независимо от флага в БД). Флаг is_fixed_master у услуги позволяет включить фикс
    для любой ДРУГОЙ услуги.
    """
    if is_fixed_master_service(service_name):
        return True
    svc = db.get(Service, service_id) if service_id else None
    if svc is not None:
        return bool(svc.is_fixed_master)
    return False


def _resource_group_for_service(db: Session, service_id: str) -> str:

    svc = db.get(Service, service_id)

    return svc.resource_group if svc else "wash"



def _salary_booking_actual_service(
    b: Booking,
    worker_id: str,
    worker_link: BookingWorker | None,
) -> tuple[str, str | None]:
    """Возвращает (название, service_id) услуги, которую мастер реально выполнял.

    Если мастер не назначен на основную услугу записи, но назначен на
    дополнительные — показываем их (то, что он фактически делал), а не
    основную услугу. Иначе — основную услугу."""
    if worker_link is None:
        performed = [
            asvc
            for asvc in b.additional_services
            if any(asw.worker_id == worker_id for asw in asvc.worker_links)
        ]
        if performed:
            name = ", ".join(a.name for a in performed)
            service_id = next((a.service_id for a in performed if a.service_id), None)
            return name, service_id
    return b.service, b.service_id



def _payroll_entry_period_condition(
    worker_condition: Any, date_from: str, date_to: str
) -> Any:
    """Условие выборки зарплатных операций за период (DD.MM.YYYY): операции с
    entry_date попадают в период по своей дате, остальные (legacy) — по дате создания."""
    date_from_key = date_from[6:10] + date_from[3:5] + date_from[0:2]
    date_to_key = date_to[6:10] + date_to[3:5] + date_to[0:2]
    entry_date_key = (
        func.substr(PayrollEntry.entry_date, 7, 4)
        .concat(func.substr(PayrollEntry.entry_date, 4, 2))
        .concat(func.substr(PayrollEntry.entry_date, 1, 2))
    )
    return and_(
        worker_condition,
        or_(
            and_(
                PayrollEntry.entry_date.is_not(None),
                entry_date_key >= date_from_key,
                entry_date_key <= date_to_key,
            ),
            and_(
                PayrollEntry.entry_date.is_(None),
                PayrollEntry.created_at >= _local_day_bounds(date_from)[0],
                PayrollEntry.created_at <= _local_day_bounds(date_to)[1],
            ),
        ),
    )





def _worker_period_balance(
    db: Session,
    worker: StaffUser,
    *,
    date_from: str,
    date_to: str,
    period: str,
    segment: str,
    complaints_by_worker: dict[str, list[Penalty]],
) -> int:
    """Баланс мастера за период — ровно как на странице ЗП: заработанное по записям
    периода (сплит) + оклад (пропорция периоду) + смены + премии/корректировки −
    авансы − удержания − выплаты."""
    date_from_key = date_from[6:10] + date_from[3:5] + date_from[0:2]  # DD.MM.YYYY → YYYYMMDD
    date_to_key = date_to[6:10] + date_to[3:5] + date_to[0:2]

    date_col_key = (
        func.substr(Booking.date, 7, 4).concat(
            func.substr(Booking.date, 4, 2)
        ).concat(
            func.substr(Booking.date, 1, 2)
        )
    )

    bookings_query = (
        select(Booking)
        .options(
            joinedload(Booking.worker_links),
            joinedload(Booking.additional_services).joinedload(BookingAdditionalService.worker_links),
        )
        .where(
            or_(
                Booking.worker_links.any(BookingWorker.worker_id == worker.id),
                Booking.additional_services.any(
                    BookingAdditionalService.worker_links.any(
                        AdditionalServiceWorker.worker_id == worker.id
                    )
                ),
            ),
            Booking.status == "completed",
            date_col_key >= date_from_key,
            date_col_key <= date_to_key,
        )
        .order_by(Booking.date.desc(), Booking.time.desc())
    )
    completed_bookings = db.scalars(bookings_query).unique().all()

    total_earned = 0
    for b in completed_bookings:
        rg = _resource_group_for_service(db, b.service_id)
        if segment != "all" and rg != segment:
            continue
        split = _booking_money_split(db, b, complaints_by_worker)
        worker_link = next(
            (link for link in b.worker_links if link.worker_id == worker.id), None
        )
        # Ровно как в salary-detail: override заменяет всю сумму мастера
        # (основная услуга + доп. услуги), иначе берём долю из сплита — она
        # включает и мастеров, которые работают только на доп. услугах.
        if worker_link is not None and worker_link.override_earned is not None:
            total_earned += int(worker_link.override_earned)
        else:
            total_earned += split["master_by_worker"].get(worker.id, 0)

    entries = db.scalars(
        select(PayrollEntry).where(
            _payroll_entry_period_condition(
                PayrollEntry.worker_id == worker.id, date_from, date_to
            )
        )
    ).all()

    d_from = datetime.strptime(date_from, "%d.%m.%Y").date()
    d_to = datetime.strptime(date_to, "%d.%m.%Y").date()
    inspections = _admin_shift_inspections_state(db)
    shift_count, _ = _compute_shift_attendance(inspections, worker.id, d_from, d_to)
    shift_pay_total = shift_count * (getattr(worker, "salary_per_shift", 0) or 0)

    bonus_total = sum(e.amount for e in entries if e.kind == "bonus")
    advance_total = sum(e.amount for e in entries if e.kind == "advance")
    deduction_total = sum(e.amount for e in entries if e.kind == "deduction")
    payout_total = sum(e.amount for e in entries if e.kind == "payout")
    adjustment_total = sum(e.amount for e in entries if e.kind == "adjustment")

    # Оклад пропорционален периоду — как на странице ЗП
    # (salary_base_for_period), а не полный месячный.
    period_base_salary = money_int(
        salary_base_for_period(worker.salary_base, d_from, d_to, period=period)
    )

    return int(
        total_earned
        + period_base_salary
        + shift_pay_total
        + bonus_total
        + max(adjustment_total, 0)
        - advance_total
        - deduction_total
        - payout_total
        - max(-adjustment_total, 0)
    )


@app.get(

    "/api/owner/workers/{worker_id}/salary-detail",

    response_model=SalaryDetailResponse,

)

def owner_worker_salary_detail(

    worker_id: str,

    period: str = "month",

    segment: str = "all",

    date_from: str | None = None,

    date_to: str | None = None,

    session_data: dict = Depends(_require_session),

    db: Session = Depends(get_db),

) -> SalaryDetailResponse:

    _ensure_staff_role(session_data, {"owner"})



    if period not in ("day", "week", "month", "all", "custom"):

        raise HTTPException(status_code=400, detail="Invalid period")

    if segment not in ("all", "wash", "detailing"):

        raise HTTPException(status_code=400, detail="Invalid segment")



    if period == "custom":

        if not date_from or not date_to:

            raise HTTPException(status_code=400, detail="date_from and date_to are required for custom period")

        date_from = _parse_booking_date_param(date_from)

        date_to = _parse_booking_date_param(date_to)

    else:

        date_from = date_to = None

    df, dt = _salary_date_range(period, custom_from=date_from, custom_to=date_to)
    range_from = parse_dmy(df)
    range_to = parse_dmy(dt)
    try:
        validate_range(range_from, range_to)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc



    worker = db.get(StaffUser, worker_id)

    if worker is None:

        raise HTTPException(status_code=404, detail="Мастер не найден")



    date_from_key = df[6:10] + df[3:5] + df[0:2]  # DD.MM.YYYY → YYYYMMDD

    date_to_key = dt[6:10] + dt[3:5] + dt[0:2]



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

        .options(

            joinedload(Booking.worker_links),

            joinedload(Booking.additional_services).joinedload(BookingAdditionalService.worker_links),

        )

        .where(

            or_(

                Booking.worker_links.any(BookingWorker.worker_id == worker_id),

                Booking.additional_services.any(

                    BookingAdditionalService.worker_links.any(

                        AdditionalServiceWorker.worker_id == worker_id

                    )

                ),

            ),

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

        worker_link = next(
            (link for link in b.worker_links if link.worker_id == worker_id),
            None,
        )

        # If worker is on main service, get their percent; else check if on additional services
        if worker_link is not None:
            percent = adjusted_booking_percent(

                worker_link.percent,

                worker_complaints,

                date_value=b.date,

                time_value=b.time,

                fallback=b.created_at,

            )
        else:
            # Worker is only on additional services, use default percent
            percent = worker.default_percent

        rg = _resource_group_for_service(db, b.service_id)

        if segment != "all" and rg != segment:

            continue

        # Main + additional services contribution (единая модель распределения)

        split = _booking_money_split(db, b, complaints_by_worker)

        if worker_link and worker_link.override_earned is not None:

            earned = int(worker_link.override_earned)

        else:

            earned = split["master_by_worker"].get(worker_id, 0)

        total_earned += earned

        shift_dates.add(b.date)

        actual_service, actual_service_id = _salary_booking_actual_service(
            b, worker_id, worker_link
        )

        booking_items.append(

            SalaryBookingItem(

                id=b.id,

                date=b.date,

                time=b.time,

                service=actual_service,

                serviceId=actual_service_id,

                box=b.box,

                price=b.price,

                earned=earned,

                percent=percent,

                overrideEarned=worker_link.override_earned if worker_link else None,

                linkId=worker_link.id if worker_link else None,

                payType=worker_link.pay_type if worker_link else "percent",

                resourceGroup=rg,

                car=b.car,

                plate=b.plate,

                clientName=b.client_name,

                clientPhone=b.client_phone,

                paymentType=b.payment_type,

                paymentSettled=b.payment_settled,

                notes=b.notes,

                additionalServices=[

                    BookingAdditionalServiceItem(

                        name=asvc.name,

                        price=asvc.price,

                        priceMode=asvc.price_mode,

                        duration=asvc.duration,

                        isOutsource=asvc.is_outsource,

                        outsourceAmount=asvc.outsource_amount,

                    )

                    for asvc in b.additional_services

                ],

            )

        )

    # ── Payroll entries within date range ──

    all_entries = db.scalars(

        select(PayrollEntry).where(

            _payroll_entry_period_condition(

                PayrollEntry.worker_id == worker_id, df, dt

            )

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

            amount=money_int(e.amount),

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

        shift_count, shift_dates = _compute_shift_attendance(

            inspections, worker.id, date(2000, 1, 1), date.today()

        )

    else:

        d_from = datetime.strptime(df, "%d.%m.%Y").date()

        d_to = datetime.strptime(dt, "%d.%m.%Y").date()

        inspections = _admin_shift_inspections_state(db)

        shift_count, shift_dates = _compute_shift_attendance(inspections, worker.id, d_from, d_to)



    # ── Full balance: earned + base + shifts + bonuses − advances − deductions − payouts ──

    bonus_total = sum(e.amount for e in all_entries if e.kind == "bonus")

    advance_total = sum(e.amount for e in all_entries if e.kind == "advance")

    deduction_total = sum(e.amount for e in all_entries if e.kind == "deduction")

    adjustment_total = sum(e.amount for e in all_entries if e.kind == "adjustment")

    shift_pay_total = shift_count * salary_per_shift
    period_base_salary = money_int(
        salary_base_for_period(
            worker.salary_base, range_from, range_to, period=period
        )
    )

    balance_to_pay = int(
        total_earned
        + period_base_salary
        + shift_pay_total
        + bonus_total
        + max(adjustment_total, 0)
        - advance_total
        - deduction_total
        - total_paid
        - max(-adjustment_total, 0)
    )



    return SalaryDetailResponse(

        workerId=worker.id,

        workerName=worker.name,

        salaryBase=period_base_salary,

        salaryPerShift=salary_per_shift,

        defaultPercent=worker.default_percent,

        active=worker.active,

        totalEarned=total_earned,

        totalPaid=total_paid,

        balanceToPay=balance_to_pay,

        completedBookingsCount=len(booking_items),

        shiftCount=shift_count,

        shiftDates=shift_dates,

        bookings=booking_items,

        payouts=payout_items,

        entries=entry_payloads,

    )





@app.get(

    "/api/worker/salary-detail",

    response_model=SalaryDetailResponse,

)

def worker_my_salary_detail(

    period: str = "month",

    segment: str = "all",

    date_from: str | None = None,

    date_to: str | None = None,

    session_data: dict = Depends(_require_session),

    db: Session = Depends(get_db),

) -> SalaryDetailResponse:

    _ensure_staff_role(session_data, {"worker"})

    worker_id = session_data["actorId"]



    if period not in ("day", "week", "month", "all", "custom"):

        raise HTTPException(status_code=400, detail="Invalid period")

    if segment not in ("all", "wash", "detailing"):

        raise HTTPException(status_code=400, detail="Invalid segment")



    if period == "custom":

        if not date_from or not date_to:

            raise HTTPException(status_code=400, detail="date_from and date_to are required for custom period")

        date_from = _parse_booking_date_param(date_from)

        date_to = _parse_booking_date_param(date_to)

    else:

        date_from = date_to = None

    df, dt = _salary_date_range(period, custom_from=date_from, custom_to=date_to)
    range_from = parse_dmy(df)
    range_to = parse_dmy(dt)
    try:
        validate_range(range_from, range_to)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc



    worker = db.get(StaffUser, worker_id)

    if worker is None:

        raise HTTPException(status_code=404, detail="Мастер не найден")



    date_from_key = df[6:10] + df[3:5] + df[0:2]

    date_to_key = dt[6:10] + dt[3:5] + dt[0:2]



    date_col_key = (

        func.substr(Booking.date, 7, 4).concat(

            func.substr(Booking.date, 4, 2)

        ).concat(

            func.substr(Booking.date, 1, 2)

        )

    )

    bookings_query = (

        select(Booking)

        .options(

            joinedload(Booking.worker_links),

            joinedload(Booking.additional_services).joinedload(BookingAdditionalService.worker_links),

        )

        .where(

            or_(

                Booking.worker_links.any(BookingWorker.worker_id == worker_id),

                Booking.additional_services.any(

                    BookingAdditionalService.worker_links.any(

                        AdditionalServiceWorker.worker_id == worker_id

                    )

                ),

            ),

            Booking.status == "completed",

            date_col_key >= date_from_key,

            date_col_key <= date_to_key,

        )

        .order_by(Booking.date.desc(), Booking.time.desc())

    )

    completed_bookings = db.scalars(bookings_query).unique().all()



    all_penalties = _load_penalties(db)

    complaints_by_worker = _complaints_by_worker(all_penalties)

    worker_complaints = complaints_by_worker.get(worker_id, [])



    booking_items: list[SalaryBookingItem] = []

    shift_dates: set[str] = set()

    total_earned = 0

    for b in completed_bookings:

        worker_link = next(
            (link for link in b.worker_links if link.worker_id == worker_id),
            None,
        )

        percent = adjusted_booking_percent(

            worker_link.percent if worker_link else worker.default_percent,

            worker_complaints,

            date_value=b.date,

            time_value=b.time,

            fallback=b.created_at,

        )

        rg = _resource_group_for_service(db, b.service_id)

        if segment != "all" and rg != segment:

            continue

        # Main + additional services contribution (единая модель распределения)

        split = _booking_money_split(db, b, complaints_by_worker)

        if worker_link and worker_link.override_earned is not None:

            earned = int(worker_link.override_earned)

        else:

            earned = split["master_by_worker"].get(worker_id, 0)

        total_earned += earned

        shift_dates.add(b.date)

        actual_service, actual_service_id = _salary_booking_actual_service(
            b, worker_id, worker_link
        )

        booking_items.append(

            SalaryBookingItem(

                id=b.id,

                date=b.date,

                time=b.time,

                service=actual_service,

                serviceId=actual_service_id,

                box=b.box,

                price=b.price,

                earned=earned,

                percent=percent,

                overrideEarned=worker_link.override_earned if worker_link else None,

                linkId=worker_link.id if worker_link else None,

                payType=worker_link.pay_type if worker_link else "percent",

                resourceGroup=rg,

                car=b.car,

                plate=b.plate,

                clientName=b.client_name,

                paymentType=b.payment_type,

                paymentSettled=b.payment_settled,

            )

        )

    all_entries = db.scalars(

        select(PayrollEntry).where(

            _payroll_entry_period_condition(

                PayrollEntry.worker_id == worker_id, df, dt

            )

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

            amount=money_int(e.amount),

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



    salary_per_shift = getattr(worker, "salary_per_shift", 0) or 0

    if period == "all":

        inspections = _admin_shift_inspections_state(db)

        shift_count, shift_dates = _compute_shift_attendance(

            inspections, worker.id, date(2000, 1, 1), date.today()

        )

    else:

        d_from = datetime.strptime(df, "%d.%m.%Y").date()

        d_to = datetime.strptime(dt, "%d.%m.%Y").date()

        inspections = _admin_shift_inspections_state(db)

        shift_count, shift_dates = _compute_shift_attendance(inspections, worker.id, d_from, d_to)



    # ── Full balance: earned + base + shifts + bonuses − advances − deductions − payouts ──

    bonus_total = sum(e.amount for e in all_entries if e.kind == "bonus")

    advance_total = sum(e.amount for e in all_entries if e.kind == "advance")

    deduction_total = sum(e.amount for e in all_entries if e.kind == "deduction")

    adjustment_total = sum(e.amount for e in all_entries if e.kind == "adjustment")

    shift_pay_total = shift_count * salary_per_shift
    period_base_salary = money_int(
        salary_base_for_period(
            worker.salary_base, range_from, range_to, period=period
        )
    )

    balance_to_pay = int(
        total_earned
        + period_base_salary
        + shift_pay_total
        + bonus_total
        + max(adjustment_total, 0)
        - advance_total
        - deduction_total
        - total_paid
        - max(-adjustment_total, 0)
    )



    return SalaryDetailResponse(

        workerId=worker.id,

        workerName=worker.name,

        salaryBase=period_base_salary,

        salaryPerShift=salary_per_shift,

        defaultPercent=worker.default_percent,

        active=worker.active,

        totalEarned=total_earned,

        totalPaid=total_paid,

        balanceToPay=balance_to_pay,

        completedBookingsCount=len(booking_items),

        shiftCount=shift_count,

        shiftDates=shift_dates,

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

    # Идемпотентность: повторный запрос с тем же clientRequestId (двойной клик,
    # повторная отправка формы, ретрай сети) возвращает результат первой
    # выплаты и не создаёт дубликат.
    def _replay_response(existing: PayrollEntry) -> PaySalaryResponse:
        replay_from, replay_to = _salary_date_range(
            payload.period,
            custom_from=(
                _parse_booking_date_param(payload.dateFrom)
                if payload.period == "custom" and payload.dateFrom
                else None
            ),
            custom_to=(
                _parse_booking_date_param(payload.dateTo)
                if payload.period == "custom" and payload.dateTo
                else None
            ),
        )
        all_penalties = _load_penalties(db)
        replay_balance = _worker_period_balance(
            db,
            worker,
            date_from=replay_from,
            date_to=replay_to,
            period=payload.period,
            segment=payload.segment,
            complaints_by_worker=_complaints_by_worker(all_penalties),
        )
        return PaySalaryResponse(
            message="Выплата уже проведена ранее",
            payoutId=existing.id,
            newBalance=replay_balance,
            expenseId=existing.expense_id or "",
        )

    if payload.clientRequestId:
        existing_entry = db.scalar(
            select(PayrollEntry).where(
                PayrollEntry.request_key == payload.clientRequestId,
                PayrollEntry.worker_id == worker.id,
                PayrollEntry.kind == "payout",
            )
        )
        if existing_entry is not None:
            return _replay_response(existing_entry)



    # Determine resource_group from segment

    if payload.segment == "detailing":

        resource_group = "detailing"

    else:

        resource_group = "wash"



    amount = payload.amount



    # Дата периода, к которому относится выплата (конец выбранного периода).
    # Выплата без периода (или период "all") учитывается по дате создания.
    payout_date = None
    cf = ct = None
    if payload.period in ("day", "week", "month", "custom"):
        if payload.period == "custom":
            if not payload.dateFrom or not payload.dateTo:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="dateFrom и dateTo обязательны для периода custom",
                )
            cf = _parse_booking_date_param(payload.dateFrom)
            ct = _parse_booking_date_param(payload.dateTo)
        else:
            cf = ct = None
        _df, _dt = _salary_date_range(payload.period, custom_from=cf, custom_to=ct)
        payout_date = _dt

    # 1. Create PayrollEntry

    entry = PayrollEntry(

        id=f"pay-{uuid4()}",

        worker_id=worker.id,

        actor_id=session_data["actorId"],

        actor_role=session_data["role"],

        kind="payout",

        amount=amount,

        note=payload.note.strip() or f"Выплата зарплаты ({payload.period})",

        entry_date=payout_date,

        request_key=payload.clientRequestId,

        created_at=_now(),

    )

    db.add(entry)



    # 2. Create Expense (auto-deduct from budget)

    op_date = payout_date or date.today().strftime("%d.%m.%Y")

    expense = Expense(

        id=f"exp-{uuid4()}",

        title=f"Зарплата: {worker.name}",

        amount=amount,

        category="Зарплата",

        date=op_date,

        note=payload.note.strip() or f"Выплата зарплаты ({payload.period})",

        resource_group=resource_group,

        created_at=_now(),

    )

    db.add(expense)

    entry.expense_id = expense.id

    worker.updated_at = _now()

    try:

        db.commit()

    except IntegrityError:

        # Гонка: два параллельных запроса с одним clientRequestId.
        # Уникальный индекс не дал создать дубликат — возвращаем результат
        # первой (уже закоммиченной) выплаты.
        db.rollback()
        if payload.clientRequestId:
            winner = db.scalar(
                select(PayrollEntry).where(
                    PayrollEntry.request_key == payload.clientRequestId,
                    PayrollEntry.worker_id == worker.id,
                    PayrollEntry.kind == "payout",
                )
            )
            if winner is not None:
                return _replay_response(winner)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Повторная выплата с тем же ключом уже существует",
        )

    db.refresh(worker)

    # Уведомление — только после успешного коммита: при гонке проигравший
    # запрос уходит в replay и воркеру не приходит лишнее сообщение.
    _notify_worker_about_payroll_entry(
        db,
        worker,
        actor_role=session_data["role"],
        actor_id=session_data["actorId"],
        kind="payout",
        amount=amount,
        note=payload.note.strip() or f"Выплата зарплаты ({payload.period})",
    )



    # Recalculate balance за тот же период, что показывает экран ЗП
    date_from, date_to = _salary_date_range(
        payload.period, custom_from=cf, custom_to=ct
    )
    all_penalties = _load_penalties(db)
    complaints_by_worker = _complaints_by_worker(all_penalties)
    new_balance = _worker_period_balance(
        db,
        worker,
        date_from=date_from,
        date_to=date_to,
        period=payload.period,
        segment=payload.segment,
        complaints_by_worker=complaints_by_worker,
    )

    return PaySalaryResponse(

        message="Выплата проведена",

        payoutId=entry.id,

        newBalance=new_balance,

        expenseId=expense.id,

    )





# ---------------------------------------------------------------------------

# Owner Profit Share Endpoints

# ---------------------------------------------------------------------------





@app.get("/api/owner/owners/salary-detail", response_model=OwnerSalaryDetailResponse)

def owner_salary_detail(

    period: str = "month",

    date_from: str | None = None,

    date_to: str | None = None,

    session_data: dict = Depends(_require_session),

    db: Session = Depends(get_db),

) -> OwnerSalaryDetailResponse:

    _ensure_staff_role(session_data, {"owner", "admin"})

    owners = db.scalars(

        select(StaffUser).where(StaffUser.role == "owner").order_by(StaffUser.name)

    ).all()



    now_dt = _now()

    if period == "day":

        dt_from = now_dt.replace(hour=0, minute=0, second=0, microsecond=0)

        dt_to = now_dt

    elif period == "week":

        # Calendar week: Saturday → Friday (same as _salary_date_range)

        saturday = now_dt.date() - timedelta(days=(now_dt.weekday() - 5) % 7)

        friday = saturday + timedelta(days=6)

        dt_from = datetime.combine(saturday, datetime.min.time(), tzinfo=timezone.utc)

        dt_to = datetime.combine(friday, datetime.max.time(), tzinfo=timezone.utc)

    elif period == "month":

        dt_from = now_dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        dt_to = now_dt

    else:

        dt_from = datetime(2000, 1, 1, tzinfo=timezone.utc)

        dt_to = now_dt



    # Период доли: pending — по дате создания (когда заработана),
    # paid — по дате выплаты (paid_at; для старых записей без paid_at — created_at)

    def _ops_ts(value: datetime | None) -> datetime:
        if value is None:
            return datetime.min.replace(tzinfo=timezone.utc)
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    all_shares = db.scalars(
        select(OwnerProfitShare).order_by(OwnerProfitShare.created_at.desc())
    ).all()

    period_shares = [
        share
        for share in all_shares
        if (share.status == "pending" and dt_from <= _ops_ts(share.created_at) <= dt_to)
        or (share.status != "pending" and dt_from <= _ops_ts(share.paid_at or share.created_at) <= dt_to)
    ]



    total_accrued = 0

    total_paid = 0

    owner_data: dict[str, dict] = {}



    for o in owners:

        owner_data[o.id] = {"shares": [], "total_accrued": 0, "total_paid": 0}



    date_from_dmy = _parse_booking_date_param(date_from) if date_from else None

    date_to_dmy = _parse_booking_date_param(date_to) if date_to else None
    parsed_from = parse_dmy(date_from_dmy) if date_from_dmy else None
    parsed_to = parse_dmy(date_to_dmy) if date_to_dmy else None
    if parsed_from and parsed_to:
        try:
            validate_range(parsed_from, parsed_to)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc



    for share in period_shares:

        if (parsed_from or parsed_to) and not _stored_date_in_range(
            share.date, parsed_from or date.min, parsed_to or date.max
        ):

            continue

        if share.owner_id not in owner_data:

            continue

        booking_obj = db.get(Booking, share.booking_id)

        service = booking_obj.service if booking_obj else ""

        client_name = booking_obj.client_name if booking_obj else ""

        client_phone = booking_obj.client_phone if booking_obj else ""

        price = booking_obj.price if booking_obj else 0

        time_val = booking_obj.time if booking_obj else ""

        car = booking_obj.car if booking_obj and booking_obj.car else ""

        plate = booking_obj.plate if booking_obj and booking_obj.plate else ""

        worker_name = ""

        if booking_obj:

            worker_links = db.scalars(

                select(BookingWorker).where(BookingWorker.booking_id == booking_obj.id)

            ).all()

            if worker_links:

                worker_name = ", ".join(wl.worker_name for wl in worker_links)



        item = OwnerProfitShareItem(

            id=share.id,

            bookingId=share.booking_id,

            service=service,

            clientName=client_name,

            clientPhone=client_phone,

            date=share.date,

            time=time_val,

            price=price,

            amount=share.amount,

            status=share.status,

            createdAt=share.created_at,

            workerName=worker_name,

            car=car,

            plate=plate,

        )

        owner_data[share.owner_id]["shares"].append(item)

        if share.status == "pending":

            owner_data[share.owner_id]["total_accrued"] += share.amount

            total_accrued += share.amount

        else:

            owner_data[share.owner_id]["total_paid"] += share.amount

            total_paid += share.amount



    summaries = []

    for owner in owners:

        d = owner_data[owner.id]

        summaries.append(

            OwnerProfitShareSummary(

                ownerId=owner.id,

                ownerName=owner.name,

                totalAccrued=d["total_accrued"],

                totalPaid=d["total_paid"],

                balanceToPay=d["total_accrued"] - d["total_paid"],

                shares=d["shares"],

            )

        )



    total_balance = total_accrued - total_paid

    return OwnerSalaryDetailResponse(

        owners=summaries,

        totalAccrued=total_accrued,

        totalPaid=total_paid,

        totalBalanceToPay=total_balance,

    )





@app.post("/api/owner/owners/pay-salary", response_model=PayOwnerSalaryResponse)

def owner_pay_salary(

    payload: PayOwnerSalaryRequest,

    session_data: dict = Depends(_require_session),

    db: Session = Depends(get_db),

) -> PayOwnerSalaryResponse:

    _ensure_staff_role(session_data, {"owner", "admin"})



    owner = db.get(StaffUser, payload.ownerId)

    if owner is None or owner.role != "owner":

        raise HTTPException(status_code=404, detail="Владелец не найден")



    amount = payload.amount



    # Get pending shares up to the amount

    pending_shares = db.scalars(

        select(OwnerProfitShare).where(

            OwnerProfitShare.owner_id == payload.ownerId,

            OwnerProfitShare.status == "pending",

        ).order_by(OwnerProfitShare.created_at.asc())

    ).all()



    pending_total = sum(s.amount for s in pending_shares)

    if amount > pending_total:

        raise HTTPException(

            status_code=400,

            detail=f"Нельзя выплатить больше, чем накоплено. Доступно: {pending_total} ₽",

        )



    # Mark shares as paid

    paid_at_dt = _now()

    to_pay = amount

    for share in pending_shares:

        if to_pay <= 0:

            break

        if share.amount <= to_pay:

            share.status = "paid"

            share.paid_at = paid_at_dt

            to_pay -= share.amount

        else:

            remaining = share.amount - to_pay

            share.amount = to_pay

            share.status = "paid"

            share.paid_at = paid_at_dt

            db.add(

                OwnerProfitShare(

                    id=f"ops-{uuid4()}",

                    booking_id=share.booking_id,

                    owner_id=share.owner_id,

                    amount=remaining,

                    status="pending",

                    date=share.date,

                    # Остаток доли остаётся в периоде исходной записи,
                    # а не переезжает в период выплаты
                    created_at=share.created_at,

                )

            )

            to_pay = 0



    # Create PayrollEntry

    entry = PayrollEntry(

        id=f"pay-{uuid4()}",

        worker_id=owner.id,

        actor_id=session_data["actorId"],

        actor_role=session_data["role"],

        kind="payout",

        amount=amount,

        note=payload.note.strip() or f"Выплата ЗП владельцу {owner.name}",

        request_key=payload.clientRequestId,

        created_at=_now(),

    )

    db.add(entry)



    # Create Expense

    today_str = date.today().strftime("%d.%m.%Y")

    expense = Expense(

        id=f"exp-{uuid4()}",

        title=f"ЗП владельца: {owner.name}",

        amount=amount,

        category="Зарплата",

        date=today_str,

        note=payload.note.strip() or f"Выплата ЗП владельцу {owner.name}",

        resource_group="detailing",

        created_at=_now(),

    )

    db.add(expense)

    entry.expense_id = expense.id



    owner.updated_at = _now()

    try:

        db.commit()

    except IntegrityError:

        # Гонка/повторная отправка: выплата с тем же clientRequestId уже
        # проведена — возвращаем результат первой, дубликат не создаём.
        db.rollback()
        if payload.clientRequestId:
            winner = db.scalar(
                select(PayrollEntry).where(
                    PayrollEntry.request_key == payload.clientRequestId,
                    PayrollEntry.worker_id == owner.id,
                    PayrollEntry.kind == "payout",
                )
            )
            if winner is not None:
                new_balance = sum(
                    s.amount for s in db.scalars(
                        select(OwnerProfitShare).where(
                            OwnerProfitShare.owner_id == payload.ownerId,
                            OwnerProfitShare.status == "pending",
                        )
                    ).all()
                )
                return PayOwnerSalaryResponse(
                    message="Выплата уже проведена ранее",
                    payoutId=winner.id,
                    expenseId=winner.expense_id or "",
                    newBalance=new_balance,
                )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Выплата с тем же ключом уже существует",
        )



    new_balance = sum(

        s.amount for s in db.scalars(

            select(OwnerProfitShare).where(

                OwnerProfitShare.owner_id == payload.ownerId,

                OwnerProfitShare.status == "pending",

            )

        ).all()

    )



    return PayOwnerSalaryResponse(

        message="Выплата проведена",

        payoutId=entry.id,

        expenseId=expense.id,

        newBalance=new_balance,

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

        salary_per_shift=DEFAULT_SHIFT_PAY,

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





@app.get("/api/auth/session", response_model=BootstrapPayload)
def get_session_bootstrap(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> BootstrapPayload:
    return _build_bootstrap(db, session_data)


@app.get("/api/auth/consent/check", response_model=ConsentCheckResponse)
def check_consent(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> ConsentCheckResponse:
    actor_id = session_data.get("actorId", "")
    consent = db.scalar(
        select(DataConsent).where(DataConsent.telegram_id == actor_id)
    )
    return ConsentCheckResponse(consented=consent is not None)


@app.post("/api/auth/consent", response_model=ConsentRecordPayload)
def record_consent(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> ConsentRecordPayload:
    actor_id = session_data.get("actorId", "")
    existing = db.scalar(
        select(DataConsent).where(DataConsent.telegram_id == actor_id)
    )
    if existing is not None:
        return ConsentRecordPayload(
            consented=True,
            consentedAt=existing.consented_at.isoformat(),
        )
    consent = DataConsent(telegram_id=actor_id)
    db.add(consent)
    db.commit()
    db.refresh(consent)
    return ConsentRecordPayload(
        consented=True,
        consentedAt=consent.consented_at.isoformat(),
    )


@app.get("/api/auth/sessions", response_model=list[AuthSessionPayload])
def get_active_sessions(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> list[AuthSessionPayload]:
    return []


@app.post("/api/auth/logout", response_model=GenericMessage)
def logout(
    session_data: dict = Depends(_require_session),
    db: Session = Depends(get_db),
) -> GenericMessage:
    return GenericMessage(message="Выход выполнен")


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

