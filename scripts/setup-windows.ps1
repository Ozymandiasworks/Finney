$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Finney v0.1-alpha.20 development setup"
Write-Host "Expected runtime: Node 24.19.0"

$nodeVersion = (& node --version 2>$null)
if (-not $nodeVersion) {
    throw "Node.js was not found. Install Node 24.19.0 (64-bit), then rerun SETUP_FINNEY_WINDOWS.cmd."
}

$nodeMajor = [int](($nodeVersion.TrimStart('v') -split '\.')[0])
if ($nodeMajor -ne 24) {
    throw "Finney's Electron 44 dependency tree expects Node 24.x. Detected $nodeVersion. Install/use Node 24.19.0 first."
}

Write-Host "Node: $nodeVersion"
Write-Host "Installing the full locked development dependency tree (including the local Quasar CLI)..."

# Some Windows/Yarn environments inherit NODE_ENV=production or YARN_PRODUCTION=true.
# Finney's Quasar/Electron CLI is intentionally a devDependency, so force development
# dependencies on for this source build.
$env:NODE_ENV = 'development'
$env:YARN_PRODUCTION = 'false'
# Finney uses the current Chronik 4.3.x API; keep the locked development tree installed.
& npx --yes yarn@1.22.22 install --production=false
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$quasar = Join-Path $root 'node_modules\.bin\quasar.cmd'
if (-not (Test-Path $quasar)) {
    throw "Dependency install finished but local Quasar CLI is missing at node_modules\.bin\quasar.cmd. Do not install Quasar globally; copy this error for troubleshooting."
}

Write-Host "Local Quasar CLI found: $quasar"
& $quasar --version
if ($LASTEXITCODE -ne 0) {
    throw "Local Quasar CLI exists but could not run. Copy the error shown above for troubleshooting."
}

$localService = Join-Path $root 'local-services\server.js'
& node --check $localService
if ($LASTEXITCODE -ne 0) {
    throw "Finney local relay/keyserver failed its syntax check."
}

if (-not (Test-Path (Join-Path $root 'node_modules\ws\package.json'))) {
    throw "The ws dependency required by the local relay is missing."
}
if (-not (Test-Path (Join-Path $root 'node_modules\google-protobuf\package.json'))) {
    throw "The google-protobuf dependency required by the local relay is missing."
}

Write-Host "Local relay/keyserver prerequisites verified."
$chronikPkg = Join-Path $root 'node_modules\chronik-client\package.json'
if (-not (Test-Path $chronikPkg)) {
    throw "chronik-client is missing after dependency installation."
}
$chronikVersion = (Get-Content $chronikPkg -Raw | ConvertFrom-Json).version
if ($chronikVersion -notlike '4.3.*') {
    throw "Finney alpha.20 requires chronik-client 4.3.x, but $chronikVersion was installed."
}
Write-Host "Chronik client verified: $chronikVersion"
Write-Host "Running Finney static audit..."
& node scripts/static-audit.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running Finney core-lock regression checks..."
& node scripts/test-core-lockdown.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node scripts/test-xec-txid.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node scripts/test-sender-history.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node scripts/test-core-crypto.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node scripts/test-local-development-token.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Setup completed, Quasar verified, and core-lock checks passed."
Write-Host "Next: start local services, leave Tor Browser open, then run Test Client A. After A opens, run Test Client B."
