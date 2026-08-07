"""
Tests for the public content endpoints (GET/PUT /api/content).

Covers:
- Legacy stored format (hero.title as string + hero.titleHighlight)
  is auto-migrated to the new {before, highlight, after} shape on read.
- New-format rows pass through unchanged.
- Missing row returns the default content.
- PUT with new-format payload persists and round-trips.
"""
from __future__ import annotations

import json
import os
import sys
import unittest
import urllib.parse
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


def reset_app_modules() -> None:
    for name in list(sys.modules):
        if (
            name == "app"
            or name.startswith(("app.", "backend.app."))
            or name == "backend.app"
            or name == "bot"
        ):
            del sys.modules[name]


def build_init_data(telegram_id: str) -> str:
    return urllib.parse.urlencode({"user": json.dumps({"id": telegram_id})})


class ContentTests(unittest.TestCase):
    OWNER_TG_ID = "777901"

    def setUp(self) -> None:
        data_dir = Path(__file__).resolve().parents[1] / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = data_dir / f"test_content_{uuid4().hex}.sqlite3"
        os.environ["DATABASE_URL"] = f"sqlite:///{self.db_path.as_posix()}"
        os.environ["APP_ENV"] = "development"
        os.environ["APP_SECRET"] = "test-secret"
        os.environ["CRON_SECRET"] = "test-cron-secret"
        os.environ["ALLOW_DEMO_SEED_DATA"] = "true"
        os.environ["RUN_EMBEDDED_BOT"] = "false"
        os.environ["ALLOW_INSECURE_CLIENT_AUTH"] = "true"
        os.environ["TELEGRAM_BOT_TOKEN"] = "123456:test-bot-token"
        os.environ["TELEGRAM_DELIVERY_MODE"] = "polling"
        os.environ["SYNC_TELEGRAM_WEBHOOK"] = "false"
        os.environ["TELEGRAM_WEBHOOK_PATH"] = "/api/telegram/webhook"
        os.environ.pop("WEBAPP_URL", None)

        reset_app_modules()
        from app.main import app

        self.client_manager = TestClient(app)
        self.client = self.client_manager.__enter__()

        self._set_staff_telegram_ids()
        self.owner_token = build_init_data(self.OWNER_TG_ID)

    def tearDown(self) -> None:
        if hasattr(self, "client_manager"):
            self.client_manager.__exit__(None, None, None)
        try:
            from app.database import engine
        except ModuleNotFoundError:
            pass
        else:
            engine.dispose()
        reset_app_modules()
        if self.db_path.exists():
            self.db_path.unlink()

    def _set_staff_telegram_ids(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser
        from sqlalchemy import select

        with SessionLocal() as db:
            owner = db.scalar(select(StaffUser).where(StaffUser.login == "owner"))
            if owner is not None:
                owner.telegram_chat_id = self.OWNER_TG_ID
            db.commit()

    def _seed_content(self, value: dict) -> None:
        from app.main import get_db
        from app.models import AppSetting

        with next(get_db()) as db:
            row = db.get(AppSetting, "content")
            if row is None:
                db.add(AppSetting(key="content", value=value))
            else:
                row.value = value
            db.commit()

    def test_missing_row_returns_default(self) -> None:
        res = self.client.get("/api/content")
        assert res.status_code == 200, res.text
        payload = res.json()
        assert isinstance(payload["hero"]["title"], dict)
        assert "highlight" in payload["hero"]["title"]

    def test_legacy_format_is_migrated_on_read(self) -> None:
        self._seed_content({
            "hero": {
                "backgroundImage": "/hero-bg.jpg",
                "badgeText": "ATMOSFERA",
                "title": "Ваш автомобиль заслуживает лучшего ухода",
                "titleHighlight": "лучшего",
                "subtitle": "sub",
                "button1Text": "Услуги",
                "button1Action": "services",
                "button2Text": "Записаться",
                "button2Action": "contact",
                "stats": [],
            },
            "about": {"text": "about", "features": [], "image": ""},
            "services": [],
            "works": [],
        })
        res = self.client.get("/api/content")
        assert res.status_code == 200, res.text
        title = res.json()["hero"]["title"]
        assert title == {"before": "Ваш автомобиль заслуживает ", "highlight": "лучшего", "after": " ухода"}

    def test_new_format_passes_through(self) -> None:
        self._seed_content({
            "hero": {
                "backgroundImage": "/hero-bg.jpg",
                "badgeText": "ATMOSFERA",
                "title": {"before": "Ваш автомобиль заслуживает ", "highlight": "лучшего", "after": " ухода"},
                "subtitle": "sub",
                "button1Text": "Услуги",
                "button1Action": "services",
                "button2Text": "Записаться",
                "button2Action": "contact",
                "stats": [],
            },
            "about": {"text": "about", "features": [], "image": ""},
            "services": [],
            "works": [],
        })
        res = self.client.get("/api/content")
        assert res.status_code == 200, res.text
        assert res.json()["hero"]["title"]["highlight"] == "лучшего"

    def test_put_roundtrip_new_format(self) -> None:
        payload = {
            "hero": {
                "backgroundImage": "/bg.jpg",
                "badgeText": "ATMOSFERA",
                "title": {"before": "A ", "highlight": "H", "after": " Z"},
                "subtitle": "s",
                "button1Text": "Услуги",
                "button1Action": "services",
                "button2Text": "Записаться",
                "button2Action": "contact",
                "stats": [{"value": "4.9", "label": "Рейтинг"}],
            },
            "about": {"text": "t", "features": [], "image": ""},
            "services": [],
            "works": [],
        }
        headers = {"Authorization": self.owner_token}
        res = self.client.put("/api/content", json=payload, headers=headers)
        assert res.status_code == 200, res.text
        assert res.json()["hero"]["title"]["highlight"] == "H"
        res2 = self.client.get("/api/content")
        assert res2.status_code == 200, res2.text
        assert res2.json()["hero"]["title"]["after"] == " Z"