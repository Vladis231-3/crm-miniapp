import sqlite3, json, sys
sys.stdout.reconfigure(encoding='utf-8')

db = sqlite3.connect(r"C:\Users\Admin\.local\share\mimocode\mimocode.db")
db.row_factory = sqlite3.Row
cur = db.cursor()

def get_session_flow(sid, limit=50):
    """Get the text+tool flow for a session"""
    cur.execute("""
        SELECT p.data as pdata, m.data as mdata
        FROM part p 
        JOIN message m ON p.message_id = m.id
        WHERE p.session_id = ?
        ORDER BY p.time_created
        LIMIT ?
    """, (sid, limit))
    lines = []
    for r in cur.fetchall():
        pd = json.loads(r["pdata"])
        md = json.loads(r["mdata"])
        role = md.get("role", "?")
        ptype = pd.get("type", "?")
        
        if ptype == "text":
            text = pd.get("text", "")[:250]
            if text and not text.startswith("<system"):
                lines.append(f"  {role}/text: {text}")
        elif ptype == "tool":
            tool = pd.get("tool", "?")
            inp = pd.get("state", {}).get("input", {})
            if isinstance(inp, dict):
                inp_str = json.dumps(inp, ensure_ascii=False)[:200]
            else:
                inp_str = str(inp)[:200]
            lines.append(f"  {role}/tool:{tool} -> {inp_str}")
        elif ptype == "reasoning":
            text = pd.get("text", "")[:200]
            lines.append(f"  {role}/reasoning: {text}")
    return lines

# 1. Report Generation
print("=" * 80)
print("SESSION: Report Generation (PP/UP reports from examples)")
print("=" * 80)
for line in get_session_flow("ses_10ae15872ffedKxcGUiIBD0cMc", 60):
    print(line)

print()

# 2. Formatting Reports
print("=" * 80)
print("SESSION: Formatting Reports 2025-2026 by template 2023-2024")
print("=" * 80)
for line in get_session_flow("ses_10ab65c82ffeWDzsK47sY2atJM"):
    print(line)

print()

# 3. Payment Change
print("=" * 80)
print("SESSION: Payment change for polishing prep")
print("=" * 80)
for line in get_session_flow("ses_08e9deea5ffeX3e3EZtzu9kUOi"):
    print(line)

print()

# 4. EXE Compilation
print("=" * 80)
print("SESSION: EXE Compilation for web version")
print("=" * 80)
for line in get_session_flow("ses_12a8ea838ffeqC2LDCWXe0OSvp"):
    print(line)

print()

# 5. 21st.dev MCP
print("=" * 80)
print("SESSION: 21st.dev MCP Connection")
print("=" * 80)
for line in get_session_flow("ses_147c6e205ffe6GgQ1qysI0GBo4", 60):
    print(line)

print()

# 6. Auto Dream (Qwen Code)
print("=" * 80)
print("SESSION: Auto Dream - Qwen Code")
print("=" * 80)
for line in get_session_flow("ses_0d8a21adeffeTsxIurq3HwysVW", 40):
    print(line)

print()

# 7. Qwen Code on PC
print("=" * 80)
print("SESSION: How to use Qwen Code on PC for free")
print("=" * 80)
for line in get_session_flow("ses_0d8a21b21ffe0Sd5cfcxnAuZTa"):
    print(line)

db.close()
