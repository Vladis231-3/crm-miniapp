"""Синхронизация записей (Booking) с Google Calendar.

Двусторонняя синхронизация:
- бот/CRM -> Google: записи (бот, веб-миниапп, владелец) автоматически
  отражаются в Google-календаре владельца (sync_booking_to_calendar);
- Google -> CRM: события, созданные/изменённые в Google, попадают в CRM
  (pull_calendar_changes). Инкрементальная синхронизация через syncToken.

Безопасное поведение: если сервис не настроен (нет GOOGLE_CALENDAR_CLIENT_ID
и SECRET в env и не сохранены учётные данные через UI) или у владельца нет
сохранённых OAuth-токенов, все функции — no-op. Интеграция «включается»
учётными данными OAuth-клиента: владелец может ввести их в интерфейсе настроек
(хранятся в AppSetting под GOOGLE_CALENDAR_CREDENTIALS_KEY, перекрывают env),
либо администратор прописывает env-переменные. Приложение и тесты работают
без Google-аккаунта.

Токены владельца хранятся в AppSetting под ключом GOOGLE_CALENDAR_TOKENS_KEY.
Записи сохраняют внешний идентификатор события в колонке google_event_id
(см. модели Booking), а созданные в Google события помечаются source="google".
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import requests

from .config import Settings

logger = logging.getLogger(__name__)

GOOGLE_CALENDAR_TOKENS_KEY = "google_calendar_tokens"
GOOGLE_CALENDAR_SYNC_TOKEN_KEY = "google_calendar_sync_token"
GOOGLE_CALENDAR_LAST_SYNC_KEY = "google_calendar_last_sync"
GOOGLE_CALENDAR_CREDENTIALS_KEY = "google_calendar_credentials"

# Статусы Booking, при которых запись считается активной и синхронизируется.
# admin_review — заявка от клиента ещё не подтверждена админом, но уже должна
# попадать в Google Calendar (при отмене/удалении событие удаляется).
SYNCED_STATUSES = {"new", "confirmed", "scheduled", "in_progress", "admin_review"}

# Человекочитаемые подписи источников записи (поле Booking.source).
SOURCE_LABELS = {"bot": "Бот", "google": "Google", "manual": "Вручную"}

_SCOPES = ["https://www.googleapis.com/auth/calendar.events"]

_AppSetting: Any = None


def _appsetting_model():
    """Ленивый импорт модели AppSetting (обход циклических зависимостей)."""
    global _AppSetting
    if _AppSetting is None:
        from .models import AppSetting

        _AppSetting = AppSetting
    return _AppSetting


def is_configured(settings: Settings, db: Any = None) -> bool:
    """True, если заданы учётные данные Google Calendar.

    Учётные данные берутся из БД (заполняются владельцем через UI), если они
    сохранены там; иначе — из env (GOOGLE_CALENDAR_CLIENT_ID/SECRET).
    """
    creds = _resolve_creds(db, settings)
    return bool(creds.get("client_id") and creds.get("client_secret"))


def load_credentials(db: Any) -> dict[str, Any]:
    """Вернуть учётные данные OAuth-клиента из БД или пустой dict.

    Владелец может ввести client_id/secret прямо в интерфейсе настроек
    (без правки .env). Ключи хранятся под GOOGLE_CALENDAR_CREDENTIALS_KEY.
    """
    AppSetting = _appsetting_model()
    row = db.get(AppSetting, GOOGLE_CALENDAR_CREDENTIALS_KEY)
    if row is None:
        return {}
    value = row.value
    return value if isinstance(value, dict) else {}


def save_credentials(db: Any, credentials: dict[str, Any]) -> None:
    """Сохранить учётные данные OAuth-клиента (upsert)."""
    AppSetting = _appsetting_model()
    row = db.get(AppSetting, GOOGLE_CALENDAR_CREDENTIALS_KEY)
    if row is None:
        row = AppSetting(key=GOOGLE_CALENDAR_CREDENTIALS_KEY, value=credentials)
        db.add(row)
    else:
        row.value = credentials
    db.flush()


def clear_credentials(db: Any) -> None:
    """Удалить сохранённые в БД учётные данные OAuth-клиента."""
    AppSetting = _appsetting_model()
    row = db.get(AppSetting, GOOGLE_CALENDAR_CREDENTIALS_KEY)
    if row is not None:
        db.delete(row)
    db.flush()


def _resolve_creds(
    db: Any,
    settings: Settings,
    *,
    fallback_redirect_uri: str = "",
) -> dict[str, Any]:
    """Учётные данные для OAuth: сохранённые в БД перекрывают env.

    fallback_redirect_uri используется, когда ни в БД, ни в env не задан
    redirect_uri (например, вычисленный из текущего запроса сервером).
    """
    saved = load_credentials(db) if db is not None else {}
    if saved.get("client_id") and saved.get("client_secret"):
        return {
            "client_id": str(saved["client_id"]).strip(),
            "client_secret": str(saved["client_secret"]).strip(),
            "redirect_uri": (
                str(saved.get("redirect_uri") or "").strip()
                or (getattr(settings, "google_calendar_redirect_uri", None) or "").strip()
                or fallback_redirect_uri
            ),
        }
    return {
        "client_id": getattr(settings, "google_calendar_client_id", None),
        "client_secret": getattr(settings, "google_calendar_client_secret", None),
        "redirect_uri": (
            (getattr(settings, "google_calendar_redirect_uri", None) or "").strip()
            or fallback_redirect_uri
        ),
    }


def load_tokens(db: Any) -> dict[str, Any]:
    """Вернуть OAuth-токены владельца или пустой dict.

    Совместимость: токены, сохранённые старыми версиями (сырой ответ
    token-эндпоинта Google с ключом "access_token"), нормализуются в
    ключ "token", который ожидает остальной код.
    """
    AppSetting = _appsetting_model()
    row = db.get(AppSetting, GOOGLE_CALENDAR_TOKENS_KEY)
    if row is None:
        return {}
    value = row.value
    if not isinstance(value, dict):
        return {}
    if not value.get("token") and value.get("access_token"):
        value = {**value, "token": value["access_token"]}
    return value


def save_tokens(db: Any, tokens: dict[str, Any]) -> None:
    """Сохранить OAuth-токены владельца (upsert)."""
    AppSetting = _appsetting_model()
    row = db.get(AppSetting, GOOGLE_CALENDAR_TOKENS_KEY)
    if row is None:
        row = AppSetting(key=GOOGLE_CALENDAR_TOKENS_KEY, value=tokens)
        db.add(row)
    else:
        row.value = tokens
    db.flush()


def clear_tokens(db: Any) -> None:
    """Отключить интеграцию: удалить токены и состояние синхронизации."""
    AppSetting = _appsetting_model()
    for key in (
        GOOGLE_CALENDAR_TOKENS_KEY,
        GOOGLE_CALENDAR_SYNC_TOKEN_KEY,
        GOOGLE_CALENDAR_LAST_SYNC_KEY,
    ):
        row = db.get(AppSetting, key)
        if row is not None:
            db.delete(row)
    db.flush()


def _client_config(settings: Settings) -> dict[str, Any]:
    """Базовый client_config для построения OAuth-запросов."""
    redirect_uri = settings.google_calendar_redirect_uri
    return {
        "client_id": settings.google_calendar_client_id,
        "client_secret": settings.google_calendar_client_secret,
        "redirect_uri": redirect_uri or "",
    }


def build_auth_url(
    settings: Settings, state: str, db: Any = None, *, fallback_redirect_uri: str = ""
) -> str:
    """Построить OAuth-URL для подключения Google Calendar (чистый HTTP)."""
    from urllib.parse import urlencode

    creds = _resolve_creds(db, settings, fallback_redirect_uri=fallback_redirect_uri)
    query = urlencode(
        {
            "client_id": creds["client_id"],
            "redirect_uri": creds["redirect_uri"],
            "response_type": "code",
            "scope": " ".join(_SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
            "include_granted_scopes": "true",
        }
    )
    return f"https://accounts.google.com/o/oauth2/auth?{query}"


def exchange_code(
    settings: Settings, code: str, db: Any = None, *, fallback_redirect_uri: str = ""
) -> dict[str, Any]:
    """Обменять OAuth-код на токены (POST на token endpoint). Вернёт dict."""
    creds = _resolve_creds(db, settings, fallback_redirect_uri=fallback_redirect_uri)
    resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": creds["client_id"],
            "client_secret": creds["client_secret"],
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": creds["redirect_uri"],
        },
        timeout=30,
    )
    if resp.status_code >= 400:
        raise _GoogleApiError(resp.status_code, "token_exchange_failed")
    data = resp.json()
    # Нормализуем ответ Google: остальной код ожидает ключ "token"
    # (access_token из ответа token-эндпоинта Google).
    return {
        "token": data.get("access_token", ""),
        "refresh_token": data.get("refresh_token", ""),
        "expires_in": data.get("expires_in", 3600),
        "scope": data.get("scope", ""),
        "token_type": data.get("token_type", "Bearer"),
        "refresh_token_expires_in": data.get("refresh_token_expires_in"),
    }


class _GoogleApiError(Exception):
    """Ошибка Google Calendar API (HTTP status из ответа).

    reason/details извлекаются из тела ответа Google (error.reason и
    error.message), когда это возможно, — они нужны для диагностики
    (например, accessNotConfigured = API не включён в проекте).
    """

    def __init__(
        self,
        status: int,
        message: str = "",
        *,
        reason: str | None = None,
        details: str | None = None,
    ):
        super().__init__(message or f"google api error {status}")
        self.status = status
        self.reason = reason
        self.details = details


def _google_error_from_response(resp: Any) -> tuple[str | None, str | None]:
    """Извлечь (reason, details) из тела ошибки Google API, если возможно.

    Calendar API: {"error": {"reason": ..., "message": ...}}.
    Token endpoint: {"error": "invalid_grant", "error_description": "..."}.
    """
    try:
        body = resp.json()
    except Exception:  # noqa: BLE001
        return None, None
    err = body.get("error") or {}
    if isinstance(err, dict):
        reason = err.get("reason") or err.get("status")
        details = err.get("message")
        if not details:
            errors = err.get("errors") or []
            if errors and isinstance(errors[0], dict):
                details = errors[0].get("message")
        return (reason or None), (details or None)
    if isinstance(err, str):
        return err, (body.get("error_description") or None)
    return None, None


def _refresh_access_token(
    settings: Settings, tokens: dict[str, Any], db: Any = None
) -> dict[str, Any]:
    """Обновить access_token по refresh_token. Вернёт новый dict токенов."""
    creds = _resolve_creds(db, settings)
    resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": creds["client_id"],
            "client_secret": creds["client_secret"],
            "refresh_token": tokens.get("refresh_token"),
            "grant_type": "refresh_token",
        },
        timeout=30,
    )
    if resp.status_code >= 400:
        reason, details = _google_error_from_response(resp)
        raise _GoogleApiError(
            resp.status_code, details or "token_refresh_failed", reason=reason, details=details
        )
    new_tokens = dict(tokens)
    new_tokens["token"] = resp.json().get("access_token")
    return new_tokens


def _calendar_request(
    db: Any,
    settings: Settings,
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    body: dict[str, Any] | None = None,
    _retried: bool = False,
) -> dict[str, Any]:
    """Выполнить запрос к Google Calendar API v3 (чистый HTTP, без SDK).

    path — путь после /calendar/v3/, например "calendars/primary/events".
    При 401/403 автоматически обновляет access_token по refresh_token
    (один повтор). Возвращает JSON-ответ ({} для пустого тела, напр. DELETE).
    """
    tokens = load_tokens(db)
    if not tokens or not tokens.get("token"):
        raise _GoogleApiError(401, "no_token")
    url = f"https://www.googleapis.com/calendar/v3/{path}"
    headers = {"Authorization": f"Bearer {tokens['token']}"}
    resp = requests.request(method, url, params=params, json=body, headers=headers, timeout=30)
    if resp.status_code in (401, 403) and not _retried and tokens.get("refresh_token"):
        save_tokens(db, _refresh_access_token(settings, tokens, db=db))
        return _calendar_request(db, settings, method, path, params=params, body=body, _retried=True)
    if resp.status_code >= 400:
        reason, details = _google_error_from_response(resp)
        raise _GoogleApiError(
            resp.status_code, details or f"google_api_{resp.status_code}", reason=reason, details=details
        )
    if not resp.content:
        return {}
    return resp.json()


def _source_label(source: Any) -> str:
    """Подпись источника записи для Google-события."""
    return SOURCE_LABELS.get(source or "", "CRM")


def _booking_event_body(booking: Any, settings: Settings) -> dict[str, Any]:
    """Сформировать тело Google-события из записи Booking."""
    from zoneinfo import ZoneInfo  # type: ignore

    tz = ZoneInfo(settings.google_calendar_timezone)
    try:
        start_dt = datetime.strptime(  # noqa: DTZ007 — далее явно привязываем tzinfo
            f"{booking.date} {booking.time}", "%d.%m.%Y %H:%M"
        )
    except (ValueError, TypeError):
        start_dt = datetime.strptime(  # noqa: DTZ007 — далее явно привязываем tzinfo
            f"{booking.date} {booking.time}", "%Y-%m-%d %H:%M"
        )
    start_dt = start_dt.replace(tzinfo=tz)
    end_dt = start_dt + timedelta(minutes=booking.duration or 0)

    lines = [
        f"Клиент: {booking.client_name or ''}",
        f"Телефон: {booking.client_phone or ''}",
    ]
    if booking.car:
        lines.append(f"Авто: {booking.car}")
    if booking.plate:
        lines.append(f"Номер: {booking.plate}")
    if booking.box:
        lines.append(f"Бокс: {booking.box}")
    if booking.notes:
        lines.append(f"Комментарий: {booking.notes}")
    lines.append(f"Источник: {_source_label(getattr(booking, 'source', None))}")
    description = "\n".join(lines)

    return {
        "summary": f"{booking.service or 'Запись'}",
        "description": description,
        "start": {"dateTime": start_dt.isoformat(), "timeZone": settings.google_calendar_timezone},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": settings.google_calendar_timezone},
        # Привязка события к записи CRM — по ней обратная синхронизация
        # отличает «наши» события от созданных вручную в Google.
        "extendedProperties": {"private": {"crmBookingId": str(booking.id)}},
    }


def sync_booking_to_calendar(
    db: Any, settings: Settings, booking: Any, *, action: str = "upsert"
) -> tuple[str | None, bool]:
    """Синхронизировать запись с Google Calendar.

    action: "upsert" — создать/обновить событие; "delete" — удалить событие.

    Вернёт (google_event_id, ok). ok=False при не настроенном сервисе или при
    ошибке, при этом событие/запись НЕ трогаются. Все ошибки ловим и
    логируем — синхронизация никогда не должна ломать бронирование.

    Вызывающий ответственен за db.commit() и за сохранение booking.google_event_id.
    """
    try:
        return _sync_booking_to_calendar_impl(db, settings, booking, action=action)
    except Exception:
        logger.exception("Google Calendar sync failed (booking=%s)", getattr(booking, "id", None))
        return getattr(booking, "google_event_id", None), False


def _sync_booking_to_calendar_impl(
    db: Any, settings: Settings, booking: Any, *, action: str
) -> tuple[str | None, bool]:
    if not is_configured(settings, db):
        return None, False
    tokens = load_tokens(db)
    if not tokens or not tokens.get("refresh_token"):
        return None, False

    event_id = getattr(booking, "google_event_id", None)
    status = getattr(booking, "status", "")
    is_active = status in SYNCED_STATUSES

    if action == "delete":
        if not event_id:
            return None, True
        _calendar_request(
            db,
            settings,
            "DELETE",
            f"calendars/primary/events/{event_id}",
            params={"sendUpdates": "none"},
        )
        return None, True

    if not is_active:
        # Неактивная запись (например, отменена) — удаляем событие, если было.
        if event_id:
            return _sync_booking_to_calendar_impl(db, settings, booking, action="delete")
        return None, True

    body = _booking_event_body(booking, settings)

    if event_id:
        _calendar_request(
            db,
            settings,
            "PATCH",
            f"calendars/primary/events/{event_id}",
            params={"sendUpdates": "none"},
            body=body,
        )
        booking.google_updated_at = datetime.now(timezone.utc)
        return event_id, True

    created = _calendar_request(
        db,
        settings,
        "POST",
        "calendars/primary/events",
        params={"sendUpdates": "none"},
        body=body,
    )
    new_id = created.get("id")
    if new_id:
        booking.google_event_id = new_id
        booking.google_updated_at = datetime.now(timezone.utc)
    return new_id, True


# ─────────────────────────────────────────────────────────────────────────────
# Обратная синхронизация: Google Calendar -> CRM
# ─────────────────────────────────────────────────────────────────────────────


def _load_sync_token(db: Any) -> str | None:
    """Текущий syncToken инкрементальной синхронизации или None."""
    AppSetting = _appsetting_model()
    row = db.get(AppSetting, GOOGLE_CALENDAR_SYNC_TOKEN_KEY)
    if row is None or not isinstance(row.value, dict):
        return None
    return row.value.get("sync_token")


def _save_sync_token(db: Any, sync_token: str | None) -> None:
    """Сохранить syncToken (upsert). None — сброс к полному скану."""
    AppSetting = _appsetting_model()
    row = db.get(AppSetting, GOOGLE_CALENDAR_SYNC_TOKEN_KEY)
    if row is None:
        row = AppSetting(
            key=GOOGLE_CALENDAR_SYNC_TOKEN_KEY, value={"sync_token": sync_token}
        )
        db.add(row)
    else:
        row.value = {"sync_token": sync_token}
    db.flush()


def last_sync_at(db: Any) -> str | None:
    """ISO-метка последней успешной обратной синхронизации или None."""
    AppSetting = _appsetting_model()
    row = db.get(AppSetting, GOOGLE_CALENDAR_LAST_SYNC_KEY)
    if row is None or not isinstance(row.value, dict):
        return None
    return row.value.get("at")


def _save_last_sync(db: Any) -> None:
    AppSetting = _appsetting_model()
    row = db.get(AppSetting, GOOGLE_CALENDAR_LAST_SYNC_KEY)
    now = datetime.now(timezone.utc).isoformat()
    if row is None:
        row = AppSetting(key=GOOGLE_CALENDAR_LAST_SYNC_KEY, value={"at": now})
        db.add(row)
    else:
        row.value = {"at": now}
    db.flush()


def _parse_google_datetime(raw: str) -> datetime | None:
    """RFC3339 (dateTime или date) -> aware datetime, или None."""
    try:
        return datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return None


def _event_start_end(
    event: dict[str, Any], settings: Settings
) -> tuple[datetime | None, datetime | None]:
    """(start, end) события в локальной таймзоне календаря или (None, None)."""
    from zoneinfo import ZoneInfo  # type: ignore

    start_raw = (event.get("start") or {}).get("dateTime") or (event.get("start") or {}).get("date")
    end_raw = (event.get("end") or {}).get("dateTime") or (event.get("end") or {}).get("date")
    start_dt = _parse_google_datetime(start_raw) if start_raw else None
    if start_dt is None:
        return None, None
    tz = ZoneInfo(settings.google_calendar_timezone)
    start_local = start_dt.astimezone(tz)
    end_local = None
    if end_raw:
        end_dt = _parse_google_datetime(end_raw)
        if end_dt is not None:
            end_local = end_dt.astimezone(tz)
    return start_local, end_local


# Ключи, которые мы сами пишем в описании события при экспорте записи.
_FIELD_PREFIXES = {"Клиент", "Телефон", "Авто", "Номер", "Бокс", "Комментарий"}


def _parse_event_description(description: Any) -> dict[str, str]:
    """Извлечь поля «Ключ: значение» из описания Google-события."""
    fields: dict[str, str] = {}
    if not description:
        return fields
    for line in str(description).splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()
        if key in _FIELD_PREFIXES and value:
            fields[key] = value
    return fields


# --- Свободное распознавание полей из текста (любой порядок, без подписей) ---

# Распространённые русские имена: распознаём по словарю, чтобы не путать
# с марками автомобилей и другими словами текста.
_COMMON_NAMES = frozenset(
    {
        "Александр", "Александра", "Алексей", "Алина", "Алёна", "Алена",
        "Анастасия", "Андрей", "Анна", "Антон", "Артём", "Артем", "Борис",
        "Вадим", "Валентина", "Валерий", "Валерия", "Василий", "Вера",
        "Виктор", "Виктория", "Владимир", "Владислав", "Вячеслав", "Галина",
        "Геннадий", "Георгий", "Григорий", "Даниил", "Данил", "Дарья",
        "Денис", "Дмитрий", "Евгений", "Евгения", "Егор", "Екатерина",
        "Елена", "Елизавета", "Жанна", "Захар", "Зоя", "Иван", "Игорь",
        "Илья", "Инна", "Ирина", "Кирилл", "Кристина", "Ксения", "Лариса",
        "Лев", "Леонид", "Лидия", "Любовь", "Людмила", "Максим", "Марат",
        "Марина", "Мария", "Марк", "Матвей", "Михаил", "Надежда", "Наталья",
        "Никита", "Николай", "Нина", "Оксана", "Олег", "Ольга", "Павел",
        "Пётр", "Петр", "Полина", "Регина", "Роман", "Руслан", "Светлана",
        "Святослав", "Семён", "Семен", "Сергей", "Софья", "София",
        "Станислав", "Степан", "Тамара", "Татьяна", "Тимур", "Тимофей",
        "Фёдор", "Федор", "Эдуард", "Эльвира", "Юлия", "Юрий", "Яков",
        "Яна", "Ярослав",
        # Уменьшительные формы (часто пишут именно так).
        "Алёша", "Алеша", "Аня", "Валера", "Вася", "Вика", "Вова", "Гена",
        "Даша", "Дима", "Женя", "Ира", "Катя", "Коля", "Ксюша", "Лена",
        "Лёша", "Леша", "Люда", "Маша", "Миша", "Настя", "Наташа", "Оля",
        "Паша", "Петя", "Саша", "Света", "Стас", "Тёма", "Тема", "Тима",
        "Толя", "Толик", "Юля",
    }
)

# Марки автомобилей (lowercase). Кириллица и латиница.
_CAR_BRANDS = frozenset(
    {
        # латиница
        "acura", "alfa romeo", "aston martin", "audi", "bentley", "bmw",
        "brilliance", "bugatti", "buick", "byd", "cadillac", "changan",
        "chery", "chevrolet", "chrysler", "citroen", "dacia", "daewoo",
        "daihatsu", "dodge", "dongfeng", "exeed", "faw", "ferrari", "fiat",
        "ford", "gaz", "geely", "genesis", "great wall", "gmc", "haval",
        "honda", "hyundai", "infiniti", "isuzu", "jac", "jaecoo", "jaguar",
        "jeep", "kia", "koenigsegg", "lada", "lamborghini", "land rover",
        "lexus", "lifan", "lincoln", "lixiang", "maserati", "mazda",
        "mclaren", "mercedes", "mercedes-benz", "mg", "mini", "mitsubishi",
        "nissan", "omoda", "opel", "peugeot", "porsche", "ram", "renault",
        "rolls-royce", "rover", "seat", "skoda", "smart", "ssangyong",
        "subaru", "suzuki", "tesla", "toyota", "uaz", "vaz", "volkswagen",
        "volvo", "vw", "zeekr", "zotye",
        # кириллица
        "ауди", "бмв", "ваз", "вольво", "газ", "гели", "джили", "джип",
        "дэу", "деу", "киа", "лада", "лексус", "мазда", "мерседес",
        "мерседес-бенц", "митсубиси", "мицубиси", "москвич", "ниссан",
        "опель", "пежо", "порше", "рено", "саньонг", "ссанъёнг", "субару",
        "судзуки", "тойота", "уаз", "фольксваген", "форд", "хендай",
        "хёндай", "хонда", "черри", "шкода", "шевроле", "эксид", "ягуар",
    }
)

# Слова, которые НЕ могут быть именем клиента (глаголы услуг, бытовые слова).
# Нужны для эвристики «имя рядом с телефоном», чтобы не отдать в имя
# «мойка», «помыть», «позвоните» и т.п.
_NAME_STOPWORDS = frozenset(
    {
        "авто", "автомойка", "автомобиль", "внешняя", "внутренняя", "время",
        "запишите", "запись", "заявка", "комплекс",
        "машина", "мойка", "помыть", "помой", "приеду", "сдо",
        "экспресс", "выходные", "завтра", "сегодня", "срочно", "пожалуйста",
        "кузов", "салон", "химчистка", "полировка", "плёнка", "пленка",
        "керамика", "оклейка", "детейлинг", "уборка", "стекло", "фары",
        "диски", "шиномонтаж", "привет", "добрый", "вечер",
        "утро", "день", "клиент", "номер", "телефон", "бокс", "услуга",
        "цена", "сколько", "хочу", "нужно", "надо", "можно", "записаться",
    }
)


# Слова, обрывающие модель автомобиля после марки.
_VEHICLE_STOP_WORDS = frozenset(
    {
        "а", "без", "бы", "в", "ваш", "вечером", "время", "все", "вы",
        "дата", "день", "для", "до", "днём", "днем", "его", "ее", "её",
        "же", "за", "завтра", "запись", "из", "и", "как", "клиент", "км",
        "комментарий", "кто", "кузов", "машина", "мой", "мойка", "мойки",
        "мыть", "на", "наш", "не", "номер", "но", "о", "об", "от",
        "плёнка", "пленка", "по", "пожалуйста", "полировка", "полировки",
        "под", "при", "приеду", "руб", "с", "салон", "сегодня", "со",
        "тел", "телефон", "то", "тыс", "у", "уборка", "услуга", "утром",
        "цена", "что", "это", "авто", "автомобиль", "бокс", "госномер",
    }
)

# Фрагмент телефона в исходном тексте (для вырезания после распознавания).
# Lookbehind запрещает матч с цифры, перед которой стоит буква («x5 +7…»
# не должен начинаться с «5»).
_PHONE_FRAGMENT_RE = re.compile(r"(?<![A-Za-zА-Яа-яЁё])(?:\+?\d[\d\s()\-]{8,})")

# Кандидаты в госномера: авто А123ВС77 / А123ВС777 и мото 1234АВ77.
_PLATE_AUTO_RE = re.compile(
    r"(?<![0-9A-Za-zА-Яа-яЁё])(?:[АВЕКМНОРСТУХавекмнорстухA-Za-z])"
    r"\d{3}(?:[АВЕКМНОРСТУХавекмнорстухA-Za-z]){2}\d{2,3}(?![0-9A-Za-zА-Яа-яЁё])"
)
_PLATE_MOTO_RE = re.compile(
    r"(?<![0-9A-Za-zА-Яа-яЁё])\d{4}(?:[АВЕКМНОРСТУХавекмнорстухA-Za-z]){2}"
    r"\d{2,3}(?![0-9A-Za-zА-Яа-яЁё])"
)


def _extract_plate_from_text(text: str) -> str:
    """Найти российский госномер в свободном тексте (или пустую строку)."""
    from .schemas import normalize_plate

    for candidate in _PLATE_AUTO_RE.findall(text) + _PLATE_MOTO_RE.findall(text):
        try:
            return normalize_plate(candidate)
        except ValueError:
            continue
    return ""


def _extract_phone_from_text(text: str) -> str:
    """Найти российский мобильный телефон в свободном тексте (или пустую строку).

    Перебор всех подстрок 10-11 цифр: соседние цифры (например, «5» из «x5»)
    не должны «съедать» начало номера, как это делает обычный finditer.
    """
    from .schemas import normalize_phone_digits

    digits = re.sub(r"\D", "", text)
    for start in range(max(0, len(digits) - 10)):
        for length in (11, 10):
            candidate = digits[start : start + length]
            if len(candidate) != length:
                continue
            # 10-значный «мобильный» код России: 9xx (сотовые), 4xx (МТС/гор.)
            if length == 10 and candidate[0] not in {"9", "4"}:
                continue
            try:
                return normalize_phone_digits(candidate)
            except ValueError:
                continue
    return ""


def _extract_name_from_text(text: str) -> str:
    """Найти имя клиента по словарю русских имён (или пустую строку)."""
    for token in re.findall(r"[А-ЯЁа-яё]+", text):
        normalized = token[:1].upper() + token[1:].lower()
        if normalized in _COMMON_NAMES:
            return normalized
    return ""


def _is_plausible_name(word: str) -> bool:
    """Подходит ли слово на роль имени клиента (кириллица, не служебное)."""
    if not re.fullmatch(r"[А-ЯЁа-яё]+", word):
        return False
    lowered = word.lower()
    if lowered in _NAME_STOPWORDS or lowered in _VEHICLE_STOP_WORDS:
        return False
    # Слова короче 2 букв или длиннее ~15 вряд ли имена.
    return not (len(word) < 2 or len(word) > 15)


def _extract_name_by_phone_neighborhood(text: str, phone: str) -> str:
    """Определить имя клиента по соседству с телефоном (или пустую строку).

    Когда у события есть свободный текст, имя клиента часто стоит прямо
    рядом с телефоном — до или после него, в любом порядке. Эта эвристика
    дополняет словарный поиск: она ловит имена, которых нет в _COMMON_NAMES
    (редкие, неполные формы), независимо от расположения.
    """
    if not phone or not text:
        return ""
    # Находим фрагмент телефона в исходном тексте (окружение может быть
    # «+7 (900) 123-45-67» — телефон при этом нормализован).
    phone_re = re.compile(_PHONE_FRAGMENT_RE.pattern)
    match = phone_re.search(text)
    if not match:
        return ""
    # Смотрим слова слева и справа от телефона.
    before = re.findall(r"[А-ЯЁа-яё]+", text[: match.start()])
    after = re.findall(r"[А-ЯЁа-яё]+", text[match.end() :])
    for candidate in (before[-1:] + after[:1]):
        if _is_plausible_name(candidate):
            return candidate[:1].upper() + candidate[1:].lower()
    return ""


def _title_case_words(value: str) -> str:
    """Привести каждое слово к виду «С заглавной», сохранив аббревиатуры.

    «тойота камри» -> «Тойота Камри», «BMW x5» -> «BMW X5», «BMW» останется «BMW».
    """
    out: list[str] = []
    for part in value.split():
        if part.isalpha() and part == part.upper():
            out.append(part)
        else:
            out.append(part[:1].upper() + part[1:].lower())
    return " ".join(out)


def _extract_vehicle_from_text(text: str) -> str:
    """Найти марку и модель автомобиля в свободном тексте (или пустую строку)."""
    from .schemas import normalize_vehicle_name

    lowered = text.lower()
    for brand in sorted(_CAR_BRANDS, key=len, reverse=True):
        match = re.search(
            r"(?<![0-9A-Za-zА-Яа-яЁё])" + re.escape(brand) + r"(?![0-9A-Za-zА-Яа-яЁё])",
            lowered,
        )
        if not match:
            continue
        original_brand = text[match.start() : match.end()]
        tail_words = re.findall(r"[0-9A-Za-zА-Яа-яЁё\-]+", lowered[match.end() :])
        model_words: list[str] = []
        for word in tail_words:
            if (
                word.lower() in _VEHICLE_STOP_WORDS
                or word.lower() in _CAR_BRANDS
                or word.title() in _COMMON_NAMES
                or word.isdigit()
            ):
                break
            model_words.append(word)
            if len(model_words) >= 3:
                break
        candidate = (
            _title_case_words(f"{original_brand} {' '.join(model_words)}")
            if model_words
            else _title_case_words(original_brand)
        )
        try:
            return normalize_vehicle_name(candidate)
        except ValueError:
            continue
    return ""


def _normalize_for_match(value: str) -> str:
    """Нижний регистр без «ё» и лишних пробелов — для сопоставления названий."""
    return re.sub(r"\s+", " ", value.lower().replace("ё", "е")).strip()


def _match_service_in_text(service_names: list[str], text: str) -> str:
    """Найти услугу из каталога в тексте; вернуть пусто, если нет.

    Сопоставляем по префиксу названия услуги (от полного названия к 2 словам),
    игнорируя хвост в скобках (например, цену «(от 1000 рублей)»). Так «ремонт
    скола» распознается как «Ремонт скола лобового стекла (от 1000 рублей)».
    """
    text_norm = _normalize_for_match(text or "")
    best: tuple[int, int, str] | None = None
    for name in service_names:
        base = re.split(r"\s*\(.*?\)\s*", _normalize_for_match(name), maxsplit=1)[0].strip()
        tokens = base.split()
        # n=1 (одно слово) пробуем только для реально однословных услуг, чтобы
        # «мойка» в тексте не ложно матчила «Мойка + полировка» из каталога.
        last_n = 1 if len(tokens) == 1 else 2
        for n in range(len(tokens), last_n - 1, -1):  # от полного названия к короткому префиксу
            prefix = " ".join(tokens[:n])
            if len(prefix) < 4:
                continue
            m = re.search(
                r"(?<![a-zа-яё0-9])" + re.escape(prefix) + r"(?![a-zа-яё0-9])",
                text_norm,
            )
            if m:
                key = (m.start(), -len(prefix), name)
                if best is None or key < best:
                    best = key
                break  # самое длинное совпадение для этой услуги рассмотрено
    return best[2] if best else ""


def _parse_event_text_loose(text: Any, service_names: list[str]) -> dict[str, str]:
    """Определить поля (госномер, телефон, имя, авто, услуга) из свободного текста.

    Данные могут идти в любом порядке и без подписей «Ключ: значение».
    Распознанные фрагменты вырезаются из рабочей копии, чтобы поля не
    «перехватывали» друг друга (например, цифры госномера не путаются с
    телефоном).
    """
    if not text:
        return {}
    original = str(text)
    work = original
    result: dict[str, str] = {}

    plate = _extract_plate_from_text(work)
    if plate:
        result["plate"] = plate
        work = _PLATE_AUTO_RE.sub(" ", work)
        work = _PLATE_MOTO_RE.sub(" ", work)

    phone = _extract_phone_from_text(work)
    if phone:
        result["phone"] = phone
        work = _PHONE_FRAGMENT_RE.sub(" ", work)

    name = _extract_name_from_text(work)
    if not name:
        # В словаре имя не нашлось — пробуем эвристику «рядом с телефоном»
        # (ловит неполные/редкие имена независимо от порядка слов).
        name = _extract_name_by_phone_neighborhood(original, result.get("phone", ""))
    if name:
        result["name"] = name
        work = re.sub(
            rf"(?<![0-9A-Za-zА-Яа-яЁё]){re.escape(name)}(?![0-9A-Za-zА-Яа-яЁё])",
            " ",
            work,
            flags=re.IGNORECASE,
        )

    car = _extract_vehicle_from_text(work)
    if car:
        result["car"] = car
        # Вырезаем распознанную марку+модель, чтобы она не попала в «остаток»
        # текста и не загрязнила услугу (см. fallback ниже).
        work = re.sub(
            rf"(?<![0-9A-Za-zА-Яа-яЁё]){re.escape(car)}(?![0-9A-Za-zА-Яа-яЁё])",
            " ",
            work,
            flags=re.IGNORECASE,
        )

    service = _match_service_in_text(service_names, original)
    if service:
        result["service"] = service
    else:
        # Услуги в каталоге нет: как fallback берём остаток текста (после
        # вырезания номера/телефона/имени/авто), но только если текст не в
        # строгом формате «Ключ: значение» (иначе в остатке окажутся подписи).
        if not re.search(r"(?:Клиент|Телефон|Авто|Номер|Бокс|Комментарий)\s*:", original):
            rest = " ".join(work.split())
            if rest:
                result["service"] = rest
    return result


def _active_service_names(db: Any) -> list[str]:
    """Названия активных услуг из каталога — для распознавания в тексте события."""
    from .models import Service

    return [row.name for row in db.query(Service).filter(Service.active.is_(True)).all()]


def _booking_by_google_event(db: Any, event_id: str) -> Any | None:
    from .models import Booking

    return db.query(Booking).filter(Booking.google_event_id == event_id).first()


def _event_updated_utc(event: dict[str, Any]) -> datetime | None:
    """Метка «когда событие последний раз правилось» (event.updated) в UTC."""
    raw = event.get("updated")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def _event_is_stale(event: dict[str, Any], booking: Any) -> bool:
    """Правилось ли событие ПОЗЖЕ последней записи записи в Google.

    True — событие не менялось после того, как запись была записана в Google
    (например, её та же синхронизация из CRM). В этом случае правки Google не
    переносим: они либо совпадают с записью, либо старее — затирать CRM нельзя.
    """
    ev_updated = _event_updated_utc(event)
    if ev_updated is None:
        return False  # нет данных о времени правки — переносим (как раньше)
    booking_updated = booking.google_updated_at
    if booking_updated is None:
        return False  # запись никогда не пушилась в Google — Google источник
    if booking_updated.tzinfo is None:
        # SQLite возвращает naive datetime — считаем его UTC.
        booking_updated = booking_updated.replace(tzinfo=timezone.utc)
    return ev_updated <= booking_updated


def _update_booking_from_event(
    db: Any, booking: Any, event: dict[str, Any], settings: Settings
) -> None:
    """Перенести правки события Google в запись CRM (время + текст).

    Переносим только то, что владелец мог поменять в Google: время/длительность,
    услугу (заголовок), клиента (имя/телефон/авто/номер), бокс, комментарий.
    Статус, оплату и мастеров не трогаем — это зона ответственности CRM.

    Защита от конфликтов: если событие НЕ правилось после последней записи
    записи в Google (event.updated <= google_updated_at), ничего не переносим —
    значит запись недавно правилась в CRM, и событие ей уже соответствует
    (или старее). Правка в Google всегда обновляет event.updated — тогда
    переносим.
    """
    if _event_is_stale(event, booking):
        return

    start_local, end_local = _event_start_end(event, settings)
    if start_local is not None:
        duration = (
            max(30, int((end_local - start_local).total_seconds() // 60))
            if end_local is not None
            else booking.duration
        )
        new_date = start_local.strftime("%d.%m.%Y")
        new_time = start_local.strftime("%H:%M")
        if (
            booking.date != new_date
            or booking.time != new_time
            or int(booking.duration or 0) != duration
        ):
            booking.date = new_date
            booking.time = new_time
            booking.duration = duration

    # Текстовые правки: заголовок события -> услуга; описание -> клиент/бокс/комментарий.
    summary = (event.get("summary") or "").strip()
    if summary and summary != booking.service:
        booking.service = summary

    fields = _parse_event_description(event.get("description"))
    from .models import Client
    from .schemas import normalize_phone_digits

    updated_fields: set[str] = set()
    client = db.get(Client, booking.client_id)

    new_name = (fields.get("Клиент") or "").strip()
    if new_name and new_name != booking.client_name:
        booking.client_name = new_name
        updated_fields.add("name")

    new_phone = ""
    new_phone_raw = (fields.get("Телефон") or "").strip()
    if new_phone_raw:
        try:
            new_phone = normalize_phone_digits(new_phone_raw)
            if new_phone and new_phone != booking.client_phone:
                booking.client_phone = new_phone
                updated_fields.add("phone")
        except ValueError:
            pass

    new_car = (fields.get("Авто") or "").strip()
    if new_car and new_car != (booking.car or ""):
        booking.car = new_car
        updated_fields.add("car")

    new_plate = (fields.get("Номер") or "").strip()
    if new_plate and new_plate != (booking.plate or ""):
        booking.plate = new_plate
        updated_fields.add("plate")

    new_box = (fields.get("Бокс") or "").strip()
    if new_box and new_box != (booking.box or ""):
        booking.box = new_box

    new_notes = (fields.get("Комментарий") or "").strip()
    if new_notes and new_notes != (booking.notes or ""):
        booking.notes = new_notes

    # Клиента тоже пополняем — правка имени/телефона в Google видна в CRM.
    if client is not None:
        if "name" in updated_fields and new_name != (client.name or ""):
            client.name = new_name
        if "phone" in updated_fields and (not client.phone or client.phone == ""):
            client.phone = new_phone
        if "car" in updated_fields and not client.car:
            client.car = new_car
        if "plate" in updated_fields and not client.plate:
            client.plate = new_plate

    booking.google_updated_at = datetime.now(timezone.utc)


def _find_duplicate_booking(
    db: Any, client_id: str, date: str, time: str
) -> Any | None:
    """Активная запись клиента в том же слоте — кандидат на дубль.

    Защита от дублирования: если в боте уже создана запись на клиента в
    дату/время (и она ещё не отменена/завершена), а затем это же событие
    появляется из Google Calendar — новую запись не создаём.
    """
    from .models import Booking

    active = {"new", "confirmed", "scheduled", "in_progress", "admin_review"}
    return (
        db.query(Booking)
        .filter(
            Booking.client_id == client_id,
            Booking.date == date,
            Booking.time == time,
            Booking.status.in_(active),
            Booking.deleted_at.is_(None),
        )
        .first()
    )


def _create_booking_from_event(
    db: Any, event: dict[str, Any], settings: Settings
) -> bool:
    """Создать запись CRM (source="google") из события, созданного в Google.

    Возвращает True, если запись создана, False — если это дубль уже
    существующей активной записи клиента (созданной, например, из бота).
    """
    from .models import Booking, Client
    from .schemas import normalize_phone_digits

    start_local, end_local = _event_start_end(event, settings)
    if start_local is None:
        return False
    duration = (
        max(30, int((end_local - start_local).total_seconds() // 60))
        if end_local is not None
        else 30
    )
    fields = _parse_event_description(event.get("description"))
    description_text = event.get("description") or ""
    event_text = f"{event.get('summary') or ''}\n{description_text}"
    loose = _parse_event_text_loose(event_text, _active_service_names(db))
    phone = ""
    phone_raw = fields.get("Телефон") or loose.get("phone") or ""
    if phone_raw:
        try:
            phone = normalize_phone_digits(phone_raw)
        except ValueError:
            phone = ""

    client_name = fields.get("Клиент") or loose.get("name") or "Из Google-календаря"
    car = fields.get("Авто") or loose.get("car") or ""
    plate = fields.get("Номер") or loose.get("plate") or ""
    box = fields.get("Бокс") or ""

    # Сопоставляем с уже известным клиентом: в первую очередь по телефону
    # (точное совпадение, при неудаче — нормализованное сравнение), затем по
    # имени. Найденного клиента НЕ дублируем, а пополняем карточку данными.
    client = None
    if phone:
        client = (
            db.query(Client)
            .filter(Client.phone == phone, Client.deleted_at.is_(None))
            .first()
        )
        if client is None:
            normalized = phone
            for cand in (
                db.query(Client)
                .filter(Client.phone != "", Client.deleted_at.is_(None))
                .all()
            ):
                try:
                    if normalize_phone_digits(cand.phone) == normalized:
                        client = cand
                        break
                except ValueError:
                    continue
    if client is None and client_name not in {"", "Из Google-календаря"}:
        same = (
            db.query(Client)
            .filter(Client.name == client_name, Client.deleted_at.is_(None))
            .all()
        )
        if len(same) == 1:
            client = same[0]

    if client is None:
        client = Client(
            id=f"c-{uuid4()}",
            name=client_name,
            phone=phone,
            car=car,
            plate=plate,
            registered=True,
        )
        db.add(client)
    else:
        if not client.car and car:
            client.car = car
        if not client.plate and plate:
            client.plate = plate
        if client_name not in {"", "Из Google-календаря"} and (
            not client.name or client.name == "Из Google-календаря"
        ):
            client.name = client_name

    date = start_local.strftime("%d.%m.%Y")
    time = start_local.strftime("%H:%M")

    # Дубль: активная запись клиента уже есть в этом слоте -> не создаём.
    if _find_duplicate_booking(db, client.id, date, time):
        return False

    comments = fields.get("Комментарий") or ""
    booking = Booking(
        id=f"b-{uuid4()}",
        client_id=client.id,
        client_name=client_name,
        client_phone=phone,
        service=loose.get("service") or (event.get("summary") or "Запись из Google"),
        service_id="",
        date=date,
        time=time,
        duration=duration,
        price=0,
        status="scheduled",
        box=box,
        payment_type="cash",
        payment_settled=False,
        notes=comments or None,
        car=car,
        plate=plate,
        source="google",
        google_event_id=event.get("id"),
        google_updated_at=datetime.now(timezone.utc),
    )
    db.add(booking)
    return True


def _apply_calendar_event(
    db: Any, settings: Settings, event: dict[str, Any], result: dict[str, Any]
) -> None:
    """Применить одно событие Google к CRM (создать/обновить/отменить)."""
    event_id = event.get("id")
    if event.get("status") == "cancelled":
        booking = _booking_by_google_event(db, event_id)
        if booking is not None and booking.status not in {"completed", "cancelled"}:
            booking.status = "cancelled"
            result["cancelled"] += 1
        return

    private = (event.get("extendedProperties") or {}).get("private") or {}
    crm_booking_id = private.get("crmBookingId")
    if crm_booking_id:
        from .models import Booking

        booking = db.get(Booking, crm_booking_id)
        # Событие принадлежит нашей записи: переносим время в CRM, но только
        # если событие действительно наше (google_event_id совпадает/пуст).
        if booking is not None and booking.google_event_id in (None, event_id):
            _update_booking_from_event(db, booking, event, settings)
            if not booking.google_event_id:
                booking.google_event_id = event_id
            result["updated"] += 1
        return

    booking = _booking_by_google_event(db, event_id)
    if booking is not None:
        _update_booking_from_event(db, booking, event, settings)
        result["updated"] += 1
    elif _create_booking_from_event(db, event, settings):
        result["created"] += 1
    else:
        # Дубль уже существующей записи клиента — просто пропускаем.
        result["duplicates"] = result.get("duplicates", 0) + 1


def pull_calendar_changes(db: Any, settings: Settings) -> dict[str, Any]:
    """Обратная синхронизация «Google Calendar -> CRM».

    Инкрементальная через syncToken (Google Calendar API). Первый запуск —
    полный скан окна (30 дней назад .. 60 дней вперёд). События, созданные в
    Google, становятся записями CRM с source="google"; события с привязкой
    crmBookingId переносят время/длительность в существующую запись; удалённые
    события отменяют записи (статус cancelled).

    Вернёт статистику:
    {"ok": bool, "skipped": bool, "created": int, "updated": int,
     "cancelled": int, "duplicates": int, "error": str | None}

    Безопасное поведение: no-op (skipped=True), если сервис не настроен или
    токены не привязаны. Вызывающий ответственен за db.commit().
    """
    try:
        return _pull_calendar_changes_impl(db, settings)
    except Exception:
        logger.exception("Google Calendar pull failed")
        return {
            "ok": False,
            "skipped": False,
            "created": 0,
            "updated": 0,
            "cancelled": 0,
            "error": "pull_failed",
        }


def _pull_calendar_changes_impl(db: Any, settings: Settings) -> dict[str, Any]:
    result: dict[str, Any] = {
        "ok": True,
        "skipped": False,
        "created": 0,
        "updated": 0,
        "cancelled": 0,
        "duplicates": 0,
        "error": None,
    }
    if not is_configured(settings, db):
        result["skipped"] = True
        return result
    tokens = load_tokens(db)
    if not tokens or not tokens.get("refresh_token"):
        result["skipped"] = True
        return result

    sync_token = _load_sync_token(db)
    params: dict[str, Any] = {
        "singleEvents": True,
        "maxResults": 250,
    }
    if sync_token:
        params["syncToken"] = sync_token
    else:
        now = datetime.now(timezone.utc)
        params["timeMin"] = (now - timedelta(days=30)).isoformat()
        params["timeMax"] = (now + timedelta(days=60)).isoformat()

    try:
        page = None
        page_token = None
        while True:
            query = dict(params)
            if page_token:
                query["pageToken"] = page_token
            page = _calendar_request(
                db, settings, "GET", "calendars/primary/events", params=query
            )
            for item in page.get("items", []):
                _apply_calendar_event(db, settings, item, result)
            page_token = page.get("nextPageToken")
            if not page_token:
                break
        next_sync_token = page.get("nextSyncToken")
        if next_sync_token:
            _save_sync_token(db, next_sync_token)
    except _GoogleApiError as exc:
        # 410 GONE: syncToken устарел (календарь пересоздан) — полный рескан.
        if exc.status == 410:
            _save_sync_token(db, None)
            return _pull_calendar_changes_impl(db, settings)
        if exc.status in (401, 403):
            logger.warning("Google Calendar pull auth failed: %s", exc.details or exc)
            result.update(ok=False, error="auth_failed")
            if exc.reason == "accessNotConfigured":
                # 403 "Google Calendar API has not been used ... or it is disabled":
                # токены рабочие, но сам API не включён в проекте Google Cloud.
                result["errorDetails"] = (
                    "Google Calendar API не включён в проекте Google Cloud. "
                    "Включите его по этой ссылке: "
                    "https://console.cloud.google.com/apis/library/calendar.googleapis.com — "
                    "затем нажмите «Синхронизировать сейчас» ещё раз (подождите 1–2 минуты "
                    "после включения)."
                )
            elif exc.details:
                result["errorDetails"] = exc.details
            return result
        raise

    _save_last_sync(db)
    return result