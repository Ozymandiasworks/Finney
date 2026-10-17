Set-StrictMode -Version Latest

function Assert-Stock($condition, [string]$code) {
  if (-not $condition) { throw $code }
}

function Resolve-StockPath([string]$value, [string]$lab, [bool]$directory) {
  Assert-Stock ($value -cmatch '^[A-Z]:\\' -and $value.Length -le 1024) 'INVALID_STOCK_PATH'
  $full = [IO.Path]::GetFullPath($value)
  Assert-Stock ($full -ceq $value -and $full.StartsWith("$lab\", [StringComparison]::Ordinal)) 'STOCK_PATH_ESCAPE'
  $current = $full
  while ($current -and $current -ne [IO.Path]::GetPathRoot($current)) {
    Assert-Stock (Test-Path -LiteralPath $current) 'STOCK_PATH_MISSING'
    $entry = Get-Item -LiteralPath $current -Force -ErrorAction Stop
    Assert-Stock (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) 'STOCK_REPARSE_PATH'
    $current = [IO.Path]::GetDirectoryName($current)
  }
  Assert-Stock ((Get-Item -LiteralPath $full -Force).PSIsContainer -eq $directory) 'STOCK_PATH_TYPE'
  return $full
}

function Get-StockHash([string]$file) {
  return (Get-FileHash -LiteralPath $file -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant()
}

function Read-StockBoundRecord([string]$file, [string]$hash, [string]$lab) {
  $null = Resolve-StockPath $file $lab $false
  Assert-Stock ($hash -cmatch '^[a-f0-9]{64}$' -and (Get-Item -LiteralPath $file).Length -le 1048576) 'STOCK_RECORD_LIMIT'
  Assert-Stock ((Get-StockHash $file) -ceq $hash) 'STOCK_RECORD_CHANGED'
  return ([IO.File]::ReadAllText($file) | ConvertFrom-Json)
}

function Get-StockLayout {
  $docs = 'docs/a1-offline/stock-startup-v1/'
  $code = 'experimental/a1/test/stock-startup-v1/'
  return @('CASE_MATRIX.json','COVERAGE.md','LAUNCH.md','STAGE_I_HANDOFF.md','STAGING.md' | ForEach-Object { $docs + $_ }) +
    @('NativeLaunch.cs','classify.js','contract.js','contract.test.js','dispatch-input.schema.json',
      'dispatch.ps1','launch-record.schema.json','provenance.ps1','provenance.test.ps1',
      'result.schema.json','tooling-manifest.schema.json' | ForEach-Object { $code + $_ })
}

function Confirm-StockInventory([string]$root, $files, [string]$lab) {
  $null = Resolve-StockPath $root $lab $true
  $layout = @(Get-StockLayout)
  Assert-Stock ($files -is [array] -and $files.Count -eq $layout.Count) 'STOCK_INVENTORY_SIZE'
  $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  $directories = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  foreach ($file in $files) {
    Assert-Stock ($file.relative -is [string] -and $file.relative -cin $layout -and
      $seen.Add($file.relative) -and $file.sha256 -cmatch '^[a-f0-9]{64}$' -and
      $file.bytes -is [ValueType] -and $file.bytes -ge 1 -and $file.bytes -le 1048576) 'STOCK_INVENTORY_ENTRY'
    $parent = $file.relative
    while ($parent.Contains('/')) {
      $parent = $parent.Substring(0,$parent.LastIndexOf('/'))
      $null = $directories.Add($parent)
    }
    $target = Join-Path $root ($file.relative.Replace('/','\'))
    $null = Resolve-StockPath $target $lab $false
    Assert-Stock ((Get-Item -LiteralPath $target).Length -eq $file.bytes -and
      (Get-StockHash $target) -ceq $file.sha256) 'STOCK_FILE_CHANGED'
  }
  $actual = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $queue = [Collections.Generic.Queue[string]]::new()
  $queue.Enqueue($root)
  $count = 0
  while ($queue.Count -gt 0) {
    foreach ($entry in Get-ChildItem -LiteralPath $queue.Dequeue() -Force -ErrorAction Stop) {
      $count++
      Assert-Stock ($count -le 64) 'STOCK_INVENTORY_LIMIT'
      Assert-Stock (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) 'STOCK_REPARSE_ENTRY'
      $relative = $entry.FullName.Substring($root.Length+1).Replace('\','/')
      if ($entry.PSIsContainer) {
        Assert-Stock ($directories.Contains($relative)) 'STOCK_EXTRA_DIRECTORY'
        $queue.Enqueue($entry.FullName)
      } else {
        Assert-Stock ($relative -cin $layout -and $actual.Add($relative)) 'STOCK_EXTRA_FILE'
      }
    }
  }
  Assert-Stock ($actual.Count -eq $layout.Count) 'STOCK_INVENTORY_INCOMPLETE'
}

function Read-StockGitState([string]$source) {
  Assert-Stock (@(Get-ChildItem Env: | Where-Object { $_.Name -like 'GIT_*' }).Count -eq 0) 'STOCK_GIT_ENVIRONMENT'
  $root = @(& git -C $source rev-parse --show-toplevel)
  Assert-Stock ($LASTEXITCODE -eq 0 -and $root.Count -eq 1) 'STOCK_GIT_ROOT_UNAVAILABLE'
  $head = @(& git -C $source rev-parse HEAD)
  Assert-Stock ($LASTEXITCODE -eq 0 -and $head.Count -eq 1) 'STOCK_GIT_HEAD_UNAVAILABLE'
  $status = @(& git -C $source status --porcelain=v1 --untracked-files=all)
  Assert-Stock ($LASTEXITCODE -eq 0) 'STOCK_GIT_STATUS_UNAVAILABLE'
  return @{ root=$root[0].Replace('/','\'); head=$head[0]; status=$status }
}

function Confirm-StockProvenance {
  param([string]$AuthorizationPath, [string]$AuthorizationSha256, [string]$ScriptDirectory,
    [string]$CaseId, [string]$Network, [string]$Profile, [string]$Lab = 'C:\FinneyA1Lab',
    [DateTimeOffset]$Now = [DateTimeOffset]::UtcNow)
  $source = "$Lab\source"
  $packageSource = 'a0e5890e612c81fda4d2698f78dbe4b81fba3e0d'
  $requirement = 'ec6524ebdc4be39279ba356e23020a8d7e45d0d06dcad878c48bb8cbf40a3fb6'
  $approval = Read-StockBoundRecord $AuthorizationPath $AuthorizationSha256 $Lab
  Assert-Stock ($approval.version -is [ValueType] -and $approval.version -eq 2 -and $approval.stage -ceq 'II' -and
    $approval.scope -ceq 'FIRST_FEASIBILITY' -and $approval.authorized -is [bool] -and $approval.authorized -eq $true -and
    $approval.ownerApproval -is [string] -and $approval.ownerApproval.Trim().Length -gt 0) 'STOCK_AUTHORIZATION_VERSION'
  Assert-Stock ($approval.runId -cmatch '^[a-f0-9]{32}$' -and $approval.caseId -ceq $CaseId -and
    $approval.network -ceq $Network -and $approval.profile -ceq $Profile -and
    $CaseId -ceq 'S02-REOPEN' -and $Network -ceq 'xec-regtest' -and $Profile -ceq 'client-b') 'STOCK_AUTHORIZATION_BINDING'
  Assert-Stock ($approval.validFrom -cmatch 'Z$' -and $approval.expires -cmatch 'Z$' -and
    [DateTimeOffset]::Parse($approval.validFrom) -le $Now -and
    [DateTimeOffset]::Parse($approval.expires) -gt $Now) 'STOCK_AUTHORIZATION_EXPIRED'
  Assert-Stock ($approval.packageSource -ceq $packageSource -and $approval.packageSourceRoot -ceq $source -and
    $approval.requirementHash -ceq $requirement -and $approval.toolingCommit -cmatch '^[a-f0-9]{40}$' -and
    $approval.toolingCommit -cne $packageSource -and $approval.deliveryId -cmatch '^[a-f0-9]{32}$') 'STOCK_SUBJECT_BINDING'
  $delivery = "$Lab\evidence\stock-tooling-v2-$($approval.deliveryId)"
  $root = "$delivery\tooling"
  Assert-Stock ($approval.toolingRoot -ceq $root -and
    $ScriptDirectory -ceq "$root\experimental\a1\test\stock-startup-v1" -and
    $approval.toolingManifest.path -ceq "$delivery\manifest.json" -and
    $approval.toolingArchive.path -ceq "$delivery\tooling.zip") 'STOCK_ROOT_BINDING'
  $null = Resolve-StockPath $ScriptDirectory $Lab $true
  $manifest = Read-StockBoundRecord $approval.toolingManifest.path $approval.toolingManifest.sha256 $Lab
  Assert-Stock ($manifest.version -eq 2 -and $manifest.format -ceq 'git-archive-zip-raw-v1' -and
    $manifest.toolingCommit -ceq $approval.toolingCommit -and $manifest.packageSource -ceq $packageSource -and
    $manifest.requirementHash -ceq $requirement -and $manifest.deliverySha256 -ceq $approval.toolingArchive.sha256 -and
    $manifest.caseMatrixSha256 -ceq $approval.caseMatrixSha256 -and
    $manifest.caseMatrixPath -ceq 'docs/a1-offline/stock-startup-v1/CASE_MATRIX.json') 'STOCK_MANIFEST_BINDING'
  $archive = Resolve-StockPath $approval.toolingArchive.path $Lab $false
  Assert-Stock ($approval.toolingArchive.sha256 -cmatch '^[a-f0-9]{64}$' -and
    (Get-Item -LiteralPath $archive).Length -eq $manifest.deliveryBytes -and
    $manifest.deliveryBytes -gt 0 -and $manifest.deliveryBytes -le 1048576 -and
    (Get-StockHash $archive) -ceq $approval.toolingArchive.sha256) 'STOCK_DELIVERY_CHANGED'
  Confirm-StockInventory $root $manifest.files $Lab
  $matrixPath = Join-Path $root ($manifest.caseMatrixPath.Replace('/','\'))
  $matrix = Read-StockBoundRecord $matrixPath $approval.caseMatrixSha256 $Lab
  Assert-Stock ($matrix.version -eq 1 -and $matrix.requirement -ceq 'A1-STOCK-STARTUP-1' -and
    $matrix.requirementSha256 -ceq $requirement -and $matrix.packageSource -ceq $packageSource -and
    $matrix.executionAuthorized -ceq $false -and $matrix.cases.Count -eq 43) 'STOCK_MATRIX_BINDING'
  $ids = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($row in $matrix.cases) { Assert-Stock ($ids.Add($row.id)) 'STOCK_DUPLICATE_CASE' }
  $selected = @($matrix.cases | Where-Object { $_.id -ceq $CaseId })
  Assert-Stock ($selected.Count -eq 1 -and $selected[0].kind -ceq 'ordinary' -and
    $selected[0].dispatch -ceq $true -and $selected[0].create -ceq $false) 'STOCK_CASE_BINDING'
  $ledger = Read-StockBoundRecord $approval.attemptLedger.path $approval.attemptLedger.sha256 $Lab
  Assert-Stock ($ledger.version -eq 1 -and $ledger.scope -ceq 'FIRST_FEASIBILITY' -and
    $ledger.caseId -ceq $CaseId -and $ledger.network -ceq $Network -and $ledger.profile -ceq $Profile -and
    $ledger.runId -ceq $approval.runId -and $ledger.maximumCandidateAttempts -eq 1 -and
    $ledger.candidateAttempts -eq 0 -and $ledger.dispatcherInvocations -eq 0 -and
    $ledger.previousCheckpointSha256 -cmatch '^[a-f0-9]{64}$') 'STOCK_ATTEMPT_BINDING'
  $null = Resolve-StockPath $source $Lab $true
  Assert-Stock (Test-Path -LiteralPath "$source\.git") 'STOCK_GIT_ENTRY_MISSING'
  $gitEntry = Get-Item -LiteralPath "$source\.git" -Force -ErrorAction Stop
  $null = Resolve-StockPath $gitEntry.FullName $Lab $gitEntry.PSIsContainer
  $gitState = Read-StockGitState $source
  Assert-Stock ($gitState.root -ceq $source -and $gitState.head -ceq $packageSource) 'STOCK_PACKAGE_SOURCE_MISMATCH'
  Assert-Stock (@($gitState.status).Count -eq 0) 'SOURCE_NOT_CLEAN'
  return @{ approval=$approval; selected=$selected[0]; matrixPath=$matrixPath
    provenance=@{ version=2; packageSourceRoot=$source; packageSourceHead=$gitState.head; toolingRoot=$root
      toolingCommit=$approval.toolingCommit; commitEvidence='HOST_EXPORT_APPROVAL_NOT_GUEST_GIT'
      manifestSha256=$approval.toolingManifest.sha256; deliverySha256=$approval.toolingArchive.sha256
      caseMatrixSha256=$approval.caseMatrixSha256; authorizationSha256=$AuthorizationSha256
      runId=$approval.runId; caseId=$CaseId; network=$Network; profile=$Profile } }
}
