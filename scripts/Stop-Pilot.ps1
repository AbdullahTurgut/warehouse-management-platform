$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent

Write-Host "Stopping Pilot Backend..."
# We only want to stop the specific backend jar if possible
$wmi = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match "warehouse-0.1.0.jar" }
foreach ($p in $wmi) {
    Write-Host "Killing backend process (PID $($p.ProcessId))"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Host "Stopping Database..."
$pgRoot = Join-Path $projectRoot '.tools/postgres'
$dataRoot = Join-Path $projectRoot '.local/postgres-data'
if (Test-Path $pgRoot) {
    & (Join-Path $pgRoot 'bin/pg_ctl.exe') stop -D $dataRoot -s -m fast
}

Write-Host "Pilot stopped successfully."
