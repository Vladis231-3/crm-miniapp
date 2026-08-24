"""Repro: изменение суммы в архиве (money-split) должно отражаться в ЗП."""

import json
import os
import sys
import unittest
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))


def reset_app_modules() -> None:
    for name in list(sys.modules):
        if name.startswith("app") or name in {"bot", "main"}:
            sys.modules.pop(name, None)


def build_init_data(telegram_id: str) -> str:
    return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})


class ArchiveSplitPayrollSyncTests(unittest.TestCase):
    ADMIN_TG_ID = "889011"
    WORKER_TG_ID = "889012"
    OWNER_TG_ID = "889013"

    def setUp(self) -> None:
        data_dir = Path(__file__).resolve().parents[1] / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = data_dir / f"test_suite_{uuid4().hex}.sqlite3"
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

        self.restart_app()
        self._set_staff_telegram_ids()
        self.admin_token = build_init_data(self.ADMIN_TG_ID)
        self.worker_token = build_init_data(self.WORKER_TG_ID)
        self.owner_token = build_init_data(self.OWNER_TG_ID)

    def tearDown(self) -> None:
        if hasattr(self, "client_manager"):
            self.client_manager.__exit__(None, None, None)
        try:
            from app.database import engine

            engine.dispose()
        except ModuleNotFoundError:
            pass
        reset_app_modules()
        if self.db_path.exists():
            self.db_path.unlink()

    def restart_app(self) -> None:
        reset_app_modules()
        from app.main import app

        self.client_manager = TestClient(app)
        self.client = self.client_manager.__enter__()

    def _set_staff_telegram_ids(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser
        from sqlalchemy import select

        mapping = {
            "admin": self.ADMIN_TG_ID,
            "ivan": self.WORKER_TG_ID,
            "owner": self.OWNER_TG_ID,
        }
        with SessionLocal() as db:
            staff = db.scalars(select(StaffUser)).all()
            for item in staff:
                if item.login in mapping:
                    item.telegram_chat_id = mapping[item.login]
            db.commit()

    @staticmethod
    def auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": token}

    @staticmethod
    def next_active_date() -> str:
        # В сиде неактивен только day_index=1 («Вс», конвенция Сб=0..Пт=6).
        candidate = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        for offset in range(1, 8):
            next_date = candidate + timedelta(days=offset)
            if next_date.weekday() != 6:
                return next_date.strftime("%d.%m.%Y")
        raise AssertionError("Unable to find active schedule day")

    def _worker_id(self) -> str:
        from app.database import SessionLocal
        from app.models import StaffUser

        with SessionLocal() as db:
            worker = db.scalars(select(StaffUser).where(StaffUser.login == "ivan")).one()
            return worker.id

    def create_completed_booking(self) -> dict:
        booking_date = self.next_active_date()
        create_response = self.client.post(
            "/api/bookings",
            headers=self.auth_headers(self.admin_token),
            json={
                "clientId": "",
                "clientName": "Sync Client",
                "clientPhone": "+7 (999) 444-55-66",
                "service": "Мойка базовая",
                "serviceId": "s1",
                "date": booking_date,
                "time": "10:00",
                "duration": 30,
                "price": 1200,
                "status": "scheduled",
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 30}],
                "box": "Бокс 1",
                "paymentType": "cash",
                "car": "Lada Vesta",
                "plate": "A123BC",
            },
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)
        booking = create_response.json()
        complete_response = self.client.patch(
            f"/api/bookings/{booking['id']}",
            headers=self.auth_headers(self.admin_token),
            json={"status": "completed", "paymentSettled": True},
        )
        self.assertEqual(complete_response.status_code, 200, complete_response.text)
        return complete_response.json()

    def test_override_in_archive_updates_payroll_pages(self) -> None:
        booking = self.create_completed_booking()

        split = self.client.get(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(split.status_code, 200, split.text)
        split_payload = split.json()
        self.assertTrue(split_payload["workers"], "У записи должен быть мастер")
        link_id = split_payload["workers"][0]["linkId"]
        auto_earned = split_payload["workers"][0]["earned"]

        # Меняем сумму в архиве
        put = self.client.put(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token),
            json={
                "workers": [{"linkId": link_id, "overrideEarned": 777}],
                "materialsCost": None,
                "piggyDeposit": None,
                "owners": [],
            },
        )
        self.assertEqual(put.status_code, 200, put.text)
        self.assertEqual(put.json()["workers"][0]["earned"], 777)

        worker_id = self._worker_id()

        # 1) Страница ЗП (owner): /api/admin/workers/payroll?period=all
        payroll_all = self.client.get(
            "/api/admin/workers/payroll?period=all",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(payroll_all.status_code, 200, payroll_all.text)
        row = next((w for w in payroll_all.json() if w["id"] == "w1"), None)
        self.assertIsNotNone(row, "Мастер w1 должен быть в расчётке")
        summary_all = row.get("payrollSummary") or {}
        bookings_all = summary_all.get("bookingItems") or []
        earned_all = [b["earned"] for b in bookings_all if b.get("bookingId") == booking["id"]]
        self.assertEqual(
            earned_all,
            [777],
            f"period=all: ЗП не обновилась после правки в архиве (auto={auto_earned})",
        )

        # 2) Страница ЗП за период даты записи
        d = booking["date"]
        payroll_period = self.client.get(
            f"/api/admin/workers/payroll?period=custom&date_from={d}&date_to={d}",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(payroll_period.status_code, 200, payroll_period.text)
        row_p = next((w for w in payroll_period.json() if w["id"] == "w1"), None)
        self.assertIsNotNone(row_p)
        summary_p = row_p.get("payrollSummary") or {}
        self.assertEqual(
            summary_p.get("accruedFromBookings"),
            777,
            f"period=custom: accruedFromBookings={summary_p.get('accruedFromBookings')}, ожидалось 777",
        )

        # 2b) Страница ЗП с периодом «месяц» (дефолт страницы «Зарплаты»)
        payroll_month = self.client.get(
            "/api/admin/workers/payroll?period=month",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(payroll_month.status_code, 200, payroll_month.text)
        row_m = next((w for w in payroll_month.json() if w["id"] == "w1"), None)
        self.assertIsNotNone(row_m)
        summary_m = row_m.get("payrollSummary") or {}
        self.assertEqual(
            summary_m.get("accruedFromBookings"),
            777,
            f"period=month: accruedFromBookings={summary_m.get('accruedFromBookings')}, ожидалось 777",
        )

        # 3) Детальная ЗП мастера у владельца
        detail = self.client.get(
            f"/api/owner/workers/{worker_id}/salary-detail?period=all",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(detail.status_code, 200, detail.text)
        items = [b for b in detail.json()["bookings"] if b["id"] == booking["id"]]
        self.assertTrue(items, "Запись должна быть в детальной ЗП")
        self.assertEqual(items[0]["earned"], 777, "salary-detail: earned не обновился")

    def test_owner_master_override_reflected_on_payroll_page(self) -> None:
        """Правка суммы в архиве для владельца-мастера (extra_roles=['worker'])
        должна отражаться на странице «Зарплаты» (/api/admin/workers/payroll)."""
        from app.database import SessionLocal
        from app.models import StaffUser
        from app.security import hash_password

        with SessionLocal() as db:
            db.add(
                StaffUser(
                    id="om-test-1",
                    login="om_test_1",
                    password_hash=hash_password("om-test-1"),
                    role="owner",
                    name="Владелец Мастер",
                    phone="", email="", city="", experience="", specialty="", about="",
                    telegram_chat_id="889099",
                    is_primary_owner=False,
                    default_percent=30,
                    salary_base=0,
                    salary_per_shift=0,
                    available=True,
                    active=True,
                    extra_roles=["worker"],
                )
            )
            db.commit()

        booking_date = self.next_active_date()
        create_response = self.client.post(
            "/api/bookings",
            headers=self.auth_headers(self.admin_token),
            json={
                "clientId": "",
                "clientName": "Owner Master Client",
                "clientPhone": "+7 (999) 111-22-33",
                "service": "Мойка базовая",
                "serviceId": "s1",
                "date": booking_date,
                "time": "11:00",
                "duration": 30,
                "price": 1200,
                "status": "scheduled",
                "workers": [{"workerId": "om-test-1", "workerName": "Владелец Мастер", "percent": 30}],
                "box": "Бокс 1",
                "paymentType": "cash",
                "car": "Lada Vesta",
                "plate": "A123BC",
            },
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)
        booking = create_response.json()
        complete_response = self.client.patch(
            f"/api/bookings/{booking['id']}",
            headers=self.auth_headers(self.admin_token),
            json={"status": "completed", "paymentSettled": True},
        )
        self.assertEqual(complete_response.status_code, 200, complete_response.text)

        split = self.client.get(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(split.status_code, 200, split.text)
        split_payload = split.json()
        self.assertTrue(split_payload["workers"], "У записи должен быть мастер")
        link_id = split_payload["workers"][0]["linkId"]

        put = self.client.put(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token),
            json={
                "workers": [{"linkId": link_id, "overrideEarned": 555}],
                "materialsCost": None,
                "piggyDeposit": None,
                "owners": [],
            },
        )
        self.assertEqual(put.status_code, 200, put.text)

        # Страница «Зарплаты», период по умолчанию «месяц»
        payroll = self.client.get(
            "/api/admin/workers/payroll?period=month",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(payroll.status_code, 200, payroll.text)
        rows = payroll.json()
        row = next((w for w in rows if w["id"] == "om-test-1"), None)
        self.assertIsNotNone(row, "Мастер-владелец должен быть на странице «Зарплаты»")
        summary = row.get("payrollSummary") or {}
        self.assertEqual(
            summary.get("accruedFromBookings"),
            555,
            f"У мастера-владельца accruedFromBookings={summary.get('accruedFromBookings')}, "
            f"ожидалось 555 (сводка после правки в архиве)",
        )

    def test_archive_payroll_tab_includes_owner_master(self) -> None:
        """Вкладка «Зарплаты» внутри архива: мастер-владелец виден,
        правка суммы в архиве меняет его начисления."""
        from app.database import SessionLocal
        from app.models import StaffUser
        from app.security import hash_password

        with SessionLocal() as db:
            db.add(
                StaffUser(
                    id="om-arch-1",
                    login="om_arch_1",
                    password_hash=hash_password("om-arch-1"),
                    role="owner",
                    name="Владелец Мастер Архив",
                    phone="", email="", city="", experience="", specialty="", about="",
                    telegram_chat_id="889098",
                    is_primary_owner=False,
                    default_percent=30,
                    salary_base=0,
                    salary_per_shift=0,
                    available=True,
                    active=True,
                    extra_roles=["worker"],
                )
            )
            db.commit()

        booking_date = self.next_active_date()
        create_response = self.client.post(
            "/api/bookings",
            headers=self.auth_headers(self.admin_token),
            json={
                "clientId": "",
                "clientName": "Archive Owner Master",
                "clientPhone": "+7 (999) 222-33-44",
                "service": "Мойка базовая",
                "serviceId": "s1",
                "date": booking_date,
                "time": "12:00",
                "duration": 30,
                "price": 1200,
                "status": "scheduled",
                "workers": [{"workerId": "om-arch-1", "workerName": "Владелец Мастер Архив", "percent": 30}],
                "box": "Бокс 1",
                "paymentType": "cash",
                "car": "Lada Vesta",
                "plate": "A123BC",
            },
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)
        booking = create_response.json()
        complete_response = self.client.patch(
            f"/api/bookings/{booking['id']}",
            headers=self.auth_headers(self.admin_token),
            json={"status": "completed", "paymentSettled": True},
        )
        self.assertEqual(complete_response.status_code, 200, complete_response.text)

        split = self.client.get(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token),
        ).json()
        link_id = split["workers"][0]["linkId"]
        put = self.client.put(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token),
            json={
                "workers": [{"linkId": link_id, "overrideEarned": 444}],
                "materialsCost": None,
                "piggyDeposit": None,
                "owners": [],
            },
        )
        self.assertEqual(put.status_code, 200, put.text)

        archive = self.client.get(
            "/api/owner/archive",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(archive.status_code, 200, archive.text)
        payroll_rows = archive.json()["payroll"]
        arch_row = next((w for w in payroll_rows if w["workerId"] == "om-arch-1"), None)
        self.assertIsNotNone(arch_row, "Мастер-владелец должен быть во вкладке «Зарплаты» архива")
        self.assertEqual(
            arch_row["accruedFromBookings"],
            444,
            f"accruedFromBookings={arch_row['accruedFromBookings']}, ожидалось 444 после правки в архиве",
        )


if __name__ == "__main__":
    unittest.main()
