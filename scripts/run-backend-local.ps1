$env:RUN_EMBEDDED_BOT = 'false'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot
Set-Location (Join-Path $projectRoot 'backend')
python -m uvicorn app.main:app --host 127.0.0.1 --port 8765
