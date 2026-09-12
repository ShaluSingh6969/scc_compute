$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$runDir = Join-Path $projectRoot ".run"
$pidFile = Join-Path $runDir "dev-processes.json"
$frontendDir = Join-Path $projectRoot "frontend"

if (-not (Test-Path (Join-Path $projectRoot "backend\main.py"))) {
    throw "Could not find backend\\main.py in $projectRoot. Run this script from the project root."
}

if (-not (Test-Path $frontendDir)) {
    throw "Could not find frontend directory at $frontendDir"
}

if (-not (Test-Path $runDir)) {
    New-Item -ItemType Directory -Path $runDir | Out-Null
}

function Start-ManagedProcess {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][string]$Command
    )

    $process = Start-Process powershell -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $Command) -WorkingDirectory $WorkingDirectory -PassThru

    [PSCustomObject]@{
        name = $Name
        pid = $process.Id
        cwd = $WorkingDirectory
        command = $Command
        startedAt = (Get-Date).ToString("o")
    }
}

function Ensure-Command {
    param([Parameter(Mandatory = $true)][string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' is not available in PATH."
    }
}

function Assert-ProcessRunning {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][int]$ProcessId,
        [Parameter(Mandatory = $true)][string]$Hint
    )

    $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($null -eq $proc) {
        throw "$Name failed to start. $Hint"
    }
}

Ensure-Command -Name "python"
Ensure-Command -Name "npm"

if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "Frontend dependencies missing. Installing..."
    Push-Location $frontendDir
    try {
        npm install
    }
    finally {
        Pop-Location
    }
}

if (Test-Path $pidFile) {
    Write-Host "Existing dev process state found. Cleaning it up first..."
    & (Join-Path $projectRoot "stop-dev.ps1") | Out-Null
}

$backend = Start-ManagedProcess -Name "backend" -WorkingDirectory $projectRoot -Command "python -m uvicorn backend.main:app --reload"
Assert-ProcessRunning -Name "backend" -ProcessId $backend.pid -Hint "Try running: python -m uvicorn backend.main:app --reload"

$frontend = Start-ManagedProcess -Name "frontend" -WorkingDirectory $frontendDir -Command "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort"
Assert-ProcessRunning -Name "frontend" -ProcessId $frontend.pid -Hint "Try running from frontend folder: npm run dev -- --host 127.0.0.1 --port 5173 --strictPort"

$payload = [PSCustomObject]@{
    projectRoot = $projectRoot
    createdAt = (Get-Date).ToString("o")
    processes = @($backend, $frontend)
}

$payload | ConvertTo-Json -Depth 4 | Set-Content -Path $pidFile -Encoding UTF8

Write-Host "Started development services:"
Write-Host "- Backend  PID: $($backend.pid)"
Write-Host "- Frontend PID: $($frontend.pid)"
Write-Host ""
Write-Host "Open: http://127.0.0.1:5173"
Write-Host "To stop services run: .\stop-dev.ps1"
