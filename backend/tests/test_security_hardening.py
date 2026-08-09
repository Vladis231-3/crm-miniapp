from __future__ import annotations

import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import pytest
from app.security import validate_telegram_init_data

BOT_TOKEN = "123456:test-token"


def _signed_init_data(*, user: object, auth_date: int | None = None) -> str:
    pairs = {
        "auth_date": str(int(time.time()) if auth_date is None else auth_date),
        "query_id": "query",
        "user": json.dumps(user, separators=(",", ":")),
    }
    check = "\n".join(f"{key}={pairs[key]}" for key in sorted(pairs))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    pairs["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(pairs)


def test_accepts_valid_user_with_short_configurable_ttl() -> None:
    result = validate_telegram_init_data(
        _signed_init_data(user={"id": 123456789}),
        BOT_TOKEN,
        max_age_seconds=300,
        future_skew_seconds=30,
    )

    assert result["user"]["id"] == 123456789


def test_rejects_duplicate_query_keys() -> None:
    init_data = _signed_init_data(user={"id": 123456789})

    with pytest.raises(ValueError, match="duplicate keys"):
        validate_telegram_init_data(f"{init_data}&user=%7B%22id%22%3A2%7D", BOT_TOKEN)


@pytest.mark.parametrize("user", [[], {}, {"id": "123"}, {"id": True}, {"id": 0}])
def test_rejects_invalid_user_structure(user: object) -> None:
    with pytest.raises(ValueError, match="user"):
        validate_telegram_init_data(_signed_init_data(user=user), BOT_TOKEN)


def test_rejects_future_auth_date_beyond_skew() -> None:
    with pytest.raises(ValueError, match="auth_date"):
        validate_telegram_init_data(
            _signed_init_data(user={"id": 123456789}, auth_date=int(time.time()) + 31),
            BOT_TOKEN,
            future_skew_seconds=30,
        )


def test_rejects_expired_init_data_using_configured_ttl() -> None:
    with pytest.raises(ValueError, match="expired"):
        validate_telegram_init_data(
            _signed_init_data(user={"id": 123456789}, auth_date=int(time.time()) - 301),
            BOT_TOKEN,
            max_age_seconds=300,
        )
