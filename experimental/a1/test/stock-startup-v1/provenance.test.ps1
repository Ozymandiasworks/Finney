param([Parameter(Mandatory = $true)][string]$EvidenceRoot)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. "$PSScriptRoot\provenance.ps1"

Assert-Stock ($EvidenceRoot -cmatch '^C:\\FinneyA1Lab\\evidence\\stock-provenance-tests-[a-f0-9]{32}$' -and
  -not (Test-Path -LiteralPath $EvidenceRoot)) 'NEW_TEST_EVIDENCE_REQUIRED'
$null = Resolve-StockPath 'C:\FinneyA1Lab\evidence' 'C:\FinneyA1Lab' $true
$null = New-Item -ItemType Directory -Path $EvidenceRoot
$testSource = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\..'))
$utf8 = [Text.UTF8Encoding]::new($false)
$script:gitFixture = $null
$script:continuations = 0
$now = [DateTimeOffset]::Parse('2026-10-17T05:00:00Z')

function Test-JsonBytes($value) { return $utf8.GetBytes(($value | ConvertTo-Json -Depth 32) + "`n") }
function Test-Hash([byte[]]$bytes) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant() }
  finally { $sha.Dispose() }
}
function Write-TestFile([string]$file, [byte[]]$bytes) {
  $parent = [IO.Path]::GetDirectoryName($file)
  if (-not (Test-Path -LiteralPath $parent)) { $null = New-Item -ItemType Directory -Path $parent -Force }
  $stream = [IO.File]::Open($file,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
  try { $stream.Write($bytes,0,$bytes.Length) } finally { $stream.Dispose() }
}

# The filesystem/hash gate is real; only the external Git command result is substituted.
function Read-StockGitState([string]$source) { return $script:gitFixture }

function New-TestFixture([int]$number) {
  $lab = "$EvidenceRoot\case-$number"
  $id = ('{0:x32}' -f $number)
  $delivery = "$lab\evidence\stock-tooling-v2-$id"
  $root = "$delivery\tooling"
  $files = @()
  $contents = @{}
  foreach ($relative in Get-StockLayout) {
    $bytes = [IO.File]::ReadAllBytes((Join-Path $testSource $relative))
    $contents[$relative] = $bytes
    $files += [pscustomobject]@{relative=$relative;bytes=$bytes.Length;sha256=(Test-Hash $bytes)}
  }
  $matrix = 'docs/a1-offline/stock-startup-v1/CASE_MATRIX.json'
  $archive = $utf8.GetBytes('Synthetic hash fixture only, not a Git export or package')
  $source = 'a0e5890e612c81fda4d2698f78dbe4b81fba3e0d'
  $requirement = 'ec6524ebdc4be39279ba356e23020a8d7e45d0d06dcad878c48bb8cbf40a3fb6'
  $manifest = [ordered]@{version=2;format='git-archive-zip-raw-v1';toolingCommit=('1'*40)
    packageSource=$source;requirementHash=$requirement;caseMatrixPath=$matrix
    caseMatrixSha256=(Test-Hash $contents[$matrix]);deliverySha256=(Test-Hash $archive)
    deliveryBytes=$archive.Length;files=$files}
  $ledger = [ordered]@{version=1;scope='FIRST_FEASIBILITY';caseId='S02-REOPEN';network='xec-regtest'
    profile='client-b';runId=$id;maximumCandidateAttempts=1;candidateAttempts=0;dispatcherInvocations=0
    previousCheckpointSha256=('8'*64)}
  $approval = [ordered]@{version=2;stage='II';scope='FIRST_FEASIBILITY';authorized=$true
    ownerApproval='SYNTHETIC VALIDATION ONLY';runId=$id;caseId='S02-REOPEN';network='xec-regtest';profile='client-b'
    validFrom='2026-10-17T04:59:00Z';expires='2026-10-17T05:01:00Z';packageSource=$source
    packageSourceRoot="$lab\source";requirementHash=$requirement;toolingCommit=('1'*40);deliveryId=$id
    toolingRoot=$root;caseMatrixSha256=$manifest.caseMatrixSha256
    toolingManifest=@{path="$delivery\manifest.json";sha256=$null}
    toolingArchive=@{path="$delivery\tooling.zip";sha256=$manifest.deliverySha256}
    attemptLedger=@{path="$lab\ledger.json";sha256=$null}}
  return @{lab=$lab;root=$root;delivery=$delivery;contents=$contents;manifest=$manifest;approval=$approval
    ledger=$ledger;archive=$archive;omit=$null;extra=$null;reparse=$false;gitEntry=$true
    scriptDirectory="$root\experimental\a1\test\stock-startup-v1"
    git=@{root="$lab\source";head=$source;status=@()};approvalPin=$null;manifestPin=$null
    callCase='S02-REOPEN';callNetwork='xec-regtest';callProfile='client-b'}
}

function Save-TestFixture($fixture) {
  foreach ($relative in @($fixture.contents.Keys)) {
    if ($relative -cne $fixture.omit) {
      Write-TestFile (Join-Path $fixture.root $relative) $fixture.contents[$relative]
    }
  }
  if ($fixture.extra) { Write-TestFile (Join-Path $fixture.root $fixture.extra) $utf8.GetBytes('unexpected') }
  if ($fixture.reparse) {
    $target = "$($fixture.lab)\reparse-target"
    $null = New-Item -ItemType Directory -Path $target
    $null = New-Item -ItemType Junction -Path "$($fixture.root)\link" -Target $target
  }
  $null = New-Item -ItemType Directory -Path "$($fixture.lab)\source" -Force
  if ($fixture.gitEntry) { Write-TestFile "$($fixture.lab)\source\.git" $utf8.GetBytes('synthetic Git marker') }
  Write-TestFile "$($fixture.delivery)\tooling.zip" $fixture.archive
  $manifestBytes = Test-JsonBytes $fixture.manifest
  Write-TestFile "$($fixture.delivery)\manifest.json" $manifestBytes
  $fixture.approval.toolingManifest.sha256 = if ($fixture.manifestPin) { $fixture.manifestPin } else { Test-Hash $manifestBytes }
  $ledgerBytes = Test-JsonBytes $fixture.ledger
  Write-TestFile "$($fixture.lab)\ledger.json" $ledgerBytes
  $fixture.approval.attemptLedger.sha256 = Test-Hash $ledgerBytes
  $approvalBytes = Test-JsonBytes $fixture.approval
  Write-TestFile "$($fixture.lab)\approval.json" $approvalBytes
  if (-not $fixture.approvalPin) { $fixture.approvalPin = Test-Hash $approvalBytes }
}

function Change-TestMatrix($fixture, [scriptblock]$change) {
  $relative = 'docs/a1-offline/stock-startup-v1/CASE_MATRIX.json'
  $matrix = $utf8.GetString($fixture.contents[$relative]) | ConvertFrom-Json
  & $change $matrix
  $bytes = Test-JsonBytes $matrix
  $fixture.contents[$relative] = $bytes
  $entry = @($fixture.manifest.files | Where-Object { $_.relative -ceq $relative })[0]
  $entry.bytes = $bytes.Length
  $entry.sha256 = Test-Hash $bytes
  $fixture.manifest.caseMatrixSha256 = $entry.sha256
  $fixture.approval.caseMatrixSha256 = $entry.sha256
}

$cases = @(
  @{name='distinct frozen source and approved tooling without staged .git';code=$null;change={param($f)}},
  @{name='wrong package root';code='STOCK_SUBJECT_BINDING';change={param($f) $f.approval.packageSourceRoot+='-wrong'}},
  @{name='wrong tooling root';code='STOCK_ROOT_BINDING';change={param($f) $f.approval.toolingRoot+='-wrong'}},
  @{name='parent-repository fallback';code='STOCK_PACKAGE_SOURCE_MISMATCH';change={param($f) $f.git.root=$f.lab}},
  @{name='swapped package and tooling commits';code='STOCK_PACKAGE_SOURCE_MISMATCH';change={param($f) $f.git.head=$f.approval.toolingCommit}},
  @{name='package commit used as tooling';code='STOCK_SUBJECT_BINDING';change={param($f) $f.approval.toolingCommit=$f.manifest.packageSource}},
  @{name='stale approved tooling commit';code='STOCK_MANIFEST_BINDING';change={param($f) $f.approval.toolingCommit='f21755ac7700b42eb927a901d3a545794505945b'}},
  @{name='wrong archive pin';code='STOCK_MANIFEST_BINDING';change={param($f) $f.approval.toolingArchive.sha256='0'*64}},
  @{name='changed archive';code='STOCK_DELIVERY_CHANGED';change={param($f) $f.archive=$utf8.GetBytes('changed')}},
  @{name='substituted approval';code='STOCK_RECORD_CHANGED';change={param($f) $f.approvalPin='0'*64}},
  @{name='substituted manifest';code='STOCK_RECORD_CHANGED';change={param($f) $f.manifestPin='0'*64}},
  @{name='changed native helper';code='STOCK_FILE_CHANGED';change={param($f) $f.contents['experimental/a1/test/stock-startup-v1/NativeLaunch.cs']=$utf8.GetBytes('changed')}},
  @{name='wrong recorded file hash';code='STOCK_FILE_CHANGED';change={param($f) $f.manifest.files[0].sha256='0'*64}},
  @{name='missing matrix';code='STOCK_PATH_MISSING';change={param($f) $f.omit='docs/a1-offline/stock-startup-v1/CASE_MATRIX.json'}},
  @{name='missing executable dependency';code='STOCK_PATH_MISSING';change={param($f) $f.omit='experimental/a1/test/stock-startup-v1/classify.js'}},
  @{name='extra executable dependency';code='STOCK_EXTRA_FILE';change={param($f) $f.extra='experimental/a1/test/stock-startup-v1/injected.ps1'}},
  @{name='no staged Git metadata permitted';code='STOCK_EXTRA_FILE';change={param($f) $f.extra='.git'}},
  @{name='duplicate manifest entry';code='STOCK_INVENTORY_ENTRY';change={param($f) $f.manifest.files[1]=$f.manifest.files[0]}},
  @{name='case-alias entry';code='STOCK_INVENTORY_ENTRY';change={param($f) $f.manifest.files[0].relative=$f.manifest.files[0].relative.ToUpperInvariant()}},
  @{name='traversal entry';code='STOCK_INVENTORY_ENTRY';change={param($f) $f.manifest.files[0].relative='../outside.ps1'}},
  @{name='reparse entry';code='STOCK_REPARSE_ENTRY';change={param($f) $f.reparse=$true}},
  @{name='entry root traversal';code='STOCK_ROOT_BINDING';change={param($f) $f.scriptDirectory+='\..'}},
  @{name='wrong matrix pin';code='STOCK_MANIFEST_BINDING';change={param($f) $f.approval.caseMatrixSha256='0'*64}},
  @{name='wrong matrix relative path';code='STOCK_MANIFEST_BINDING';change={param($f) $f.manifest.caseMatrixPath='CASE_MATRIX.json'}},
  @{name='rebound matrix wrong source';code='STOCK_MATRIX_BINDING';change={param($f) Change-TestMatrix $f {param($m) $m.packageSource='1'*40}}},
  @{name='rebound matrix wrong requirement';code='STOCK_MATRIX_BINDING';change={param($f) Change-TestMatrix $f {param($m) $m.requirementSha256='0'*64}}},
  @{name='rebound matrix wrong case';code='STOCK_CASE_BINDING';change={param($f) Change-TestMatrix $f {param($m) ($m.cases | Where-Object {$_.id -ceq 'S02-REOPEN'}).create=$true}}},
  @{name='rebound matrix duplicate case';code='STOCK_DUPLICATE_CASE';change={param($f) Change-TestMatrix $f {param($m) $m.cases[1].id=$m.cases[0].id}}},
  @{name='old manifest schema';code='STOCK_MANIFEST_BINDING';change={param($f) $f.manifest.version=1}},
  @{name='wrong requirement';code='STOCK_SUBJECT_BINDING';change={param($f) $f.approval.requirementHash='0'*64}},
  @{name='wrong package source';code='STOCK_SUBJECT_BINDING';change={param($f) $f.approval.packageSource='1'*40}},
  @{name='expired authorization';code='STOCK_AUTHORIZATION_EXPIRED';change={param($f) $f.approval.expires='2026-10-17T04:59:30Z'}},
  @{name='future authorization';code='STOCK_AUTHORIZATION_EXPIRED';change={param($f) $f.approval.validFrom='2026-10-17T05:00:30Z'}},
  @{name='old approval schema';code='STOCK_AUTHORIZATION_VERSION';change={param($f) $f.approval.version=1}},
  @{name='case mismatch';code='STOCK_AUTHORIZATION_BINDING';change={param($f) $f.callCase='S06-UPPER'}},
  @{name='network mismatch';code='STOCK_AUTHORIZATION_BINDING';change={param($f) $f.callNetwork='xec-testnet'}},
  @{name='profile mismatch';code='STOCK_AUTHORIZATION_BINDING';change={param($f) $f.callProfile='client-a'}},
  @{name='run binding mismatch';code='STOCK_ATTEMPT_BINDING';change={param($f) $f.ledger.runId='f'*32}},
  @{name='spent cumulative attempt';code='STOCK_ATTEMPT_BINDING';change={param($f) $f.ledger.candidateAttempts=1}},
  @{name='dirty tracked source';code='SOURCE_NOT_CLEAN';change={param($f) $f.git.status=@(' M package.json')}},
  @{name='preserved untracked source';code='SOURCE_NOT_CLEAN';change={param($f) $f.git.status=@('?? powershell')}},
  @{name='absent source Git identity';code='STOCK_GIT_ENTRY_MISSING';change={param($f) $f.gitEntry=$false}}
)
$results = @()
for ($index=0; $index -lt $cases.Count; $index++) {
  $case = $cases[$index]
  $fixture = New-TestFixture ($index+1)
  $script:continuations = 0
  $failure = $null
  $setupComplete = $false
  try {
    & $case.change $fixture
    Save-TestFixture $fixture
    $setupComplete = $true
    $script:gitFixture = $fixture.git
    $verified = Confirm-StockProvenance -AuthorizationPath "$($fixture.lab)\approval.json" `
      -AuthorizationSha256 $fixture.approvalPin -ScriptDirectory $fixture.scriptDirectory `
      -CaseId $fixture.callCase -Network $fixture.callNetwork -Profile $fixture.callProfile -Lab $fixture.lab -Now $now
    $script:continuations++
    Assert-Stock ($verified.provenance.toolingCommit -cne $verified.provenance.packageSourceHead -and
      -not (Test-Path -LiteralPath "$($fixture.root)\.git")) 'POSITIVE_PROVENANCE_INVALID'
  } catch { $failure = $_.Exception.Message }
  $passed = $setupComplete -and $(if ($null -eq $case.code) { $null -eq $failure -and $script:continuations -eq 1 }
    else { $null -ne $failure -and $script:continuations -eq 0 -and $failure -ceq $case.code })
  $results += [ordered]@{name=$case.name;passed=$passed;setupComplete=$setupComplete;expectedError=$case.code
    observedError=$failure;preflightContinuations=$script:continuations;nativeInvocations=0;candidateAttempts=0
    acceptance='UNQUALIFIED';independentVerification='NOT PERFORMED';evidenceRoot=$fixture.lab}
}
Write-TestFile "$EvidenceRoot\results.json" (Test-JsonBytes @{version=2;kind='SYNTHETIC_PROVENANCE_GATE'
  gitCommand='SUBSTITUTED; real Git wrapper and live dispatcher still require integration validation'
  runtime=$PSVersionTable.PSVersion.ToString();cases=$results})
$failed = @($results | Where-Object { -not $_.passed }).Count
Write-Output "Cases=$($results.Count) Passed=$($results.Count-$failed) Failed=$failed; fixtures preserved at $EvidenceRoot"
if ($failed -gt 0) { exit 1 }
