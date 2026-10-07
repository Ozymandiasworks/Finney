# Guest-only real filesystem fixtures. They exercise extracted production
# functions, not a packaged executable. All fixture files are retained.
$ErrorActionPreference = 'Stop'
$source = 'C:\FinneyA1Lab\source'
if ($PSScriptRoot -ne "$source\experimental\a1\test") { throw 'ISOLATED_CHECKOUT_REQUIRED' }
$approval = Get-Content -Raw -LiteralPath 'C:\FinneyA1Lab\execution-approval.json' | ConvertFrom-Json
if ($approval.phase -ne 'offline' -or $approval.disposable -ne $true -or
    $approval.personalDataPresent -ne $false -or $approval.hostCredentialsPresent -ne $false -or
    $approval.sharedClipboard -ne $false -or $approval.sensitiveMounts.Count -ne 0) { throw 'ISOLATION_EVIDENCE_REQUIRED' }
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'STANDARD_ACCOUNT_REQUIRED' }
$owner = $identity.User
$sid = [Security.Principal.SecurityIdentifier]::new('S-1-15-3-1024-395641907-2340533657-1796656376-1949871151-3167452726-3934347287-2361051074-3061173417')
$tokens = $null
$errors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile("$source\experimental\a1\app\inspect-boundary.ps1", [ref]$tokens, [ref]$errors)
if ($errors.Count -ne 0) { throw 'INVALID_INSPECTOR_SYNTAX' }
$names = @('Convert-A1FileRights', 'Test-A1NetworkServiceAccess', 'Assert-A1ScanBudget',
  'Get-A1Children', 'Get-A1CheckedEntry', 'Assert-A1Tree')
$functions = @($ast.FindAll({ param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -in $names
}, $true))
if ($functions.Count -ne $names.Count) { throw 'INSPECTOR_FUNCTIONS_MISSING' }
foreach ($definition in $functions) { . ([scriptblock]::Create($definition.Extent.Text)) }
$base = Join-Path 'C:\FinneyA1Lab\fixtures' ('a1-tree-' + [guid]::NewGuid().ToString('N'))
if (Test-Path -LiteralPath $base) { throw 'FIXTURE_ALREADY_EXISTS' }
[void][IO.Directory]::CreateDirectory($base)
$results = [Collections.Generic.List[object]]::new()

function New-Tree {
  param([string]$Name)
  $root = Join-Path $base $Name
  [void][IO.Directory]::CreateDirectory($root)
  $acl = [Security.AccessControl.DirectorySecurity]::new()
  $acl.SetOwner($owner)
  $acl.SetAccessRuleProtection($true, $false)
  $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($owner, 'FullControl', 'ContainerInherit, ObjectInherit', 'None', 'Allow'))
  Set-Acl -LiteralPath $root -AclObject $acl
  return $root
}

function New-Nested {
  param([string]$Root, [string]$Name = 'Cache')
  $anchor = Join-Path $Root $Name
  [void][IO.Directory]::CreateDirectory($anchor)
  if ($Name -in @('Cache', 'Network', 'Shared Dictionary')) {
    $acl = Get-Acl -LiteralPath $anchor
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid, 'Modify', 'None', 'None', 'Allow'))
    $raw = [Security.AccessControl.DirectorySecurity]::new()
    $raw.SetSecurityDescriptorSddlForm("D:(A;OICIIO;0xe0010000;;;$($sid.Value))")
    $rawRule = @($raw.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))[0]
    $acl.AddAccessRule($rawRule)
    Set-Acl -LiteralPath $anchor -AclObject $acl
  }
  $nested = Join-Path $anchor 'one\two'
  [void][IO.Directory]::CreateDirectory($nested)
  [IO.File]::WriteAllText((Join-Path $nested 'data.fixture'), 'nonsecret nested canary')
  return $nested
}

function Assert-TreeResult {
  param([string]$Name, [string]$Root, [string]$Expected = '', [hashtable]$Overrides = @{},
    [string]$ExpectedOwner = $owner.Value)
  $scan = @{ Clock = [Diagnostics.Stopwatch]::StartNew(); Entries = 0;
    MaximumDepth = 32; MaximumEntries = 4096; MaximumMilliseconds = 6000 }
  foreach ($key in $Overrides.Keys) { $scan[$key] = $Overrides[$key] }
  $actual = ''
  try { Assert-A1Tree $Root $Root $Root $ExpectedOwner $scan }
  catch { $actual = $_.Exception.Message }
  if (($Expected -eq '' -and $actual -ne '') -or
      ($Expected -ne '' -and $actual -notmatch $Expected)) { throw "TREE_FIXTURE_FAILURE: $Name ($actual)" }
  $results.Add(@{ name = $Name; expected = $Expected; observed = $actual; path = $Root; entries = $scan.Entries })
}

foreach ($name in @('Cache', 'Network', 'Shared Dictionary')) {
  $root = New-Tree ('positive-' + $name.Replace(' ', '-'))
  $nested = New-Nested $root $name
  $rules = @((Get-Acl -LiteralPath (Join-Path $nested 'data.fixture')).GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
  if (@($rules | Where-Object { $_.IdentityReference.Value -eq $sid.Value -and $_.IsInherited }).Count -eq 0) { throw 'INHERITANCE_NOT_OBSERVED' }
  Assert-TreeResult ('positive-' + $name) $root
}
foreach ($mode in @('foreign-allow', 'excess-capability', 'explicit-capability')) {
  $root = New-Tree $mode
  $nested = New-Nested $root
  $target = Join-Path $nested 'data.fixture'
  $acl = Get-Acl -LiteralPath $target
  $grantee = $sid
  $rights = 'Modify'
  if ($mode -eq 'foreign-allow') { $grantee = [Security.Principal.SecurityIdentifier]::new('S-1-1-0') }
  if ($mode -eq 'excess-capability') { $rights = 'FullControl' }
  $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($grantee, $rights, 'Allow'))
  Set-Acl -LiteralPath $target -AclObject $acl
  Assert-TreeResult $mode $root 'FOREIGN_PATH_ACCESS'
}
foreach ($name in @('Cache-other', 'Code Cache')) {
  $root = New-Tree ('lookalike-' + $name.Replace(' ', '-'))
  $nested = New-Nested $root $name
  $acl = Get-Acl -LiteralPath $nested
  $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid, 'Modify', 'Allow'))
  Set-Acl -LiteralPath $nested -AclObject $acl
  Assert-TreeResult ('lookalike-' + $name) $root 'FOREIGN_PATH_ACCESS'
}
$root = New-Tree 'junction'
$nested = New-Nested $root
$escape = New-Tree 'escape-target'
[IO.File]::WriteAllText((Join-Path $escape 'canary.fixture'), 'nonsecret escape canary')
$junction = Join-Path $nested 'escape'
$null = New-Item -ItemType Junction -Path $junction -Target $escape
Assert-TreeResult 'junction' $root 'REPARSE_PATH_DENIED'
if ([IO.File]::ReadAllText((Join-Path $escape 'canary.fixture')) -ne 'nonsecret escape canary') { throw 'ESCAPE_CANARY_CHANGED' }
# Unchanged content alone is not proof of no read. The packaged campaign needs
# an independent file-access observer for the target as well.
$root = New-Tree 'enumeration-denied'
$nested = New-Nested $root
$acl = Get-Acl -LiteralPath $nested
$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($owner, 'ListDirectory', 'Deny'))
Set-Acl -LiteralPath $nested -AclObject $acl
Assert-TreeResult 'enumeration-denied' $root '(?i)denied|refus|access'
$root = New-Tree 'depth-limit'
$nested = New-Nested $root
Assert-TreeResult 'depth-limit' $root 'BOUNDARY_SCAN_LIMIT' @{ MaximumDepth = 2 }
$root = New-Tree 'entry-limit'
$nested = New-Nested $root
Assert-TreeResult 'entry-limit' $root 'BOUNDARY_SCAN_LIMIT' @{ MaximumEntries = 2 }
$root = New-Tree 'time-limit'
$nested = New-Nested $root
Assert-TreeResult 'time-limit' $root 'BOUNDARY_SCAN_LIMIT' @{ MaximumMilliseconds = 0 }
$root = New-Tree 'owner-mismatch'
$nested = New-Nested $root
# This tests a real descriptor against a deliberately wrong expected owner;
# actual depth-two foreign ownership requires owner-operated privileged setup.
Assert-TreeResult 'owner-mismatch' $root 'WRONG_PATH_OWNER' @{} 'S-1-5-18'
@{ result = 'on-disk-tree-fixtures-pass'; cases = $results.ToArray(); preserved = $true;
   fixtureRoot = $base; limitation = 'Extracted functions; no packaged or privileged wrong-owner result' } | ConvertTo-Json -Depth 5 -Compress
