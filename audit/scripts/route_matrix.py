"""IDOR/авторизационная матрица (Фаза 2.3).

Статический проход по backend/app/main.py: для каждого @app.<method> —
декоратор, путь, функция, механизм авторизации (по первому взгляду на тело):
  - open: нет Depends сессий
  - session: _require_session (+ роли из _ensure_staff_role, если видны рядом)
  - object-check: эвристики (actorId/assigned/owner_id/403 рядом с доступом к объекту)

Вывод: audit/reports/route_matrix.md
Эвристика, не вердикт: каждую строку с объектом проверять динамически.
"""

from __future__ import annotations

import ast
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MAIN = REPO / "backend" / "app" / "main.py"

ROLE_CALL = "_ensure_staff_role"
SESSION_DEPS = ("_require_session", "_require_client", "_optional_session")


def auth_of(func: ast.FunctionDef) -> str:
    src = ast.dump(func)
    roles: set[str] = set()
    for node in ast.walk(func):
        if isinstance(node, ast.Call):
            name = getattr(getattr(node, "func", None), "attr", "") or getattr(
                getattr(node, "func", None), "id", ""
            )
            if name == ROLE_CALL and node.args and len(node.args) >= 2:
                try:
                    roles.update(
                        elt.value for elt in node.args[1].elts if isinstance(elt, ast.Constant)
                    )
                except Exception:
                    pass
    has_session = any(dep in src for dep in SESSION_DEPS)
    has_object_check = any(
        marker in src
        for marker in (
            "assigned_worker_ids",
            "actorId",
            "owner_id",
            "telegram_chat_id",
            "recipient",
            "Forbidden",
        )
    )
    if not has_session and ROLE_CALL not in src:
        return "OPEN?"
    parts = []
    parts.append("session+" + ("/".join(sorted(roles)) if roles else "?roles"))
    if has_object_check:
        parts.append("object-check?")
    return " ".join(parts)


def main() -> None:
    tree = ast.parse(MAIN.read_text(encoding="utf-8"))
    rows: list[tuple[str, str, str, str]] = []
    for node in tree.body:
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for dec in node.decorator_list:
            if not isinstance(dec, ast.Call):
                continue
            func = getattr(dec.func, "value", None)
            method = getattr(dec.func, "attr", "")
            if (
                getattr(func, "id", "") != "app"
                or method not in ("get", "post", "put", "patch", "delete")
                or not dec.args
            ):
                continue
            path = dec.args[0].value if isinstance(dec.args[0], ast.Constant) else "?"
            rows.append((method.upper(), path, node.name, auth_of(node)))

    out = REPO / "audit" / "reports" / "route_matrix.md"
    lines = [
        "# Route × auth matrix — статика (эвристика)",
        "",
        f"Всего декораторов: **{len(rows)}**.",
        "OPEN? — нет следов сессионной авторизации: проверить вручную первыми.",
        "",
        "| Method | Path | Handler | Auth |",
        "|---|---|---|---|",
    ]
    for method, path, name, auth in sorted(rows, key=lambda r: (r[1], r[0])):
        flag = " 🔴" if auth == "OPEN?" else ""
        lines.append(f"| {method} | `{path}` | {name} | {auth}{flag} |")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    opens = sum(1 for r in rows if r[3] == "OPEN?")
    print(f"routes={len(rows)} open_suspects={opens} -> {out}")


if __name__ == "__main__":
    sys.exit(main())
