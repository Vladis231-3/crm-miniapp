"""Тесты команды /help в основном боте: обучающий тур и фолбэк на основную CRM."""

import os

os.environ.setdefault("APP_SECRET", "test-secret")
os.environ.setdefault("TELEGRAM_BOT_TOKEN", "123456:test-bot-token")
os.environ.setdefault("TELEGRAM_DELIVERY_MODE", "polling")

from unittest.mock import patch

from bot import BotRuntime, _configure_bot_metadata, process_telegram_update


def _runtime(*, training_url: str | None = "https://training.example") -> BotRuntime:
    return BotRuntime(
        token="t",
        webapp_url="https://app.example",
        api_base="https://api.example",
        training_webapp_url=training_url,
    )


def _run_update(runtime: BotRuntime, update: dict) -> list[tuple[str, dict]]:
    calls: list[tuple[str, dict]] = []

    def fake_telegram_call(_runtime, method: str, payload: dict | None = None, **_kwargs):
        calls.append((method, payload or {}))
        return {}

    def fake_multipart_call(_runtime, method: str, *, fields: dict | None = None, files: dict | None = None) -> None:
        # sendPhoto/sendDocument идут multipart-каналом мимо _telegram_call:
        # перехватываем и их, иначе тест уходит в реальную сеть.
        calls.append((method, fields or {}))

    def fake_public_send(chat_id, text, **_kwargs) -> None:
        calls.append(("sendMessage", {"chat_id": chat_id, "text": text}))

    # ВАЖНО: после reset_app_modules в соседних тестах функция держит ссылку
    # на СТАРЫЙ globals-словарь модуля bot, которого уже нет в sys.modules.
    # Поэтому патчим непосредственно этот словарь.
    bot_globals = process_telegram_update.__globals__

    def fake_public_send(chat_id, text, **_kwargs) -> None:
        calls.append(("sendMessage", {"chat_id": chat_id, "text": text}))

    with patch.dict(
        bot_globals,
        {
            "_build_runtime": lambda: runtime,
            "_telegram_call": fake_telegram_call,
            "_telegram_multipart_call": fake_multipart_call,
            "send_telegram_message": fake_public_send,
            "send_telegram_photo": fake_multipart_call,
            "send_telegram_document": fake_multipart_call,
            "_send_start_message": lambda _runtime, chat_id: calls.append(
                ("sendMessage", {"chat_id": chat_id, "text": "start"})
            ),
        },
    ):
        process_telegram_update(update)
    return calls


def test_help_command_sends_training_message_with_webapp_button() -> None:
    calls = _run_update(
        _runtime(),
        {"message": {"chat": {"id": 777}, "text": "/help"}},
    )

    sent = [payload for method, payload in calls if method == "sendMessage"]
    assert len(sent) == 1
    payload = sent[0]
    assert payload["chat_id"] == 777
    assert payload["parse_mode"] == "HTML"
    assert "Обучающая версия ATMOSFERA" in payload["text"]
    assert "мини-помощник" in payload["text"]

    keyboard = payload["reply_markup"]["inline_keyboard"]
    assert len(keyboard) == 1
    button = keyboard[0][0]
    assert button["text"] == "🎓 Открыть обучение"
    assert button["web_app"]["url"] == "https://training.example?help=1"


def test_help_button_falls_back_to_main_webapp_url_when_training_unset() -> None:
    calls = _run_update(
        _runtime(training_url=None),
        {"message": {"chat": {"id": 778}, "text": "/help"}},
    )

    sent = [payload for method, payload in calls if method == "sendMessage"]
    assert len(sent) == 1
    button = sent[0]["reply_markup"]["inline_keyboard"][0][0]
    assert button["web_app"]["url"] == "https://app.example?help=1"


def test_help_command_registered_in_bot_menu() -> None:
    calls: list[tuple[str, dict]] = []
    runtime = _runtime()

    def fake_telegram_call(_runtime, method: str, payload: dict | None = None, **_kwargs):
        calls.append((method, payload or {}))
        return {}

    with patch.dict(
        _configure_bot_metadata.__globals__,
        {"_telegram_call": fake_telegram_call},
    ):
        _configure_bot_metadata(runtime)

    commands_payload = next(payload for method, payload in calls if method == "setMyCommands")
    commands = {command["command"] for command in commands_payload["commands"]}
    assert "help" in commands
    help_command = next(command for command in commands_payload["commands"] if command["command"] == "help")
    assert "Обучающий" in help_command["description"]


def test_help_does_not_break_start_command() -> None:
    calls = _run_update(
        _runtime(),
        {"message": {"chat": {"id": 779}, "text": "/start"}},
    )
    sent = [payload for method, payload in calls if method == "sendMessage"]
    assert len(sent) == 1
    assert "Обучающая версия" not in sent[0]["text"]