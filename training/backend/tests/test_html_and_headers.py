from __future__ import annotations

import asyncio

from starlette.requests import Request
from starlette.responses import JSONResponse

import bot
from app import main


def test_bot_db_content_is_html_escaped(monkeypatch) -> None:
    sent = {}
    monkeypatch.setattr(bot, "session_scope", lambda: _SessionContext({"works": [{"title": "<b>x</b>", "description": "a&b"}]}))
    monkeypatch.setattr(bot, "_send_text_message", lambda runtime, chat_id, text, **kwargs: sent.update(text=text, **kwargs))

    bot._send_works_message(object(), 1)

    assert "&lt;b&gt;x&lt;/b&gt;" in sent["text"]
    assert "a&amp;b" in sent["text"]
    assert sent["parse_mode"] == "HTML"


class _SessionContext:
    def __init__(self, value) -> None:
        self.value = value

    def __enter__(self):
        return _Db(self.value)

    def __exit__(self, *args):
        return False


class _Db:
    def __init__(self, value) -> None:
        self.value = value

    def get(self, model, key):
        return type("Row", (), {"value": self.value})()


def request(path: str = "/api/test", scheme: str = "http") -> Request:
    return Request({"type": "http", "method": "GET", "path": path, "headers": [], "scheme": scheme, "server": ("test", 80), "query_string": b""})


def test_global_security_headers_and_sensitive_no_store() -> None:
    response = asyncio.run(main.add_security_headers(request(), lambda req: _response()))

    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-XSS-Protection"] == "0"
    assert "telegram.org" in response.headers["Content-Security-Policy"]
    assert response.headers["Cache-Control"] == "no-store"
    assert "Strict-Transport-Security" not in response.headers


async def _response():
    return JSONResponse({"ok": True})


def test_upload_cache_policy_is_not_overwritten() -> None:
    async def immutable():
        return JSONResponse({"ok": True}, headers={"Cache-Control": "public, max-age=31536000, immutable"})

    response = asyncio.run(main.add_security_headers(request("/api/uploads/file.png"), lambda req: immutable()))
    assert response.headers["Cache-Control"] == "public, max-age=31536000, immutable"
