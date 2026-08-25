@echo off
setlocal
rem ── Guard: не публикуем наружу дев-бэкенд с небезопасной аутентификацией ──
set "ROOT=%~dp0.."
if exist "%ROOT%\backend\.env" (
    findstr /i /c:"ALLOW_INSECURE_CLIENT_AUTH=true" "%ROOT%\backend\.env" >nul 2>&1
    if not errorlevel 1 (
        echo [BLOCKED] backend/.env has ALLOW_INSECURE_CLIENT_AUTH=true.
        echo Publishing this backend through a public tunnel would let anyone
        echo log in as any telegram_id without a valid signature.
        echo Set ALLOW_INSECURE_CLIENT_AUTH=false in backend/.env first.
        exit /b 1
    )
)

if not exist "%ROOT%\runtime" mkdir "%ROOT%\runtime"
set "OUT=%ROOT%\runtime\pinggy_live_try.out.log"
set "ERR=%ROOT%\runtime\pinggy_live_try.err.log"
del /f /q "%OUT%" "%ERR%" 2>nul
start "" /b C:\Windows\System32\OpenSSH\ssh.exe -p 443 -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -R0:127.0.0.1:8765 qr@a.pinggy.io 1>"%OUT%" 2>"%ERR%"
