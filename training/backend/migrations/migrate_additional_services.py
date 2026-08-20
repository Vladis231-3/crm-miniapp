from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from uuid import uuid4

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DB_FILES = [
    f for f in DATA_DIR.iterdir()
    if f.suffix == ".sqlite3" and f.is_file()
]


def migrate_additional_services(db_path: Path) -> None:
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Проверить, существует ли новая таблица
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='booking_additional_services'")
        if not cursor.fetchone():
            print(f"  Table booking_additional_services does not exist yet in {db_path.name} — skipping")
            conn.close()
            return

        # Получить все брони с непустым services
        cursor.execute("SELECT id, services, price, duration FROM bookings WHERE services IS NOT NULL AND services != '[]' AND services != ''")
        rows = cursor.fetchall()

        migrated = 0
        for booking_id, services_json, booking_price, booking_duration in rows:
            try:
                svc_list = json.loads(services_json) if isinstance(services_json, str) else services_json
            except (json.JSONDecodeError, TypeError):
                continue
            if not isinstance(svc_list, list) or len(svc_list) == 0:
                continue

            for svc in svc_list:
                name = svc.get("name", "Доп. услуга")
                service_id = svc.get("serviceId", "")
                price = int(svc.get("price", 0))
                duration = int(svc.get("duration", 30))

                # Проверить, не перенесена ли уже эта услуга
                cursor.execute(
                    "SELECT id FROM booking_additional_services WHERE booking_id=? AND name=? AND price=? AND duration=?",
                    (booking_id, name, price, duration),
                )
                if cursor.fetchone():
                    continue

                asvc_id = str(uuid4())
                cursor.execute(
                    "INSERT INTO booking_additional_services (id, booking_id, service_id, name, price, duration, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))",
                    (asvc_id, booking_id, service_id, name, price, duration),
                )
                migrated += 1

            # Очистить JSON поле после миграции
            cursor.execute("UPDATE bookings SET services='[]' WHERE id=?", (booking_id,))

        conn.commit()
        print(f"  Migrated {migrated} additional services in {db_path.name}")
        conn.close()
    except Exception as exc:
        print(f"  Skipped {db_path.name}: {exc}")


def main() -> None:
    print("Migrating additional services from Booking.services JSON to booking_additional_services table...")
    for db_file in sorted(DB_FILES):
        migrate_additional_services(db_file)
    print("Done.")


if __name__ == "__main__":
    main()
