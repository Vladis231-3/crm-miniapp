#!/usr/bin/env python3
"""PROJECT_MAP.md — автогенератор карты проекта.

Режимы:
    python scripts/generate_project_map.py            # сгенерировать один раз и выйти
    python scripts/generate_project_map.py --watch    # следить за изменениями и перегенерировать
    python scripts/generate_project_map.py --watch --interval 2
    python scripts/generate_project_map.py --install-hook  # установить git pre-commit хук

Карта перезаписывается только при реальном изменении содержимого,
поэтому watcher не зацикливается сам на себя.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "PROJECT_MAP.md"
LOCK_FILE = ROOT / "scripts" / ".project-map-watch.lock"

# ---- фильтры: что НЕ попадает в карту ----
EXCLUDE_DIRS = {
    ".git", ".codex", ".kiro", ".mimocode", ".opencode", ".vscode",
    ".vercel", "__pycache__", ".pytest_cache", ".ruff_cache", ".mypy_cache",
    "node_modules", "dist", "build", "out", ".venv", "venv", "env",
    "runtime", "uploads", "assets",
}
# поддеревья, которые отбрасываются целиком (результаты сборки, БД, логи)
EXCLUDE_SUBTREE_PREFIXES = ("backend/data", "data", "desktop/build", "portable")
EXCLUDE_EXT = {
    ".pyc", ".pyo", ".sqlite3", ".sqlite3-shm", ".sqlite3-wal", ".db",
    ".log", ".exe", ".ico", ".png", ".jpg", ".jpeg", ".gif", ".webp",
    ".svg", ".woff", ".woff2", ".ttf", ".eot", ".map", ".tgz", ".pdf",
    ".xlsx", ".xls", ".zip", ".7z", ".dll", ".pdb", ".bak",
}
EXCLUDE_FILES = {"package-lock.json", "pnpm-lock.yaml", "yarn.lock", ".env", ".env.bak", "PROJECT_MAP.md"}
EXCLUDE_PREFIXES = ("_distill_", "__dream_")
SCAN_EXTS = {".py", ".ts", ".tsx", ".js", ".mjs", ".cjs"}
MAX_PER_FILE = 200
MAX_PER_FILE_ROUTES = 250

# ---- регулярные выражения для извлечения сигнатур ----
ROUTE_RE = re.compile(r"^@(?:app|router)\.(get|post|put|delete|patch|api_route|websocket)\(")
STR_RE = re.compile(r"[\"']([^\"']+)[\"']")
DEF_RE = re.compile(r"^(async def|def) (\w+)\(")
CLASS_RE = re.compile(r"^class (\w+)")
TS_PATTERNS = [
    re.compile(r"^export default (?:async )?function (\w+)"),
    re.compile(r"^export (?:async )?function (\w+)"),
    re.compile(r"^export const (\w+)\b"),
    re.compile(r"^export default (\w+)\b"),
    re.compile(r"^(?:async )?function (\w+)"),
    re.compile(r"^const (\w+) = "),
]


# --------------------------------------------------------------------------
# сбор файлов
# --------------------------------------------------------------------------
def excluded_subtree(rel: Path) -> bool:
    rels = rel.as_posix()
    for p in EXCLUDE_SUBTREE_PREFIXES:
        if rels == p or rels.startswith(p + "/"):
            return True
    return False


def collect_files() -> list[Path]:
    files = []
    for dirpath, dirnames, filenames in os_walk(ROOT):
        dirnames[:] = sorted(d for d in dirnames if d not in EXCLUDE_DIRS)
        rel_dir = Path(dirpath).relative_to(ROOT)
        if excluded_subtree(rel_dir):
            dirnames[:] = []
            continue
        for fname in filenames:
            rel = rel_dir / fname
            if excluded_subtree(rel):
                continue
            if fname in EXCLUDE_FILES:
                continue
            if fname.startswith(EXCLUDE_PREFIXES):
                continue
            if rel.suffix.lower() in EXCLUDE_EXT:
                continue
            files.append(rel)
    return sorted(files, key=lambda p: p.as_posix().lower())


def os_walk(root: Path):
    import os
    return os.walk(root, topdown=True)


# --------------------------------------------------------------------------
# защита от дублей watcher'а (lock-файл с PID)
# --------------------------------------------------------------------------
def _is_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        import ctypes

        PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
        handle = ctypes.windll.kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
        if not handle:
            return False
        ctypes.windll.kernel32.CloseHandle(handle)
        return True
    except OSError:
        return False


def acquire_lock() -> bool:
    if LOCK_FILE.exists():
        try:
            pid = int(LOCK_FILE.read_text(encoding="utf-8").strip() or "-1")
        except ValueError:
            pid = -1
        if _is_alive(pid):
            print(f"[map] watcher уже запущен (PID {pid}) \u2014 выходим")
            return False
        try:
            LOCK_FILE.unlink()
        except OSError:
            pass
    LOCK_FILE.write_text(str(os.getpid()), encoding="utf-8")
    return True


def release_lock() -> None:
    try:
        LOCK_FILE.unlink(missing_ok=True)
    except OSError:
        pass


def snapshot(files: list[Path]) -> str:
    h = hashlib.sha256()
    for rel in files:
        try:
            st = (ROOT / rel).stat()
            h.update(f"{rel.as_posix()}|{st.st_size}|{st.st_mtime_ns}\n".encode("utf-8"))
        except OSError:
            pass
    return h.hexdigest()


# --------------------------------------------------------------------------
# извлечение сигнатур из Python
# --------------------------------------------------------------------------
def _join_signature(lines: list[str], idx: int) -> str:
    parts = [lines[idx - 1].strip()]
    base_indent = len(lines[idx - 1]) - len(lines[idx - 1].lstrip())
    j = idx
    while j < len(lines):
        ln = lines[j]
        if ln.strip() == "":
            j += 1
            continue
        indent = len(ln) - len(ln.lstrip())
        if indent <= base_indent:
            break
        parts.append(ln.strip())
        stripped = ln.rstrip()
        if stripped.endswith("):"):
            break
        if re.search(r"\)\s*->", stripped):
            if j + 1 < len(lines) and lines[j + 1].strip().startswith("->"):
                parts.append(lines[j + 1].strip())
            break
        j += 1
        if j - idx > 14:
            parts.append("\u2026")
            break
    text = re.sub(r"\s+", " ", " ".join(parts))
    return text[:180]


def _class_label(lines: list[str], idx: int) -> str:
    line = lines[idx - 1]
    text = line.strip()
    if not text.rstrip().endswith("(") and "(" in text:
        return re.sub(r"\s+", " ", text)[:120]
    parts = [text]
    j = idx
    while j < len(lines):
        ln = lines[j].strip()
        if not ln:
            j += 1
            continue
        parts.append(ln)
        if ln.rstrip().endswith("):") or ln.endswith(")"):
            break
        j += 1
        if j - idx > 8:
            parts.append("\u2026")
            break
    return re.sub(r"\s+", " ", " ".join(parts))[:120]


def extract_python(rel: Path):
    """Возвращает (routes, defs) — списки строк карты."""
    text = (ROOT / rel).read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    routes: list[str] = []
    defs: list[str] = []
    current_class = None
    class_indent = -1
    pending = None  # [METHOD, строка_декоратора, path]
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if pending is not None:
            if pending[2] is None:
                m = STR_RE.search(line)
                if m and not stripped.startswith("@"):
                    pending[2] = m.group(1)
            m = DEF_RE.match(stripped)
            if m:
                routes.append(
                    f"`{pending[0]} {pending[2] or '?'}` -> `{m.group(2)}` (декоратор: стр. {pending[1]})"
                )
                pending = None
                continue
            if i - pending[1] > 25:
                pending = None
        if pending is None:
            m = ROUTE_RE.match(stripped)
            if m:
                sm = STR_RE.search(stripped)
                paren = stripped.find("(")
                first_arg = ""
                if paren >= 0:
                    first_arg = stripped[paren + 1:].split(",", 1)[0].strip().strip(")")
                pending = [m.group(1).upper(), i, sm.group(1) if sm else (first_arg or None)]
                continue
        m = CLASS_RE.match(stripped)
        if m:
            current_class = m.group(1)
            class_indent = len(line) - len(line.lstrip())
            defs.append(f"`{_class_label(lines, i)}` (стр. {i})")
            continue
        m = DEF_RE.match(stripped)
        if m:
            indent = len(line) - len(line.lstrip())
            name = m.group(2)
            sig = _join_signature(lines, i)
            label = f"{current_class}.{name}" if current_class and indent > class_indent else name
            defs.append(f"`{label}{sig}` (стр. {i})")
            continue
    return routes, defs


# --------------------------------------------------------------------------
# извлечение из TS/TSX/JS
# --------------------------------------------------------------------------
def extract_ts(rel: Path) -> list[str]:
    text = (ROOT / rel).read_text(encoding="utf-8", errors="replace")
    entries: list[str] = []
    for i, line in enumerate(text.splitlines(), 1):
        stripped = line.strip()
        for pat in TS_PATTERNS:
            m = pat.match(stripped)
            if m:
                exported = stripped.startswith("export")
                name = m.group(1)
                entries.append(f"`{name}` (стр. {i})" + ("" if exported else " — локальный"))
                break
        if len(entries) >= MAX_PER_FILE:
            break
    return entries


# --------------------------------------------------------------------------
# дерево каталогов
# --------------------------------------------------------------------------
def build_nodes(rel_paths: list[Path]) -> dict:
    root: dict = {}
    for rp in rel_paths:
        node = root
        for p in rp.parts[:-1]:
            node = node.setdefault(p, {})
        node[rp.parts[-1]] = None
    return root


def _count_files(node: dict) -> int:
    return sum(1 if v is None else _count_files(v) for v in node.values())


def render_tree_lines(node: dict, prefix: str = "") -> list[str]:
    lines: list[str] = []
    keys = sorted(node.keys(), key=lambda k: (node[k] is None, k.lower()))
    for idx, k in enumerate(keys):
        last = idx == len(keys) - 1
        child = node[k]
        conn = "\u2514\u2500\u2500 " if last else "\u251c\u2500\u2500 "
        lines.append(prefix + conn + k + ("/" if child is not None else ""))
        if child is not None:
            if k == "ui" and all(v is None for v in child.values()):
                lines.append(
                    prefix + ("    " if last else "\u2502   ")
                    + "\u2514\u2500\u2500 (%d shadcn/ui-файлов \u2014 не индексируются)" % _count_files(child)
                )
            else:
                lines.extend(render_tree_lines(child, prefix + ("    " if last else "\u2502   ")))
    return lines


# --------------------------------------------------------------------------
# секции карты
# --------------------------------------------------------------------------
def render_mermaid() -> list[str]:
    has = lambda d: (ROOT / d).is_dir()  # noqa: E731
    out = ["graph TD"]
    out.append('    BE["backend/ \u2014 FastAPI + SQLAlchemy"] --> DB[("SQLite: backend/data/crm.sqlite3")]')
    if has("backend"):
        out.append('    BOT["backend/bot.py \u2014 Telegram polling-бот"] --> DB')
    if has("frontend"):
        out.append('    FE["frontend/ \u2014 CRM-минапп (React/Vite): admin/owner/worker/client"] -->|HTTP /api| BE')
    if has("carwash"):
        out.append('    CWS["carwash/ \u2014 лендинг автомойки (React)"] -->|HTTP| BE')
    if has("Showcase"):
        out.append('    SHOW["Showcase/ \u2014 лендинг-витрина (React)"] -->|HTTP| BE')
    if has("api"):
        out.append('    API["api/ \u2014 Vercel serverless (api/index.py)"] --> BE')
    if has("native"):
        out.append('    EL["native/electron/ \u2014 Windows-десктоп (Electron)"] -->|HTTPS| BE')
    return out


def _file_lines(rel: Path) -> int:
    try:
        return len((ROOT / rel).read_text(encoding="utf-8", errors="replace").splitlines())
    except OSError:
        return 0


def _section_for_files(files: list[Path], title: str) -> list[str]:
    if not files:
        return []
    out = [f"## {title}", ""]
    for rel in files:
        rels = rel.as_posix()
        if "/components/ui/" in rels or rels.endswith("/components/ui"):
            continue
        nl = _file_lines(rel)
        out.append(f"### {rels} ({nl} строк)")
        if rel.suffix == ".py":
            routes, defs = extract_python(rel)
            if routes:
                out.append("")
                out.append(f"Роуты ({len(routes)}):")
                out.append("")
                out.append("```")
                out.extend(f"  {r}" for r in routes[:MAX_PER_FILE_ROUTES])
                if len(routes) > MAX_PER_FILE_ROUTES:
                    out.append(f"  ...ещё {len(routes) - MAX_PER_FILE_ROUTES}")
                out.append("```")
            if defs:
                out.append("")
                out.append(f"Классы и функции ({len(defs)}):")
                out.append("")
                out.extend(f"- {d}" for d in defs[:MAX_PER_FILE])
                if len(defs) > MAX_PER_FILE:
                    out.append(f"- ...ещё {len(defs) - MAX_PER_FILE}")
        elif rel.suffix in {".ts", ".tsx", ".js", ".mjs", ".cjs"}:
            entries = extract_ts(rel)
            if entries:
                out.append("")
                out.extend(f"- {e}" for e in entries)
        out.append("")
    return out


def render_map(files: list[Path]) -> str:
    scan_files = [f for f in files if f.suffix in SCAN_EXTS]
    total_lines = sum(_file_lines(f) for f in scan_files)
    by_ext: dict[str, int] = {}
    for f in scan_files:
        by_ext[f.suffix] = by_ext.get(f.suffix, 0) + 1

    lines: list[str] = []
    lines.append("# PROJECT_MAP \u2014 карта проекта")
    lines.append("")
    lines.append(f"> Автосгенерировано {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}. **НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ.**")
    lines.append("")
    lines.append("**Обновление:**")
    lines.append("")
    lines.append("```")
    lines.append("python scripts/generate_project_map.py            # один раз")
    lines.append("scripts\\watch-project-map.bat                    # фоновый вотчер (перезапускается при изменениях)")
    lines.append("python scripts/generate_project_map.py --install-hook  # git pre-commit хук (обновляет карту при коммите)")
    lines.append("```")
    lines.append("")
    lines.append("## Статистика")
    lines.append("")
    lines.append(f"- Файлов кода: **{len(scan_files)}**")
    lines.append(f"- Строк кода: **{total_lines:,}**".replace(",", " "))
    if by_ext:
        lines.append("- По расширениям: " + ", ".join(f"`{k}`: {v}" for k, v in sorted(by_ext.items())))
    lines.append("")
    lines.append("## Архитектура")
    lines.append("")
    lines.append("```mermaid")
    lines.extend(render_mermaid())
    lines.append("```")
    lines.append("")
    lines.append("## Дерево каталогов")
    lines.append("")
    lines.append("```")
    lines.append(ROOT.name + "/")
    lines.extend(render_tree_lines(build_nodes(files)))
    lines.append("```")
    lines.append("")

    backend = [f for f in scan_files if f.parts[:1] == ("backend",) and "data" not in f.parts[:2] and "/data" not in f.as_posix()]
    frontend = [f for f in scan_files if f.parts[:2] == ("frontend", "src") and f.suffix in {".ts", ".tsx"}]
    carwash = [f for f in scan_files if f.parts[:2] == ("carwash", "src") and f.suffix in {".ts", ".tsx"}]
    showcase = [f for f in scan_files if f.parts[:2] == ("Showcase", "src") and f.suffix in {".ts", ".tsx"}]
    api_files = [f for f in scan_files if f.parts[:1] == ("api",)]
    electron = [f for f in scan_files if f.parts[:2] == ("native", "electron")]
    scripts_list = [f for f in scan_files if f.parts[:1] == ("scripts",)]
    root_files = [f for f in scan_files if len(f.parts) == 1 and f.name not in EXCLUDE_FILES]

    lines.extend(_section_for_files(backend, "Backend (Python)"))
    lines.extend(_section_for_files(frontend, "Frontend \u2014 CRM-минапп (frontend/src)") or _section_for_files(frontend, "Frontend"))
    lines.extend(_section_for_files(carwash, "Carwash \u2014 лендинг (carwash/src)"))
    lines.extend(_section_for_files(showcase, "Showcase \u2014 лендинг (Showcase/src)"))
    lines.extend(_section_for_files(api_files, "API (Vercel serverless)"))
    lines.extend(_section_for_files(electron, "Native (Electron)"))

    if scripts_list or root_files:
        lines.append("## Скрипты и корневые файлы")
        lines.append("")
        for f in scripts_list + root_files:
            lines.append(f"- `{f.as_posix()}`")
        lines.append("")

    recent = sorted(files, key=lambda p: (ROOT / p).stat().st_mtime, reverse=True)[:15]
    lines.append("## Недавно изменённые файлы")
    lines.append("")
    for f in recent:
        t = datetime.fromtimestamp((ROOT / f).stat().st_mtime).strftime("%Y-%m-%d %H:%M")
        lines.append(f"- `{f.as_posix()}` ({t})")
    lines.append("")

    return "\n".join(lines)


# --------------------------------------------------------------------------
# git pre-commit hook
# --------------------------------------------------------------------------
HOOK_SCRIPT = """#!/bin/sh
# Автообновление PROJECT_MAP.md при коммите (создан: scripts/generate_project_map.py --install-hook)
root=$(git rev-parse --show-toplevel) || exit 0
cd "$root" || exit 0
if [ -f scripts/generate_project_map.py ]; then
  python scripts/generate_project_map.py >/dev/null 2>&1 || true
  git add PROJECT_MAP.md 2>/dev/null || true
fi
exit 0
"""


def install_hook() -> bool:
    hooks = ROOT / ".git" / "hooks"
    if not hooks.is_dir():
        print("[map] нет каталога .git/hooks \u2014 хук не установлен")
        return False
    hook = hooks / "pre-commit"
    hook.write_text(HOOK_SCRIPT, encoding="utf-8", newline="\n")
    print(f"[map] pre-commit хук установлен: {hook}")
    return True


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------
def _strip_stamp(text: str) -> str:
    return "\n".join(l for l in text.splitlines() if not l.startswith("> Автосгенерировано "))


def regenerate(quiet: bool = False) -> None:
    files = collect_files()
    content = render_map(files)
    old = OUT.read_text(encoding="utf-8") if OUT.exists() else None
    if old is None or _strip_stamp(old) != _strip_stamp(content):
        OUT.write_text(content, encoding="utf-8", newline="\n")
        print(f"[map] PROJECT_MAP.md обновлён ({len(files)} файлов, {len(content)} байт)")
    elif not quiet:
        print("[map] изменений нет \u2014 карта актуальна")


def main() -> int:
    sys.stdout.reconfigure(line_buffering=True)  # для логов watcher'а при редиректе
    ap = argparse.ArgumentParser(description="Генератор PROJECT_MAP.md")
    ap.add_argument("--watch", action="store_true", help="следить за изменениями и перегенерировать")
    ap.add_argument("--interval", type=float, default=2.0, help="интервал опроса в секундах (по умолчанию 2)")
    ap.add_argument("--install-hook", action="store_true", help="установить git pre-commit хук")
    ap.add_argument("--quiet", action="store_true", help="не печатать лишнего")
    args = ap.parse_args()

    if args.install_hook:
        install_hook()

    regenerate(args.quiet)
    if not args.watch:
        return 0

    if not acquire_lock():
        return 0
    print(f"[map] watcher запущен (интервал {args.interval} c, PID {os.getpid()}). Ctrl+C \u2014 выход.")
    try:
        last = snapshot(collect_files())
        while True:
            time.sleep(args.interval)
            try:
                cur = snapshot(collect_files())
            except OSError:
                continue
            if cur != last:
                time.sleep(1.0)
                last = snapshot(collect_files())
                try:
                    regenerate(quiet=True)
                except Exception as exc:  # noqa: BLE001
                    print(f"[map] ошибка: {exc}")
    finally:
        release_lock()


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n[map] остановлен")
        sys.exit(0)
