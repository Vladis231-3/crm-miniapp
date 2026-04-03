$ErrorActionPreference = "Stop"

$taskName = "Concept1 Tunnel Watchdog"
$scriptPath = "C:\Users\Vlad\Desktop\concept1.0\scripts\run-tunnel-watchdog.ps1"
$workDir = "C:\Users\Vlad\Desktop\concept1.0"

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`""

$triggerAtLogon = New-ScheduledTaskTrigger -AtLogOn
$triggerOnStart = New-ScheduledTaskTrigger -AtStartup

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 3650) `
    -StartWhenAvailable

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger @($triggerAtLogon, $triggerOnStart) `
    -Settings $settings `
    -Principal $principal `
    -Description "Keeps localhost.run tunnel alive, updates WEBAPP_URL, and restarts bot polling when URL changes." `
    -Force | Out-Null

Start-ScheduledTask -TaskName $taskName
Write-Output "Scheduled task '$taskName' installed and started."
