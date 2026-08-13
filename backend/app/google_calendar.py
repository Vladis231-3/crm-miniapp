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
SYNCED_STATUSES = {"new", "confirmed", "scheduled", "in_progress"}

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
    """Вернуть OAuth-токены владельца или пустой dict."""
    AppSetting = _appsetting_model()
    row = db.get(AppSetting, GOOGLE_CALENDAR_TOKENS_KEY)
    if row is None:
        return {}
    value = row.value
    return value if isinstance(value, dict) else {}


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
    return resp.json()


class _GoogleApiError(Exception):
    """Ошибка Google Calendar API (HTTP status из ответа)."""

    def __init__(self, status: int, message: str = ""):
        super().__init__(message or f"google api error {status}")
        self.status = status


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
        raise _GoogleApiError(resp.status_code, "token_refresh_failed")
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
        raise _GoogleApiError(resp.status_code, f"google_api_{resp.status_code}")
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


def _booking_by_google_event(db: Any, event_id: str) -> Any | None:
    from .models import Booking

    return db.query(Booking).filter(Booking.google_event_id == event_id).first()


def _update_booking_from_event(booking: Any, event: dict[str, Any], settings: Settings) -> None:
    """Перенести в запись время/длительность события (если событие изменилось).

    Сознательно не трогаем статус, клиента, оплату и мастеров — это зона
    ответственности CRM. Правки, сделанные в Google, только переносят запись.
    """
    start_local, end_local = _event_start_end(event, settings)
    if start_local is None:
        return
    duration = (
        max(30, int((end_local - start_local).total_seconds() // 60))
        if end_local is not None
        else booking.duration
    )
    new_date = start_local.strftime("%d.%m.%Y")
    new_time = start_local.strftime("%H:%M")
    if booking.date == new_date and booking.time == new_time and int(booking.duration or 0) == duration:
        return
    booking.date = new_date
    booking.time = new_time
    booking.duration = duration
    booking.google_updated_at = datetime.now(timezone.utc)


def _create_booking_from_event(
    db: Any, event: dict[str, Any], settings: Settings
) -> None:
    """Создать запись CRM (source="google") из события, созданного в Google."""
    from .models import Booking, Client
    from .schemas import normalize_phone_digits

    start_local, end_local = _event_start_end(event, settings)
    if start_local is None:
        return
    duration = (
        max(30, int((end_local - start_local).total_seconds() // 60))
        if end_local is not None
        else 30
    )
    fields = _parse_event_description(event.get("description"))
    phone = ""
    phone_raw = fields.get("Телефон") or ""
    if phone_raw:
        try:
            phone = normalize_phone_digits(phone_raw)
        except ValueError:
            phone = ""

    client_name = fields.get("Клиент") or "Из Google-календаря"
    car = fields.get("Авто") or ""
    plate = fields.get("Номер") or ""
    box = fields.get("Бокс") or ""

    client = None
    if phone:
        client = db.query(Client).filter(Client.phone == phone).first()
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

    comments = fields.get("Комментарий") or ""
    booking = Booking(
        id=f"b-{uuid4()}",
        client_id=client.id,
        client_name=client_name,
        client_phone=phone,
        service=event.get("summary") or "Запись из Google",
        service_id="",
        date=start_local.strftime("%d.%m.%Y"),
        time=start_local.strftime("%H:%M"),
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
            _update_booking_from_event(booking, event, settings)
            if not booking.google_event_id:
                booking.google_event_id = event_id
            result["updated"] += 1
        return

    booking = _booking_by_google_event(db, event_id)
    if booking is not None:
        _update_booking_from_event(booking, event, settings)
        result["updated"] += 1
    else:
        _create_booking_from_event(db, event, settings)
        result["created"] += 1


def pull_calendar_changes(db: Any, settings: Settings) -> dict[str, Any]:
    """Обратная синхронизация «Google Calendar -> CRM».

    Инкрементальная через syncToken (Google Calendar API). Первый запуск —
    полный скан окна (30 дней назад .. 60 дней вперёд). События, созданные в
    Google, становятся записями CRM с source="google"; события с привязкой
    crmBookingId переносят время/длительность в существующую запись; удалённые
    события отменяют записи (статус cancelled).

    Вернёт статистику:
    {"ok": bool, "skipped": bool, "created": int, "updated": int,
     "cancelled": int, "error": str | None}

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
    except _GoogleApiError as exc:  # noqa: BLE001
        # 410 GONE: syncToken устарел (календарь пересоздан) — полный рескан.
        if exc.status == 410:
            _save_sync_token(db, None)
            return _pull_calendar_changes_impl(db, settings)
        if exc.status in (401, 403):
            logger.warning("Google Calendar pull auth failed")
            result.update(ok=False, error="auth_failed")
            return result
        raise

    _save_last_sync(db)
    return result