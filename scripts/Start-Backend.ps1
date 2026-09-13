param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$mavenCommand = Get-Command mvn.cmd -ErrorAction SilentlyContinue
if (!$SkipBuild) {
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
}
& java -jar (Join-Path $projectRoot 'backend/target/warehouse-0.1.0.jar')
if ($LASTEXITCODE -ne 0) { throw 'Backend stopped with an error' }
