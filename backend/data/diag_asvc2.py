import re
from pathlib import Path
import psycopg

ENV_PATH = Path(r"C:\Users\Admin\Desktop\concept1.0\backend\.env")
url = None
for line in ENV_PATH.read_text(encoding="utf-8", errors="replace").splitlines():
    m = re.match(r"\s*DATABASE_URL\s*=\s*(.+)\s*$", line)
    if m:
        url = m.group(1).strip()
        break
conn_url = url.replace("postgresql+psycopg://", "postgresql://")

with psycopg.connect(conn_url, connect_timeout=20) as conn:
    cur = conn.cursor()
    for bid in ["b-b79c7267-2859-4665-84e6-c1d4614b68b0", "b-c3b00198-79e5-4239-a328-8eb3acd7a713"]:
        cur.execute("""
            SELECT id, service, service_id, date, time, price, status, source, created_at, completed_at
            FROM bookings WHERE id = %s
        """, (bid,))
        print("BOOKING:", cur.fetchone())
        cur.execute("""
            SELECT bw.worker_name, bw.percent, bw.pay_type, bw.fixed_amount
            FROM booking_workers bw WHERE bw.booking_id = %s
        """, (bid,))
        print("  booking_workers:", cur.fetchall())
        cur.execute("""
            SELECT bas.id, bas.name, bas.price, bas.price_mode, bas.status, bas.created_at
            FROM booking_additional_services bas WHERE bas.booking_id = %s
        """, (bid,))
        for r in cur.fetchall():
            print("  ASVC:", r)
            cur.execute("SELECT asw.worker_name, asw.percent, asw.pay_type, asw.fixed_amount FROM additional_service_workers asw WHERE asw.additional_service_id = %s", (r[0],))
            print("    links:", cur.fetchall())
