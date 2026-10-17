param(
  [Parameter(Mandatory = $true)][ValidatePattern('^(S[0-9]{2}|X)-[A-Z-]+$')][string]$CaseId,
  [Parameter(Mandatory = $true)][ValidateSet('xec-testnet','xec-regtest')][string]$Network,
  [Parameter(Mandatory = $true)][ValidateSet('client-a','client-b')][string]$Profile,
  [Parameter(Mandatory = $true)][string]$AuthorizationPath,
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-f0-9]{64}$')][string]$AuthorizationSha256
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$lab = 'C:\FinneyA1Lab'
$source = "$lab\source"
$expectedSource = 'a0e5890e612c81fda4d2698f78dbe4b81fba3e0d'
$requirementHash = 'ec6524ebdc4be39279ba356e23020a8d7e45d0d06dcad878c48bb8cbf40a3fb6'

function Require($condition, [string]$code) {
  if (-not $condition) { throw $code }
}

function Hash-Bytes([byte[]]$bytes) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant() }
  finally { $sha.Dispose() }
}

function Check-Path([string]$value, [bool]$directory) {
  $full = [IO.Path]::GetFullPath($value)
  Require ($full.StartsWith("$lab\", [StringComparison]::OrdinalIgnoreCase) -or $full -eq $lab) 'OUTSIDE_LAB'
  $current = $full
  while ($current -and $current -ne 'C:\') {
    $entry = Get-Item -LiteralPath $current -Force
    Require (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) 'REPARSE_PATH'
    $current = [IO.Path]::GetDirectoryName($current)
  }
  $entry = Get-Item -LiteralPath $full -Force
  Require ($entry.PSIsContainer -eq $directory) 'WRONG_PATH_TYPE'
  return $full
}

function Read-Record([string]$value, [int]$maximum = 1048576) {
  $file = Check-Path $value $false
  Require ((Get-Item -LiteralPath $file).Length -le $maximum) 'RECORD_TOO_LARGE'
  return ([IO.File]::ReadAllText($file) | ConvertFrom-Json)
}

function Write-NewRecord([string]$file, $record) {
  $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($record | ConvertTo-Json -Depth 32) + [Environment]::NewLine)
  $stream = [IO.File]::Open($file, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
  try { $stream.Write($bytes,0,$bytes.Length); $stream.Flush($true) } finally { $stream.Dispose() }
}

function Bound-Reference($reference) {
  Require ($reference.sha256 -cmatch '^[a-f0-9]{64}$') 'INVALID_REFERENCE_HASH'
  $file = Check-Path $reference.path $false
  Require ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ceq $reference.sha256) 'REFERENCE_CHANGED'
  return Read-Record $file
}

function Check-Inventory([string]$root, $files) {
  $root = Check-Path $root $true
  Require ($files.Count -gt 0 -and $files.Count -le 4096) 'INVENTORY_SIZE'
  $actual = [Collections.Generic.List[string]]::new()
  $queue = [Collections.Generic.Queue[string]]::new()
  $queue.Enqueue($root)
  $count = 0
  while ($queue.Count -gt 0) {
    $directory = $queue.Dequeue()
    foreach ($entry in Get-ChildItem -LiteralPath $directory -Force) {
      $count++
      Require ($count -le 4096) 'INVENTORY_LIMIT'
      Require (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) 'REPARSE_INVENTORY'
      if ($entry.PSIsContainer) { $queue.Enqueue($entry.FullName) }
      else { $actual.Add($entry.FullName.Substring($root.Length + 1).Replace('\','/')) }
    }
  }
  $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($file in $files) {
    Require ($file.relative -cmatch '^[A-Za-z0-9_. -]+(/[A-Za-z0-9_. -]+)*$' -and
      -not (@($file.relative.Split('/') | Where-Object { $_ -eq '.' -or $_ -eq '..' }).Count) -and
      $file.sha256 -cmatch '^[a-f0-9]{64}$' -and $seen.Add($file.relative)) 'INVALID_INVENTORY_ENTRY'
    $target = Join-Path $root $file.relative
    Require ($actual.Contains($file.relative)) 'INVENTORY_ENTRY_MISSING'
    Require ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ceq $file.sha256) 'INVENTORY_CHANGED'
  }
  Require ($actual.Count -eq $files.Count) 'EXTRA_PACKAGE_FILE'
}

function Read-Fuses([string]$executable) {
  $bytes = [IO.File]::ReadAllBytes($executable)
  $sentinel = [Text.Encoding]::ASCII.GetBytes('dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX')
  $positions = [Collections.Generic.List[int]]::new()
  for ($i=0; $i -le $bytes.Length-$sentinel.Length; $i++) {
    if ($bytes[$i] -ne $sentinel[0]) { continue }
    $match = $true
    for ($j=1; $j -lt $sentinel.Length; $j++) { if ($bytes[$i+$j] -ne $sentinel[$j]) { $match=$false; break } }
    if ($match) { $positions.Add($i) }
  }
  Require ($positions.Count -eq 1) 'INVALID_FUSE_SENTINEL'
  $offset = $positions[0] + $sentinel.Length
  Require ($bytes.Length -ge $offset+11 -and $bytes[$offset] -eq 1 -and $bytes[$offset+1] -eq 9) 'UNSUPPORTED_FUSE_SCHEMA'
  $states = @($bytes[($offset+2)..($offset+10)])
  foreach ($state in $states) { Require ($state -in @(48,49,114)) 'INVALID_FUSE_STATE' }
  foreach ($index in @(0,2,3,7)) { Require ($states[$index] -eq 48) 'UNSAFE_FUSE_STATE' }
  Require ($states[5] -eq 49) 'UNSAFE_ASAR_FUSE'
  return $states
}

$run = $null
$native = $null
$record = $null
try {
  Require ([Environment]::Is64BitProcess -and $env:OS -eq 'Windows_NT') 'ISOLATED_WINDOWS_X64_REQUIRED'
  $null = Check-Path $PSScriptRoot $true
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  Require (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) 'STANDARD_ACCOUNT_REQUIRED'
  $approval = Bound-Reference @{path=$AuthorizationPath;sha256=$AuthorizationSha256}
  Require ($approval.version -eq 2 -and $approval.deliveryId -cmatch '^[a-f0-9]{32}$') 'STAGE_II_VERSION_REQUIRED'
  $delivery = "$lab\evidence\stock-tooling-v2-$($approval.deliveryId)"
  Require ($PSScriptRoot -ceq "$delivery\tooling\experimental\a1\test\stock-startup-v1" -and
    $approval.toolingManifest.path -ceq "$delivery\manifest.json") 'STAGED_TOOLING_ROOT_REQUIRED'
  $bootstrap = Bound-Reference $approval.toolingManifest
  foreach ($name in @('dispatch.ps1','provenance.ps1')) {
    $bound = @($bootstrap.files | Where-Object { $_.relative -ceq "experimental/a1/test/stock-startup-v1/$name" })
    Require ($bound.Count -eq 1 -and $bound[0].sha256 -cmatch '^[a-f0-9]{64}$') 'BOOTSTRAP_IDENTITY_MISSING'
    $file = Check-Path "$PSScriptRoot\$name" $false
    Require ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ceq $bound[0].sha256) 'BOOTSTRAP_CHANGED'
  }
  . "$PSScriptRoot\provenance.ps1"
  $verified = Confirm-StockProvenance -AuthorizationPath $AuthorizationPath -AuthorizationSha256 $AuthorizationSha256 `
    -ScriptDirectory $PSScriptRoot -CaseId $CaseId -Network $Network -Profile $Profile
  $approval = $verified.approval
  $selected = $verified.selected
  $evidence = Check-Path "$lab\evidence" $true
  $run = Join-Path $evidence ('stock-startup-v2-' + $approval.runId)
  Require (-not (Test-Path -LiteralPath $run)) 'RUN_ALREADY_EXISTS'
  $null = New-Item -ItemType Directory -Path $run
  $record = [ordered]@{ version=2; runId=$approval.runId; caseId=$CaseId; network=$Network; profile=$Profile
    execution='NOT LAUNCHED'; preparationRejected=$false; unsupported=$false
    identity=$null; provenance=$verified.provenance; launch=$null; fixture=@{status='UNVERIFIED'}
    wrapper=@{pid=$null; creationTime=$null; exitCode=$null; ready=$false; readyBindingValid=$false
      stderr=''; timeout=$false; outputOverflow=$false; drainComplete=$false; forcedTermination=$false}
    kernel=$null; observation=@{attestations=@()}; limitation='Independent evidence not imported; unqualified'
    authorizationSha256=(Get-FileHash -LiteralPath $AuthorizationPath -Algorithm SHA256).Hash.ToLowerInvariant()
    startedUtc=[DateTime]::UtcNow.ToString('o') }
  if (-not $selected.dispatch -and $selected.kind -ne 'preparation') {
    if ($selected.kind -eq 'control') { $record.execution = 'UNEXECUTED' }
    $record.limitation = 'Excluded route or external observer-control definition; no candidate dispatch'
    Write-NewRecord "$run\raw-result.json" $record
    Write-Output $run
    exit 0
  }
  $package = Bound-Reference $approval.packageManifest
  Require ($package.version -eq 1 -and $package.packageSource -ceq $expectedSource -and
    $package.network -ceq $Network -and $package.requirementHash -ceq $requirementHash -and
    $package.configurationSha256 -cmatch '^[a-f0-9]{64}$') 'PACKAGE_BINDING_MISMATCH'
  Check-Inventory $package.root $package.files
  Require ($package.executable -cmatch '^[A-Za-z0-9_. -]+\.exe$') 'INVALID_EXECUTABLE_NAME'
  $executable = Check-Path (Join-Path $package.root $package.executable) $false
  $archive = Check-Path (Join-Path $package.root 'resources\app.asar') $false
  $exeHash = (Get-FileHash -LiteralPath $executable -Algorithm SHA256).Hash.ToLowerInvariant()
  $asarHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
  Require ($exeHash -ceq $package.executableSha256 -and $asarHash -ceq $package.archiveSha256) 'PACKAGE_IDENTITY_MISMATCH'
  $fuses = @(Read-Fuses $executable)
  $fixture = Bound-Reference $approval.fixtureManifest
  Require ($fixture.runId -ceq $approval.runId -and $fixture.network -ceq $Network -and
    $fixture.profile -ceq $Profile -and $fixture.ownerSid -ceq $identity.User.Value -and
    $fixture.id -cmatch '^[a-f0-9]{32}$') 'FIXTURE_BINDING_MISMATCH'
  $profilePath = "$lab\profiles\$Network\$Profile"
  $protection = "$lab\runtime\a1-userdata-$Network-$Profile"
  $create = $selected.PSObject.Properties.Name -contains 'create' -and $selected.create -eq $true
  if ($create) {
    Require ($fixture.state -ceq 'ABSENT' -and -not (Test-Path -LiteralPath $profilePath) -and
      -not (Test-Path -LiteralPath $protection)) 'FRESH_FIXTURE_REQUIRED'
  } else {
    Require ($fixture.state -ceq 'VALID' -and $fixture.cleanControlReference -is [string] -and
      $fixture.cleanControlReference.Length -gt 0) 'VALID_PROFILE_CONTROL_REQUIRED'
    Check-Inventory $profilePath $fixture.profileFiles
    Check-Inventory $protection $fixture.protectionFiles
    Require (-not (Test-Path -LiteralPath "$profilePath\.guard.lock")) 'PROFILE_NOT_IDLE'
  }
  $observers = Bound-Reference $approval.observerReadiness
  Require ($observers.runId -ceq $approval.runId -and $observers.caseId -ceq $CaseId -and
    $observers.network -ceq $Network -and $observers.profile -ceq $Profile -and
    $observers.executableSha256 -ceq $exeHash -and $observers.capturing -eq $true -and
    $observers.controlsReady -eq $true -and $observers.isolationReady -eq $true -and
    $observers.noCandidateRunning -eq $true -and
    [DateTimeOffset]::Parse($observers.expires) -gt [DateTimeOffset]::UtcNow) 'INDEPENDENT_OBSERVERS_REQUIRED'
  $arguments = @("--profile=$Profile")
  if ($create) { $arguments += '--create-profile' }
  $environment = [Collections.Generic.SortedDictionary[string,string]]::new([StringComparer]::OrdinalIgnoreCase)
  $environment.Add('SystemRoot','C:\Windows')
  $environment.Add('WINDIR','C:\Windows')
  $environment.Add('TEMP',$protection)
  $environment.Add('TMP',$protection)
  if ($selected.PSObject.Properties.Name -contains 'environment') {
    $name = [string]$selected.environment.name
    Require ($name -cin @('NODE_PATH','NoDe_PaTh','FINNEY_LIVE','FiNnEy_LiVe','ELECTRON_RUN_AS_NODE',
      'ElEcTrOn_RuN_As_NoDe','NODE_OPTIONS','NoDe_OpTiOnS','NODE_EXTRA_CA_CERTS','NoDe_ExTrA_Ca_CeRtS')) 'UNLISTED_ENVIRONMENT_CASE'
    $value = [string]$selected.environment.value
    $syntheticRoot = "$lab\fixtures\stock-startup-v1\$($fixture.id)"
    switch -CaseSensitive ($value) {
      '$moduleDirectory' { $value = Check-Path "$syntheticRoot\modules" $true }
      '$requireOption' {
        $module = Check-Path "$syntheticRoot\injection.cjs" $false
        Require ((Get-FileHash -LiteralPath $module -Algorithm SHA256).Hash.ToLowerInvariant() -ceq $fixture.moduleSha256) 'MODULE_FIXTURE_CHANGED'
        $value = '--require="' + $module + '"'
      }
      '$certificate' {
        $certificate = Check-Path "$syntheticRoot\certificate.pem" $false
        Require ((Get-Item -LiteralPath $certificate).Length -gt 0 -and
          (Get-FileHash -LiteralPath $certificate -Algorithm SHA256).Hash.ToLowerInvariant() -ceq $fixture.certificateSha256) 'CERTIFICATE_FIXTURE_CHANGED'
        $value = $certificate
      }
      default { Require ($value -cin @('','1','--inspect=127.0.0.1:9229')) 'UNLISTED_ENVIRONMENT_VALUE' }
    }
    $environment.Add($name,$value)
  }
  if ($selected.kind -eq 'preparation') {
    switch -CaseSensitive ($CaseId) {
      'S01-NODE-INSPECTOR' { $arguments += '--inspect=9229' }
      'S01-CHROMIUM-PORT' { $arguments += '--remote-debugging-port=9222' }
      'S01-CHROMIUM-PIPE' { $arguments += '--remote-debugging-pipe' }
      'S01-JS-FLAGS' { $arguments += '--js-flags=--help' }
      'S01-EXTENSION' { $arguments += "--load-extension=$lab\fixtures\stock-startup-v1\$($fixture.id)\extension" }
      'S01-USER-DATA' { $arguments += "--user-data-dir=$lab\fixtures\stock-startup-v1\$($fixture.id)\foreign" }
      'S01-NODE-PATH' { $environment.Add('NODE_PATH',"$lab\fixtures\stock-startup-v1\$($fixture.id)\modules") }
      'S01-MISSING-PROFILE' { $arguments = @() }
      'S01-DUPLICATE-PROFILE' { $arguments += "--profile=$Profile" }
      'S01-UNKNOWN-ENV' { $environment.Add('CHROME_LOG_FILE',"$lab\fixtures\stock-startup-v1\$($fixture.id)\foreign.log") }
      default { throw 'UNKNOWN_PREPARATION_CASE' }
    }
  }
  $publicValid = $arguments.Count -ge 1 -and $arguments.Count -le 2 -and
    $arguments[0] -cmatch '^--profile=client-[ab]$' -and
    ($arguments.Count -eq 1 -or $arguments[1] -ceq '--create-profile')
  $prohibitedNames = @($environment.Keys | Where-Object { $_ -match '^(FINNEY_|ELECTRON_|NODE_|CHROME_|CHROMIUM_)' })
  $preparationRejected = -not $publicValid -or $prohibitedNames.Count -gt 0
  if ($selected.kind -eq 'preparation') { Require $preparationRejected 'NEGATIVE_INPUT_NOT_REJECTED' }
  else {
    Require $publicValid 'INVALID_PUBLIC_ARGUMENTS'
    if ($selected.kind -in @('refusal','suppression')) {
      Require ($prohibitedNames.Count -eq 1 -and $prohibitedNames[0] -ceq $selected.environment.name) 'D2_INPUT_MISMATCH'
    } else { Require ($prohibitedNames.Count -eq 0) 'ENVIRONMENT_OVERRIDE_DENIED' }
  }
  $envPairs = @($environment.GetEnumerator() | ForEach-Object { $_.Key + '=' + $_.Value })
  $envBytes = [Text.Encoding]::Unicode.GetBytes(($envPairs -join [char]0) + [char]0 + [char]0)
  $tokens = @($executable) + $arguments
  foreach ($token in $tokens) { Require (-not ($token -match '["\r\n\x00]') -and -not $token.EndsWith('\')) 'INVALID_COMMAND_TOKEN' }
  $command = (@($tokens | ForEach-Object { '"' + $_ + '"' }) -join ' ')
  $commandBytes = [Text.Encoding]::Unicode.GetBytes($command + [char]0)
  $record.identity = @{packageSource=$expectedSource; toolingCommit=$approval.toolingCommit; requirementHash=$requirementHash
    executableSha256=$exeHash; archiveSha256=$asarHash; configurationSha256=$package.configurationSha256
    inventorySha256=$approval.packageManifest.sha256}
  $record.fixture = @{status='VALID'; id=$fixture.id; reference=$approval.fixtureManifest; statedState=$fixture.state}
  $record.launch = @{executable=$executable; arguments=$arguments; cwd=$lab; fuses=$fuses
    commandLine=@{encoding='UTF-16LE';base64=[Convert]::ToBase64String($commandBytes);sha256=(Hash-Bytes $commandBytes)}
    environment=@{encoding='UTF-16LE';base64=[Convert]::ToBase64String($envBytes);sha256=(Hash-Bytes $envBytes)}
    transport='CreateProcessW/STARTUPINFOEX/PROC_THREAD_ATTRIBUTE_HANDLE_LIST'
    captureState='PREPARED_NOT_SUBMITTED'; creationFlags=525312
    token=@{ownerSid=$identity.User.Value;groups=@($identity.Groups | ForEach-Object {$_.Value})
      administratorRoleEnabled=$false;elevation='UNVERIFIED';integrity='UNVERIFIED'
      privileges='UNVERIFIED';session=[Diagnostics.Process]::GetCurrentProcess().SessionId}
    handles=@()}
  if ($selected.kind -eq 'preparation') {
    $record.preparationRejected = $true
    $record.limitation = 'Preparation rejected before native launcher creation; independent no-process evidence still required.'
    Write-NewRecord "$run\raw-result.json" $record
    Write-Output $run
    exit 0
  }
  $null = Confirm-StockProvenance -AuthorizationPath $AuthorizationPath -AuthorizationSha256 $AuthorizationSha256 `
    -ScriptDirectory $PSScriptRoot -CaseId $CaseId -Network $Network -Profile $Profile
  Add-Type -Path "$PSScriptRoot\NativeLaunch.cs"
  $native = [FinneyA1Qualification.NativeLaunch]::new($executable,$command,$envBytes,$lab,"$run\stdout.bin","$run\stderr.bin")
  $record.launch.captureState = 'PREPARED_FOR_CREATEPROCESS'
  $record.launch.creationFlags = $native.Flags
  $record.launch.handles = @(@{handle=$native.InputHandle;role='stdin';object='NUL';access='GENERIC_READ'},
    @{handle=$native.OutputHandle;role='stdout';object='anonymous-pipe';access='write'},
    @{handle=$native.ErrorHandle;role='stderr';object='anonymous-pipe';access='write'})
  Write-NewRecord "$run\submitted-launch.json" $record
  $native.Start()
  $record.launch.captureState = 'SUBMITTED_NOT_INDEPENDENTLY_CORROBORATED'
  $record.execution = 'LAUNCHED'
  $record.wrapper.pid = $native.ProcessId
  $record.wrapper.creationTime = $native.CreationTime
  Write-NewRecord "$run\created.json" $record
  $timer = [Diagnostics.Stopwatch]::StartNew()
  $closeTimer = $null
  $closeRequested = $false
  while (-not $native.Exited) {
    foreach ($line in ($native.OutputText -split '\r?\n')) {
      if ($line -notmatch '"event"\s*:\s*"offline-shell-ready"') { continue }
      $record.wrapper.ready = $true
      try {
        $ready = $line | ConvertFrom-Json
        $record.wrapper.readyBindingValid = $ready.processId -eq $native.ProcessId -and
          $ready.network -ceq $Network -and $ready.profile -ceq $Profile
      } catch { $record.wrapper.readyBindingValid = $false }
    }
    if ($record.wrapper.ready -and -not $closeRequested) {
      $closeRequested = $native.RequestNormalClose()
      if ($closeRequested) { $closeTimer = [Diagnostics.Stopwatch]::StartNew() }
    }
    if ($native.OutputOverflow -or $native.ReadFailed -or $timer.ElapsedMilliseconds -ge 60000 -or
      ($closeTimer -and $closeTimer.ElapsedMilliseconds -ge 10000)) { break }
    Start-Sleep -Milliseconds 50
  }
  $record.wrapper.timeout = -not $native.Exited
  if ($native.Exited) {
    $drain = [Diagnostics.Stopwatch]::StartNew()
    while (-not $native.DrainComplete -and $drain.ElapsedMilliseconds -lt 10000) { Start-Sleep -Milliseconds 50 }
  }
  $record.wrapper.exitCode = $native.ExitCode
  $record.wrapper.outputOverflow = $native.OutputOverflow
  $record.wrapper.drainComplete = $native.DrainComplete
  $record.wrapper.outputBytes = $native.OutputBytes
  $record.wrapper.errorBytes = $native.ErrorBytes
  $record.wrapper.normalCloseRequested = $closeRequested
  if ($native.DrainComplete) {
    $record.wrapper.stderr = [IO.File]::ReadAllText("$run\stderr.bin")
    foreach ($line in ($native.OutputText -split '\r?\n')) {
      if ($line -match '"event"\s*:\s*"offline-shell-ready"') { $record.wrapper.ready = $true }
    }
  }
  $record.finishedUtc = [DateTime]::UtcNow.ToString('o')
  $record.limitation = 'Raw wrapper capture only. Separate kernel/interval/input/token/trust evidence required; no acceptance inferred.'
  Write-NewRecord "$run\raw-result.json" $record
  Write-Output $run
} catch {
  if ($record -and $run) {
    if ($native -and $native.ProcessId -gt 0) {
      $record.execution = 'LAUNCHED'
      $record.wrapper.pid = $native.ProcessId
      $record.wrapper.creationTime = $native.CreationTime
    }
    $record.limitation = 'Dispatcher stopped; evidence incomplete. ' + $_.Exception.GetType().Name
    $record.dispatcherError = $_.Exception.Message
    Write-NewRecord "$run\dispatcher-error.json" $record
  }
  throw
} finally {
  if ($native -and ($native.ProcessId -eq 0 -or ($native.Exited -and $native.DrainComplete))) { $native.Dispose() }
}
