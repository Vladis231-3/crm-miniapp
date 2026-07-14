# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec для десктоп-бэкенда Atmosfera CRM.
# Сборка: pyinstaller desktop/atmosfera-backend.spec \
#           --distpath desktop/build --workpath desktop/build/work --noconfirm

import os
from PyInstaller.utils.hooks import collect_submodules

block_cipher = None

PROJECT_ROOT = os.path.abspath(os.path.join(SPECPATH, '..'))
BACKEND_DIR = os.path.join(PROJECT_ROOT, 'backend')
FRONTEND_DIST = os.path.join(PROJECT_ROOT, 'frontend', 'dist')
DESKTOP_ENV = os.path.join(SPECPATH, '.env')

# Динамически/условно импортируемые модули — PyInstaller их не видит сам.
hiddenimports = []
hiddenimports += collect_submodules('psycopg')          # драйвер БД (C-биндари)
hiddenimports += collect_submodules('sqlalchemy.dialects')  # postgresql/psycopg диалект
hiddenimports += collect_submodules('reportlab')         # PDF-экспорт, плагины шрифтов
hiddenimports += collect_submodules('openpyxl')          # Excel-экспорт
hiddenimports += ['uvicorn.logging', 'uvicorn.lifespan.on', 'uvicorn.lifespan.off',
                  'uvicorn.protocols.http.auto', 'uvicorn.protocols.websockets.auto',
                  'uvicorn.protocols.websockets.websockets_impl', 'uvicorn.loops.auto',
                  'uvicorn.loops.asyncio']
# Бэкенд условно импортирует bot.py двумя способами — добавляем оба, чтобы не падало.
hiddenimports += ['bot', 'backend.bot']
hiddenimports += ['email.mime.multipart', 'email.mime.text', 'email.mime.base']  # для уведомлений бота

# Бандлим собранный фронтенд (app.main раздаёт его на одном origin) и desktop .env.
datas = []
datas.append((FRONTEND_DIST, os.path.join('frontend', 'dist')))
datas.append((DESKTOP_ENV, '.'))

a = Analysis(
    [os.path.join(SPECPATH, 'run_frozen.py')],
    pathex=[BACKEND_DIR, PROJECT_ROOT],   # чтобы `import app...` и `import bot` работали
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'pytest', 'tests'],
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='atmosfera-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,          # консольный сервер; Electron прячет своё окно
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='atmosfera-backend',
)
