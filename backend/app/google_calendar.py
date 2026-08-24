"""Синхронизация записей (Booking) с Google Calendar.

Двусторонняя синхронизация:
- бот/CRM -> Google: записи (бот, веб-миниапп, владелец) автоматически
  отражаются в Google-календаре владельца (sync_booking_to_calendar);
- Google -> CRM: события, созданные/изменённые в Google, попадают в CRM
  (pull_calendar_changes). Инкрементальная синхронизация через syncToken.

Безопасное поведение: если сервис не настроен (нет GOOGLE_CALENDAR_CLIENT_ID
и SECRET в env и не сохранены учётные данные через UI) или нет ни одного
подключённого Google-аккаунта, все функции — no-op. Интеграция «включается»
учётными данными OAuth-клиента: владелец может ввести их в интерфейсе настроек
(хранятся в AppSetting под GOOGLE_CALENDAR_CREDENTIALS_KEY, перекрывают env),
либо администратор прописывает env-переменные. Приложение и тесты работают
без Google-аккаунта.

Мультиподключение: календари могут подключить несколько человек (владелец +
приглашённые по ссылке). Подключения хранятся в AppSetting под ключом
GOOGLE_CALENDAR_CONNECTIONS_KEY — список dict {id, name, email, tokens,
sync_token, created_at}. Запись синхронизируется во ВСЕ подключённые
календари; обратная синхронизация читает их все. Идентификаторы событий по
каждому календарю хранятся на записи в google_event_ids ({connection_id:
event_id}); колонка google_event_id сохраняется для первого подключения
(совместимость). Старое хранилище GOOGLE_CALENDAR_TOKENS_KEY мигрируется в
первое подключение автоматически при первой записи.
"""

from __future__ import annotations

import base64
import json
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
# Мультиподключение: список календарей разных людей.
GOOGLE_CALENDAR_CONNECTIONS_KEY = "google_calendar_connections"
# Ожидающие приглашения (ссылки, разосланные владельцем): state -> label.
GOOGLE_CALENDAR_INVITES_KEY = "google_calendar_pending_invites"

# Подключение владельца (первое, создаётся через /auth-url + callback).
OWNER_CONNECTION_ID = "owner"

# Статусы Booking, при которых запись считается активной и синхронизируется.
# admin_review — заявка от клиента ещё не подтверждена админом, но уже должна
# попадать в Google Calendar (при отмене/удалении событие удаляется).
SYNCED_STATUSES = {"new", "confirmed", "scheduled", "in_progress", "admin_review"}

# Человекочитаемые подписи источников записи (поле Booking.source).
SOURCE_LABELS = {"bot": "Бот", "google": "Google", "manual": "Вручную"}

_SCOPES = ["https://www.googleapis.com/auth/calendar.events", "email", "openid"]

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


# ─────────────────────────────────────────────────────────────────────────────
# Подключения календарей (мультиаккаунт)
# ─────────────────────────────────────────────────────────────────────────────


def _default_connection(tokens: dict[str, Any] | None = None) -> dict[str, Any]:
    """Шаблон подключения владельца."""
    return {
        "id": OWNER_CONNECTION_ID,
        "name": "Владелец",
        "email": "",
        "tokens": dict(tokens or {}),
        "sync_token": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def _read_legacy_tokens(db: Any) -> dict[str, Any]:
    """Токены из старого ключа google_calendar_tokens (до мультиподключения)."""
    AppSetting = _appsetting_model()
    row = db.get(AppSetting, GOOGLE_CALENDAR_TOKENS_KEY)
    if row is None or not isinstance(row.value, dict):
        return {}
    value = dict(row.value)
    if not value.get("token") and value.get("access_token"):
        value["token"] = value["access_token"]
    return value


def _read_connections(db: Any) -> list[dict[str, Any]]:
    """Прочитать список подключений (полные dict с токенами).

    Совместимость: если ключ подключений отсутствует/пуст, но есть legacy-
    токены (google_calendar_tokens) — вернуть одно подключение «Владелец»
    на их основе. Чтение ничего не пишет; миграция завершается при первой
    записи (_write_connections удаляет legacy-ключ).
    """
    AppSetting = _appsetting_model()
    row = db.get(AppSetting, GOOGLE_CALENDAR_CONNECTIONS_KEY)
    raw = row.value if row is not None else None
    conns: list[dict[str, Any]] = []
    if isinstance(raw, dict):
        items = raw.get("connections")
        if isinstance(items, list):
            conns = [dict(item) for item in items if isinstance(item, dict)]
    elif isinstance(raw, list):  # защита от альтернативных форматов
        conns = [dict(item) for item in raw if isinstance(item, dict)]
    if not conns:
        tokens = _read_legacy_tokens(db)
        if tokens:
            conns = [_default_connection(tokens)]
    return conns


def _write_connections(db: Any, connections: list[dict[str, Any]]) -> None:
    """Сохранить весь список подключений (upsert) и завершить legacy-миграцию.

    Ключи с префиксом "_" (служебные маркеры вроде _dirty) не сохраняются.
    """
    clean: list[dict[str, Any]] = []
    for conn in connections:
        item = {k: v for k, v in dict(conn).items() if not str(k).startswith("_")}
        if item.get("id"):
            clean.append(item)
    AppSetting = _appsetting_model()
    row = db.get(AppSetting, GOOGLE_CALENDAR_CONNECTIONS_KEY)
    payload = {"connections": clean}
    if row is None:
        db.add(AppSetting(key=GOOGLE_CALENDAR_CONNECTIONS_KEY, value=payload))
    else:
        row.value = payload
    # Legacy-ключи больше не источник истины — удаляем.
    for key in (GOOGLE_CALENDAR_TOKENS_KEY, GOOGLE_CALENDAR_SYNC_TOKEN_KEY):
        legacy_row = db.get(AppSetting, key)
        if legacy_row is not None:
            db.delete(legacy_row)
    db.flush()


def get_connection(db: Any, connection_id: str) -> dict[str, Any] | None:
    """Полное подключение по id (с токенами) или None."""
    for conn in _read_connections(db):
        if str(conn.get("id")) == connection_id:
            return conn
    return None


def list_connections(db: Any) -> list[dict[str, Any]]:
    """Публичный список подключений (без токенов) — для UI владельца."""
    return [
        {
            "id": str(conn.get("id") or ""),
            "name": str(conn.get("name") or ""),
            "email": str(conn.get("email") or ""),
            "createdAt": str(conn.get("created_at") or ""),
        }
        for conn in _read_connections(db)
    ]


def upsert_connection(db: Any, connection: dict[str, Any]) -> None:
    """Добавить подключение или обновить существующее (по полю id)."""
    connections = _read_connections(db)
    conn_id = str(connection.get("id") or "")
    for index, existing in enumerate(connections):
        if str(existing.get("id")) == conn_id:
            connections[index] = {**existing, **dict(connection)}
            break
    else:
        connections.append(dict(connection))
    _write_connections(db, connections)


def delete_connection(db: Any, connection_id: str) -> bool:
    """Удалить одно подключение. True, если оно существовало."""
    connections = _read_connections(db)
    remaining = [c for c in connections if str(c.get("id")) != connection_id]
    if len(remaining) == len(connections):
        return False
    _write_connections(db, remaining)
    return True


def _usable_connections(db: Any) -> list[dict[str, Any]]:
    """Подключения, готовые к запросам (есть refresh_token)."""
    return [
        conn
        for conn in _read_connections(db)
        if isinstance(conn.get("tokens"), dict) and conn["tokens"].get("refresh_token")
    ]


def _persist_dirty_connections(db: Any, connections: list[dict[str, Any]]) -> None:
    """Сохранить подключения с изменёнными токенами/sync_token (маркер _dirty).

    Маркер ставится при refresh access-токена и обновлении syncToken; здесь он
    снимается, а подключение целиком перезаписывается в хранилище.
    """
    for conn in connections:
        if conn.pop("_dirty", False):
            upsert_connection(db, conn)


# ─────────────────────────────────────────────────────────────────────────────
# Приглашения (владелец создаёт ссылку и пересылает человеку)
# ─────────────────────────────────────────────────────────────────────────────


def create_invite(db: Any, label: str, state: str) -> dict[str, Any]:
    """Запомнить приглашение: state OAuth-ссылки -> имя приглашённого."""
    invite = {
        "state": state,
        "label": label,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    AppSetting = _appsetting_model()
    row = db.get(AppSetting, GOOGLE_CALENDAR_INVITES_KEY)
    invites: list[dict[str, Any]] = []
    if row is not None and isinstance(row.value, dict):
        raw = row.value.get("invites")
        if isinstance(raw, list):
            invites = [item for item in raw if isinstance(item, dict)]
    invites = [item for item in invites if item.get("state") != state]
    invites.append(invite)
    payload = {"invites": invites[-50:]}  # ограничиваем рост списка
    if row is None:
        db.add(AppSetting(key=GOOGLE_CALENDAR_INVITES_KEY, value=payload))
    else:
        row.value = payload
    db.flush()
    return invite


def consume_invite(db: Any, state: str) -> dict[str, Any] | None:
    """Найти приглашение по state и удалить его (одноразовое)."""
    AppSetting = _appsetting_model()
    row = db.get(AppSetting, GOOGLE_CALENDAR_INVITES_KEY)
    if row is None or not isinstance(row.value, dict):
        return None
    raw = row.value.get("invites")
    if not isinstance(raw, list):
        return None
    found: dict[str, Any] | None = None
    invites: list[dict[str, Any]] = []
    for item in raw:
        if isinstance(item, dict) and not found and item.get("state") == state:
            found = item
            continue
        invites.append(item if isinstance(item, dict) else {})
    if found is None:
        return None
    row.value = {"invites": invites}
    db.flush()
    return found


def clear_invites(db: Any) -> None:
    """Удалить все ожидающие приглашения (например, при полном отключении)."""
    AppSetting = _appsetting_model()
    row = db.get(AppSetting, GOOGLE_CALENDAR_INVITES_KEY)
    if row is not None:
        db.delete(row)
    db.flush()


def extract_account_email(tokens: dict[str, Any] | None) -> str:
    """Email Google-аккаунта из id_token (JWT payload), если он есть.

    Scope email добавлен к запросу авторизации, поэтому Google присылает
    id_token; подпись не проверяем (токен получен напрямую от Google по TLS),
    нам нужен только claim email.
    """
    raw = str((tokens or {}).get("id_token") or "")
    try:
        payload_b64 = raw.split(".")[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        return str(payload.get("email") or "")
    except Exception:  # noqa: BLE001 — битый/отсутствующий id_token не критичен
        return ""


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
    """Вернуть OAuth-токены первого подключения или пустой dict.

    Совместимость: функция сохранена для старого кода/тестов — в
    мультиподключенном мире токены лежат внутри подключений
    (_read_connections), а «первое» подключение играет роль основного.
    Токены, сохранённые старыми версиями (сырой ответ token-эндпоинта
    Google с ключом "access_token"), нормализуются в ключ "token".
    """
    connections = _read_connections(db)
    if not connections:
        return {}
    tokens = dict(connections[0].get("tokens") or {})
    if not tokens.get("token") and tokens.get("access_token"):
        tokens["token"] = tokens["access_token"]
    return tokens


def save_tokens(db: Any, tokens: dict[str, Any]) -> None:
    """Сохранить OAuth-токены в первое подключение (создать при отсутствии).

    Совместимость со старым кодом: раньше токены лежали отдельным ключом,
    теперь — внутри подключения владельца.
    """
    connections = _read_connections(db)
    if not connections:
        connections = [_default_connection()]
        connections[0]["_dirty"] = True
    connections[0]["tokens"] = dict(tokens)
    connections[0]["_dirty"] = True
    _persist_dirty_connections(db, connections)


def clear_tokens(db: Any) -> None:
    """Отключить интеграцию полностью: удалить все подключения и состояние."""
    AppSetting = _appsetting_model()
    for key in (
        GOOGLE_CALENDAR_TOKENS_KEY,
        GOOGLE_CALENDAR_SYNC_TOKEN_KEY,
        GOOGLE_CALENDAR_LAST_SYNC_KEY,
        GOOGLE_CALENDAR_CONNECTIONS_KEY,
    ):
        row = db.get(AppSetting, key)
        if row is not None:
            db.delete(row)
    db.flush()


# Подстроки, указывающие на отзыв/истечение refresh-токена (invalid_grant).
_REVOKED_DETAILS_SUBSTRINGS = (
    "expired or revoked",
    "invalid_grant",
    "token has been expired",
    "revoked",
)


def _is_token_revoked_error(exc: _GoogleApiError) -> bool:
    """True, если ошибка — истёкший/отозванный токен (нужен повторный OAuth).

    Google возвращает 400 invalid_grant с описанием
    "Token has been expired or revoked." — это не временный сбой,
    а требование переподключить календарь.
    """
    # _GoogleApiError может быть ещё не определён при импорте — проверяем
    # наличие атрибутов безопасно.
    reason = getattr(exc, "reason", None) or ""
    details = getattr(exc, "details", None) or ""
    msg = str(exc) or ""
    haystack = f"{reason} {details} {msg}".lower()
    for substr in _REVOKED_DETAILS_SUBSTRINGS:
        if substr in haystack:
            return True
    # Явный 400+invalid_grant с любого места ответа
    if getattr(exc, "status", None) == 400 and "invalid_grant" in haystack:
        return True
    return False


def _disable_integration_on_revoked(db: Any, connection_id: str | None = None) -> None:
    """Отключить Google Calendar при отозванном токене.

    Если задан connection_id — удаляем только это подключение (остальные
    календари продолжают работать); иначе чистим всё. Флаг
    owner_integrations.googleCalendar сбрасываем, только если подключений
    не осталось, чтобы UI снова показал «требуется подключение», а
    фоновый sync стал no-op (skipped=True).
    """
    try:
        if connection_id:
            delete_connection(db, connection_id)
            if _read_connections(db):
                return  # есть другие календари — флаг не трогаем
        else:
            clear_tokens(db)
        AppSetting = _appsetting_model()
        row = db.get(AppSetting, "owner_integrations")
        if row is not None and isinstance(row.value, dict) and row.value.get("googleCalendar"):
            new_val = dict(row.value)
            new_val["googleCalendar"] = False
            row.value = new_val
            db.flush()
    except Exception:
        logger.exception("Failed to disable Google integration after token revocation")


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
    # (access_token из ответа token-эндпоинта Google). Поддерживаем
    # и "token" для совместимости с моками/старыми тестами. id_token
    # нужен только для extract_account_email и в хранилище не сохраняется.
    return {
        "token": data.get("access_token") or data.get("token", ""),
        "refresh_token": data.get("refresh_token", ""),
        "expires_in": data.get("expires_in", 3600),
        "scope": data.get("scope", ""),
        "token_type": data.get("token_type", "Bearer"),
        "refresh_token_expires_in": data.get("refresh_token_expires_in"),
        "id_token": data.get("id_token", ""),
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
    conn: dict[str, Any] | None = None,
    _retried: bool = False,
) -> dict[str, Any]:
    """Выполнить запрос к Google Calendar API v3 (чистый HTTP, без SDK).

    path — путь после /calendar/v3/, например "calendars/primary/events".
    conn — конкретное подключение (токены берутся из него); если не задан,
    используются токены первого подключения (совместимость). При 401/403
    автоматически обновляет access_token по refresh_token (один повтор),
    обновлённые токены сохраняются в то же подключение. Возвращает
    JSON-ответ ({} для пустого тела, напр. DELETE).
    """
    if conn is not None:
        tokens = dict(conn.get("tokens") or {})
    else:
        tokens = load_tokens(db)
    if not tokens or not tokens.get("token"):
        raise _GoogleApiError(401, "no_token")
    url = f"https://www.googleapis.com/calendar/v3/{path}"
    headers = {"Authorization": f"Bearer {tokens['token']}"}
    resp = requests.request(method, url, params=params, json=body, headers=headers, timeout=30)
    if resp.status_code in (401, 403) and not _retried and tokens.get("refresh_token"):
        try:
            new_tokens = _refresh_access_token(settings, tokens, db=db)
        except _GoogleApiError as refresh_exc:
            if _is_token_revoked_error(refresh_exc):
                _disable_integration_on_revoked(
                    db, connection_id=str(conn.get("id")) if conn else None
                )
                logger.warning(
                    "Google Calendar refresh token revoked/expired, integration disabled. Please reconnect. Details: %s",
                    refresh_exc.details or refresh_exc,
                )
                raise _GoogleApiError(
                    401,
                    "invalid_grant",
                    reason="invalid_grant",
                    details="Token has been expired or revoked. Please reconnect Google Calendar.",
                ) from refresh_exc
            raise
        if conn is not None:
            conn["tokens"] = new_tokens
            conn["_dirty"] = True  # сохранит обёртка (_persist_dirty_connections)
        else:
            save_tokens(db, new_tokens)
        return _calendar_request(
            db, settings, method, path, params=params, body=body, conn=conn, _retried=True
        )
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
    """Синхронизировать запись со ВСЕМИ подключёнными Google-календарями.

    action: "upsert" — создать/обновить события; "delete" — удалить события.

    Вернёт (google_event_id, ok). google_event_id — идентификатор события в
    первом (основном) подключении; ok=False, если не сработало ни одно
    подключение. Событие каждого календаря хранится на записи в
    google_event_ids ({connection_id: event_id}). Ошибки отдельных
    календарей изолируются и логируются — синхронизация никогда не должна
    ломать бронирование. Вызывающий ответственен за db.commit().
    """
    try:
        return _sync_booking_to_calendar_impl(db, settings, booking, action=action)
    except _GoogleApiError as exc:
        if _is_token_revoked_error(exc):
            try:
                _disable_integration_on_revoked(db)
            except Exception:
                pass
            logger.warning(
                "Google Calendar sync skipped - token revoked/expired (booking=%s). Please reconnect. Details: %s",
                getattr(booking, "id", None),
                exc.details or exc,
            )
            return getattr(booking, "google_event_id", None), False
        logger.exception("Google Calendar sync failed (booking=%s)", getattr(booking, "id", None))
        return getattr(booking, "google_event_id", None), False
    except Exception:
        logger.exception("Google Calendar sync failed (booking=%s)", getattr(booking, "id", None))
        return getattr(booking, "google_event_id", None), False


def _connection_event_ids(booking: Any, connections: list[dict[str, Any]]) -> dict[str, str]:
    """Карта {connection_id: event_id} для записи.

    Совместимость: у записей, созданных до мультиподключения, заполнена
    только колонка google_event_id — считаем её событием первого
    подключения.
    """
    mapping = getattr(booking, "google_event_ids", None)
    event_ids: dict[str, str] = {}
    if isinstance(mapping, dict):
        event_ids = {
            str(key): str(value) for key, value in mapping.items() if key and value
        }
    if not event_ids:
        legacy = getattr(booking, "google_event_id", None)
        if legacy and connections:
            event_ids = {str(connections[0].get("id")): str(legacy)}
    return event_ids


def _sync_booking_to_calendar_impl(
    db: Any, settings: Settings, booking: Any, *, action: str
) -> tuple[str | None, bool]:
    if not is_configured(settings, db):
        return None, False
    connections = _usable_connections(db)
    if not connections:
        return None, False

    event_ids = _connection_event_ids(booking, connections)

    # Неактивная запись (например, отменена) — убираем события из календарей.
    status = getattr(booking, "status", "")
    is_active = status in SYNCED_STATUSES
    if action == "upsert" and not is_active:
        action = "delete"

    if action == "delete":
        deleted_any = False
        for conn in connections:
            event_id = event_ids.get(str(conn.get("id")))
            if not event_id:
                continue
            try:
                _calendar_request(
                    db,
                    settings,
                    "DELETE",
                    f"calendars/primary/events/{event_id}",
                    params={"sendUpdates": "none"},
                    conn=conn,
                )
                event_ids.pop(str(conn.get("id")), None)
                deleted_any = True
            except _GoogleApiError as exc:
                if _is_token_revoked_error(exc):
                    _disable_integration_on_revoked(db, connection_id=str(conn.get("id")))
                else:
                    logger.exception(
                        "Google Calendar delete failed (booking=%s, calendar=%s)",
                        getattr(booking, "id", None),
                        conn.get("name") or conn.get("id"),
                    )
            except Exception:
                logger.exception(
                    "Google Calendar delete failed (booking=%s, calendar=%s)",
                    getattr(booking, "id", None),
                    conn.get("name") or conn.get("id"),
                )
        primary = event_ids.get(str(connections[0].get("id"))) or None
        booking.google_event_ids = dict(event_ids)
        booking.google_event_id = primary
        if deleted_any:
            booking.google_updated_at = datetime.now(timezone.utc)
        _persist_dirty_connections(db, connections)
        return primary, True

    body = _booking_event_body(booking, settings)

    ok_any = False
    for conn in connections:
        conn_id = str(conn.get("id"))
        event_id = event_ids.get(conn_id)
        try:
            if event_id:
                _calendar_request(
                    db,
                    settings,
                    "PATCH",
                    f"calendars/primary/events/{event_id}",
                    params={"sendUpdates": "none"},
                    body=body,
                    conn=conn,
                )
                ok_any = True
            else:
                created = _calendar_request(
                    db,
                    settings,
                    "POST",
                    "calendars/primary/events",
                    params={"sendUpdates": "none"},
                    body=body,
                    conn=conn,
                )
                new_id = created.get("id")
                if new_id:
                    event_ids[conn_id] = str(new_id)
                    ok_any = True
        except _GoogleApiError as exc:
            if _is_token_revoked_error(exc):
                logger.warning(
                    "Google Calendar sync skipped - token revoked/expired "
                    "(booking=%s, calendar=%s). Please reconnect. Details: %s",
                    getattr(booking, "id", None),
                    conn.get("name") or conn_id,
                    exc.details or exc,
                )
                _disable_integration_on_revoked(db, connection_id=conn_id)
            else:
                logger.exception(
                    "Google Calendar sync failed (booking=%s, calendar=%s)",
                    getattr(booking, "id", None),
                    conn.get("name") or conn_id,
                )
        except Exception:
            logger.exception(
                "Google Calendar sync failed (booking=%s, calendar=%s)",
                getattr(booking, "id", None),
                conn.get("name") or conn_id,
            )

    if ok_any:
        booking.google_updated_at = datetime.now(timezone.utc)
    primary = event_ids.get(str(connections[0].get("id"))) or None
    booking.google_event_ids = dict(event_ids)
    booking.google_event_id = primary
    _persist_dirty_connections(db, connections)
    return primary, ok_any


# ─────────────────────────────────────────────────────────────────────────────
# Обратная синхронизация: Google Calendar -> CRM
# ─────────────────────────────────────────────────────────────────────────────


def _load_sync_token(db: Any) -> str | None:
    """syncToken первого подключения (совместимость) или None."""
    connections = _read_connections(db)
    if not connections:
        return None
    return connections[0].get("sync_token") or None


def _save_sync_token(db: Any, sync_token: str | None) -> None:
    """Сохранить syncToken первого подключения (совместимость)."""
    connections = _read_connections(db)
    if not connections:
        return
    connections[0]["sync_token"] = sync_token
    connections[0]["_dirty"] = True
    _persist_dirty_connections(db, connections)


def _set_connection_sync_token(conn: dict[str, Any], sync_token: str | None) -> None:
    """Отметить syncToken подключения (сохранится через _persist_dirty)."""
    conn["sync_token"] = sync_token
    conn["_dirty"] = True


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
_FIELD_PREFIXES = {"Клиент", "Телефон", "Авто", "Номер", "Бокс", "Комментарий", "Услуга"}


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
        # китайские и новые марки (латиница)
        "avatr", "baic", "changhe", "dayun", "denza", "foton", "gac", "jetour",
        "leapmotor", "li", "maxus", "neta", "polestar", "skywell", "tang",
        "tank", "vortex", "voyah", "wuling", "xpeng", "yangwang", "yunus",
        # кириллица
        "ауди", "бмв", "ваз", "вольво", "газ", "гели", "джили", "джип",
        "дэу", "деу", "киа", "лада", "лексус", "мазда", "мерседес",
        "мерседес-бенц", "митсубиси", "мицубиси", "москвич", "ниссан",
        "опель", "пежо", "порше", "рено", "саньонг", "ссанъёнг", "субару",
        "судзуки", "тойота", "уаз", "фольксваген", "форд", "хендай",
        "хёндай", "хонда", "черри", "шкода", "шевроле", "эксид", "ягуар",
        # китайские и новые марки (кириллица)
        "аватр", "данза", "джетур", "зис", "кадиллак", "линкольн",
        "максус", "нета", "полстар", "танк", "фотон", "хавал",
        "эмгэ", "волксваген", "воях", "вулинг", "сяопэн",
        "леап", "ли", "джи-эм",
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

# Иностранные номера (Европа: M123AB / ABC123 / B123CDE; Казахстан KA123AB;
# новые казахстанские 123ABC7; Украина) — буквы латиницей любого регистра.
# Чтобы не спутать с российским номером и не зацепить телефон, требуем минимум
# 2 латинские буквы и не менее 4 символов, буквы только справа от цифр/слева.
_PLATE_FOREIGN_RE = re.compile(
    r"(?<![0-9A-Za-zА-Яа-яЁё])"
    r"[a-z]{1,3}\d{2,4}[a-z]{1,2}"
    r"(?![0-9A-Za-zА-Яа-яЁё])",
    flags=re.IGNORECASE,
)


def _extract_plate_from_text(text: str) -> str:
    """Найти госномер в свободном тексте (или пустую строку).

    Сначала российские (авто + мото), затем иностранные. Иностранные
    распознаём только если в тексте нет российского формата — иначе буквы
    «M123AB» могли бы конфликтовать.
    """
    from .schemas import normalize_plate

    for candidate in _PLATE_AUTO_RE.findall(text) + _PLATE_MOTO_RE.findall(text):
        try:
            return normalize_plate(candidate)
        except ValueError:
            continue

    # Иностранные номера: только латиница, длина 4-10. «M123AB» -> m123ab.
    for candidate in _PLATE_FOREIGN_RE.findall(text):
        try:
            return normalize_plate(candidate, plate_type="foreign")
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
        work = _PLATE_FOREIGN_RE.sub(" ", work)

    # Авто извлекаем ДО имени: модель («хавал джолион») не должна попасть в
    # эвристику имени рядом с телефоном («Джолион»).
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

    # Текст без номера и авто, но с телефоном — для эвристики имени рядом с
    # телефоном (чтобы буквы госномера «У888УУ716» не стали именем «Уу»).
    name_work = work

    phone = _extract_phone_from_text(work)
    if phone:
        result["phone"] = phone
        work = _PHONE_FRAGMENT_RE.sub(" ", work)

    name = _extract_name_from_text(work)
    if not name:
        # В словаре имя не нашлось — пробуем эвристику «рядом с телефоном»
        # (ловит неполные/редкие имена независимо от порядка слов).
        name = _extract_name_by_phone_neighborhood(name_work, result.get("phone", ""))
    if name:
        result["name"] = name
        work = re.sub(
            rf"(?<![0-9A-Za-zА-Яа-яЁё]){re.escape(name)}(?![0-9A-Za-zА-Яа-яЁё])",
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
    """Запись по идентификатору события Google из любого подключённого календаря."""
    from .models import Booking

    booking = db.query(Booking).filter(Booking.google_event_id == event_id).first()
    if booking is not None:
        return booking
    # События не-основных календарей хранятся в карте google_event_ids.
    candidates = (
        db.query(Booking)
        .filter(Booking.google_event_ids.isnot(None))
        .order_by(Booking.created_at.desc())
        .limit(500)
        .all()
    )
    for candidate in candidates:
        mapping = candidate.google_event_ids
        if isinstance(mapping, dict) and event_id in {str(v) for v in mapping.values()}:
            return candidate
    return None


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
    # Свободно введённый текст (без подписей «Авто:»/«Номер:») распознаём тем же
    # парсером, что и при создании записи, чтобы правки в Google доходили до CRM.
    summary = (event.get("summary") or "").strip()
    description_text = event.get("description") or ""
    description_fields = _parse_event_description(description_text)
    event_text_for_loose = f"{event.get('summary') or ''}\n{description_text}"
    loose = _parse_event_text_loose(event_text_for_loose, _active_service_names(db))

    from .models import Client
    from .schemas import normalize_phone_digits

    # Услуга: структурированная подпись -> свободно распознанный -> заголовок события.
    # Если весь заголовок «съеден» как авто/номер («бмв х5 у888уу716»), мы не должны
    # записать его в поле услуги: услугу берём только из описания/подписи.
    new_service = description_fields.get("Услуга") or loose.get("service") or ""
    if not new_service and not (loose.get("car") or loose.get("plate")):
        # Заголовок — это услуга, только если он не распознался как авто/номер.
        new_service = summary
    if new_service and new_service != booking.service:
        booking.service = new_service

    fields = description_fields
    updated_fields: set[str] = set()
    client = db.get(Client, booking.client_id)

    new_name = (fields.get("Клиент") or loose.get("name") or "").strip()
    if new_name and new_name != booking.client_name:
        booking.client_name = new_name
        updated_fields.add("name")

    new_phone = ""
    new_phone_raw = (fields.get("Телефон") or loose.get("phone") or "").strip()
    if new_phone_raw:
        try:
            new_phone = normalize_phone_digits(new_phone_raw)
            if new_phone and new_phone != booking.client_phone:
                booking.client_phone = new_phone
                updated_fields.add("phone")
        except ValueError:
            pass

    new_car = (fields.get("Авто") or loose.get("car") or "").strip()
    if new_car and new_car != (booking.car or ""):
        booking.car = new_car
        updated_fields.add("car")

    new_plate = _extract_plate_from_text(
        fields.get("Номер") or loose.get("plate") or ""
    ) or _extract_plate_from_text(event_text_for_loose)
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
    """Обратная синхронизация «Google Calendar -> CRM» по ВСЕМ подключениям.

    Инкрементальная через syncToken (Google Calendar API, у каждого
    подключения свой). Первый запуск — полный скан окна (30 дней назад ..
    60 дней вперёд). События, созданные в Google, становятся записями CRM с
    source="google"; события с привязкой crmBookingId переносят
    время/длительность в существующую запись; удалённые события отменяют
    записи (статус cancelled). Ошибка одного календаря не мешает остальным.

    Вернёт суммарную статистику:
    {"ok": bool, "skipped": bool, "created": int, "updated": int,
     "cancelled": int, "duplicates": int, "error": str | None}

    Безопасное поведение: no-op (skipped=True), если сервис не настроен или
    нет ни одного рабочего подключения. Вызывающий ответственен за
    db.commit().
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
            "duplicates": 0,
            "error": "pull_failed",
        }


def _empty_pull_result() -> dict[str, Any]:
    return {
        "ok": True,
        "skipped": False,
        "created": 0,
        "updated": 0,
        "cancelled": 0,
        "duplicates": 0,
        "error": None,
    }


def _pull_one_calendar(db: Any, settings: Settings, conn: dict[str, Any]) -> dict[str, Any]:
    """Обратная синхронизация одного календаря. Возвращает свою статистику.

    result["ok"]=False при ошибке календаря; отозванный токен удаляет
    подключение из хранилища.
    """
    result = _empty_pull_result()
    params: dict[str, Any] = {
        "singleEvents": True,
        "maxResults": 250,
    }
    sync_token = conn.get("sync_token")
    if sync_token:
        params["syncToken"] = sync_token
    else:
        now = datetime.now(timezone.utc)
        params["timeMin"] = (now - timedelta(days=30)).isoformat()
        params["timeMax"] = (now + timedelta(days=60)).isoformat()

    # Одна попытка + повтор после сброса устаревшего syncToken (410).
    for attempt in range(2):
        page: dict[str, Any] = {}
        page_token: str | None = None
        try:
            while True:
                query = dict(params)
                if page_token:
                    query["pageToken"] = page_token
                page = _calendar_request(
                    db, settings, "GET", "calendars/primary/events",
                    params=query, conn=conn,
                )
                for item in page.get("items", []):
                    _apply_calendar_event(db, settings, item, result)
                page_token = page.get("nextPageToken")
                if not page_token:
                    break
        except _GoogleApiError as exc:
            if exc.status == 410 and attempt == 0:
                # syncToken устарел (календарь пересоздан) — полный рескан.
                _set_connection_sync_token(conn, None)
                params.pop("syncToken", None)
                now = datetime.now(timezone.utc)
                params["timeMin"] = (now - timedelta(days=30)).isoformat()
                params["timeMax"] = (now + timedelta(days=60)).isoformat()
                continue
            raise
        next_sync_token = page.get("nextSyncToken")
        if next_sync_token:
            _set_connection_sync_token(conn, str(next_sync_token))
        return result
    return result


def _pull_calendar_changes_impl(db: Any, settings: Settings) -> dict[str, Any]:
    result = _empty_pull_result()
    if not is_configured(settings, db):
        result["skipped"] = True
        return result
    connections = _usable_connections(db)
    if not connections:
        result["skipped"] = True
        return result

    any_ok = False
    errors: list[tuple[str | None, str]] = []  # (код, детали) по сломанным календарям
    for conn in connections:
        conn_label = str(conn.get("name") or conn.get("id") or "")
        try:
            stats = _pull_one_calendar(db, settings, conn)
        except _GoogleApiError as exc:
            if _is_token_revoked_error(exc):
                logger.warning(
                    "Google Calendar pull token revoked/expired (calendar=%s): %s",
                    conn_label,
                    exc.details or exc,
                )
                _disable_integration_on_revoked(db, connection_id=str(conn.get("id")))
                errors.append(("auth_failed", f"«{conn_label}»: токен истёк или отозван — переподключите календарь."))
            elif exc.status in (401, 403):
                logger.warning(
                    "Google Calendar pull auth failed (calendar=%s): %s",
                    conn_label,
                    exc.details or exc,
                )
                if exc.reason == "accessNotConfigured":
                    # 403 "Google Calendar API has not been used ...":
                    # токены рабочие, но API не включён в проекте Google Cloud.
                    errors.append((
                        "auth_failed",
                        (
                            f"«{conn_label}»: Google Calendar API не включён в проекте Google Cloud "
                            "(https://console.cloud.google.com/apis/library/calendar.googleapis.com), "
                            "затем нажмите «Синхронизировать сейчас» ещё раз."
                        ),
                    ))
                else:
                    errors.append(("auth_failed", f"«{conn_label}»: {exc.details or 'ошибка доступа'}"))
            else:
                logger.exception(
                    "Google Calendar pull failed (calendar=%s)", conn_label
                )
                errors.append(("pull_failed", f"«{conn_label}»: {exc.details or 'ошибка Google API'}"))
            continue
        except Exception:
            logger.exception("Google Calendar pull failed (calendar=%s)", conn_label)
            errors.append(("pull_failed", f"«{conn_label}»: ошибка синхронизации"))
            continue

        any_ok = True
        for key in ("created", "updated", "cancelled", "duplicates"):
            result[key] += int(stats.get(key) or 0)

    _persist_dirty_connections(db, connections)

    if errors:
        result["ok"] = False
        result["error"] = errors[0][0]
        details = "; ".join(detail for _, detail in errors)
        result["errorDetails"] = (
            f"{details}. Остальные календари обработаны."
            if any_ok
            else details
        )
    if any_ok:
        _save_last_sync(db)
    return result