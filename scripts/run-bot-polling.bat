@echo off
set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%\backend"
if not exist "%PROJECT_ROOT%\runtime" mkdir "%PROJECT_ROOT%\runtime"
python bot.py 1> "%PROJECT_ROOT%\runtime\bot_polling.out.log" 2> "%PROJECT_ROOT%\runtime\bot_polling.err.log"
