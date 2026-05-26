from __future__ import annotations

import sqlite3
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DB_FILES = [
    f for f in DATA_DIR.iterdir()
    if f.suffix == ".sqlite3" and f.is_file()
]


def add_referral_source_column(db_path: Path) -> None:
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(clients)")
        columns = {row[1] for row in cursor.fetchall()}
        if "referral_source" not in columns:
            cursor.execute(
                "ALTER TABLE clients ADD COLUMN referral_source VARCHAR(64) NOT NULL DEFAULT ''"
            )
            conn.commit()
            print(f"  Added referral_source to {db_path.name}")
        else:
            print(f"  Already has referral_source in {db_path.name}")
        conn.close()
    except Exception as exc:
        print(f"  Skipped {db_path.name}: {exc}")


def main() -> None:
    print("Adding referral_source column to client databases...")
    for db_file in sorted(DB_FILES):
        add_referral_source_column(db_file)
    print("Done.")


if __name__ == "__main__":
    main()
