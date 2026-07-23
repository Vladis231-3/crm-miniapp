import sqlite3, json, sys
sys.stdout.reconfigure(encoding='utf-8')

db = sqlite3.connect(r"C:\Users\Admin\.local\share\mimocode\mimocode.db")
db.row_factory = sqlite3.Row
cur = db.cursor()

# 1. Examine report generation session (74 msgs)
sid = "ses_10ae15872ffedKxcGUiIBD0cMc"
cur.execute("SELECT id, data FROM message WHERE session_id = ? ORDER BY time_created LIMIT 40", (sid,))
print("=== ses_10ae15872 (Report Generation) first 40 msgs ===")
for r in cur.fetchall():
    d = json.loads(r["data"])
    role = d.get("role", "?")
    content = d.get("content", "")
    if isinstance(content, list):
        content = str(content)[:200]
    else:
        content = str(content)[:200]
    print(f"  [{r['id'][:12]}] {role}: {content}")

print()

# 2. Examine formatting session (15 msgs)
sid2 = "ses_10ab65c82ffeWDzsK47sY2atJM"
cur.execute("SELECT id, data FROM message WHERE session_id = ? ORDER BY time_created", (sid2,))
print("=== ses_10ab65c82 (Formatting Reports) ===")
for r in cur.fetchall():
    d = json.loads(r["data"])
    role = d.get("role", "?")
    content = d.get("content", "")
    if isinstance(content, list):
        content = str(content)[:250]
    else:
        content = str(content)[:250]
    print(f"  [{r['id'][:12]}] {role}: {content}")

print()

# 3. Examine payment change session
sid3 = "ses_08e9deea5ffeX3e3EZtzu9kUOi"
cur.execute("SELECT id, data FROM message WHERE session_id = ? ORDER BY time_created", (sid3,))
print("=== ses_08e9deea5 (Payment Change) ===")
for r in cur.fetchall():
    d = json.loads(r["data"])
    role = d.get("role", "?")
    content = d.get("content", "")
    if isinstance(content, list):
        content = str(content)[:250]
    else:
        content = str(content)[:250]
    print(f"  [{r['id'][:12]}] {role}: {content}")

print()

# 4. Examine exe compilation session
sid4 = "ses_12a8ea838ffeqC2LDCWXe0OSvp"
cur.execute("SELECT id, data FROM message WHERE session_id = ? ORDER BY time_created", (sid4,))
print("=== ses_12a8ea83 (EXE Compilation) ===")
for r in cur.fetchall():
    d = json.loads(r["data"])
    role = d.get("role", "?")
    content = d.get("content", "")
    if isinstance(content, list):
        content = str(content)[:250]
    else:
        content = str(content)[:250]
    print(f"  [{r['id'][:12]}] {role}: {content}")

print()

# 5. Examine MCP/21st.dev sessions
sid5 = "ses_147c6e205ffe6GgQ1qysI0GBo4"
cur.execute("SELECT id, data FROM message WHERE session_id = ? ORDER BY time_created", (sid5,))
print("=== ses_147c6e20 (21st.dev MCP) ===")
for r in cur.fetchall():
    d = json.loads(r["data"])
    role = d.get("role", "?")
    content = d.get("content", "")
    if isinstance(content, list):
        content = str(content)[:250]
    else:
        content = str(content)[:250]
    print(f"  [{r['id'][:12]}] {role}: {content}")

print()

# 6. Examine Auto Dream sessions
sid6 = "ses_0d8a21adeffeTsxIurq3HwysVW"
cur.execute("SELECT id, data FROM message WHERE session_id = ? ORDER BY time_created LIMIT 30", (sid6,))
print("=== ses_0d8a21ad (Auto Dream) first 30 msgs ===")
for r in cur.fetchall():
    d = json.loads(r["data"])
    role = d.get("role", "?")
    content = d.get("content", "")
    if isinstance(content, list):
        content = str(content)[:200]
    else:
        content = str(content)[:200]
    print(f"  [{r['id'][:12]}] {role}: {content}")

db.close()
