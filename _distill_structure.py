import sqlite3, json, sys
sys.stdout.reconfigure(encoding='utf-8')

db = sqlite3.connect(r"C:\Users\Admin\.local\share\mimocode\mimocode.db")
db.row_factory = sqlite3.Row
cur = db.cursor()

# Check what the message data actually contains
sid = "ses_10ae15872ffedKxcGUiIBD0cMc"
cur.execute("SELECT data FROM message WHERE session_id = ? ORDER BY time_created LIMIT 3", (sid,))
print("=== Sample message data structure ===")
for r in cur.fetchall():
    d = json.loads(r["data"])
    print(json.dumps(d, ensure_ascii=False, indent=2)[:500])
    print("---")

print()

# Check part table structure  
cur.execute("SELECT data FROM part WHERE session_id = ? ORDER BY time_created LIMIT 5", (sid,))
print("=== Sample part data structure ===")
for r in cur.fetchall():
    d = json.loads(r["data"])
    print(json.dumps(d, ensure_ascii=False, indent=2)[:600])
    print("---")

db.close()
