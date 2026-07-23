import sqlite3, json, sys
sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect(r'C:\Users\Admin\.local\share\mimocode\mimocode.db')
c = conn.cursor()

PID = 'a96d4138-11c4-42c4-8947-6ea8af094c4f'

# Get all sessions for this project
c.execute("""
    SELECT id, title, time_created 
    FROM session 
    WHERE project_id=?
    ORDER BY time_created DESC
""", (PID,))
sessions = c.fetchall()

for s in sessions:
    sid = s[0]
    print(f"\n{'='*60}")
    print(f"SESSION: {sid}")
    print(f"TITLE: {s[1]}")
    print(f"{'='*60}")
    
    # Get messages
    c.execute("""
        SELECT id, data FROM message
        WHERE session_id = ?
        ORDER BY time_created
    """, (sid,))
    msgs = c.fetchall()
    
    for mid, mdata in msgs:
        try:
            md = json.loads(mdata)
            role = md.get('role', '?')
        except:
            role = '?'
        
        if role == 'user':
            # Get text parts from this message
            c.execute("""
                SELECT data FROM part WHERE message_id = ? ORDER BY time_created
            """, (mid,))
            parts = c.fetchall()
            for pdata in parts:
                try:
                    pd = json.loads(pdata[0])
                    if pd.get('type') == 'text':
                        text = pd.get('text', '')[:500]
                        print(f"\n  USER [{mid}]: {text}")
                except:
                    pass
        elif role == 'assistant':
            # Get text parts
            c.execute("""
                SELECT data FROM part WHERE message_id = ? ORDER BY time_created
            """, (mid,))
            parts = c.fetchall()
            text_parts = []
            tool_parts = []
            for pdata in parts:
                try:
                    pd = json.loads(pdata[0])
                    if pd.get('type') == 'text':
                        text_parts.append(pd.get('text', '')[:200])
                    elif pd.get('type') == 'tool':
                        tool = pd.get('tool', '?')
                        state = pd.get('state', {})
                        inp = str(state.get('input', ''))[:100]
                        tool_parts.append(f"{tool}({inp})")
                except:
                    pass
            if text_parts:
                print(f"\n  ASSISTANT [{mid}]: {' | '.join(text_parts[:3])}")
            if tool_parts:
                print(f"    Tools: {' -> '.join(tool_parts[:5])}")

conn.close()
