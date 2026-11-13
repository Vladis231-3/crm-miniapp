@echo off
setlocal
rem ── Guard: не публикуем наружу дев-бэкенд с небезопасной аутентификацией ──
rem P0-3: проверка закрыта по умолчанию и разбирает значения 1/yes/on/TRUE,
rem переменную окружения и отсутствие .env (см. assert-safe-for-tunnel.ps1).
set "ROOT=%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0assert-safe-for-tunnel.ps1"
if errorlevel 1 exit /b 1

if not exist "%ROOT%\runtime" mkdir "%ROOT%\runtime"
set "OUT=%ROOT%\runtime\localhostrun_fresh.out.log"
set "ERR=%ROOT%\runtime\localhostrun_fresh.err.log"
del /f /q "%OUT%" "%ERR%" 2>nul
start "" /b C:\Windows\System32\OpenSSH\ssh.exe -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -R 80:127.0.0.1:8765 nokey@localhost.run 1>"%OUT%" 2>"%ERR%"