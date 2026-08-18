"""Diagnostic: additional services on 11.08.2026 and their worker links (Rodion)."""
import re
import sys
from pathlib import Path

import psycopg

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
url = None
for line in ENV_PATH.read_text(encoding="utf-8", errors="replace").splitlines():
    m = re.match(r"\s*DATABASE_URL\s*=\s*(.+)\s*$", line)
    if m:
        url = m.group(1).strip()
        break
if not url:
    print("DATABASE_URL not found in .env")
    sys.exit(1)

conn_url = url.replace("postgresql+psycopg://", "postgresql://")
display = re.sub(r"://[^@]+@", "://***@", conn_url)
print("Connecting to:", display)

with psycopg.connect(conn_url, connect_timeout=20) as conn:
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, name, role, active FROM staff_users
        WHERE lower(name) LIKE '%%родион%%' OR lower(name) LIKE '%%rodion%%'
        """
    )
    rodion = cur.fetchall()
    print("\n=== Мастера 'Родион' в staff_users ===")
    for row in rodion:
        print(row)

    rodion_id = rodion[0][0] if rodion else None

    cur.execute(
        """
        SELECT bas.id, bas.booking_id, bas.name, bas.price, bas.price_mode,
               bas.is_outsource, bas.status, b.date, b.status AS booking_status,
               b.service, b.client_name, b.time
        FROM booking_additional_services bas
        JOIN bookings b ON b.id = bas.booking_id
        WHERE b.date = '11.08.2026'
        ORDER BY b.time, bas.created_at
        """
    )
    rows = cur.fetchall()
    print(f"\n=== Доп услуги за 11.08.2026: {len(rows)} ===")
    for r in rows:
        print(
            f"asvc={r[0]} booking={r[1]} | {r[2]} price={r[3]} mode={r[4]} "
            f"outsource={r[5]} status={r[6]} | b.date={r[7]} b.status={r[8]} time={r[11]} | {r[9]} ({r[10]})"
        )
        cur.execute(
            """
            SELECT asw.worker_id, asw.worker_name, asw.percent, asw.pay_type, asw.fixed_amount
            FROM additional_service_workers asw
            WHERE asw.additional_service_id = %s
            """,
            (r[0],),
        )
        links = cur.fetchall()
        if not links:
            print("    >>> НЕТ worker_links у доп услуги!")
        for l in links:
            mark = " <<< РОДИОН" if rodion_id and l[0] == rodion_id else ""
            print(f"    worker={l[1]} ({l[0]}) percent={l[2]} pay_type={l[3]} fixed={l[4]}{mark}")

    if rodion_id:
        cur.execute(
            """
            SELECT bas.name, bas.price, bas.price_mode, b.date, b.status,
                   bas.id, bas.booking_id
            FROM additional_service_workers asw
            JOIN booking_additional_services bas ON bas.id = asw.additional_service_id
            JOIN bookings b ON b.id = bas.booking_id
            WHERE asw.worker_id = %s AND b.date >= '01.08.2026'
            ORDER BY b.date
            """,
            (rodion_id,),
        )
        print("\n=== Все доп услуги Родиона (август), где он мастер ===")
        for r in cur.fetchall():
            print(f"  {r[3]} [{r[4]}] {r[0]} price={r[1]} mode={r[2]} asvc={r[5]} booking={r[6]}")

    cur.execute(
        """
        SELECT bas.id, bas.booking_id, bas.name, bas.price, bas.price_mode,
               bas.is_outsource, bas.status, b.date, b.status, b.service, b.client_name, b.time
        FROM booking_additional_services bas
        JOIN bookings b ON b.id = bas.booking_id
        WHERE b.date = '11.08.2026'
          AND NOT EXISTS (SELECT 1 FROM additional_service_workers asw WHERE asw.additional_service_id = bas.id)
        ORDER BY b.time
        """
    )
    rows = cur.fetchall()
    print(f"\n=== Доп услуги 11.08 БЕЗ worker_links: {len(rows)} ===")
    for r in rows:
        print(
            f"  asvc={r[0]} booking={r[1]} | {r[2]} price={r[3]} mode={r[4]} "
            f"outsource={r[5]} status={r[6]} | b.date={r[7]} b.status={r[8]} time={r[11]} | {r[9]} ({r[10]})"
        )
