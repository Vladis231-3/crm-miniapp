from __future__ import annotations

import base64
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


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64url_decode(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + padding)


def create_session_token(payload: dict[str, Any], secret: str, ttl_seconds: int = 60 * 60 * 24 * 7) -> str:
    data = {**payload, "exp": int(time.time()) + ttl_seconds}
    encoded_payload = _b64url_encode(json.dumps(data, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    signature = hmac.new(secret.encode("utf-8"), encoded_payload.encode("ascii"), hashlib.sha256).digest()
    return f"{encoded_payload}.{_b64url_encode(signature)}"


def decode_session_token(token: str, secret: str) -> dict[str, Any]:
    try:
        encoded_payload, encoded_signature = token.split(".", 1)
    except ValueError as exc:
        raise ValueError("Malformed token") from exc

    expected_signature = hmac.new(secret.encode("utf-8"), encoded_payload.encode("ascii"), hashlib.sha256).digest()
    if not hmac.compare_digest(_b64url_encode(expected_signature), encoded_signature):
        raise ValueError("Invalid token signature")

    payload = json.loads(_b64url_decode(encoded_payload).decode("utf-8"))
    if int(payload.get("exp", 0)) < int(time.time()):
        raise ValueError("Token expired")
    return payload


def validate_telegram_init_data(init_data: str, bot_token: str) -> dict[str, Any]:
    if not init_data:
        raise ValueError("initData is required")

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
