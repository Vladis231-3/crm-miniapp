import sqlite3

conn = sqlite3.connect(r"backend/data/crm.sqlite3")
cursor = conn.cursor()

# Add columns to booking_workers
try:
    cursor.execute('ALTER TABLE booking_workers ADD COLUMN pay_type VARCHAR(16) NOT NULL DEFAULT "percent"')
    print("Added pay_type to booking_workers")
except Exception as e:
    print(f"pay_type: {e}")

try:
    cursor.execute("ALTER TABLE booking_workers ADD COLUMN fixed_amount INTEGER DEFAULT NULL")
    print("Added fixed_amount to booking_workers")
except Exception as e:
    print(f"fixed_amount: {e}")

# Check additional_service_workers table
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='additional_service_workers'")
tbl = cursor.fetchone()
print(f"additional_service_workers table exists: {tbl is not None}")
if tbl:
    cursor.execute("PRAGMA table_info(additional_service_workers)")
    print(f"columns: {cursor.fetchall()}")
    try:
        cursor.execute('ALTER TABLE additional_service_workers ADD COLUMN pay_type VARCHAR(16) NOT NULL DEFAULT "percent"')
        print("Added pay_type to additional_service_workers")
    except Exception as e:
        print(f"pay_type: {e}")
    try:
        cursor.execute("ALTER TABLE additional_service_workers ADD COLUMN fixed_amount INTEGER DEFAULT NULL")
        print("Added fixed_amount to additional_service_workers")
    except Exception as e:
        print(f"fixed_amount: {e}")

conn.commit()
conn.close()
print("Done")