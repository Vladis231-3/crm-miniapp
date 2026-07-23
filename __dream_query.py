import sqlite3, json, sys
sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect(r'C:\Users\Admin\.local\share\mimocode\mimocode.db')
c = conn.cursor()

PID = 'a96d4138-11c4-42c4-8947-6ea8af094c4f'

# Get user sessions for this project
c.execute("""
    SELECT id, title, time_created, directory 
    FROM session 
    WHERE project_id=? AND title NOT LIKE 'checkpoint-writer%' AND title NOT LIKE 'Auto%'
    ORDER BY time_created DESC
""", (PID,))
sessions = c.fetchall()
print("=== USER SESSIONS ===")
for s in sessions:
    print(f"  {s[0]} | {s[1]} | {s[2]} | {s[3]}")

# For each session, get user messages
for s in sessions:
    sid = s[0]
    print(f"\n=== SESSION {sid} — {s[1]} ===")
    c.execute("""
        SELECT m.id, json_extract(m.data, '$.role') as role, 
               substr(m.data, 1, 500) as preview
        FROM message m
        WHERE m.session_id = ?
        ORDER BY m.time_created
    """, (sid,))
    msgs = c.fetchall()
    for m in msgs:
        role = m[1]
        preview = m[2]
        if role == 'user':
            # Extract text content from the message data
            try:
                data = json.loads(preview)
                parts = data.get('content', [])
                if isinstance(parts, list):
                    for p in parts:
                        if isinstance(p, dict) and p.get('type') == 'text':
                            text = p['text'][:300]
                            print(f"  USER: {text}")
                elif isinstance(parts, str):
                    print(f"  USER: {parts[:300]}")
            except:
                print(f"  USER (raw): {preview[:300]}")

conn.close()
