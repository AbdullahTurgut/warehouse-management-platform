$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
& (Join-Path $projectRoot '.tools/postgres/bin/pg_ctl.exe') stop -D (Join-Path $projectRoot '.local/postgres-data') -m fast -w
if ($LASTEXITCODE -ne 0) { throw 'Could not stop the local PostgreSQL instance' }
