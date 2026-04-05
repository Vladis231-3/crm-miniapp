from __future__ import annotations

import hashlib
import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from urllib import error, request
from uuid import uuid4

try:
    from backend.app.config import get_settings
    from backend.app.database import session_scope
    from backend.app.models import AppSetting, Notification, StaffUser
    from backend.app.telegram_linking import confirm_link_code
except ImportError:
    from app.config import get_settings
    from app.database import session_scope
    from app.models import AppSetting, Notification, StaffUser
    from app.telegram_linking import confirm_link_code


@dataclass(frozen=True)
class BotRuntime:
    token: str
    webapp_url: str
    api_base: str


ADMIN_SHIFT_INSPECTIONS_KEY = "admin_shift_inspections"
ADMIN_SHIFT_OWNER_BOT_STATE_KEY = "admin_shift_owner_bot_state"


def _build_runtime() -> BotRuntime:
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")
    if not settings.webapp_url:
        raise RuntimeError("WEBAPP_URL is not configured")
    return BotRuntime(
        token=settings.telegram_bot_token,
        webapp_url=settings.webapp_url,
        api_base=f"https://api.telegram.org/bot{settings.telegram_bot_token}",
    )


def telegram_webhook_secret() -> str:
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")
    raw_secret = f"{settings.app_secret}:{settings.telegram_bot_token}".encode("utf-8")
    return hashlib.sha256(raw_secret).hexdigest()


def telegram_webhook_url() -> str:
    settings = get_settings()
    if not settings.webapp_url:
        raise RuntimeError("WEBAPP_URL is not configured")
    return f"{settings.webapp_url.rstrip('/')}{settings.telegram_webhook_path}"


def _parse_retry_after(details: str) -> int | None:
    try:
        parsed = json.loads(details)
    except json.JSONDecodeError:
        return None
    parameters = parsed.get("parameters")
    if not isinstance(parameters, dict):
        return None
    retry_after = parameters.get("retry_after")
    if isinstance(retry_after, int) and retry_after > 0:
        return retry_after
    return None


def _telegram_call(
    runtime: BotRuntime,
    method: str,
    payload: dict[str, Any] | None = None,
    *,
    max_attempts: int = 3,
) -> dict[str, Any]:
    body = json.dumps(payload or {}).encode("utf-8")
    req = request.Request(
        url=f"{runtime.api_base}/{method}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    attempt = 0
    while True:
        attempt += 1
        try:
            with request.urlopen(req, timeout=60) as response:
                result = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            details = exc.read().decode("utf-8", errors="ignore")
            retry_after = _parse_retry_after(details)
            if exc.code == 429 and retry_after is not None and attempt < max_attempts:
                time.sleep(retry_after)
                continue
            raise RuntimeError(f"Telegram API HTTP error in {method}: {details or exc}") from exc
        if not result.get("ok"):
            raise RuntimeError(f"Telegram API error in {method}: {result}")
        return result["result"]


def _telegram_multipart_call(
    runtime: BotRuntime,
    method: str,
    fields: dict[str, Any],
    files: dict[str, tuple[str, str, bytes]],
) -> dict[str, Any]:
    boundary = f"----crmminiapp-{uuid4().hex}"
    body = bytearray()

    for name, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        body.extend(str(value).encode("utf-8"))
        body.extend(b"\r\n")

    for field_name, (file_name, mime_type, content) in files.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(
            f'Content-Disposition: form-data; name="{field_name}"; filename="{file_name}"\r\n'.encode("utf-8")
        )
        body.extend(f"Content-Type: {mime_type}\r\n\r\n".encode("utf-8"))
        body.extend(content)
        body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    req = request.Request(
        url=f"{runtime.api_base}/{method}",
        data=bytes(body),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Telegram API HTTP error in {method}: {details or exc}") from exc
    if not result.get("ok"):
        raise RuntimeError(f"Telegram API error in {method}: {result}")
    return result["result"]


def _start_reply_markup(webapp_url: str) -> dict[str, Any]:
    return {
        "inline_keyboard": [
            [
                {
                    "text": "Открыть CRM",
                    "web_app": {"url": webapp_url},
                }
            ]
        ]
    }


def _configure_bot_metadata(runtime: BotRuntime) -> str | None:
    me = _telegram_call(runtime, "getMe")
    _telegram_call(
        runtime,
        "setMyCommands",
        {
            "commands": [
                {"command": "start", "description": "Открыть CRM mini app"},
                {"command": "chatid", "description": "Показать chat id"},
                {"command": "link", "description": "Привязать Telegram к CRM"},
            ]
        },
    )
    _telegram_call(
        runtime,
        "setChatMenuButton",
        {
            "menu_button": {
                "type": "web_app",
                "text": "Открыть CRM",
                "web_app": {"url": runtime.webapp_url},
            }
        },
    )
    return me.get("username")


def disable_telegram_webhook(*, drop_pending_updates: bool = False) -> str | None:
    runtime = _build_runtime()
    username = _configure_bot_metadata(runtime)
    _telegram_call(runtime, "deleteWebhook", {"drop_pending_updates": drop_pending_updates})
    return username


def sync_telegram_webhook(*, drop_pending_updates: bool = False) -> str | None:
    runtime = _build_runtime()
    username = _configure_bot_metadata(runtime)
    target_url = telegram_webhook_url()
    target_secret = telegram_webhook_secret()
    current = _telegram_call(runtime, "getWebhookInfo")
    if (
        current.get("url") == target_url
        and current.get("has_custom_certificate") is False
        and (current.get("pending_update_count") in {0, None} or not drop_pending_updates)
        and (
            current.get("secret_token") in {None, "", target_secret}
            or str(current.get("last_error_message", "")).startswith("Wrong secret token")
        )
    ):
        return username
    _telegram_call(
        runtime,
        "setWebhook",
        {
            "url": target_url,
            "secret_token": target_secret,
            "allowed_updates": ["message", "callback_query"],
            "drop_pending_updates": drop_pending_updates,
        },
    )
    return username


def _send_text_message(
    runtime: BotRuntime,
    chat_id: int,
    text: str,
    *,
    reply_markup: dict[str, Any] | None = None,
) -> None:
    payload: dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
    }
    if reply_markup is not None:
        payload["reply_markup"] = reply_markup
    _telegram_call(runtime, "sendMessage", payload)


def _send_start_message(runtime: BotRuntime, chat_id: int) -> None:
    _send_text_message(
        runtime,
        chat_id,
        (
            "CRM mini app готово. Откройте его кнопкой ниже.\n\n"
            "Чтобы привязать Telegram автоматически, создайте код в CRM и отправьте боту команду /link 123456.\n"
            f"Ваш chat id: {chat_id}"
        ),
        reply_markup=_start_reply_markup(runtime.webapp_url),
    )


def send_telegram_message(chat_id: str | int, text: str) -> None:
    runtime = _build_runtime()
    _send_text_message(runtime, int(chat_id), text)


def send_telegram_document(
    chat_id: str | int,
    *,
    file_name: str,
    content: bytes,
    caption: str | None = None,
    mime_type: str = "application/octet-stream",
) -> None:
    runtime = _build_runtime()
    fields: dict[str, Any] = {"chat_id": int(chat_id)}
    if caption:
        fields["caption"] = caption
    _telegram_multipart_call(
        runtime,
        "sendDocument",
        fields=fields,
        files={"document": (file_name, mime_type, content)},
    )


def send_telegram_photo(
    chat_id: str | int,
    *,
    file_name: str,
    content: bytes,
    caption: str | None = None,
    mime_type: str = "image/jpeg",
    reply_markup: dict[str, Any] | None = None,
) -> None:
    runtime = _build_runtime()
    fields: dict[str, Any] = {"chat_id": int(chat_id)}
    if caption:
        fields["caption"] = caption
    if reply_markup is not None:
        fields["reply_markup"] = json.dumps(reply_markup, ensure_ascii=False)
    _telegram_multipart_call(
        runtime,
        "sendPhoto",
        fields=fields,
        files={"photo": (file_name, mime_type, content)},
    )


def _setting_dict(db, key: str, default: dict[str, Any]) -> dict[str, Any]:
    row = db.get(AppSetting, key)
    if row is None or not isinstance(row.value, dict):
        return dict(default)
    return dict(row.value)


def _setting_list(db, key: str) -> list[dict[str, Any]]:
    row = db.get(AppSetting, key)
    if row is None or not isinstance(row.value, list):
        return []
    return list(row.value)


def _upsert_setting(db, key: str, value: Any) -> None:
    row = db.get(AppSetting, key)
    if row is None:
        row = AppSetting(key=key, value=value)
        db.add(row)
    else:
        row.value = value


def _serialize_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _owner_by_chat_id(db, chat_id: int) -> StaffUser | None:
    return db.query(StaffUser).filter(StaffUser.role == "owner", StaffUser.telegram_chat_id == str(chat_id)).first()


def _apply_shift_review_from_bot(chat_id: int, inspection_id: str, action: str, issue_note: str = "") -> str:
    with session_scope() as db:
        owner = _owner_by_chat_id(db, chat_id)
        if owner is None:
            return "Только владелец с привязанным Telegram может подтверждать смену."
        entries = _setting_list(db, ADMIN_SHIFT_INSPECTIONS_KEY)
        entry = next((item for item in entries if item.get("id") == inspection_id), None)
        if entry is None:
            return "Чек-лист смены не найден."
        if str(entry.get("status") or "") != "pending":
            return "По этому чек-листу уже принято решение."
        if action == "rejected" and not issue_note.strip():
            return "Опишите проблему текстом после нажатия кнопки отказа."

        entry["status"] = action
        entry["issueNote"] = issue_note.strip()
        entry["reviewedAt"] = _serialize_now()
        entry["ownerDecisionBy"] = owner.id
        _upsert_setting(db, ADMIN_SHIFT_INSPECTIONS_KEY, entries[-200:])

        admin = db.get(StaffUser, str(entry.get("adminId") or ""))
        verb = "подтвердил" if action == "approved" else "отклонил"
        extra = f"\nПроблема: {issue_note.strip()}" if issue_note.strip() else ""
        message = f"Владелец {verb} открытие смены администратора {entry.get('adminName')}.{extra}"
        if admin is not None:
            db.add(
                Notification(
                    id=f"n-{uuid4()}",
                    recipient_role="admin",
                    recipient_id=admin.id,
                    message=message,
                    read=False,
                    created_at=datetime.now(timezone.utc),
                )
            )
            if admin.telegram_chat_id:
                send_telegram_message(admin.telegram_chat_id, message)
        return "Смена подтверждена." if action == "approved" else "Отказ по смене отправлен администратору."


def _remember_pending_issue(chat_id: int, inspection_id: str) -> None:
    with session_scope() as db:
        state = _setting_dict(db, ADMIN_SHIFT_OWNER_BOT_STATE_KEY, {"pendingIssueByChat": {}})
        pending = state.get("pendingIssueByChat")
        if not isinstance(pending, dict):
            pending = {}
        pending[str(chat_id)] = inspection_id
        state["pendingIssueByChat"] = pending
        _upsert_setting(db, ADMIN_SHIFT_OWNER_BOT_STATE_KEY, state)


def _pop_pending_issue(chat_id: int) -> str | None:
    with session_scope() as db:
        state = _setting_dict(db, ADMIN_SHIFT_OWNER_BOT_STATE_KEY, {"pendingIssueByChat": {}})
        pending = state.get("pendingIssueByChat")
        if not isinstance(pending, dict):
            pending = {}
        inspection_id = pending.pop(str(chat_id), None)
        state["pendingIssueByChat"] = pending
        _upsert_setting(db, ADMIN_SHIFT_OWNER_BOT_STATE_KEY, state)
        return inspection_id if isinstance(inspection_id, str) else None


def _extract_chat_id(update: dict[str, Any]) -> int | None:
    callback = update.get("callback_query") or {}
    callback_message = callback.get("message") or {}
    callback_chat = callback_message.get("chat") or {}
    if isinstance(callback_chat.get("id"), int):
        return callback_chat["id"]
    message = update.get("message") or {}
    chat = message.get("chat") or {}
    if isinstance(chat.get("id"), int):
        return chat["id"]
    return None


def _extract_text(update: dict[str, Any]) -> str:
    message = update.get("message") or {}
    text = message.get("text")
    return text.strip() if isinstance(text, str) else ""


def _extract_callback(update: dict[str, Any]) -> tuple[str, str] | None:
    callback = update.get("callback_query") or {}
    callback_id = callback.get("id")
    data = callback.get("data")
    if isinstance(callback_id, str) and isinstance(data, str):
        return callback_id, data
    return None


def _answer_callback_query(runtime: BotRuntime, callback_id: str, text: str) -> None:
    _telegram_call(runtime, "answerCallbackQuery", {"callback_query_id": callback_id, "text": text})


def _handle_link_command(chat_id: int, text: str) -> str:
    parts = text.split(maxsplit=1)
    code = parts[1].strip() if len(parts) == 2 else ""
    if not code.isdigit():
        return "Код введён неверно. Отправьте 6 цифр из CRM."
    with session_scope() as db:
        try:
            staff = confirm_link_code(db, code, chat_id)
        except ValueError as exc:
            return str(exc)
        if staff is None:
            return "Код неверный или уже истёк. Создайте новый код в CRM."
        role_labels = {
            "admin": "администратор",
            "worker": "мастер",
            "owner": "владелец",
        }
        role_label = role_labels.get(staff.role, staff.role)
        return f"Код введён правильно. Telegram привязан к роли: {role_label} ({staff.name})."


def _handle_plain_code(chat_id: int, text: str) -> str:
    code = text.strip()
    if not (code.isdigit() and len(code) == 6):
        return "Код должен состоять из 6 цифр."
    with session_scope() as db:
        try:
            staff = confirm_link_code(db, code, chat_id)
        except ValueError as exc:
            return str(exc)
        if staff is None:
            return "Код неверный или уже истёк. Создайте новый код в CRM."
        role_labels = {
            "admin": "администратор",
            "worker": "мастер",
            "owner": "владелец",
        }
        role_label = role_labels.get(staff.role, staff.role)
        return f"Код введён правильно. Telegram привязан к роли: {role_label} ({staff.name})."


def _process_telegram_update(runtime: BotRuntime, update: dict[str, Any]) -> None:
    text = _extract_text(update)
    chat_id = _extract_chat_id(update)
    if chat_id is None:
        return

    callback = _extract_callback(update)
    if callback is not None:
        callback_id, data = callback
        if data.startswith("shiftapprove:"):
            _answer_callback_query(runtime, callback_id, _apply_shift_review_from_bot(chat_id, data.split(":", 1)[1], "approved"))
            return
        if data.startswith("shiftreject:"):
            _remember_pending_issue(chat_id, data.split(":", 1)[1])
            _answer_callback_query(runtime, callback_id, "Опишите проблему следующим сообщением")
            _send_text_message(runtime, chat_id, "Напишите сообщением, в чём проблема по открытию смены.")
            return

    pending_issue = _pop_pending_issue(chat_id) if text and not text.startswith("/") else None
    if pending_issue is not None:
        _send_text_message(runtime, chat_id, _apply_shift_review_from_bot(chat_id, pending_issue, "rejected", text))
        return

    if text.startswith("/start"):
        _send_start_message(runtime, chat_id)
    elif text.startswith("/chatid"):
        _send_text_message(runtime, chat_id, f"Ваш chat id: {chat_id}")
    elif text.startswith("/link"):
        _send_text_message(runtime, chat_id, _handle_link_command(chat_id, text))
    elif text.isdigit():
        _send_text_message(runtime, chat_id, _handle_plain_code(chat_id, text))


def process_telegram_update(update: dict[str, Any]) -> None:
    runtime = _build_runtime()
    _process_telegram_update(runtime, update)


def run_polling() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    runtime = _build_runtime()
    username = disable_telegram_webhook(drop_pending_updates=False)
    logging.info("Bot started as @%s with mini app %s", username, runtime.webapp_url)

    offset = 0
    while True:
        try:
            updates = _telegram_call(
                runtime,
                "getUpdates",
                {
                    "offset": offset,
                    "timeout": 30,
                    "allowed_updates": ["message", "callback_query"],
                },
            )
            for update in updates:
                offset = max(offset, int(update["update_id"]) + 1)
                _process_telegram_update(runtime, update)
        except error.HTTPError as exc:
            logging.error("Telegram HTTP error: %s", exc.read().decode("utf-8", errors="ignore"))
            time.sleep(5)
        except error.URLError as exc:
            logging.error("Telegram network error: %s", exc)
            time.sleep(5)
        except Exception:
            logging.exception("Bot loop crashed")
            time.sleep(5)


if __name__ == "__main__":
    run_polling()
