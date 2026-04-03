$env:RUN_EMBEDDED_BOT = 'false'
Set-Location 'C:\Users\Vlad\Desktop\concept1.0\backend'
python -m uvicorn app.main:app --host 127.0.0.1 --port 8765
