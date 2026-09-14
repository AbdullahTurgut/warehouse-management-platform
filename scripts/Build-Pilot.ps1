$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$frontendRoot = Join-Path $projectRoot 'frontend'
$backendRoot = Join-Path $projectRoot 'backend'

Write-Host "Installing frontend dependencies..."
Push-Location $frontendRoot
if (!(Test-Path "node_modules")) {
    & npm install
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
}

Write-Host "Building frontend..."
& npm run build
if ($LASTEXITCODE -ne 0) { throw 'npm run build failed' }
Pop-Location

Write-Host "Copying frontend to backend static resources..."
$staticDest = Join-Path $backendRoot 'src/main/resources/static'
if (Test-Path $staticDest) { Remove-Item -Recurse -Force $staticDest }
New-Item -ItemType Directory -Force $staticDest | Out-Null
Copy-Item -Path (Join-Path $frontendRoot 'dist\*') -Destination $staticDest -Recurse -Force

Write-Host "Building backend..."
$mavenCommand = Get-Command mvn.cmd -ErrorAction SilentlyContinue
if ($mavenCommand) { $mavenPath = $mavenCommand.Source }
else {
    $cachedMaven = Get-ChildItem (Join-Path $env:USERPROFILE '.m2/wrapper/dists') -Recurse -Filter mvn.cmd -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cachedMaven) { $mavenPath = $cachedMaven.FullName }
    else {
        $toolRoot = Join-Path $projectRoot '.tools'
        New-Item -ItemType Directory -Force $toolRoot | Out-Null
        $mavenPath = Join-Path $toolRoot 'apache-maven-3.9.16/bin/mvn.cmd'
        if (!(Test-Path $mavenPath)) {
            $archive = Join-Path $toolRoot 'maven.zip'
            & curl.exe -fL --retry 2 -o $archive 'https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.16/apache-maven-3.9.16-bin.zip'
            if ($LASTEXITCODE -ne 0) { throw 'Maven download failed' }
            Expand-Archive -LiteralPath $archive -DestinationPath $toolRoot -Force
        }
    }
}
& $mavenPath "-Dmaven.repo.local=$(Join-Path $env:USERPROFILE '.m2/repository')" -B -f (Join-Path $projectRoot 'backend/pom.xml') -DskipTests package
if ($LASTEXITCODE -ne 0) { throw 'Backend build failed' }

Write-Host "Pilot build successful."
