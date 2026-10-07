# Synthetic I/O faults around the actual traversal. No on-disk/provider claim.
$ErrorActionPreference = 'Stop'
if ($PSScriptRoot -ne 'C:\FinneyA1Lab\source\experimental\a1\test') { throw 'ISOLATED_CHECKOUT_REQUIRED' }
$tokens = $null
$errors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot '..\app\inspect-boundary.ps1'), [ref]$tokens, [ref]$errors)
if ($errors.Count -ne 0) { throw 'INVALID_INSPECTOR_SYNTAX' }
$names = @('Convert-A1FileRights', 'Test-A1NetworkServiceAccess', 'Assert-A1ScanBudget', 'Get-A1CheckedEntry', 'Assert-A1Tree')
$functions = @($ast.FindAll({ param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -in $names
}, $true))
if ($functions.Count -ne $names.Count) { throw 'INSPECTOR_FUNCTIONS_MISSING' }
foreach ($definition in $functions) { . ([scriptblock]::Create($definition.Extent.Text)) }
$root = 'C:\FinneyA1Lab\runtime\a1-userdata-xec-regtest-client-a'
$nested = "$root\Cache\nested"
$leaf = "$nested\data"
$owner = [Security.Principal.SecurityIdentifier]::new('S-1-5-21-1-2-3-1001')
$results = [Collections.Generic.List[object]]::new()

function Get-Item {
  [CmdletBinding()]param([string]$LiteralPath, [switch]$Force)
  $script:visited.Add($LiteralPath)
  if ($LiteralPath -eq $nested -and $script:mode -eq 'metadata') { throw 'METADATA_UNAVAILABLE' }
  $attributes = [IO.FileAttributes]::Directory
  if ($LiteralPath -eq $nested -and $script:mode -eq 'reparse') { $attributes = $attributes -bor [IO.FileAttributes]::ReparsePoint }
  return @{ Attributes = $attributes; PSIsContainer = ($LiteralPath -ne $leaf) }
}
function Get-Acl {
  [CmdletBinding()]param([string]$LiteralPath)
  $script:aclReads.Add($LiteralPath)
  if ($LiteralPath -eq $leaf -and $script:mode -eq 'acl') { throw 'ACL_UNAVAILABLE' }
  $acl = [Security.AccessControl.DirectorySecurity]::new()
  $acl.SetOwner($owner)
  $acl.SetAccessRuleProtection($true, $false)
  $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($owner, 'Modify', 'Allow'))
  if ($LiteralPath -eq $leaf -and $script:mode -eq 'owner') { $acl.SetOwner([Security.Principal.SecurityIdentifier]::new('S-1-5-18')) }
  if ($LiteralPath -eq $leaf -and $script:mode -eq 'foreign') {
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-1-0'), 'Read', 'Allow'))
  }
  if ($LiteralPath -eq $leaf -and $script:mode -eq 'inherit-only-owner') {
    $acl = [Security.AccessControl.DirectorySecurity]::new()
    $acl.SetOwner($owner)
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($owner, 'Modify', 'ContainerInherit, ObjectInherit', 'InheritOnly', 'Allow'))
  }
  return $acl
}
function Get-A1Children {
  param([string]$Target, [hashtable]$Scan)
  $script:enumerated.Add($Target)
  if ($Target -eq $nested) {
    if ($script:mode -eq 'enumeration') { throw 'ENUMERATION_UNAVAILABLE' }
    if ($script:mode -eq 'partial') { Write-Output $leaf; throw 'PARTIAL_ENUMERATION' }
    if ($script:mode -eq 'elapsed') { $Scan.Clock.ElapsedMilliseconds = 6000 }
    if ($script:mode -eq 'entries') { $Scan.Entries = 4097 }
    return $leaf
  }
  if ($Target -eq $root) { return "$root\Cache" }
  if ($Target -eq "$root\Cache") { return $nested }
  throw 'UNEXPECTED_ENUMERATION'
}
$expected = [ordered]@{ positive = ''; metadata = 'METADATA_UNAVAILABLE'; acl = 'ACL_UNAVAILABLE';
  owner = 'WRONG_PATH_OWNER'; foreign = 'FOREIGN_PATH_ACCESS'; 'inherit-only-owner' = 'OWNER_ACCESS_UNAVAILABLE';
  reparse = 'REPARSE_PATH_DENIED'; enumeration = 'ENUMERATION_UNAVAILABLE'; partial = 'PARTIAL_ENUMERATION';
  elapsed = 'BOUNDARY_SCAN_LIMIT'; entries = 'BOUNDARY_SCAN_LIMIT'; depth = 'BOUNDARY_SCAN_LIMIT' }
foreach ($name in $expected.Keys) {
  $script:mode = $name
  $script:visited = [Collections.Generic.List[string]]::new()
  $script:aclReads = [Collections.Generic.List[string]]::new()
  $script:enumerated = [Collections.Generic.List[string]]::new()
  $scan = @{ Clock = [pscustomobject]@{ ElapsedMilliseconds = 0 }; Entries = 0;
    MaximumDepth = 32; MaximumEntries = 4096; MaximumMilliseconds = 6000 }
  if ($name -eq 'depth') { $scan.MaximumDepth = 1 }
  $actual = ''
  try { Assert-A1Tree $root $root 'C:\FinneyA1Lab' $owner.Value $scan }
  catch { $actual = $_.Exception.Message }
  if ($actual -ne $expected[$name]) { throw "WALK_FIXTURE_FAILURE: $name ($actual)" }
  if ($name -eq 'positive' -and $script:visited.Count -ne 4) { throw 'DESCENDANT_NOT_INSPECTED' }
  if ($name -eq 'reparse' -and ($script:enumerated.Contains($nested) -or $script:aclReads.Contains($nested))) { throw 'REPARSE_TARGET_ACCESSED' }
  if ($name -eq 'partial' -and $script:visited.Contains($leaf)) { throw 'PARTIAL_SCAN_ACCEPTED' }
  $results.Add(@{ name = $name; observed = $actual })
}
@{ result = 'synthetic-walk-faults-pass'; cases = $results.ToArray() } | ConvertTo-Json -Depth 4 -Compress
