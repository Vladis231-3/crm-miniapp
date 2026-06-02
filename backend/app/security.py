from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import time
from typing import Any
from urllib.parse import parse_qsl


PASSWORD_ITERATIONS = 390_000
TELEGRAM_INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60
TELEGRAM_INIT_DATA_FUTURE_SKEW_SECONDS = 60


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), PASSWORD_ITERATIONS)
    return f"{PASSWORD_ITERATIONS}${salt}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        iterations_raw, salt, digest = password_hash.split("$", 2)
        iterations = int(iterations_raw)
    except ValueError:
        return False
    calculated = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), iterations).hex()
    return hmac.compare_digest(calculated, digest)


def hash_one_time_code(code: str, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), code.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_one_time_code(code: str, expected_hash: str, secret: str) -> bool:
    calculated = hash_one_time_code(code, secret)
    return hmac.compare_digest(calculated, expected_hash)


def validate_telegram_init_data(init_data: str, bot_token: str | None) -> dict[str, Any]:
    if not init_data:
        raise ValueError("initData is required")
    if not bot_token:
        raise ValueError("TELEGRAM_BOT_TOKEN is not configured")

    pairs = dict(parse_qsl(init_data, keep_blank_values=True, strict_parsing=True))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise ValueError("initData hash is missing")

    data_check_string = "\n".join(f"{key}={pairs[key]}" for key in sorted(pairs))
    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calculated_hash, received_hash):
        raise ValueError("initData hash validation failed")

    auth_date_raw = pairs.get("auth_date")
    if auth_date_raw is None:
        raise ValueError("initData auth_date is missing")
    try:
        auth_date = int(auth_date_raw)
    except ValueError as exc:
        raise ValueError("initData auth_date is invalid") from exc

    current_ts = int(time.time())
    if auth_date > current_ts + TELEGRAM_INIT_DATA_FUTURE_SKEW_SECONDS:
        raise ValueError("initData auth_date is invalid")
    if current_ts - auth_date > TELEGRAM_INIT_DATA_MAX_AGE_SECONDS:
        raise ValueError("initData is expired")

    validated: dict[str, Any] = pairs
    if "user" in validated:
        validated["user"] = json.loads(validated["user"])
    return validated
