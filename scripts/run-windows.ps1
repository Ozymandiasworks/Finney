param(
  [switch]$TorBrowser,
  [string]$InstanceId = ''
)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$logName = if ($InstanceId) { 'finney-run-' + $InstanceId + '.log' } else { 'finney-run.log' }
$log = Join-Path $root $logName
if (Test-Path $log) { Remove-Item $log -Force }

function Write-Both([string]$Text) {
  $Text | Tee-Object -FilePath $log -Append | Write-Host
}

Write-Both "Finney v0.1-alpha.20 launcher"
Write-Both ("Started: " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Write-Both ("Folder: " + $root)
if ($InstanceId) {
  $env:FINNEY_INSTANCE_ID = $InstanceId
  Write-Both ("Isolated identity store: " + $InstanceId)
}

try {
  $nodeVersion = (& node --version 2>&1 | Out-String).Trim()
  Write-Both ("Node: " + $nodeVersion)
} catch {
  Write-Both "ERROR: Node could not be started."
  Write-Both $_.Exception.Message
  Read-Host 'Press Enter to close'
  exit 1
}

& node scripts\check-runtime.js 2>&1 | Tee-Object -FilePath $log -Append
if ($LASTEXITCODE -ne 0) {
  Write-Both "ERROR: Finney requires Node 16.20.2 for this baseline build."
  Read-Host 'Press Enter to close'
  exit 1
}

if ($TorBrowser) {
  $env:FINNEY_TOR_PROXY = 'socks5://127.0.0.1:9150'
  Write-Both 'Transport: Tor Browser SOCKS5 127.0.0.1:9150'

  $torListening = $false
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $iar = $tcp.BeginConnect('127.0.0.1', 9150, $null, $null)
    $torListening = $iar.AsyncWaitHandle.WaitOne(1200, $false)
    if ($torListening) {
      $tcp.EndConnect($iar)
    }
    $tcp.Close()
  } catch {
    $torListening = $false
  }

  if (-not $torListening) {
    Write-Both 'WARNING: Nothing answered on local port 9150.'
    Write-Both 'Keep Tor Browser fully open. Finney may not have Tor connectivity until that port is available.'
  } else {
    Write-Both 'Tor SOCKS listener detected on port 9150.'
  }
} else {
  if (-not $env:FINNEY_TOR_PROXY) {
    $env:FINNEY_TOR_PROXY = 'socks5://127.0.0.1:9050'
  }
  Write-Both ("Transport: " + $env:FINNEY_TOR_PROXY)
}

# The alpha.20 baseline expects the local relay and registry to be running.
foreach ($port in @(31337, 31338)) {
  $listening = $false
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $iar = $tcp.BeginConnect('127.0.0.1', $port, $null, $null)
    $listening = $iar.AsyncWaitHandle.WaitOne(800, $false)
    if ($listening) { $tcp.EndConnect($iar) }
    $tcp.Close()
  } catch {
    $listening = $false
  }
  if (-not $listening) {
    Write-Both ("WARNING: Finney local service port $port is not listening.")
    Write-Both 'Start START_FINNEY_LOCAL_SERVICES_WINDOWS.cmd and leave that window open.'
  }
}

$env:ELECTRON_ENABLE_LOGGING = '1'
$env:ELECTRON_ENABLE_STACK_DUMPING = '1'
$quasar = Join-Path $root 'node_modules\.bin\quasar.cmd'
if (-not (Test-Path $quasar)) {
  Write-Both 'ERROR: The local Quasar CLI is missing.'
  Write-Both 'Run SETUP_FINNEY_WINDOWS.cmd from this same alpha.20 folder before launching Finney.'
  Write-Both 'Do not install Quasar globally.'
  Read-Host 'Press Enter to close'
  exit 1
}
Write-Both ('Quasar: ' + $quasar)

Write-Both 'Launching Finney...'
Write-Both 'NOTE: Closing the Finney window may hide it in the Windows system tray.'
Write-Both ("All output is also being saved to " + $logName + '.')
Write-Both '------------------------------------------------------------'

# Use cmd.exe so Windows resolves npx.cmd reliably. Stream stdout/stderr to both
# the console and a persistent log file. The launcher always pauses afterward.
& cmd.exe /d /c 'npx --yes yarn@1.22.22 dev' 2>&1 | Tee-Object -FilePath $log -Append
$exitCode = $LASTEXITCODE

Write-Both '------------------------------------------------------------'
Write-Both ("Finney dev process exited with code: " + $exitCode)
if ($exitCode -eq 0) {
  Write-Both 'The process ended without reporting a command-line error. Check the Windows system tray for a hidden Finney instance.'
} else {
  Write-Both ("Finney exited with an error. The useful diagnostics are preserved in " + $logName + '.')
}
Write-Both ("Log file: " + $log)
Read-Host 'Press Enter to close this window'
exit $exitCode
