@echo off
setlocal
set OUT=C:\Users\Vlad\Desktop\concept1.0\runtime\localhostrun_fresh.out.log
set ERR=C:\Users\Vlad\Desktop\concept1.0\runtime\localhostrun_fresh.err.log
del /f /q "%OUT%" "%ERR%" 2>nul
start "" /b C:\Windows\System32\OpenSSH\ssh.exe -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:127.0.0.1:8765 nokey@localhost.run 1>"%OUT%" 2>"%ERR%"
