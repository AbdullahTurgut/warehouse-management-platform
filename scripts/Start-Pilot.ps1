$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent

Write-Host "Ensuring PostgreSQL is running..."
& (Join-Path $PSScriptRoot 'Start-Database.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Database startup failed' }

Write-Host "Starting Pilot Backend (LAN-accessible)..."
# By default Spring Boot binds to 0.0.0.0 (all interfaces).
# We set server.address just to be absolutely sure.
$env:SERVER_ADDRESS = "0.0.0.0"
$env:DB_URL = "jdbc:postgresql://127.0.0.1:5432/warehouse"

# Find LAN IP address
$lanIps = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback" -and $_.InterfaceAlias -notmatch "vEthernet" -and $_.IPAddress -notmatch "^169\.254\." } | Select-Object -ExpandProperty IPAddress
$hostIp = if ($lanIps) { $lanIps[0] } else { "127.0.0.1" }

$jarPath = Join-Path $projectRoot 'backend/target/warehouse-0.1.0.jar'
if (!(Test-Path $jarPath)) { throw "Backend jar not found. Run Build-Pilot.ps1 first." }

# Start backend in a new window/process to not block
$logPath = Join-Path $projectRoot 'backend-pilot.log'
$errPath = Join-Path $projectRoot 'backend-pilot-err.log'
$backendProcess = Start-Process java -ArgumentList "-jar", "`"$jarPath`"" -RedirectStandardOutput $logPath -RedirectStandardError $errPath -PassThru -WindowStyle Hidden

Write-Host "========================================"
Write-Host " Warehouse pilot started."
Write-Host "========================================"
Write-Host "Local:"
Write-Host "http://localhost:8080"
Write-Host ""
if ($lanIps) {
    Write-Host "Mobile / LAN:"
    foreach ($ip in $lanIps) {
        Write-Host "http://$($ip):8080"
    }
} else {
    Write-Host "Mobile / LAN:"
    Write-Host "(Could not determine a LAN IP automatically)"
}
Write-Host ""
Write-Host "Database:"
Write-Host "local/private (127.0.0.1:5432)"
Write-Host "========================================"
Write-Host "Press Ctrl+C to close this window, or run Stop-Pilot.ps1 to shut down."
