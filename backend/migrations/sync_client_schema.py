from __future__ import annotations

import sqlite3
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DB_FILES = [
    f for f in DATA_DIR.iterdir()
    if f.suffix == ".sqlite3" and f.is_file()
]

MISSING_COLUMNS = {
    "notes": "TEXT NOT NULL DEFAULT ''",
    "debt_balance": "INTEGER NOT NULL DEFAULT 0",
    "admin_rating": "INTEGER NOT NULL DEFAULT 0",
    "admin_note": "TEXT NOT NULL DEFAULT ''",
    "referral_source": "VARCHAR(64) NOT NULL DEFAULT ''",
}


def sync_client_schema(db_path: Path) -> None:
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(clients)")
        columns = {row[1] for row in cursor.fetchall()}
        for col_name, col_type in MISSING_COLUMNS.items():
            if col_name not in columns:
                cursor.execute(
                    f"ALTER TABLE clients ADD COLUMN {col_name} {col_type}"
                )
                conn.commit()
                print(f"  Added {col_name} to {db_path.name}")
        conn.close()
        if all(c in columns for c in MISSING_COLUMNS):
            pass
    except Exception as exc:
        print(f"  Skipped {db_path.name}: {exc}")


def main() -> None:
    print("Syncing client table schema...")
    for db_file in sorted(DB_FILES):
        sync_client_schema(db_file)
    print("Done.")


if __name__ == "__main__":
    main()
