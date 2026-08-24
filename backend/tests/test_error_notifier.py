"""Тесты глобального нотификатора ошибок в Telegram (app/error_notifier.py).

Проверяем:
- несловленное исключение в HTTP-роуте -> 500 + сообщение владельцам в ТГ;
- HTTPException (ожидаемые 4xx) НЕ дублируются в ТГ;
- logging-handler пересылает logger.error/exception из любых модулей;
- throttle: cooldown на одинаковые ошибки + часовой бюджет;
- ERROR_NOTIFY_ENABLED=false выключает отправку.
"""

import contextlib
import logging
import os
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("APP_SECRET", "test-secret")
os.environ.setdefault("TELEGRAM_BOT_TOKEN", "123456:test-bot-token")
for _key in (
    "ERROR_NOTIFY_ENABLED",
    "ERROR_NOTIFY_COOLDOWN_SECONDS",
    "ERROR_NOTIFY_MAX_PER_HOUR",
):
    os.environ.pop(_key, None)

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app import error_notifier as en


@contextlib.contextmanager
def _transport(chats=("111", "222")):
    """Подменяет получателей и отправку, собирая отправленные тексты."""
    sent: list[tuple[str, str]] = []
    with patch.object(en, "_fetch_owner_chat_ids", lambda: list(chats)), patch.object(
        en, "_send_via_bot", lambda chat_id, text: sent.append((chat_id, text))
    ):
        yield sent


def _raised_value_error(message: str = "boom") -> ValueError:
    try:
        raise ValueError(message)
    except ValueError as exc:
        return exc


def test_notify_exception_sends_to_all_owners_with_context() -> None:
    en._reset_state_for_tests()
    with _transport() as sent:
        assert en.notify_exception(_raised_value_error(), context="POST /api/test")
    assert len(sent) == 2  # обоим владельцам
    texts = [text for _, text in sent]
    for text in texts:
        assert "ValueError" in text
        assert "boom" in text
        assert "POST /api/test" in text
        assert "Стек" in text  # хвост трейсбека приложен


def test_identical_error_suppressed_by_cooldown() -> None:
    en._reset_state_for_tests()
    with _transport() as sent:
        assert en.notify_exception(_raised_value_error("same")) is True
        # тот же сайт и то же сообщение -> подавлено cooldown'ом
        assert en.notify_exception(_raised_value_error("same")) is False
    assert len(sent) == 2  # только первая отправка (два чата)


def test_different_message_same_site_not_suppressed() -> None:
    en._reset_state_for_tests()
    with _transport() as sent:
        assert en.notify_exception(_raised_value_error("first"))
        assert en.notify_exception(_raised_value_error("second"))
    assert len(sent) == 4


def test_hourly_budget_blocks_extra_messages(monkeypatch) -> None:
    monkeypatch.setenv("ERROR_NOTIFY_MAX_PER_HOUR", "1")
    en._reset_state_for_tests()
    with _transport() as sent:
        assert en.notify_exception(_raised_value_error("one"))
        # другой отпечаток, но бюджет на час исчерпан
        assert not en.notify_exception(_raised_value_error("two"))
    assert len(sent) == 2  # только первое сообщение (два чата)


def test_disabled_env_disables_sending(monkeypatch) -> None:
    monkeypatch.setenv("ERROR_NOTIFY_ENABLED", "false")
    en._reset_state_for_tests()
    with _transport() as sent:
        assert not en.notify_exception(_raised_value_error("disabled"))
    assert sent == []


def test_logging_handler_forwards_errors_and_dedups() -> None:
    en._reset_state_for_tests()
    root = logging.getLogger()
    old_level = root.level
    handler = en.TelegramErrorNotifyHandler()
    with _transport() as sent:
        root.addHandler(handler)
        root.setLevel(logging.ERROR)
        try:
            # Дважды с ОДНОЙ строки: повтор должен быть подавлен cooldown'ом.
            dup_logger = logging.getLogger("test.notifier.a")
            for _ in range(2):
                dup_logger.error("first %s", "fail")
            try:
                raise RuntimeError("inner")
            except RuntimeError:
                logging.getLogger("test.notifier.b").exception("wrapped")
        finally:
            root.removeHandler(handler)
            root.setLevel(old_level)

    # одна отправка на каждый из двух чатов
    firsts = [text for _, text in sent if "first fail" in text]
    assert len(firsts) == 2
    wrapped = [text for _, text in sent if "wrapped" in text]
    assert len(wrapped) == 2  # по одному на каждый чат
    assert "RuntimeError" in wrapped[0] and "inner" in wrapped[0]


def test_install_is_idempotent_across_module_reloads() -> None:
    root = logging.getLogger()
    before = list(root.handlers)
    try:
        en.install_error_notifying()
        handlers_after_first = [
            h for h in root.handlers if type(h).__name__ == "TelegramErrorNotifyHandler"
        ]
        assert len(handlers_after_first) == 1
        en.install_error_notifying()  # второй вызов ничего не добавляет
        handlers_after_second = [
            h for h in root.handlers if type(h).__name__ == "TelegramErrorNotifyHandler"
        ]
        assert len(handlers_after_second) == 1
    finally:
        for handler in list(root.handlers):
            if handler not in before and type(handler).__name__ == "TelegramErrorNotifyHandler":
                root.removeHandler(handler)


def test_unhandled_route_exception_returns_500_and_notifies() -> None:
    en._reset_state_for_tests()

    app = FastAPI()

    @app.get("/boom")
    def _boom() -> dict:
        raise RuntimeError("route exploded")

    app.add_exception_handler(Exception, en.unhandled_exception_handler)

    with _transport(chats=("777",)) as sent:
        client = TestClient(app, raise_server_exceptions=False)
        response = client.get("/boom")

    assert response.status_code == 500
    assert response.json()["detail"]
    assert len(sent) == 1
    chat_id, text = sent[0]
    assert chat_id == "777"
    assert "RuntimeError" in text
    assert "route exploded" in text
    assert "GET /boom" in text


def test_http_exception_does_not_notify() -> None:
    en._reset_state_for_tests()

    app = FastAPI()

    @app.get("/missing")
    def _missing() -> dict:
        raise HTTPException(status_code=404, detail="nope")

    app.add_exception_handler(Exception, en.unhandled_exception_handler)

    with _transport() as sent:
        client = TestClient(app, raise_server_exceptions=False)
        response = client.get("/missing")

    assert response.status_code == 404
    assert sent == []  # ожидаемые клиентские ошибки в ТГ не уходим
