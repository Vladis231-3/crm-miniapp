"""Точка входа для PyInstaller-сборки десктоп-бэкенда Atmosfera CRM.

Запускает FastAPI-приложение (app.main:app) через uvicorn на 127.0.0.1:8000
без reload. В frozen-режиме переопределяет PERSISTENT_DATA_DIR на папку рядом
с реальным exe, чтобы загрузки не терялись во временной папке _MEIPASS.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path


def _bootstrap_env() -> None:
    """Настраивает окружение ДО импорта app.* (которое читает .env)."""
    if getattr(sys, "frozen", False):
        # Реальное расположение portable-exe (НЕ временная _MEIPASS).
        exe_dir = Path(sys.executable).resolve().parent
        # Загрузки и кэш кладём рядом с exe — переживают перезапуск.
        os.environ.setdefault("PERSISTENT_DATA_DIR", str(exe_dir / "data"))
        # PyInstaller-бинарник, запущенный без консольного TTY (например из
        # Electron со stdio:'ignore'), заставляет uvicorn/внутренние библиотеки
        # блокирующе читать stdin и виснуть на startup. Перенаправляем stdin на
        # NUL — читается мгновенный EOF вместо ожидания ввода.
        try:
            sys.stdin = open(os.devnull, "r", encoding="utf-8")
        except OSError:
            pass


_bootstrap_env()

import uvicorn  # noqa: E402

from app.config import get_settings  # noqa: E402
from app.main import app  # noqa: E402  — импортируем объект, чтобы uvicorn
# не пытался сделать строковый import("app.main") в frozen-режиме,
# где package "app" не лежит на sys.path.


def main() -> None:
    settings = get_settings()
    uvicorn.run(
        app,
        host=settings.api_host,
        port=settings.api_port,
        log_level="info",
        # reload недопустим в frozen-режиме (исходников нет в bundle).
        reload=False,
    )


if __name__ == "__main__":
    main()
