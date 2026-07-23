import sqlite3, json, sys
sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect(r'C:\Users\Admin\.local\share\mimocode\mimocode.db')
c = conn.cursor()

# Get all assistant messages for the compilation session
sid = 'ses_12a8ea838ffeqC2LDCWXe0OSvp'
print(f"=== SESSION {sid} - Компиляция в exe ===")

c.execute("""
    SELECT m.id, json_extract(m.data, '$.role') as role
    FROM message m
    WHERE m.session_id = ?
    ORDER BY m.time_created
""", (sid,))
msgs = c.fetchall()

for mid, role in msgs:
    if role == 'assistant':
        c.execute("SELECT data FROM part WHERE message_id = ? ORDER BY time_created", (mid,))
        parts = c.fetchall()
        for pdata in parts:
            try:
                pd = json.loads(pdata[0])
                if pd.get('type') == 'text':
                    text = pd.get('text', '')[:800]
                    print(f"\n  ASSISTANT [{mid}]: {text}")
                elif pd.get('type') == 'tool':
                    tool = pd.get('tool', '?')
                    state = pd.get('state', {})
                    inp = state.get('input', {})
                    out = state.get('output', {})
                    if tool in ('write', 'edit'):
                        fp = inp.get('file_path', inp.get('filePath', ''))
                        print(f"    {tool}: {fp}")
                    elif tool == 'bash':
                        cmd = inp.get('command', '')[:150]
                        print(f"    bash: {cmd}")
                    elif tool == 'read':
                        fp = inp.get('file_path', inp.get('filePath', ''))
                        print(f"    read: {fp}")
                    elif tool == 'grep':
                        pat = inp.get('pattern', '')
                        print(f"    grep: {pat}")
                    else:
                        print(f"    {tool}: {str(inp)[:100]}")
            except:
                pass

# Now get the payment session details
print("\n\n=== SESSION ses_08e9deea5ffeX3e3EZtzu9kUOi - Оплата за полировку ===")
sid = 'ses_08e9deea5ffeX3e3EZtzu9kUOi'

c.execute("""
    SELECT m.id, json_extract(m.data, '$.role') as role
    FROM message m
    WHERE m.session_id = ?
    ORDER BY m.time_created
""", (sid,))
msgs = c.fetchall()

for mid, role in msgs:
    if role == 'assistant':
        c.execute("SELECT data FROM part WHERE message_id = ? ORDER BY time_created", (mid,))
        parts = c.fetchall()
        for pdata in parts:
            try:
                pd = json.loads(pdata[0])
                if pd.get('type') == 'text':
                    text = pd.get('text', '')[:600]
                    print(f"\n  ASSISTANT [{mid}]: {text}")
                elif pd.get('type') == 'tool':
                    tool = pd.get('tool', '?')
                    state = pd.get('state', {})
                    inp = state.get('input', {})
                    if tool in ('write', 'edit'):
                        fp = inp.get('file_path', inp.get('filePath', ''))
                        print(f"    {tool}: {fp}")
                    elif tool == 'bash':
                        cmd = inp.get('command', '')[:150]
                        print(f"    bash: {cmd}")
                    elif tool == 'read':
                        fp = inp.get('file_path', inp.get('filePath', ''))
                        print(f"    read: {fp}")
                    elif tool == 'grep':
                        pat = inp.get('pattern', '')
                        print(f"    grep: {pat}")
                    else:
                        print(f"    {tool}: {str(inp)[:100]}")
            except:
                pass

conn.close()
