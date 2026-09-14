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
$lanIps = @(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback" -and $_.InterfaceAlias -notmatch "vEthernet" -and $_.IPAddress -notmatch "^169\.254\." } | Select-Object -ExpandProperty IPAddress)
$hostIp = if ($lanIps.Count -gt 0) { $lanIps[0] } else { "127.0.0.1" }

$caSubject = "CN=WarehousePilotRootCA"
$cerCaPath = Join-Path $projectRoot 'pilot-ca.cer'
$p12Path = Join-Path $projectRoot 'pilot-keystore.p12'
$ipTrackerFile = Join-Path $projectRoot '.local/pilot-ip.txt'

$caCert = Get-ChildItem -Path "cert:\CurrentUser\My" | Where-Object { $_.Subject -match "WarehousePilotRootCA" -and $_.HasPrivateKey } | Select-Object -First 1

if (-not $caCert) {
    Write-Host "Generating local Root CA for Pilot (pilot-ca.cer)..."
    $caCert = New-SelfSignedCertificate -Subject $caSubject -CertStoreLocation "cert:\CurrentUser\My" -KeyUsage CertSign,CRLSign -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 -NotAfter (Get-Date).AddYears(10) -TextExtension @("2.5.29.19={text}CA=true")
}
if (-not (Test-Path $cerCaPath)) {
    Export-Certificate -Cert $caCert -FilePath $cerCaPath -Force | Out-Null
    Write-Host "Exported pilot-ca.cer. Install this Root CA on mobile devices to trust the server."
}

$lastIp = if (Test-Path $ipTrackerFile) { Get-Content $ipTrackerFile } else { "" }

if ($lastIp -ne $hostIp -or -not (Test-Path $p12Path)) {
    Write-Host "Generating Server Certificate for IP $hostIp signed by Root CA..."
    $sanList = @("DNS=localhost", "DNS=127.0.0.1", "IPAddress=127.0.0.1")
    if ($lanIps) {
        foreach ($ip in $lanIps) {
            $sanList += "IPAddress=$ip"
        }
    }
    $sanString = "2.5.29.17={text}" + ($sanList -join "&")
    
    $serverCert = New-SelfSignedCertificate -Type SSLServer -Subject "CN=$hostIp" -CertStoreLocation "cert:\CurrentUser\My" -Signer $caCert -NotAfter (Get-Date).AddDays(90) -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 -TextExtension @($sanString)
    
    $pwd = ConvertTo-SecureString -String "pilot123" -Force -AsPlainText
    Export-PfxCertificate -Cert $serverCert -FilePath $p12Path -Password $pwd -Force | Out-Null
    
    $localDir = Join-Path $projectRoot '.local'
    if (-not (Test-Path $localDir)) { New-Item -ItemType Directory -Force $localDir | Out-Null }
    Set-Content -Path $ipTrackerFile -Value $hostIp
}

$env:SERVER_SSL_KEY_STORE = $p12Path
$env:SERVER_SSL_KEY_STORE_PASSWORD = "pilot123"
$env:SERVER_SSL_KEY_STORE_TYPE = "PKCS12"

$jarPath = Join-Path $projectRoot 'backend/target/warehouse-0.1.0.jar'
if (!(Test-Path $jarPath)) { throw "Backend jar not found. Run Build-Pilot.ps1 first." }

# Start backend in a new window/process to not block
$logPath = Join-Path $projectRoot 'backend-pilot.log'
$errPath = Join-Path $projectRoot 'backend-pilot-err.log'
$backendProcess = Start-Process java -ArgumentList "-jar", "`"$jarPath`"" -RedirectStandardOutput $logPath -RedirectStandardError $errPath -PassThru -WindowStyle Hidden

Write-Host "========================================"
Write-Host " Warehouse pilot started (HTTPS for Camera)."
Write-Host "========================================"
Write-Host "Local:"
Write-Host "https://localhost:8080"
Write-Host ""
if ($lanIps) {
    Write-Host "Mobile / LAN:"
    foreach ($ip in $lanIps) {
        Write-Host "https://$($ip):8080"
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
