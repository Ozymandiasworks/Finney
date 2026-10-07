param(
  [Parameter(Mandatory = $true)][ValidateSet('xec-testnet','xec-regtest')][string]$Network,
  [Parameter(Mandatory = $true)][ValidatePattern('^[A-Z][A-Z0-9-]{1,47}$')][string]$CaseId,
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-fA-F0-9]{40}$')][string]$SourceCommit,
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExecutableHash,
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ArchiveHash,
  [ValidateSet('client-a','client-b')][string]$Profile = 'client-b',
  [ValidateSet('refuse','ready')][string]$Expected = 'refuse',
  [ValidatePattern('^[A-Z_]{1,80}$')][string]$ExpectedError = 'BOUNDARY_UNVERIFIED',
  [switch]$CreateProfile
)
$ErrorActionPreference = 'Stop'
$source = 'C:\FinneyA1Lab\source'
if ($PSScriptRoot -ne "$source\experimental\a1\test" -or -not [Environment]::Is64BitOperatingSystem) {
  throw 'ISOLATED_CHECKOUT_REQUIRED'
}
$approval = Get-Content -Raw -LiteralPath 'C:\FinneyA1Lab\execution-approval.json' | ConvertFrom-Json
if ($approval.version -ne 1 -or $approval.phase -ne 'offline' -or $approval.platform -ne 'windows-x64' -or
    $approval.disposable -ne $true -or $approval.personalDataPresent -ne $false -or
    $approval.hostCredentialsPresent -ne $false -or $approval.sharedClipboard -ne $false -or
    $null -eq $approval.sensitiveMounts -or $approval.sensitiveMounts.Count -ne 0 -or
    $approval.evidenceDirectory -ne 'C:\FinneyA1Lab\evidence' -or -not $approval.ownerApproval) {
  throw 'ISOLATION_EVIDENCE_REQUIRED'
}
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'STANDARD_ACCOUNT_REQUIRED' }
$actualCommit = & git -C $source rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $actualCommit -ne $SourceCommit) { throw 'SOURCE_IDENTITY_MISMATCH' }
$changes = & git -C $source status --porcelain --untracked-files=no
if ($LASTEXITCODE -ne 0 -or $changes) { throw 'SOURCE_NOT_CLEAN' }
$package = "$source\dist\a1\$Network\package\win-unpacked"
$exe = "$package\FinneyA1.exe"
$archive = "$package\resources\app.asar"
if ((Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash -ne $ExecutableHash -or
    (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $ArchiveHash) { throw 'PACKAGE_IDENTITY_MISMATCH' }
if (Get-Process -Name FinneyA1 -ErrorAction SilentlyContinue) { throw 'PACKAGE_ALREADY_RUNNING' }
$run = Join-Path $approval.evidenceDirectory ($CaseId + '-' + [guid]::NewGuid().ToString('N'))
if (Test-Path -LiteralPath $run) { throw 'EVIDENCE_ALREADY_EXISTS' }
$null = New-Item -ItemType Directory -Path $run
$arguments = @("--profile=$Profile")
if ($CreateProfile) { $arguments += '--create-profile' }
$record = [ordered]@{ case = $CaseId; sourceCommit = $SourceCommit; network = $Network; profile = $Profile;
  executable = $exe; executableSha256 = $ExecutableHash; archiveSha256 = $ArchiveHash;
  ownerSid = $identity.User.Value; arguments = $arguments; expected = $Expected; expectedError = $ExpectedError;
  startedUtc = [DateTime]::UtcNow.ToString('o'); status = 'STARTED'; fixturePreserved = $true }
$record | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath "$run\started.json" -Encoding UTF8
# No preliminary boundary inspection here: the exact package must encounter
# the adverse fixture. The operator verifies isolation independently first.
$process = Start-Process -FilePath $exe -ArgumentList $arguments -WorkingDirectory 'C:\FinneyA1Lab' `
  -PassThru -RedirectStandardOutput "$run\stdout.txt" -RedirectStandardError "$run\stderr.txt"
$record.processId = $process.Id
$exited = $process.WaitForExit(60000)
if ($exited) {
  $process.WaitForExit()
  $record.exitCode = $process.ExitCode
  $stdout = Get-Content -Raw -LiteralPath "$run\stdout.txt"
  $stderr = Get-Content -Raw -LiteralPath "$run\stderr.txt"
  $ready = $stdout -match '"event":"offline-shell-ready"'
  $record.readyObserved = [bool]$ready
  if ($Expected -eq 'refuse') {
    $record.passed = ($record.exitCode -eq 1 -and -not $ready -and $stderr -match "(?m)^$ExpectedError\r?$" )
  } else {
    $record.passed = ($record.exitCode -eq 0 -and $ready)
  }
  $record.status = 'OBSERVED'
} else {
  $record.status = 'TIMEOUT_OWNER_CLOSE_REQUIRED'
  $record.passed = $false
  # Never terminate or reset a preserved fixture automatically.
}
$record.finishedUtc = [DateTime]::UtcNow.ToString('o')
$record.limitation = 'Operator fixture, file-access and OS egress evidence required separately; stdout is not an isolation measurement'
$record | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath "$run\result.json" -Encoding UTF8
Write-Output $run
if (-not $record.passed) { exit 1 }
