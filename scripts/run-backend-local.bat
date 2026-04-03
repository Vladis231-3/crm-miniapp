@echo off
cd /d C:\Users\Vlad\Desktop\concept1.0\backend
set RUN_EMBEDDED_BOT=false
C:\Python314\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8765
