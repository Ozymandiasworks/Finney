# Executed only by guards.test.js after requireGuest('offline'). These are
# synthetic Windows ACL descriptors; no on-disk permissions are changed.
$ErrorActionPreference = 'Stop'
$inspector = 'C:\FinneyA1Lab\source\experimental\a1\app\inspect-boundary.ps1'
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile($inspector, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -ne 0) { throw 'INVALID_INSPECTOR_SYNTAX' }
$functions = @($ast.FindAll({ param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and
    $node.Name -eq 'Test-A1NetworkServiceAccess'
}, $true))
if ($functions.Count -ne 1) { throw 'ACL_POLICY_FUNCTION_NOT_UNIQUE' }
# Load the actual policy function without running the inspector's firewall or
# profile traversal. The packaged smoke separately exercises the complete path.
. ([scriptblock]::Create($functions[0].Extent.Text))

$sid = [Security.Principal.SecurityIdentifier]::new('S-1-15-3-1024-395641907-2340533657-1796656376-1949871151-3167452726-3934347287-2361051074-3061173417')
$root = 'C:\FinneyA1Lab\runtime\a1-userdata-xec-regtest-client-a'
$results = [Collections.Generic.List[string]]::new()

function New-FixtureRule {
  param(
    [Security.Principal.SecurityIdentifier]$Identity = $sid,
    [Security.AccessControl.FileSystemRights]$Rights = 'Modify',
    [Security.AccessControl.InheritanceFlags]$Inheritance = 'None',
    [Security.AccessControl.PropagationFlags]$Propagation = 'None',
    [Security.AccessControl.AccessControlType]$Type = 'Allow'
  )
  return [Security.AccessControl.FileSystemAccessRule]::new($Identity, $Rights, $Inheritance, $Propagation, $Type)
}

function Assert-Policy {
  param([string]$Name, [string]$Target, [bool]$Directory,
    [Security.AccessControl.FileSystemAccessRule]$Rule, [bool]$Expected)
  $actual = Test-A1NetworkServiceAccess -Target $Target -ProtectionRoot $root -IsDirectory $Directory -Rule $Rule
  if ($actual -isnot [bool] -or $actual -ne $Expected) { throw "ACL_POLICY_FAILURE: $Name" }
  $results.Add($Name)
}

$modify = New-FixtureRule
$inheritOnly = New-FixtureRule -Inheritance 'ContainerInherit, ObjectInherit' -Propagation 'InheritOnly'
foreach ($name in @('Cache', 'Network', 'Shared Dictionary')) {
  Assert-Policy "allow-$name-self" (Join-Path $root $name) $true $modify $true
  Assert-Policy "allow-$name-children" (Join-Path $root $name) $true $inheritOnly $true
  Assert-Policy "deny-$name-file" (Join-Path $root $name) $false $modify $false
}
foreach ($name in @('Local State', 'Code Cache', 'GPUCache', 'blob_storage',
    'Cache-other', 'Cache\child', 'other\Cache', 'Cache\..\Network')) {
  Assert-Policy "deny-location-$name" (Join-Path $root $name) $true $modify $false
}
foreach ($target in @('C:\FinneyA1Lab', 'C:\FinneyA1Lab\runtime', $root,
    'C:\FinneyA1Lab\profiles\xec-regtest\client-a',
    'C:\FinneyA1Lab\profiles\xec-regtest\client-a\profile.json',
    'C:\FinneyA1Lab\runtime\a1-userdata-xec-regtest-client-b\Cache',
    'C:\FinneyA1Lab\runtime\a1-userdata-xec-testnet-client-a\Cache')) {
  Assert-Policy "deny-outside-$target" $target $true $modify $false
}
foreach ($identity in @('S-1-1-0', 'S-1-15-2-1', 'S-1-15-3-1',
    'S-1-15-3-1024-395641907-2340533657-1796656376-1949871151-3167452726-3934347287-2361051074-3061173418')) {
  $foreign = New-FixtureRule -Identity ([Security.Principal.SecurityIdentifier]::new($identity))
  Assert-Policy "deny-identity-$identity" (Join-Path $root 'Cache') $true $foreign $false
}
foreach ($right in @('ChangePermissions', 'TakeOwnership', 'DeleteSubdirectoriesAndFiles', 'FullControl')) {
  $rights = [Security.AccessControl.FileSystemRights]::Modify -bor [Security.AccessControl.FileSystemRights]$right
  Assert-Policy "deny-right-$right" (Join-Path $root 'Cache') $true (New-FixtureRule -Rights $rights) $false
}
$descriptor = [Security.AccessControl.DirectorySecurity]::new()
$descriptor.SetSecurityDescriptorSddlForm("D:(A;ID;0x1301bf;;;$($sid.Value))")
$inherited = @($descriptor.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
if ($inherited.Count -ne 1 -or -not $inherited[0].IsInherited) { throw 'INVALID_INHERITED_FIXTURE' }
Assert-Policy 'deny-inherited-capability' (Join-Path $root 'Cache') $true $inherited[0] $false
Assert-Policy 'deny-rule-is-not-an-allowance' (Join-Path $root 'Cache') $true (New-FixtureRule -Type Deny) $false
Assert-Policy 'allow-windows-case-insensitivity' (Join-Path $root.ToUpperInvariant() 'CACHE') $true $modify $true

# Preserve raw generic bits through an ACL descriptor. Constructing a fixture
# only from FileSystemRights.Modify missed the actual Chromium inherit-only ACE.
function New-RawFixtureRule {
  param([string]$Mask = '0xe0010000', [string]$Flags = 'OICIIO', [string]$Identity = $sid.Value)
  $rawDescriptor = [Security.AccessControl.DirectorySecurity]::new()
  $rawDescriptor.SetSecurityDescriptorSddlForm("D:(A;$Flags;$Mask;;;$Identity)")
  $rawRules = @($rawDescriptor.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
  if ($rawRules.Count -ne 1) { throw 'INVALID_RAW_ACL_FIXTURE' }
  return $rawRules[0]
}
$genericChildren = New-RawFixtureRule
if ([int]$genericChildren.FileSystemRights -ne -536805376 -or $genericChildren.IsInherited -or
    $genericChildren.InheritanceFlags -ne [Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit' -or
    $genericChildren.PropagationFlags -ne [Security.AccessControl.PropagationFlags]::InheritOnly) {
  throw 'RAW_FIXTURE_DOES_NOT_MATCH_VM_EVIDENCE'
}
foreach ($name in @('Cache', 'Network', 'Shared Dictionary')) {
  Assert-Policy "allow-raw-generic-$name" (Join-Path $root $name) $true $genericChildren $true
  Assert-Policy "deny-raw-generic-file-$name" (Join-Path $root $name) $false $genericChildren $false
}
foreach ($target in @($root, (Join-Path $root 'Local State'), (Join-Path $root 'Code Cache'),
    'C:\FinneyA1Lab\profiles\xec-regtest\client-a\profile.json')) {
  Assert-Policy "deny-raw-generic-location-$target" $target $true $genericChildren $false
}
foreach ($mask in @('0x10000000', '0xf0010000', '0xe0050000', '0xe0090000',
    '0xe0010040', '0xe1010000', '0xe2010000')) {
  # GENERIC_ALL, generic rights plus WRITE_DAC/WRITE_OWNER/DELETE_CHILD,
  # ACCESS_SYSTEM_SECURITY, and MAXIMUM_ALLOWED must not enter the allowance.
  Assert-Policy "deny-raw-excess-$mask" (Join-Path $root 'Cache') $true (New-RawFixtureRule -Mask $mask) $false
}
foreach ($mask in @('0x80000000', '0x40000000', '0x20000000')) {
  Assert-Policy "allow-raw-subset-$mask" (Join-Path $root 'Cache') $true (New-RawFixtureRule -Mask $mask) $true
}
Assert-Policy 'deny-raw-foreign-capability' (Join-Path $root 'Cache') $true (New-RawFixtureRule -Identity 'S-1-15-3-1') $false
Assert-Policy 'deny-raw-inherited-capability' (Join-Path $root 'Cache') $true (New-RawFixtureRule -Flags 'OICIIOID') $false
@{ result = 'synthetic-acl-policy-pass'; cases = $results.Count } | ConvertTo-Json -Compress
