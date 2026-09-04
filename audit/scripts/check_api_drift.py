"""Дрейф контрактов фронт↔бэк (Фаза 4.1).

A. Вызовы фронта без роута бэка (сломанные вызовы!) — с учётом метода где видно.
B. Роуты бэка без вызывателей во фронте (кандидаты в мёртвый API / тень тестов).

Эвристики задокументированы в коде; вывод: audit/reports/api_drift.md
Запуск из корня репо: python audit/scripts/check_api_drift.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
FRONTEND_SRC = REPO / "frontend" / "src"
CARWASH_SRC = REPO / "carwash" / "src"
MAIN = REPO / "backend" / "app" / "main.py"

URL_RE = re.compile(r"""['"`](\/api\/[^'"`\s]*)['"`]""")
METHOD_RE = re.compile(r"""method\s*:\s*['"](GET|POST|PUT|PATCH|DELETE)['"]""")
NEXT_CALL_RE = re.compile(r"(apiRequest|apiDownload|fetch)\s*(?:<(?:[^<>]|<[^<>]*>)*>)?\s*\(")
ROUTE_RE = re.compile(
    r"""@app\.(get|post|put|delete|patch)\(\s*["']([^"']+)["']"""
)
# декоратор может быть разорван: @app.post(\n    "/api/...",\n ...
ROUTE_MULTILINE_RE = re.compile(
    r"""@app\.(get|post|put|delete|patch)\(\s*\n?\s*["']([^"']+)["']""",
    re.MULTILINE,
)


def normalize(path: str) -> str:
    path = path.split("?", 1)[0].rstrip("/") or "/"
    path = re.sub(r"\$\{[^}]*\}", "{id}", path)
    path = re.sub(r"/\d+(\/|$)", r"/{id}\1", path)
    path = re.sub(r"\{[^{}]*\}", "{id}", path)
    return path


def call_method(text: str, url_start: int, url_end: int) -> str:
    """Метод из 2-го аргумента ТОГО ЖЕ вызова (скобочный баланс), иначе GET.

    Если ближайший вызов начинается более чем на 3 строки выше URL
    (URL собран в переменную динамически) — DYNAMIC, не вердикт.
    """
    # начало вызова — ближайший apiRequest(/fetch( слева
    starts = [(m.start(), m.group(0)) for m in NEXT_CALL_RE.finditer(text[:url_start])]
    if not starts:
        return "GET"
    call_pos = starts[-1][0]
    url_line = text[:url_start].count("\n")
    call_line = text[:call_pos].count("\n")
    if url_line - call_line > 3:
        return "DYNAMIC"
    # пропустить имя вызова + опциональный дженерик <T> + пробелы до '('
    k = call_pos
    while k < len(text) and (text[k].isspace() or text[k].isalpha()):
        k += 1
    while k < len(text) and text[k].isspace():
        k += 1
    if k < len(text) and text[k] == "<":
        depth_angle = 0
        while k < len(text):
            if text[k] == "<":
                depth_angle += 1
            elif text[k] == ">":
                depth_angle -= 1
                if depth_angle == 0:
                    k += 1
                    break
            k += 1
        while k < len(text) and text[k].isspace():
            k += 1
    # k теперь на '(' вызова (или около); страховка — ближайшая '(' вперёд
    if k >= len(text) or text[k] != "(":
        k = text.find("(", call_pos)
    paren = 0
    in_str: str | None = None
    current: list[str] = []
    args: list[str] = []
    while k < len(text) and k < url_start + 2000:
        ch = text[k]
        if in_str:
            if ch == in_str and text[k - 1] != "\\":
                in_str = None
        elif ch in "\"'`":
            in_str = ch
        elif ch == "(":
            paren += 1
        elif ch == ")":
            paren -= 1
            if paren == 0:
                current.append(text[k])
                args.append("".join(current))
                break
        elif ch == "," and paren == 1:
            args.append("".join(current))
            current = []
            k += 1
            continue
        current.append(ch)
        k += 1
    if len(args) >= 2:
        method_match = METHOD_RE.search(args[1])
        if method_match:
            return method_match.group(1)
    return "GET"


def frontend_calls() -> dict[tuple[str, str], list[str]]:
    """(METHOD, path) -> [file:line, ...]. Метод — из того же вызова."""
    found: dict[tuple[str, str], list[str]] = {}
    for root in (FRONTEND_SRC, CARWASH_SRC):
        if not root.exists():
            continue
        for path in sorted(root.rglob("*")):
            if path.suffix not in (".ts", ".tsx") or "node_modules" in path.parts:
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            for match in URL_RE.finditer(text):
                raw = match.group(1)
                method = call_method(text, match.start(), match.end())
                key = (method, normalize(raw))
                loc = f"{path.relative_to(REPO)}:{text[: match.start()].count(chr(10)) + 1}"
                found.setdefault(key, []).append(loc)
    return found


def backend_routes() -> dict[tuple[str, str], str]:
    """(METHOD, path) -> handler."""
    routes: dict[tuple[str, str], str] = {}
    tree_lines = MAIN.read_text(encoding="utf-8").splitlines()
    # склеить разорванные декораторы: от "@app.<method>(" до баланса скобок
    joined: list[str] = []
    index = 0
    while index < len(tree_lines):
        line = tree_lines[index]
        if re.match(r"""\s*@app\.(get|post|put|delete|patch)\(""", line):
            depth = line.count("(") - line.count(")")
            lookahead = 0
            while depth > 0 and lookahead < 8 and index + lookahead + 1 < len(tree_lines):
                lookahead += 1
                line = line + " " + tree_lines[index + lookahead].strip()
                depth = line.count("(") - line.count(")")
            index += lookahead
        joined.append(line)
        index += 1
    tree_lines = joined
    current_handler = "?"
    for index, line in enumerate(tree_lines):
        match = re.match(r"\s*def (\w+)\(", line)
        if match:
            current_handler = match.group(1)
        route = ROUTE_RE.search(line)
        if route:
            method, path = route.group(1).upper(), normalize(route.group(2))
            # хендлер — ближайший def ниже декоратора
            handler = current_handler
            for following in tree_lines[index + 1 : index + 12]:
                func = re.match(r"\s*def (\w+)\(", following)
                if func:
                    handler = func.group(1)
                    break
            routes[(method, path)] = handler
    return routes


def main() -> int:
    calls = frontend_calls()
    routes = backend_routes()
    route_keys = set(routes)

    dynamic = sorted(
        (key, locs) for key, locs in calls.items() if key[0] == "DYNAMIC"
    )
    calls = {key: locs for key, locs in calls.items() if key[0] != "DYNAMIC"}
    broken = sorted(
        (key, locs) for key, locs in calls.items() if key not in route_keys
    )
    # второй шанс без учёта метода: путь есть, но метод другой
    paths_only = {path for _, path in route_keys}
    truly_broken = []
    method_mismatch = []
    for (method, path), locs in broken:
        if path in paths_only:
            have = sorted(m for m, p in route_keys if p == path)
            method_mismatch.append(((method, path), have, locs))
        else:
            truly_broken.append(((method, path), locs))

    call_paths = {path for _, path in calls} | {key[1] for key, _ in dynamic}
    orphan_routes = sorted(
        (key, handler)
        for key, handler in routes.items()
        if key[1] not in call_paths
    )

    out = REPO / "audit" / "reports" / "api_drift.md"
    lines = [
        "# API drift — фронт↔бэк (статика, эвристика)",
        "",
        f"Вызовов фронта: **{len(calls)}** (frontend + carwash; Showcase без API).",
        f"Роутов бэка: **{len(routes)}**.",
        "",
        f"## A. Вызовы без роута: {len(truly_broken)}",
        "",
    ]
    if truly_broken:
        lines.append("| Method | Path | Где |")
        lines.append("|---|---|---|")
        for (method, path), locs in truly_broken:
            lines.append(f"| {method} | `{path}` | {locs[0]} |")
    else:
        lines.append("Чисто — все пути фронта резолвятся в роуты бэка.")
    lines += ["", f"## B. Метод не совпал: {len(method_mismatch)}", ""]
    if method_mismatch:
        lines.append("| Фронт | Роут имеет | Где |")
        lines.append("|---|---|---|")
        for (method, path), have, locs in method_mismatch:
            lines.append(f"| {method} `{path}` | {', '.join(have)} | {locs[0]} |")
    else:
        lines.append("Чисто.")
    lines += ["", f"## C. Роуты без вызывателей фронта: {len(orphan_routes)}", ""]
    lines.append("(живут за счёт других клиентов/тестов либо мёртвые — см. B-002)")
    lines.append("")
    lines.append("| Method | Path | Handler |")
    lines.append("|---|---|---|")
    for (method, path), handler in orphan_routes:
        lines.append(f"| {method} | `{path}` | {handler} |")
    lines += ["", f"## D. Динамические URL (вне вердикта): {len(dynamic)}", ""]
    lines.append("URL собран в переменную — проверить вручную.")
    lines.append("")
    if dynamic:
        lines.append("| Path | Где |")
        lines.append("|---|---|")
        for (_, path), locs in dynamic:
            lines.append(f"| `{path}` | {locs[0]} |")
    else:
        lines.append("Нет.")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(
        f"calls={len(calls)} routes={len(routes)} "
        f"broken={len(truly_broken)} method_mismatch={len(method_mismatch)} "
        f"orphans={len(orphan_routes)} dynamic={len(dynamic)} -> {out}"
    )
    # CI-гейт: сломанные вызовы и несовпадение методов роняют сборку.
    # Сироты (C) и динамика (D) — информационные.
    return 1 if (truly_broken or method_mismatch) else 0


if __name__ == "__main__":
    sys.exit(main())
