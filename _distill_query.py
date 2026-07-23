import sqlite3, json, sys

db = sqlite3.connect(r"C:\Users\Admin\.local\share\mimocode\mimocode.db")
db.row_factory = sqlite3.Row
cur = db.cursor()

# 1. Tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print("=== TABLES ===")
for t in tables:
    print(t)
print()

# 2. Recent sessions (last 30 days)
cur.execute("SELECT id, time_created, title FROM session ORDER BY time_created DESC LIMIT 30")
print("=== RECENT SESSIONS (last 30) ===")
session_ids = []
for r in cur.fetchall():
    sid = r[0]
    ts = r[1]
    title = r[2] if len(r) > 2 else "?"
    print(f"  {sid}  ts={ts}  title={title[:80] if title else '?'}")
    session_ids.append(sid)
print()

# 3. Top tool usage patterns across recent sessions
# Find cutoff: 30 days ago in ms
import datetime
cutoff = int((datetime.datetime.utcnow() - datetime.timedelta(days=30)).timestamp() * 1000)
print(f"=== TOOL USAGE (since {cutoff}) ===")
cur.execute("""
SELECT json_extract(p.data, '$.tool') as tool,
       substr(json_extract(p.data, '$.state.input'), 1, 120) as input_preview,
       count(*) as n
FROM message m
JOIN part p ON p.message_id = m.id
WHERE json_extract(m.data, '$.role') = 'assistant'
  AND json_extract(p.data, '$.type') = 'tool'
  AND m.time_created > ?
GROUP BY tool, input_preview
ORDER BY n DESC
LIMIT 40
""", (cutoff,))
for r in cur.fetchall():
    print(f"  {r[2]:3d}x  {r[0]}  {r[1][:100] if r[1] else ''}")
print()

# 4. User messages with repeated keywords
print("=== USER KEYWORD SEARCH ===")
keywords = ["again", "every time", "like last time", "the usual", "repeat", "same as before", "каждый раз", "снова", "как раньше", "как в прошлый раз", "привычн"]
for kw in keywords:
    cur.execute("""
    SELECT m.id, substr(json_extract(m.data, '$.content'), 1, 200)
    FROM message m
    WHERE json_extract(m.data, '$.role') = 'user'
      AND json_extract(m.data, '$.content') LIKE ?
      AND m.time_created > ?
    LIMIT 5
    """, (f"%{kw}%", cutoff))
    rows = cur.fetchall()
    if rows:
        print(f"  Keyword '{kw}': {len(rows)} hits")
        for r in rows:
            print(f"    [{r[0]}] {r[1][:150]}")
print()

# 5. Message count per session in recent period
print("=== SESSIONS BY MESSAGE COUNT (recent) ===")
cur.execute("""
SELECT m.session_id, count(*) as msg_count
FROM message m
WHERE m.time_created > ?
GROUP BY m.session_id
ORDER BY msg_count DESC
LIMIT 15
""", (cutoff,))
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]} messages")
print()

# 6. Repeated file paths in tool calls
print("=== REPEAKED FILE PATHS IN TOOLS ===")
cur.execute("""
SELECT json_extract(p.data, '$.state.input') as inp, count(*) as n
FROM message m
JOIN part p ON p.message_id = m.id
WHERE json_extract(m.data, '$.role') = 'assistant'
  AND json_extract(p.data, '$.type') = 'tool'
  AND m.time_created > ?
GROUP BY inp
HAVING n >= 2
ORDER BY n DESC
LIMIT 30
""", (cutoff,))
for r in cur.fetchall():
    inp = r[0] if r[0] else ""
    print(f"  {r[1]:2d}x  {inp[:150]}")
print()

db.close()
