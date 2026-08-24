from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from app import google_calendar as gc
from app.config import get_settings


@pytest.fixture
def settings(monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("APP_SECRET", "a" * 32)
    monkeypatch.setenv("ALLOW_DEMO_SEED_DATA", "false")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")
    monkeypatch.setenv("GOOGLE_CALENDAR_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_CALENDAR_CLIENT_SECRET", "test-secret")
    monkeypatch.setenv("GOOGLE_CALENDAR_REDIRECT_URI", "https://example.com/api/owner/integrations/google/callback")
    monkeypatch.setenv("GOOGLE_CALENDAR_TIMEZONE", "Europe/Moscow")
    return get_settings()


class _Row:
    def __init__(self, key, value):
        self.key = key
        self.value = value


class _FakeDb:
    """Минимальный fake сессии: хранит AppSetting-подобные строки в dict."""

    def __init__(self):
        self.rows = {}

    def get(self, model, key):
        return self.rows.get(key)

    def add(self, row):
        self.rows[row.key] = row

    def delete(self, row):
        self.rows.pop(row.key, None)

    def flush(self):
        pass


class _FakeAppSetting:
    def __init__(self, key, value):
        self.key = key
        self.value = value


@pytest.fixture
def fake_db():
    return _FakeDb()


@pytest.fixture(autouse=True)
def patch_appsetting(monkeypatch):
    # Подменяем модель AppSetting в модуле google_calendar на fake.
    # Устойчиво к перезагрузке модулей из других тест-файлов: патчим
    # атрибут МОДУЛЯ, а не строку "app.google_calendar", чтобы патч и
    # вызов гарантированно попадали в один и тот же объект.
    monkeypatch.setattr(gc, "_AppSetting", _FakeAppSetting)


def test_is_configured_requires_both_credentials(settings):
    assert gc.is_configured(settings) is True
    settings2 = SimpleNamespace(
        google_calendar_client_id=None, google_calendar_client_secret="x"
    )
    assert gc.is_configured(settings2) is False


def test_save_load_clear_tokens(fake_db):
    tokens = {"token": "t", "refresh_token": "r"}
    gc.save_tokens(fake_db, tokens)
    assert gc.load_tokens(fake_db) == tokens
    gc.clear_tokens(fake_db)
    assert gc.load_tokens(fake_db) == {}


def test_load_tokens_ignores_non_dict(fake_db):
    fake_db.rows[gc.GOOGLE_CALENDAR_TOKENS_KEY] = _Row(gc.GOOGLE_CALENDAR_TOKENS_KEY, "not-a-dict")
    assert gc.load_tokens(fake_db) == {}


def test_credentials_save_load_clear(fake_db):
    creds = {
        "client_id": "id.apps.googleusercontent.com",
        "client_secret": "secret",
        "redirect_uri": "https://example.com/callback",
    }
    gc.save_credentials(fake_db, creds)
    assert gc.load_credentials(fake_db) == creds
    gc.clear_credentials(fake_db)
    assert gc.load_credentials(fake_db) == {}


def test_load_credentials_ignores_non_dict(fake_db):
    fake_db.rows[gc.GOOGLE_CALENDAR_CREDENTIALS_KEY] = _Row(
        gc.GOOGLE_CALENDAR_CREDENTIALS_KEY, "not-a-dict"
    )
    assert gc.load_credentials(fake_db) == {}


def test_is_configured_with_db_credentials(fake_db):
    settings2 = SimpleNamespace(
        google_calendar_client_id=None, google_calendar_client_secret=None
    )
    assert gc.is_configured(settings2, fake_db) is False
    gc.save_credentials(
        fake_db, {"client_id": "id.apps.googleusercontent.com", "client_secret": "s"}
    )
    assert gc.is_configured(settings2, fake_db) is True
    # Без db учётные данные из БД не учитываются.
    assert gc.is_configured(settings2) is False


def test_build_auth_url_uses_db_credentials(fake_db, settings):
    gc.save_credentials(
        fake_db,
        {
            "client_id": "db-client.apps.googleusercontent.com",
            "client_secret": "db-secret",
            "redirect_uri": "https://db.example.com/callback",
        },
    )
    url = gc.build_auth_url(settings, "state-1", fake_db)
    assert "client_id=db-client.apps.googleusercontent.com" in url
    assert "redirect_uri=https%3A%2F%2Fdb.example.com%2Fcallback" in url
    # Без db — учётные данные из env.
    url2 = gc.build_auth_url(settings, "state-1")
    assert "client_id=test-client-id.apps.googleusercontent.com" in url2


def test_exchange_code_uses_db_credentials(fake_db, settings):
    gc.save_credentials(
        fake_db,
        {
            "client_id": "db-client.apps.googleusercontent.com",
            "client_secret": "db-secret",
            "redirect_uri": "",
        },
    )
    resp_mock = MagicMock()
    resp_mock.status_code = 200
    resp_mock.json.return_value = {"token": "t", "refresh_token": "r"}
    with patch.object(gc.requests, "post", return_value=resp_mock) as post_mock:
        tokens = gc.exchange_code(settings, "code-123", fake_db)
    assert tokens["token"] == "t"
    data = post_mock.call_args.kwargs["data"]
    assert data["client_id"] == "db-client.apps.googleusercontent.com"
    assert data["client_secret"] == "db-secret"


def test_booking_event_body_uses_timezone_and_duration(settings):
    booking = SimpleNamespace(
        id="b1",
        date="13.08.2026",
        time="10:30",
        duration=45,
        client_name="Иван",
        client_phone="+7 999 111-22-33",
        car="Toyota",
        plate="A123BC",
        box="Бокс 1",
        notes="",
        service="Полировка",
        source="bot",
    )
    body = gc._booking_event_body(booking, settings)
    assert body["summary"] == "Полировка"
    assert body["start"]["timeZone"] == "Europe/Moscow"
    assert body["start"]["dateTime"].startswith("2026-08-13T10:30")
    assert body["end"]["dateTime"].startswith("2026-08-13T11:15")
    assert "Иван" in body["description"]
    assert "A123BC" in body["description"]
    # Привязка к записи CRM + подпись источника в описании события.
    assert body["extendedProperties"]["private"]["crmBookingId"] == "b1"
    assert "Источник: Бот" in body["description"]


def test_booking_event_body_marks_google_source_label(settings):
    booking = SimpleNamespace(
        id="b2",
        date="13.08.2026",
        time="10:30",
        duration=30,
        client_name="",
        client_phone="",
        car="",
        plate="",
        box="",
        notes="",
        service="Мойка",
        source="google",
    )
    body = gc._booking_event_body(booking, settings)
    assert "Источник: Google" in body["description"]


def test_sync_noop_when_unconfigured(fake_db):
    settings2 = SimpleNamespace(
        google_calendar_client_id=None, google_calendar_client_secret=None
    )
    booking = SimpleNamespace(id="b1", status="scheduled", google_event_id=None)
    event_id, ok = gc.sync_booking_to_calendar(fake_db, settings2, booking, action="upsert")
    assert event_id is None
    assert ok is False


def test_sync_noop_without_tokens(fake_db, settings):
    booking = SimpleNamespace(id="b1", status="scheduled", google_event_id=None)
    event_id, ok = gc.sync_booking_to_calendar(fake_db, settings, booking, action="upsert")
    assert event_id is None
    assert ok is False


def test_sync_insert_saves_event_id(fake_db, settings):
    gc.save_tokens(fake_db, {"token": "t", "refresh_token": "r"})
    booking = SimpleNamespace(
        id="b1",
        status="scheduled",
        google_event_id=None,
        date="13.08.2026",
        time="10:00",
        duration=30,
        client_name="Иван",
        client_phone="",
        car="",
        plate="",
        box="",
        notes="",
        service="Мойка",
    )
    with patch.object(gc, "_calendar_request", return_value={"id": "evt-123"}) as api:
        event_id, ok = gc.sync_booking_to_calendar(fake_db, settings, booking, action="upsert")
    api.assert_called_once()
    assert api.call_args.args[2] == "POST"
    assert api.call_args.args[3] == "calendars/primary/events"
    assert event_id == "evt-123"
    assert ok is True
    assert booking.google_event_id == "evt-123"
    assert booking.google_updated_at is not None


def test_sync_patch_existing_event(fake_db, settings):
    gc.save_tokens(fake_db, {"token": "t", "refresh_token": "r"})
    booking = SimpleNamespace(
        id="b1",
        status="scheduled",
        google_event_id="evt-123",
        date="13.08.2026",
        time="10:00",
        duration=30,
        client_name="Иван",
        client_phone="",
        car="",
        plate="",
        box="",
        notes="",
        service="Мойка",
    )
    with patch.object(gc, "_calendar_request", return_value={}) as api:
        event_id, ok = gc.sync_booking_to_calendar(fake_db, settings, booking, action="upsert")
    assert event_id == "evt-123"
    assert ok is True
    assert api.call_args.args[2] == "PATCH"
    assert api.call_args.args[3] == "calendars/primary/events/evt-123"


def test_sync_delete_removes_event(fake_db, settings):
    gc.save_tokens(fake_db, {"token": "t", "refresh_token": "r"})
    booking = SimpleNamespace(
        id="b1", status="cancelled", google_event_id="evt-123"
    )
    with patch.object(gc, "_calendar_request", return_value={}) as api:
        event_id, ok = gc.sync_booking_to_calendar(fake_db, settings, booking, action="upsert")
    assert ok is True
    assert event_id is None
    assert api.call_args.args[2] == "DELETE"
    assert api.call_args.args[3] == "calendars/primary/events/evt-123"


def test_sync_cancelled_without_event_is_noop(fake_db, settings):
    gc.save_tokens(fake_db, {"token": "t", "refresh_token": "r"})
    booking = SimpleNamespace(
        id="b1", status="cancelled", google_event_id=None
    )
    with patch.object(gc, "_calendar_request", return_value={}) as api:
        event_id, ok = gc.sync_booking_to_calendar(fake_db, settings, booking, action="upsert")
    assert ok is True
    assert event_id is None
    api.assert_not_called()


def test_sync_errors_are_caught(fake_db, settings):
    gc.save_tokens(fake_db, {"token": "t", "refresh_token": "r"})
    booking = SimpleNamespace(
        id="b1",
        status="scheduled",
        google_event_id=None,
        date="13.08.2026",
        time="10:00",
        duration=30,
        client_name="Иван",
        client_phone="",
        car="",
        plate="",
        box="",
        notes="",
        service="Мойка",
    )
    with patch.object(gc, "_calendar_request", side_effect=RuntimeError("google api down")):
        event_id, ok = gc.sync_booking_to_calendar(fake_db, settings, booking, action="upsert")
    assert ok is False
    assert event_id is None


def test_build_auth_url_returns_consent_url(settings):
    url = gc.build_auth_url(settings, "test-state-123")
    assert url.startswith("https://accounts.google.com/o/oauth2/auth")
    assert "test-state-123" in url
    assert "redirect_uri" in url


def test_exchange_code_returns_tokens(settings):
    resp_mock = MagicMock()
    resp_mock.status_code = 200
    resp_mock.json.return_value = {"token": "t", "refresh_token": "r"}
    with patch.object(gc.requests, "post", return_value=resp_mock) as post_mock:
        tokens = gc.exchange_code(settings, "code-123")
    assert tokens["token"] == "t"
    assert tokens["refresh_token"] == "r"
    assert post_mock.call_args.args[0] == "https://oauth2.googleapis.com/token"
    assert post_mock.call_args.kwargs["data"]["code"] == "code-123"
    assert post_mock.call_args.kwargs["data"]["grant_type"] == "authorization_code"


# ─────────────────────────────────────────────────────────────────────────────
# Мультиподключение: несколько людей, несколько календарей
# ─────────────────────────────────────────────────────────────────────────────


def _connect_second_person(fake_db):
    """Подключить второго человека к уже подключённому владельцу."""
    gc.save_tokens(fake_db, {"token": "t1", "refresh_token": "r1"})
    gc.upsert_connection(
        fake_db,
        {
            "id": "gc-anna",
            "name": "Анна",
            "email": "anna@example.com",
            "tokens": {"token": "t2", "refresh_token": "r2"},
            "sync_token": None,
            "created_at": "2026-08-24T00:00:00+00:00",
        },
    )


def _booking_for_sync(**overrides):
    base = {
        "id": "b1",
        "status": "scheduled",
        "google_event_id": None,
        "date": "13.08.2026",
        "time": "10:00",
        "duration": 30,
        "client_name": "Иван",
        "client_phone": "",
        "car": "",
        "plate": "",
        "box": "",
        "notes": "",
        "service": "Мойка",
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def test_connections_store_roundtrip(fake_db):
    _connect_second_person(fake_db)
    conns = gc.list_connections(fake_db)
    assert [c["id"] for c in conns] == ["owner", "gc-anna"]
    assert conns[1]["name"] == "Анна"
    assert "tokens" not in conns[0]  # публичный список без токенов
    # Полное подключение с токенами доступно отдельно.
    full = gc.get_connection(fake_db, "gc-anna")
    assert full is not None and full["tokens"]["refresh_token"] == "r2"
    # Удаление одного не трогает другое.
    assert gc.delete_connection(fake_db, "gc-anna") is True
    assert gc.delete_connection(fake_db, "gc-anna") is False
    assert [c["id"] for c in gc.list_connections(fake_db)] == ["owner"]
    assert gc.load_tokens(fake_db)["refresh_token"] == "r1"


def test_legacy_tokens_migrate_into_first_connection(fake_db):
    # Старое хранилище: токены лежат отдельным ключом.
    fake_db.rows[gc.GOOGLE_CALENDAR_TOKENS_KEY] = _Row(
        gc.GOOGLE_CALENDAR_TOKENS_KEY, {"access_token": "legacy-at", "refresh_token": "legacy-rt"}
    )
    conns = gc._read_connections(fake_db)
    assert len(conns) == 1
    assert conns[0]["id"] == gc.OWNER_CONNECTION_ID
    assert gc.load_tokens(fake_db)["token"] == "legacy-at"
    # Первая запись мигрирует: legacy-ключ удаляется, данные переезжают.
    gc.save_tokens(fake_db, {"token": "new-t", "refresh_token": "r"})
    assert gc.GOOGLE_CALENDAR_TOKENS_KEY not in fake_db.rows
    assert gc.list_connections(fake_db)[0]["id"] == gc.OWNER_CONNECTION_ID


def test_sync_fans_out_to_all_calendars(fake_db, settings):
    _connect_second_person(fake_db)
    booking = _booking_for_sync()
    responses = [{"id": "evt-owner"}, {"id": "evt-anna"}]
    with patch.object(
        gc, "_calendar_request", side_effect=lambda *a, **k: responses.pop(0)
    ) as api:
        event_id, ok = gc.sync_booking_to_calendar(fake_db, settings, booking, action="upsert")
    assert api.call_count == 2
    assert ok is True
    # Основное (первое) подключение определяет google_event_id для совместимости.
    assert event_id == "evt-owner"
    assert booking.google_event_id == "evt-owner"
    assert booking.google_event_ids == {"owner": "evt-owner", "gc-anna": "evt-anna"}
    # Каждому календарю уходят его токены.
    used_conns = [call.kwargs["conn"]["id"] for call in api.call_args_list]
    assert used_conns == ["owner", "gc-anna"]


def test_sync_patch_uses_legacy_event_id_for_first_calendar(fake_db, settings):
    gc.save_tokens(fake_db, {"token": "t", "refresh_token": "r"})
    gc.upsert_connection(
        fake_db,
        {
            "id": "gc-anna",
            "name": "Анна",
            "email": "",
            "tokens": {"token": "t2", "refresh_token": "r2"},
            "sync_token": None,
            "created_at": "",
        },
    )
    # Запись старого формата: только google_event_id без карты.
    booking = _booking_for_sync(google_event_id="evt-legacy")

    def fake_request(db, settings_, method, path, **kwargs):
        if method == "POST":
            return {"id": "evt-anna-new"}
        return {}

    with patch.object(gc, "_calendar_request", side_effect=fake_request) as api:
        event_id, ok = gc.sync_booking_to_calendar(fake_db, settings, booking, action="upsert")
    assert ok is True
    assert event_id == "evt-legacy"
    methods = [call.args[2] for call in api.call_args_list]
    assert methods.count("PATCH") == 1  # только для первого календаря
    # Второму календарю создаётся новое событие и карта заполняется.
    assert booking.google_event_ids == {"owner": "evt-legacy", "gc-anna": "evt-anna-new"}


def test_delete_removes_events_from_all_calendars(fake_db, settings):
    _connect_second_person(fake_db)
    booking = SimpleNamespace(
        id="b1",
        status="cancelled",
        google_event_id="evt-owner",
        google_event_ids={"owner": "evt-owner", "gc-anna": "evt-anna"},
    )
    with patch.object(gc, "_calendar_request", return_value={}) as api:
        event_id, ok = gc.sync_booking_to_calendar(fake_db, settings, booking, action="upsert")
    assert ok is True
    assert event_id is None
    assert api.call_count == 2
    paths = [call.args[3] for call in api.call_args_list]
    assert paths == [
        "calendars/primary/events/evt-owner",
        "calendars/primary/events/evt-anna",
    ]
    assert booking.google_event_ids == {}
    assert booking.google_event_id is None


def test_one_broken_calendar_does_not_block_others(fake_db, settings):
    _connect_second_person(fake_db)
    booking = _booking_for_sync()

    def flaky_request(db, settings_, method, path, **kwargs):
        if kwargs["conn"]["id"] == "owner":
            raise RuntimeError("network down")
        return {"id": "evt-anna"}

    with patch.object(gc, "_calendar_request", side_effect=flaky_request):
        event_id, ok = gc.sync_booking_to_calendar(fake_db, settings, booking, action="upsert")
    # Второй календарь сработал -> ok=True; основной идентификатор пуст.
    assert ok is True
    assert event_id is None
    assert booking.google_event_ids == {"gc-anna": "evt-anna"}


def test_pull_aggregates_from_all_calendars(fake_db, settings):
    _connect_second_person(fake_db)

    def fake_request(db, settings_, method, path, *, params=None, body=None, conn=None, _retried=False):
        assert method == "GET"
        if conn["id"] == "owner":
            return {"items": [{"id": "e1"}], "nextSyncToken": "tok-owner"}
        return {"items": [{"id": "e2"}, {"id": "e3"}], "nextSyncToken": "tok-anna"}

    def apply_event(db, settings_, item, result):
        result["created"] += 1

    with patch.object(gc, "_calendar_request", side_effect=fake_request), patch.object(
        gc, "_apply_calendar_event", side_effect=apply_event
    ):
        result = gc.pull_calendar_changes(fake_db, settings)
    assert result["ok"] is True
    assert result["skipped"] is False
    assert result["created"] == 3  # события обоих календарей просуммированы
    # У каждого подключения свой syncToken.
    tokens_by_conn = {c["id"]: c.get("sync_token") for c in gc._read_connections(fake_db)}
    assert tokens_by_conn == {"owner": "tok-owner", "gc-anna": "tok-anna"}


def test_pull_skipped_without_connections(fake_db, settings):
    gc.save_tokens(fake_db, {"token": "t"})  # нет refresh_token -> не «рабочее»
    result = gc.pull_calendar_changes(fake_db, settings)
    assert result["skipped"] is True


def test_invites_create_consume_clear(fake_db):
    gc.create_invite(fake_db, "Анна", "state-1")
    gc.create_invite(fake_db, "Пётр", "state-2")
    invite = gc.consume_invite(fake_db, "state-1")
    assert invite is not None and invite["label"] == "Анна"
    # Одноразовость: повторно state не находится.
    assert gc.consume_invite(fake_db, "state-1") is None
    assert gc.consume_invite(fake_db, "state-2")["label"] == "Пётр"
    gc.create_invite(fake_db, "Ещё", "state-3")
    gc.clear_invites(fake_db)
    assert gc.consume_invite(fake_db, "state-3") is None


def test_extract_account_email_from_id_token():
    import base64
    import json as json_mod

    payload = base64.urlsafe_b64encode(
        json_mod.dumps({"email": "anna@example.com", "sub": "123"}).encode()
    ).decode().rstrip("=")
    tokens = {"id_token": f"header.{payload}.signature"}
    assert gc.extract_account_email(tokens) == "anna@example.com"
    assert gc.extract_account_email({}) == ""
    assert gc.extract_account_email({"id_token": "garbage"}) == ""