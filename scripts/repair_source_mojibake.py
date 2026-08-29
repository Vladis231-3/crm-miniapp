#!/usr/bin/env python3
"""
Скрипт ремонта файлового mojibake — зеркало backend/app/main.py

Строгий детерминированный ремонт: строка является UTF-8 байтами,
ошибочно декодированными как cp1251/cp1252/latin-1.
Без эвристик, без словарей — только encode/decode.
Идемпотентен (повтор не меняет уже-починенный текст).

Применяет line-by-line чтобы не ломаться на символах вне cp1251 (— → ─ и BOM).
Работал вчера вечером после коммитов 75b965f..5ccece0, но часть фронтовых .tsx
осталась с в”Ѕ/Р—Р°СЂ и т.п. (см. фото прод-скрин 2026-08-29 11:46).
"""
import argparse
import pathlib
import sys

def cyr_count(v: str) -> int:
    return sum(1 for ch in v if "\u0400" <= ch <= "\u04FF")

MOJIBAKE_ENCODINGS = ("cp1251", "cp1252", "latin-1")

# Комбинированная карта для смешанного mojibake (часть байт в cp1251, часть в latin-1)
# как в frontend/api.ts, но объединяем все 3 кодировки в одну карту
_combined_map = None
def get_combined_map():
    global _combined_map
    if _combined_map is not None:
        return _combined_map
    m = {}
    for enc in MOJIBAKE_ENCODINGS:
        for i in range(256):
            try:
                ch = bytes([i]).decode(enc)
            except:
                continue
            if ch not in m:
                m[ch] = i
    for i in range(0x80):
        ch = chr(i)
        if ch not in m:
            m[ch] = i
    # Явные маппинги для символов, которые в python cp1251 декодятся иначе чем в браузере
    # "→" (U+2192) в файле встречается как mojibake для стрелки, но его byte 0x92 в cp1251 дает "’", а не "→"
    # Добавляем fallback чтобы "→" мог быть закодирован как 0x92 (как в некоторых старых таблицах)
    if "→" not in m:
        m["→"] = 0x92
    if "—" not in m:
        m["—"] = 0x97
    _combined_map = m
    return m

def encode_combined(text: str):
    cmap = get_combined_map()
    out = bytearray()
    for ch in text:
        b = cmap.get(ch)
        if b is None:
            return None
        out.append(b)
    return bytes(out)

def strict_variants(value: str):
    cands = [value]
    if "'" in value or "`" in value:
        cands.append(value.replace("'", "\u2019").replace("`", "\u2019"))
    seen=set()
    res=[]
    for txt in cands:
        raw = encode_combined(txt)
        if raw is None:
            continue
        try:
            fixed=raw.decode('utf-8')
        except:
            continue
        if fixed==value or fixed in seen:
            continue
        seen.add(fixed)
        res.append(fixed)
    return res

def repair_step(v: str):
    for fixed in strict_variants(v):
        if cyr_count(fixed)==0 and "₽" not in fixed:
            continue
        return fixed
    return None

def repair_value(v: str) -> str:
    if not v:
        return v
    cur=v
    for _ in range(3):
        step=repair_step(cur)
        if step is None:
            break
        cur=step
    return cur

def repair_text(text: str) -> str:
    """Line-by-line repair to handle BOM and special chars (— →) gracefully."""
    # Preserve original line endings
    lines = text.splitlines(True)  # keepends
    out_lines=[]
    changed=False
    for line in lines:
        # Split keepends already separates \n, but we want to repair content without \n then re-add
        ending = ""
        if line.endswith("\r\n"):
            content=line[:-2]
            ending="\r\n"
        elif line.endswith("\n"):
            content=line[:-1]
            ending="\n"
        elif line.endswith("\r"):
            content=line[:-1]
            ending="\r"
        else:
            content=line
        fixed = repair_value(content)
        if fixed != content:
            changed=True
        out_lines.append(fixed + ending)
    result = "".join(out_lines)
    return result

def should_process(path: pathlib.Path) -> bool:
    return path.suffix in {".tsx",".ts",".py",".html",".css",".js",".json",".md"} and path.is_file()

def scan_and_repair(roots, apply=False, verbose=False):
    total_files=0
    changed_files=0
    total_lines_changed=0
    hit_details=[]
    for root in roots:
        p = pathlib.Path(root)
        if not p.exists():
            print(f"[skip] {root} not exists")
            continue
        for f in p.rglob("*"):
            if not should_process(f):
                continue
            # skip node_modules/dist/.git
            if any(part in (".git","node_modules","dist",".next","__pycache__") for part in f.parts):
                continue
            try:
                text = f.read_text(encoding="utf-8")
            except Exception as e:
                if verbose:
                    print(f"[read err] {f}: {e}")
                continue
            fixed = repair_text(text)
            if fixed != text:
                total_files+=1 # will increment later? actually count hit
                # count line diffs
                orig_lines=text.splitlines()
                fixed_lines=fixed.splitlines()
                diffs=sum(1 for a,b in zip(orig_lines, fixed_lines) if a!=b)
                diffs+=abs(len(orig_lines)-len(fixed_lines))
                hit_details.append((str(f), diffs))
                if verbose or diffs<20:
                    print(f"[HIT] {f} lines_changed={diffs}")
                    for i,(a,b) in enumerate(zip(orig_lines, fixed_lines)):
                        if a!=b:
                            print(f"  {i+1}: {a[:200]!r} -> {b[:200]!r}")
                            if i>4:
                                print("  ...")
                                break
                if apply:
                    # keep BOM? original may have BOM (\ufeff)
                    # write preserving utf-8, without BOM if original had it? We'll keep as is but remove BOM handling via encode
                    try:
                        f.write_text(fixed, encoding="utf-8")
                        print(f"[FIXED] {f}")
                    except Exception as e:
                        print(f"[write err] {f}: {e}")
                changed_files+=1
                total_lines_changed+=diffs
            total_files+=1 if fixed==text else 0 # count correctly? simplify
    # Actually total scanned files count
    # Recompute
    return hit_details, changed_files, total_lines_changed

def main():
    parser=argparse.ArgumentParser(description="Repair source mojibake (strict)")
    parser.add_argument("--apply", action="store_true", help="Apply fixes")
    parser.add_argument("--roots", nargs="*", default=["frontend/src","carwash/src","Showcase/src","backend/app","training/backend/app","training/frontend/src"], help="Roots to scan")
    parser.add_argument("--verbose", action="store_true")
    args=parser.parse_args()
    mode="APPLY" if args.apply else "DRY-RUN"
    print(f"=== Source mojibake scan {mode} ===")
    print(f"Roots: {args.roots}")
    hit_details, changed_files, total_lines = scan_and_repair(args.roots, apply=args.apply, verbose=args.verbose)
    print(f"\n=== Summary ===")
    print(f"Files with mojibake: {len(hit_details)}")
    for path,diffs in hit_details:
        print(f"  {path}: {diffs} lines")
    print(f"Total files changed: {changed_files}, total lines: {total_lines}")
    if not args.apply and hit_details:
        print("\nRun with --apply to fix")
        sys.exit(1)
    if args.apply:
        print("Done.")
    sys.exit(0)

if __name__=="__main__":
    main()
