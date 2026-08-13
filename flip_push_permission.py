"""Flips `git push*` permission from deny to allow in global opencode config."""
import json
import os

p = os.path.expanduser(r"~\.config\opencode\opencode.json")
with open(p, "rb") as f:
    raw = f.read()
print("BOM:", raw.startswith(b"\xef\xbb\xbf"))
text = raw.decode("utf-8-sig")
target = '"git push*": "deny"'
count = text.count(target)
print("pattern count:", count)
assert count == 1, f"expected exactly 1 occurrence, got {count}"
text = text.replace(target, '"git push*": "allow"')
with open(p, "w", encoding="utf-8", newline="") as f:
    f.write(text)
json.load(open(p, encoding="utf-8-sig"))
print("OK - config updated and still valid JSON")
