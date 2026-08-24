"""Глобальные уведомления об ошибках в Telegram для владельцев CRM.

Что делает:
1. `unhandled_exception_handler` — FastAPI-обработчик несловленных исключений
   (HTTP 500): отправляет текст ошибки владельцам в Telegram и возвращает
   стандартный JSON-ответ клиенту.
2. `TelegramErrorNotifyHandler` — logging-handler уровня ERROR+, который
   пересылает в Telegram записи `logger.error(...)` / `logger.exception(...)`
   из любого модуля бэкенда (бот, Google Calendar sync и т.д.).
3. `notify_exception` / `notify_error_message` — ручная отправка.

Защита от спама:
- одинаковая ошибка (один сайт возникновения) не чаще раза в
  ERROR_NOTIFY_COOLDOWN_SECONDS (по умолчанию 600 с);
- общий бюджет ERROR_NOTIFY_MAX_PER_HOUR сообщений за скользящий час
  (по умолчанию 30); лишнее пишется только в локальный лог;
- рекурсия исключена: записи из самого нотификатора не пересылаются,
  все его собственные ошибки глотаются.

Получатели: все активные владельцы (role="owner") с непустым
telegram_chat_id (создатель — первым).
"""

from __future__ import annotations

import hashlib
import logging
import os
import threading
import time
import traceback
from collections import deque

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy import select

from .database import SessionLocal
from .models import StaffUser

logger = logging.getLogger(__name__)

_TELEGRAM_TEXT_LIMIT = 3800
_OWN_LOGGER_NAMES = ("app.error_notifier", "backend.app.error_notifier", "error_notifier")


def _env_bool(name: str, default: bool) -> bool:
    raw = (os.getenv(name) or "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int, minimum: int) -> int:
    try:
        value = int((os.getenv(name) or "").strip())
    except ValueError:
        return default
    return max(minimum, value)


class _NotifierState:
    """Общее состояние throttle'а (потокобезопасное через RLock)."""

    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.last_sent_by_fingerprint: dict[str, float] = {}
        self.sent_timestamps: deque[float] = deque()
        self.no_recipient_warned_at = 0.0


_state = _NotifierState()


def _reset_state_for_tests() -> None:
    global _state
    _state = _NotifierState()


def _cooldown_seconds() -> int:
    return _env_int("ERROR_NOTIFY_COOLDOWN_SECONDS", 600, minimum=1)


def _max_messages_per_hour() -> int:
    return _env_int("ERROR_NOTIFY_MAX_PER_HOUR", 30, minimum=1)


def _enabled() -> bool:
    return _env_bool("ERROR_NOTIFY_ENABLED", True)


def _is_own_record(record: logging.LogRecord) -> bool:
    name = record.name or ""
    return any(
        name == own or name.startswith(f"{own}.") for own in _OWN_LOGGER_NAMES
    )


def _fetch_owner_chat_ids() -> list[str]:
    """Активные владельцы с непустым telegram_chat_id (создатель первым)."""
    db = SessionLocal()
    try:
        rows = db.execute(
            select(StaffUser.telegram_chat_id)
            .where(
                StaffUser.role == "owner",
                StaffUser.active.is_(True),
                StaffUser.telegram_chat_id != "",
            )
            .order_by(
                StaffUser.is_primary_owner.desc(),
                StaffUser.created_at.asc(),
                StaffUser.id.asc(),
            )
        ).all()
    finally:
        db.close()
    chat_ids: list[str] = []
    for (chat_id,) in rows:
        normalized = str(chat_id or "").strip()
        if normalized and normalized not in chat_ids:
            chat_ids.append(normalized)
    return chat_ids


def _send_via_bot(chat_id: str, text: str) -> None:
    """Ленивый импорт, чтобы избежать циклического импорта с bot.py."""
    try:
        from backend.bot import send_telegram_message
    except ImportError:
        from bot import send_telegram_message
    send_telegram_message(chat_id, text)


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[: max(limit - 20, 0)].rstrip() + "\n…[сообщение обрезано]"


def _build_message(
    *,
    kind: str,
    context: str,
    error_type: str,
    message: str,
    where: str,
    tb_text: str,
) -> str:
    lines = [f"🚨 Ошибка в CRM ({kind})"]
    if context:
        lines.append(f"Контекст: {context}")
    if error_type:
        lines.append(f"Тип: {error_type}")
    if message:
        lines.append(f"Сообщение: {_truncate(message, 1000)}")
    if where:
        lines.append(f"Где: {where}")

    head = "\n".join(lines)
    if tb_text:
        tail_header = "\n\nСтек (хвост):\n"
        budget = _TELEGRAM_TEXT_LIMIT - len(head) - len(tail_header) - 30
        if budget > 0:
            shown = tb_text[-budget:]
            marker = "…[стек обрезано]\n" if len(shown) < len(tb_text) else ""
            head += f"{tail_header}{marker}{shown}"
    return _truncate(head, _TELEGRAM_TEXT_LIMIT)


def _exception_where(exc: BaseException) -> str:
    frames = traceback.extract_tb(exc.__traceback__)
    if not frames:
        return ""
    last = frames[-1]
    filename = os.path.basename(last.filename)
    return f"{filename}:{last.lineno} in {last.name}"


def _exception_fingerprint(exc: BaseException) -> str:
    frames = traceback.extract_tb(exc.__traceback__)
    site = f"{frames[-1].filename}:{frames[-1].lineno}" if frames else "unknown"
    digest_input = f"{type(exc).__name__}|{site}|{str(exc)[:200]}".encode(
        "utf-8", errors="ignore"
    )
    digest = hashlib.md5(digest_input).hexdigest()[:8]
    return f"exc:{type(exc).__name__}:{site}:{digest}"


def _log_record_fingerprint(record: logging.LogRecord) -> str:
    return f"log:{record.name}:{record.funcName}:{record.lineno}"


def _dispatch_locked(state: _NotifierState, text: str, fingerprint: str) -> bool:
    """Отправка текста владельцам. Вызывать под state.lock."""
    try:
        chat_ids = _fetch_owner_chat_ids()
    except Exception as exc:  # noqa: BLE001 — БД может быть недоступна
        now = time.monotonic()
        if now - state.no_recipient_warned_at > _cooldown_seconds():
            state.no_recipient_warned_at = now
            logger.warning(
                "Не удалось получить получателей ошибок из БД: %s", exc
            )
        return False

    if not chat_ids:
        now = time.monotonic()
        if now - state.no_recipient_warned_at > _cooldown_seconds():
            state.no_recipient_warned_at = now
            logger.warning(
                "Ошибка не отправлена в Telegram: нет владельцев с telegram_chat_id"
            )
        return False

    delivered = False
    for chat_id in chat_ids:
        try:
            _send_via_bot(chat_id, text)
            delivered = True
        except Exception as exc:  # noqa: BLE001 — никогда не поднимаемся выше
            logger.warning(
                "Не удалось отправить ошибку в Telegram (chat_id=%s): %s",
                chat_id,
                exc,
            )

    if delivered:
        state.last_sent_by_fingerprint[fingerprint] = time.monotonic()
        state.sent_timestamps.append(time.time())
        # держим окно часа компактным
        horizon = time.time() - 3600
        while state.sent_timestamps and state.sent_timestamps[0] < horizon:
            state.sent_timestamps.popleft()
        # чистим остывшие отпечатки, чтобы словарь не рос бесконечно
        cooldown = _cooldown_seconds()
        stale = [
            key
            for key, ts in state.last_sent_by_fingerprint.items()
            if time.monotonic() - ts > cooldown * 2
        ]
        for key in stale:
            state.last_sent_by_fingerprint.pop(key, None)
    return delivered


def _throttle_check_locked(state: _NotifierState, fingerprint: str) -> str | None:
    """Возвращает причину подавления или None, если можно отправлять."""
    now_monotonic = time.monotonic()
    last = state.last_sent_by_fingerprint.get(fingerprint)
    if last is not None and now_monotonic - last < _cooldown_seconds():
        return "cooldown"

    now_wall = time.time()
    horizon = now_wall - 3600
    while state.sent_timestamps and state.sent_timestamps[0] < horizon:
        state.sent_timestamps.popleft()
    if len(state.sent_timestamps) >= _max_messages_per_hour():
        return "hourly_budget"
    return None


def _submit(*, fingerprint: str, message: str) -> bool:
    if not _enabled():
        return False
    state = _state
    with state.lock:
        reason = _throttle_check_locked(state, fingerprint)
        if reason is not None:
            logger.debug("Уведомление об ошибке подавлено (%s): %s", reason, fingerprint)
            return False
        return _dispatch_locked(state, message, fingerprint)


def notify_exception(exc: BaseException, *, context: str = "") -> bool:
    """Отправить исключение владельцам в Telegram. Никогда не бросает."""
    try:
        frames = traceback.extract_tb(exc.__traceback__)
        where = _exception_where(exc)
        tb_text = "".join(
            traceback.format_exception(type(exc), exc, exc.__traceback__)
        ).strip()
        message = _build_message(
            kind="необработанное исключение",
            context=context,
            error_type=type(exc).__name__,
            message=str(exc),
            where=where,
            tb_text=tb_text if frames else "",
        )
        return _submit(
            fingerprint=_exception_fingerprint(exc), message=message
        )
    except Exception:
        logger.debug("Сбой в notify_exception", exc_info=True)
        return False


def notify_error_message(message: str, *, context: str = "", source: str = "") -> bool:
    """Отправить произвольный текст ошибки владельцам в Telegram."""
    try:
        fingerprint_source = f"{source}|{message[:200]}"
        digest = hashlib.md5(
            fingerprint_source.encode("utf-8", errors="ignore")
        ).hexdigest()[:8]
        text = _build_message(
            kind="ошибка",
            context=context,
            error_type=source or "ERROR",
            message=message,
            where="",
            tb_text="",
        )
        return _submit(fingerprint=f"msg:{digest}", message=text)
    except Exception:
        logger.debug("Сбой в notify_error_message", exc_info=True)
        return False


class TelegramErrorNotifyHandler(logging.Handler):
    """Пересылает ERROR/CRITICAL-записи любого логгера в Telegram."""

    def __init__(self, level: int = logging.ERROR) -> None:
        super().__init__(level=level)

    def emit(self, record: logging.LogRecord) -> None:
        if _is_own_record(record):
            return
        try:
            message = record.getMessage()
            tb_text = ""
            if record.exc_info:
                tb_text = "".join(
                    traceback.format_exception(*record.exc_info)
                ).strip()
            where = f"{os.path.basename(record.pathname)}:{record.lineno} in {record.funcName}"
            text = _build_message(
                kind="лог ERROR",
                context=record.name,
                error_type=record.levelname,
                message=message,
                where=where,
                tb_text=tb_text,
            )
            _submit(fingerprint=_log_record_fingerprint(record), message=text)
        except Exception:  # handler не должен ломать приложение
            logger.debug("Сбой пересылки ERROR-записи в Telegram", exc_info=True)


_install_lock = threading.Lock()


def install_error_notifying() -> None:
    """Идемпотентно подключает logging-handler к корневому логгеру.

    Проверка по имени класса (а не по флагу модуля): тесты выгружают и
    заново импортируют модули приложения — флаг при этом теряется, а старый
    хендлер остаётся на корневом логгере.
    """
    root = logging.getLogger()
    with _install_lock:
        for existing in root.handlers:
            if type(existing).__name__ == "TelegramErrorNotifyHandler":
                return
        root.addHandler(TelegramErrorNotifyHandler())


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """FastAPI/Starlette handler для несловленных исключений (HTTP 500)."""
    notify_exception(exc, context=f"{request.method} {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Внутренняя ошибка сервера. Владелец уведомлён в Telegram."},
    )


__all__ = [
    "TelegramErrorNotifyHandler",
    "install_error_notifying",
    "notify_error_message",
    "notify_exception",
    "unhandled_exception_handler",
]
