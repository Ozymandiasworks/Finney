param(
  [string]$InstanceId = 'Test-B',
  [switch]$TorBrowser
)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$log = Join-Path $root ("finney-run-" + $InstanceId + ".log")
if (Test-Path $log) { Remove-Item $log -Force }

function Write-Both([string]$Text) {
  $Text | Tee-Object -FilePath $log -Append | Write-Host
}

Write-Both "Finney v0.1-alpha.20 second-client launcher"
Write-Both ("Started: " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Write-Both ("Isolated identity store: " + $InstanceId)

$env:FINNEY_INSTANCE_ID = $InstanceId
if ($TorBrowser) {
  $env:FINNEY_TOR_PROXY = 'socks5://127.0.0.1:9150'
} elseif (-not $env:FINNEY_TOR_PROXY) {
  $env:FINNEY_TOR_PROXY = 'socks5://127.0.0.1:9050'
}
Write-Both ("Transport: " + $env:FINNEY_TOR_PROXY)

# Client B reuses Client A's already-running Quasar renderer at localhost:8080.
# This avoids two dev compilers writing into the same .quasar directory.
$rendererListening = $false
try {
  $tcp = New-Object System.Net.Sockets.TcpClient
  $iar = $tcp.BeginConnect('127.0.0.1', 8080, $null, $null)
  $rendererListening = $iar.AsyncWaitHandle.WaitOne(1200, $false)
  if ($rendererListening) { $tcp.EndConnect($iar) }
  $tcp.Close()
} catch {
  $rendererListening = $false
}
if (-not $rendererListening) {
  Write-Both 'ERROR: Finney Test Client A is not serving the renderer on port 8080.'
  Write-Both 'Start RUN_FINNEY_TEST_CLIENT_A_TOR_WINDOWS.cmd first and wait for its Finney window to open.'
  Read-Host 'Press Enter to close'
  exit 1
}

$main = Join-Path $root '.quasar\electron\electron-main.js'
$electron = Join-Path $root 'node_modules\electron\dist\electron.exe'
if (-not (Test-Path $main)) {
  Write-Both 'ERROR: Compiled Electron main process is missing.'
  Write-Both 'Start Test Client A first and wait for it to finish compiling.'
  Read-Host 'Press Enter to close'
  exit 1
}
if (-not (Test-Path $electron)) {
  Write-Both 'ERROR: Local Electron runtime is missing. Run SETUP_FINNEY_WINDOWS.cmd.'
  Read-Host 'Press Enter to close'
  exit 1
}

$env:ELECTRON_ENABLE_LOGGING = '1'
$env:ELECTRON_ENABLE_STACK_DUMPING = '1'
# Quasar normally supplies these to the compiled main process. Setting APP_URL
# explicitly makes the second process self-contained while reusing the same dev server.
$env:APP_URL = 'http://localhost:8080'

Write-Both 'Launching isolated Finney Test Client B...'
Write-Both '------------------------------------------------------------'
& $electron $main --no-sandbox --disable-setuid-sandbox 2>&1 | Tee-Object -FilePath $log -Append
$exitCode = $LASTEXITCODE
Write-Both '------------------------------------------------------------'
Write-Both ("Finney Test Client B exited with code: " + $exitCode)
Write-Both ("Log file: " + $log)
Read-Host 'Press Enter to close this window'
exit $exitCode
