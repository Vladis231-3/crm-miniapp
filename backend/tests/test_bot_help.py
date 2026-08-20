"""Тесты команды /help в основном боте: обучающий тур и фолбэк на основную CRM."""

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

    with patch("bot._build_runtime", return_value=runtime), patch(
        "bot._telegram_call", side_effect=fake_telegram_call
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
    assert button["web_app"]["url"] == "https://training.example"


def test_help_button_falls_back_to_main_webapp_url_when_training_unset() -> None:
    calls = _run_update(
        _runtime(training_url=None),
        {"message": {"chat": {"id": 778}, "text": "/help"}},
    )

    sent = [payload for method, payload in calls if method == "sendMessage"]
    assert len(sent) == 1
    button = sent[0]["reply_markup"]["inline_keyboard"][0][0]
    assert button["web_app"]["url"] == "https://app.example"


def test_help_command_registered_in_bot_menu() -> None:
    calls: list[tuple[str, dict]] = []
    runtime = _runtime()

    def fake_telegram_call(_runtime, method: str, payload: dict | None = None, **_kwargs):
        calls.append((method, payload or {}))
        return {}

    with patch("bot._telegram_call", side_effect=fake_telegram_call):
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