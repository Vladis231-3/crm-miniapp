$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Users\Vlad\Desktop\concept1.0"
$BackendDir = Join-Path $ProjectRoot "backend"
$RuntimeDir = Join-Path $ProjectRoot "runtime"
$EnvPath = Join-Path $BackendDir ".env"
$TunnelOutLog = Join-Path $RuntimeDir "tunnel_watchdog.out.log"
$TunnelErrLog = Join-Path $RuntimeDir "tunnel_watchdog.err.log"
$WatchdogLog = Join-Path $RuntimeDir "tunnel_watchdog.log"
$PythonExe = "C:\Python314\python.exe"
$BotScript = Join-Path $BackendDir "bot.py"
$BackendHealthUrl = "http://127.0.0.1:8765/api/health"
$WatchdogMutexName = "Global\Concept1TunnelWatchdog"
$script:WatchdogMutex = $null
$TunnelPort = "8765"

function Write-WatchdogLog {
    param([string]$Message)

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $WatchdogLog -Value "$timestamp $Message"
}

function Get-EnvValue {
    param([string]$Key)

    if (-not (Test-Path $EnvPath)) {
        return $null
    }

    $line = Get-Content $EnvPath | Where-Object { $_ -match "^$Key=" } | Select-Object -First 1
    if (-not $line) {
        return $null
    }
    return ($line -replace "^$Key=", "").Trim()
}

function Set-EnvValue {
    param(
        [string]$Key,
        [string]$Value
    )

    $lines = @()
    if (Test-Path $EnvPath) {
        $lines = Get-Content $EnvPath
    }

    $updated = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^$Key=") {
            $lines[$i] = "$Key=$Value"
            $updated = $true
        }
    }

    if (-not $updated) {
        $lines += "$Key=$Value"
    }

    Set-Content -Path $EnvPath -Value $lines
}

function Test-BackendHealthy {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $BackendHealthUrl -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Enter-WatchdogMutex {
    $createdNew = $false
    $script:WatchdogMutex = New-Object System.Threading.Mutex($true, $WatchdogMutexName, [ref]$createdNew)
    if (-not $createdNew) {
        Write-WatchdogLog "Another watchdog instance is already running; exiting"
        exit 0
    }
}

function Get-BotProcesses {
    Get-CimInstance Win32_Process -Filter "name = 'python.exe'" |
        Where-Object { $_.CommandLine -like "*\backend\bot.py*" }
}

function Test-BotHealthy {
    $botProcesses = @(Get-BotProcesses)
    if ($botProcesses.Count -ne 1) {
        if ($botProcesses.Count -gt 1) {
            Write-WatchdogLog "Detected $($botProcesses.Count) bot processes; treating bot as unhealthy"
        }
        return $false
    }
    return $true
}

function Stop-BotProcesses {
    $botProcesses = Get-BotProcesses
    foreach ($process in $botProcesses) {
        try {
            Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
            Write-WatchdogLog "Stopped bot process $($process.ProcessId)"
        } catch {
            Write-WatchdogLog "Failed to stop bot process $($process.ProcessId): $($_.Exception.Message)"
        }
    }
}

function Start-BotProcess {
    Stop-BotProcesses
    Remove-Item (Join-Path $RuntimeDir "bot_polling.out.log"), (Join-Path $RuntimeDir "bot_polling.err.log") -Force -ErrorAction SilentlyContinue
    Start-Process -FilePath $PythonExe `
        -ArgumentList $BotScript `
        -WorkingDirectory $BackendDir `
        -RedirectStandardOutput (Join-Path $RuntimeDir "bot_polling.out.log") `
        -RedirectStandardError (Join-Path $RuntimeDir "bot_polling.err.log")
    Write-WatchdogLog "Started bot process"
}

function Get-TunnelProcess {
    Get-CimInstance Win32_Process |
        Where-Object {
            ($_.Name -eq "node.exe" -and $_.CommandLine -like "*tunnelmole*8765*") -or
            ($_.Name -eq "cmd.exe" -and $_.CommandLine -like "*tunnelmole*8765*") -or
            ($_.Name -eq "ssh.exe" -and $_.CommandLine -like "*nokey@localhost.run*")
        } |
        Select-Object -First 1
}

function Stop-TunnelProcess {
    $tunnelProcess = Get-TunnelProcess
    if ($null -ne $tunnelProcess) {
        try {
            Stop-Process -Id $tunnelProcess.ProcessId -Force -ErrorAction Stop
            Write-WatchdogLog "Stopped tunnel process $($tunnelProcess.ProcessId)"
        } catch {
            Write-WatchdogLog "Failed to stop tunnel process $($tunnelProcess.ProcessId): $($_.Exception.Message)"
        }
    }
}

function Start-TunnelProcess {
    Stop-TunnelProcess
    Remove-Item $TunnelOutLog, $TunnelErrLog -Force -ErrorAction SilentlyContinue
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList @("/c", "npx", "tunnelmole", $TunnelPort) `
        -RedirectStandardOutput $TunnelOutLog `
        -RedirectStandardError $TunnelErrLog
    Write-WatchdogLog "Started tunnelmole tunnel"
}

function Get-TunnelUrl {
    if (-not (Test-Path $TunnelOutLog)) {
        return $null
    }

    $match = Select-String -Path $TunnelOutLog -Pattern "https://[A-Za-z0-9.-]+\.tunnelmole\.net" | Select-Object -Last 1
    if ($null -eq $match) {
        return $null
    }
    return $match.Matches.Value
}

function Wait-ForTunnelUrl {
    param([int]$TimeoutSeconds = 45)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $url = Get-TunnelUrl
        if ($url) {
            return $url
        }
        Start-Sleep -Seconds 1
    } while ((Get-Date) -lt $deadline)

    return $null
}

function Ensure-TunnelAndBot {
    if (-not (Test-BackendHealthy)) {
        Write-WatchdogLog "Backend health check failed, skipping tunnel recovery"
        return
    }

    $currentUrl = Get-EnvValue -Key "WEBAPP_URL"
    $tunnelProcess = Get-TunnelProcess
    $botHealthy = Test-BotHealthy
    $needsNewTunnel = $null -eq $tunnelProcess -or -not $botHealthy

    if (-not $needsNewTunnel -and $currentUrl) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri "$currentUrl/api/health" -TimeoutSec 10
            if ($response.StatusCode -ne 200) {
                $needsNewTunnel = $true
            }
        } catch {
            $needsNewTunnel = $true
        }
    } elseif (-not $currentUrl) {
        $needsNewTunnel = $true
    }

    if ($needsNewTunnel) {
        if (-not $botHealthy) {
            Write-WatchdogLog "Bot is not healthy; renewing tunnel before bot restart"
        } else {
            Write-WatchdogLog "Tunnel health failed; requesting new tunnel"
        }
        Start-TunnelProcess
        $newUrl = Wait-ForTunnelUrl
        if (-not $newUrl) {
            Write-WatchdogLog "Tunnel URL was not acquired in time"
            return
        }

        if ($newUrl -ne $currentUrl) {
            Set-EnvValue -Key "WEBAPP_URL" -Value $newUrl
            Write-WatchdogLog "Updated WEBAPP_URL to $newUrl"
        }

        Start-BotProcess
    } elseif (-not $botHealthy) {
        Write-WatchdogLog "Bot is not healthy; starting bot"
        Start-BotProcess
    }
}

New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null
Enter-WatchdogMutex
Write-WatchdogLog "Tunnel watchdog started"

while ($true) {
    try {
        Ensure-TunnelAndBot
    } catch {
        Write-WatchdogLog "Watchdog error: $($_.Exception.Message)"
    }
    Start-Sleep -Seconds 15
}
