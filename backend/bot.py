from __future__ import annotations

import hashlib
import json
import logging
import time
from dataclasses import dataclass
from typing import Any
from urllib import error, request
from uuid import uuid4

try:
    from backend.app.config import get_settings
    from backend.app.database import session_scope
    from backend.app.telegram_linking import confirm_link_code
except ImportError:
    from app.config import get_settings
    from app.database import session_scope
    from app.telegram_linking import confirm_link_code


@dataclass(frozen=True)
class BotRuntime:
    token: str
    webapp_url: str
    api_base: str


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
            "allowed_updates": ["message"],
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


def _extract_chat_id(update: dict[str, Any]) -> int | None:
    message = update.get("message") or {}
    chat = message.get("chat") or {}
    if isinstance(chat.get("id"), int):
        return chat["id"]
    return None


def _extract_text(update: dict[str, Any]) -> str:
    message = update.get("message") or {}
    text = message.get("text")
    return text.strip() if isinstance(text, str) else ""


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
                    "allowed_updates": ["message"],
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
