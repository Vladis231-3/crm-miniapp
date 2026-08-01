# AGENTS.md — Атмосфера CRM (concept1.0)

Монорепо: FastAPI-бэкенд + 3 React/Vite фронтенда + Electron-десктоп.

## Карта проекта — читать сначала
- `PROJECT_MAP.md` — ПОЛНАЯ карта: дерево, архитектура (Mermaid), все API-роуты и сигнатуры с `file:line`. **Читать её перед крупными правками.**
- Генерируется автоматически, **вручную не редактировать**. Обновление:
  - фоновый вотчер **в автозагрузке Windows** (ярлык в `shell:startup` → `scripts\start-project-map-watch.vbs`, лог: `scripts\project-map-watch.log`) — сам стартует при входе в Windows,
  - или git pre-commit хук `.git/hooks/pre-commit` пересобирает карту при каждом коммите,
  - вручную: `python scripts/generate_project_map.py`.
  - защита от дублей: lock-файл `scripts\.project-map-watch.lock` (PID живого watcher'а).

## Краткая структура
```
backend/          FastAPI + SQLAlchemy + SQLite. app/main.py — ВСЯ логика API (~17k строк, 81+ роут),
                  app/models.py — модели, app/schemas.py — Pydantic, bot.py — Telegram polling-бот
frontend/         CRM-минапп (React/Vite/Tailwind, shadcn/ui): client/admin/owner/worker/landing
carwash/          Лендинг автомойки (React)
Showcase/         Лендинг-витрина (React)
api/              Vercel serverless (api/index.py -> backend.app.main)
native/electron/  Windows-десктоп (Electron + PyInstaller-бэкенд)
scripts/          Туннели, вотчеры, генератор карты
```

## Команды
- Backend: `cd backend; python run.py` (uvicorn, reload)
- Backend тесты: `cd backend; python -m pytest tests -q`
- Bot: `cd backend; python bot.py`
- Frontend: `cd frontend; npm run dev` (carwash/, Showcase/ — аналогично)
- Линт: `python -m ruff check backend`

## Правила
- Меняешь код — карта обновится сама (watcher/хук). Если карта не обновилась — запусти `python scripts/generate_project_map.py`.
- Большие файлы (`backend/app/main.py`, `OwnerApp.tsx`, `AppContext.tsx` и т.п.) — читать по `file:line` из карты, не целиком.
