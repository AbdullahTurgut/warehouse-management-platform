$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$toolRoot = Join-Path $projectRoot '.tools'
$localRoot = Join-Path $projectRoot '.local'
$pgRoot = Join-Path $toolRoot 'postgres'
$dataRoot = Join-Path $localRoot 'postgres-data'
New-Item -ItemType Directory -Force $toolRoot, $localRoot | Out-Null

function Download-File([string]$Url, [string]$Destination) {
    & curl.exe -fL --retry 2 -o $Destination $Url
    if ($LASTEXITCODE -ne 0) { throw "Download failed: $Url" }
}

if (!(Test-Path (Join-Path $pgRoot 'bin/pg_ctl.exe'))) {
    $archive = Join-Path $toolRoot 'postgres.jar'
    Download-File 'https://repo.maven.apache.org/maven2/io/zonky/test/postgres/embedded-postgres-binaries-windows-amd64/17.6.0/embedded-postgres-binaries-windows-amd64-17.6.0.jar' $archive
    & tar.exe -xf $archive -C $toolRoot
    if ($LASTEXITCODE -ne 0) { throw 'Could not extract PostgreSQL archive' }
    New-Item -ItemType Directory -Force $pgRoot | Out-Null
    & tar.exe -xf (Join-Path $toolRoot 'postgres-windows-x86_64.txz') -C $pgRoot
    if ($LASTEXITCODE -ne 0) { throw 'Could not extract PostgreSQL binaries' }
}

if (!(Test-Path (Join-Path $dataRoot 'PG_VERSION'))) {
    $passwordFile = Join-Path $localRoot 'pg-password.tmp'
    Set-Content -LiteralPath $passwordFile -Value 'warehouse' -Encoding ascii
    & (Join-Path $pgRoot 'bin/initdb.exe') -D $dataRoot -U warehouse "--pwfile=$passwordFile" --auth=scram-sha-256 --encoding=UTF8 --locale=C
    $initResult = $LASTEXITCODE
    Remove-Item -LiteralPath $passwordFile
    if ($initResult -ne 0) { throw 'Database initialization failed' }
}

& (Join-Path $pgRoot 'bin/pg_ctl.exe') status -D $dataRoot
if ($LASTEXITCODE -ne 0) {
    $startArgs = @('start', '-D', "`"$dataRoot`"", '-l', "`"$(Join-Path $localRoot 'postgres.log')`"", '-o', '"-h 127.0.0.1 -p 5432"', '-w')
    $process = Start-Process -FilePath (Join-Path $pgRoot 'bin/pg_ctl.exe') -ArgumentList $startArgs -WindowStyle Hidden -PassThru
    # Wait for pg_ctl only, not its long-running PostgreSQL child process.
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw 'PostgreSQL failed to start. Check .local/postgres.log and whether port 5432 is already in use.' }
}
$driver = Join-Path $toolRoot 'postgres-jdbc.jar'
if (!(Test-Path $driver)) {
    Download-File 'https://repo.maven.apache.org/maven2/org/postgresql/postgresql/42.7.11/postgresql-42.7.11.jar' $driver
}
& java -cp $driver (Join-Path $PSScriptRoot 'PrepareDatabase.java')
if ($LASTEXITCODE -ne 0) { throw 'Database creation failed' }
