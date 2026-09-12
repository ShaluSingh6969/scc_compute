$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$pidFile = Join-Path (Join-Path $projectRoot ".run") "dev-processes.json"

function Test-ManagedProcessMatch {
    param(
        [Parameter(Mandatory = $true)][int]$ProcessId,
        [Parameter(Mandatory = $true)][string]$ExpectedStartedAt,
        [string]$ExpectedCommand
    )

    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        return $false
    }

    # Ensure PID has not been reused by requiring start-time match.
    try {
        $expectedStart = [DateTime]::Parse($ExpectedStartedAt)
        $actualStart = $process.StartTime
        $driftSeconds = [Math]::Abs(($actualStart - $expectedStart).TotalSeconds)
        if ($driftSeconds -gt 5) {
            return $false
        }
    }
    catch {
        return $false
    }

    # Optional command hint match for extra safety on stale state.
    if ($ExpectedCommand) {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue).CommandLine
        if ($ExpectedCommand -match "uvicorn" -and $cmdLine -notmatch "uvicorn") {
            return $false
        }
        if ($ExpectedCommand -match "npm run dev" -and $cmdLine -notmatch "npm run dev") {
            return $false
        }
    }

    return $true
}

if (-not (Test-Path $pidFile)) {
    Write-Host "No process state file found at $pidFile"
    Write-Host "Nothing to stop."
    exit 0
}

$state = Get-Content -Raw -Path $pidFile | ConvertFrom-Json

foreach ($proc in $state.processes) {
    $target = Get-Process -Id $proc.pid -ErrorAction SilentlyContinue
    if ($null -eq $target) {
        Write-Host "$($proc.name) already stopped (PID $($proc.pid) not running)"
        continue
    }

    if (-not (Test-ManagedProcessMatch -ProcessId $proc.pid -ExpectedStartedAt $proc.startedAt -ExpectedCommand $proc.command)) {
        Write-Host "Skipped $($proc.name) (PID $($proc.pid)): state is stale or PID was reused by another process."
        continue
    }

    try {
        Stop-Process -Id $proc.pid -Force -ErrorAction Stop
        Write-Host "Stopped $($proc.name) (PID $($proc.pid))"
    }
    catch {
        Write-Host "Could not stop $($proc.name) (PID $($proc.pid)): $($_.Exception.Message)"
    }
}

Remove-Item -Path $pidFile -Force
Write-Host "Done."
