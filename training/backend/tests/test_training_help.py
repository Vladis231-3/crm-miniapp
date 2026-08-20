"""Тесты обучающего режима бота: команда /help и кнопка тура в /start."""

from unittest.mock import patch

from bot import BotRuntime, _configure_bot_metadata, process_telegram_update


def _runtime() -> BotRuntime:
    return BotRuntime(token="t", webapp_url="https://training.example", api_base="https://api.example")


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
    assert "Обучающий режим ATMOSFERA" in payload["text"]
    assert "мини-помощник" in payload["text"]

    keyboard = payload["reply_markup"]["inline_keyboard"]
    assert len(keyboard) == 1
    button = keyboard[0][0]
    assert button["text"] == "🎓 Открыть обучение"
    assert button["web_app"]["url"] == "https://training.example"


def test_help_command_ignores_extra_argument_text() -> None:
    calls = _run_update(
        _runtime(),
        {"message": {"chat": {"id": 778}, "text": "/help какой-то текст"}},
    )

    sent = [payload for method, payload in calls if method == "sendMessage"]
    assert len(sent) == 1
    assert "Обучающий режим ATMOSFERA" in sent[0]["text"]


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


def test_welcome_markup_has_training_button() -> None:
    from bot import _welcome_reply_markup

    markup = _welcome_reply_markup("https://training.example")
    first_row = markup["inline_keyboard"][0]
    assert first_row[0]["text"] == "🎓 Обучающий тур"
    assert first_row[0]["web_app"]["url"] == "https://training.example"