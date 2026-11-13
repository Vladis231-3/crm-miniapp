<#
P0-3 (audit 2026-11-13): gate for publishing the backend through a tunnel.

Fail-closed: a tunnel is allowed only when insecure auth is EXPLICITLY off.
Previously the .cmd helpers looked for the literal string
"ALLOW_INSECURE_CLIENT_AUTH=true", so values 1/yes/on/TRUE, an environment
variable, or a missing .env bypassed the guard.

Lookup order mirrors config.py: the environment variable wins over the file
(load_dotenv does not override existing variables); for the file the last
occurrence of the key is used. The file is ASCII-only on purpose: it is
started with Windows PowerShell 5.1, which misreads BOM-less UTF-8.
#>

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvPath = Join-Path $ProjectRoot "backend\.env"
$VarName = "ALLOW_INSECURE_CLIENT_AUTH"
$UnsafeValues = @("true", "1", "yes", "on", "y", "t")
$SafeValues = @("false", "0", "no", "off")

function Get-EnvFileValue {
    param([string]$Key)

    if (-not (Test-Path $EnvPath)) {
        return $null
    }
    $pattern = "^\s*" + [regex]::Escape($Key) + "\s*="
    $line = Get-Content $EnvPath | Where-Object { $_ -match $pattern } | Select-Object -Last 1
    if (-not $line) {
        return $null
    }
    return ($line -replace $pattern, "").Trim().Trim('"').Trim("'")
}

$raw = $env:ALLOW_INSECURE_CLIENT_AUTH
if ([string]::IsNullOrWhiteSpace($raw)) {
    $raw = Get-EnvFileValue -Key $VarName
}

if ([string]::IsNullOrWhiteSpace($raw)) {
    Write-Host "[BLOCKED] $VarName is not set explicitly in the environment or backend/.env."
    Write-Host "Publishing this backend would allow unsigned Telegram initData logins."
    Write-Host "Set $VarName=false in backend/.env before starting a tunnel."
    exit 1
}

$normalized = $raw.ToString().Trim().ToLowerInvariant()
if ($UnsafeValues -contains $normalized -or $SafeValues -notcontains $normalized) {
    Write-Host "[BLOCKED] $VarName=$raw in effect."
    Write-Host "Publishing this backend through a public tunnel would let anyone"
    Write-Host "log in as any telegram_id without a valid signature."
    Write-Host "Set $VarName=false in backend/.env first."
    exit 1
}

Write-Host "[OK] $VarName=false - backend may be published through a tunnel."
exit 0
