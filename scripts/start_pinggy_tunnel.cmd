@echo off
setlocal
set OUT=C:\Users\Vlad\Desktop\concept1.0\runtime\pinggy_live_try.out.log
set ERR=C:\Users\Vlad\Desktop\concept1.0\runtime\pinggy_live_try.err.log
del /f /q "%OUT%" "%ERR%" 2>nul
start "" /b C:\Windows\System32\OpenSSH\ssh.exe -p 443 -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R0:127.0.0.1:8765 qr@a.pinggy.io 1>"%OUT%" 2>"%ERR%"
