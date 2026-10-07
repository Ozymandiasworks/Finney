param(
  [Parameter(Mandatory = $true)][ValidateSet('xec-testnet','xec-regtest')][string]$Network,
  [Parameter(Mandatory = $true)][ValidateSet('client-a','client-b')][string]$Profile
)
$ErrorActionPreference = 'Stop'

function Convert-A1FileRights {
  param([int]$Mask)
  $specific = $Mask -band 0x1fffffff
  if (($Mask -band [int]::MinValue) -ne 0) { $specific = $specific -bor 0x120089 }
  if (($Mask -band 0x40000000) -ne 0) { $specific = $specific -bor 0x120116 }
  if (($Mask -band 0x20000000) -ne 0) { $specific = $specific -bor 0x1200a0 }
  return $specific
}

function Test-A1NetworkServiceAccess {
  param(
    [string]$Target,
    [string]$ProtectionRoot,
    [bool]$IsDirectory,
    [Security.AccessControl.FileSystemAccessRule]$Rule,
    [Security.AccessControl.FileSystemAccessRule[]]$ParentRules = @()
  )
  # Electron 44.3.0 / Chromium 152: lpacContentNetworkService. This is a
  # directory-scoped compatibility allowance, never a general capability grant.
  $networkServiceSid = 'S-1-15-3-1024-395641907-2340533657-1796656376-1949871151-3167452726-3934347287-2361051074-3061173417'
  if ($Rule.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or
      $Rule.IdentityReference.Value -ne $networkServiceSid) { return $false }
  $networkDirectories = @(
    (Join-Path $ProtectionRoot 'Cache'),
    (Join-Path $ProtectionRoot 'Network'),
    (Join-Path $ProtectionRoot 'Shared Dictionary')
  )
  if ($Target -ne [IO.Path]::GetFullPath($Target) -or
      $Target -match '[\\/]\.\.?([\\/]|$)') { return $false }
  # Inherit-only ACEs can retain GENERIC_READ/WRITE/EXECUTE instead of their
  # file-specific expansion. Each expands within Modify plus Synchronize for
  # files/directories. 0xE0000000 as signed Int32; GENERIC_ALL is excluded.
  $genericReadWriteExecute = -536870912
  # .NET includes Synchronize in Allow rules. No ChangePermissions, TakeOwnership,
  # DeleteSubdirectoriesAndFiles, or other rights beyond Modify are accepted.
  $maximumRights = [int][Security.AccessControl.FileSystemRights]::Modify -bor
    [int][Security.AccessControl.FileSystemRights]::Synchronize -bor $genericReadWriteExecute
  if (([int]$Rule.FileSystemRights -band (-bnot $maximumRights)) -ne 0) { return $false }
  if ($Target -in $networkDirectories) { return ($IsDirectory -and -not $Rule.IsInherited) }
  $inside = @($networkDirectories | Where-Object {
    $Target.StartsWith($_ + '\', [StringComparison]::OrdinalIgnoreCase)
  })
  if ($inside.Count -ne 1 -or -not $Rule.IsInherited) { return $false }
  $inheritOnly = [Security.AccessControl.PropagationFlags]::InheritOnly
  $noPropagate = [Security.AccessControl.PropagationFlags]::NoPropagateInherit
  $objectInherit = [Security.AccessControl.InheritanceFlags]::ObjectInherit
  $containerInherit = [Security.AccessControl.InheritanceFlags]::ContainerInherit
  $childRights = Convert-A1FileRights ([int]$Rule.FileSystemRights)
  # ParentRules comes only from the inspected immediate parent, never from a
  # caller-supplied ancestor or a path reached through a reparse point.
  foreach ($parent in $ParentRules) {
    if ($parent.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or
        $parent.IdentityReference.Value -ne $networkServiceSid) { continue }
    $parentRights = Convert-A1FileRights ([int]$parent.FileSystemRights)
    if (($childRights -band (-bnot $parentRights)) -ne 0) { continue }
    if (-not $IsDirectory) {
      if (($parent.InheritanceFlags -band $objectInherit) -ne 0 -and
          $Rule.InheritanceFlags -eq 0 -and $Rule.PropagationFlags -eq 0) { return $true }
      continue
    }
    if ($parent.InheritanceFlags -eq 0) { continue }
    if (($parent.PropagationFlags -band $noPropagate) -ne 0 -and
        ($Rule.InheritanceFlags -ne 0 -or ($Rule.PropagationFlags -band $inheritOnly) -ne 0)) { continue }
    if (($Rule.InheritanceFlags -band (-bnot [int]$parent.InheritanceFlags)) -ne 0) { continue }
    if (($Rule.PropagationFlags -band $inheritOnly) -ne 0) {
      if ($Rule.InheritanceFlags -ne 0) { return $true }
    } elseif (($parent.InheritanceFlags -band $containerInherit) -ne 0) { return $true }
  }
  return $false
}

function Assert-A1ScanBudget {
  param([hashtable]$Scan, [int]$Depth = 0)
  if ($Depth -gt $Scan.MaximumDepth -or $Scan.Entries -gt $Scan.MaximumEntries -or
      $Scan.Clock.ElapsedMilliseconds -ge $Scan.MaximumMilliseconds) { throw 'BOUNDARY_SCAN_LIMIT' }
}

function Get-A1Children {
  param([string]$Target, [hashtable]$Scan)
  Assert-A1ScanBudget $Scan
  $children = [Collections.Generic.List[string]]::new()
  $iterator = [IO.Directory]::EnumerateFileSystemEntries($Target).GetEnumerator()
  try {
    while ($iterator.MoveNext()) {
      $Scan.Entries++
      Assert-A1ScanBudget $Scan
      $child = $iterator.Current
      if ([IO.Path]::GetDirectoryName($child) -ne $Target -or
          [IO.Path]::GetFullPath($child) -ne $child) { throw 'INVALID_CHILD_PATH' }
      $children.Add($child)
    }
  } finally { $iterator.Dispose() }
  Assert-A1ScanBudget $Scan
  return $children.ToArray()
}

function Get-A1CheckedEntry {
  param([string]$Target, [string]$ProtectionRoot, [string]$LabRoot, [string]$OwnerSid,
    [hashtable]$Scan, [Security.AccessControl.FileSystemAccessRule[]]$ParentRules = @())
  Assert-A1ScanBudget $Scan
  $item = Get-Item -LiteralPath $Target -Force -ErrorAction Stop
  if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'REPARSE_PATH_DENIED' }
  $acl = Get-Acl -LiteralPath $Target -ErrorAction Stop
  if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $OwnerSid) { throw 'WRONG_PATH_OWNER' }
  if ($Target -eq $LabRoot -and -not $acl.AreAccessRulesProtected) { throw 'UNPROTECTED_LAB_ROOT' }
  $rules = @($acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
  $allowsOwner = $false
  foreach ($rule in $rules) {
    Assert-A1ScanBudget $Scan
    if ($rule.AccessControlType -eq [Security.AccessControl.AccessControlType]::Allow) {
      if ($rule.IdentityReference.Value -notin @($OwnerSid, 'S-1-5-18', 'S-1-5-32-544') -and
          -not (Test-A1NetworkServiceAccess -Target $Target -ProtectionRoot $ProtectionRoot `
            -IsDirectory $item.PSIsContainer -Rule $rule -ParentRules $ParentRules)) { throw 'FOREIGN_PATH_ACCESS' }
      if ($rule.IdentityReference.Value -eq $OwnerSid -and
          ($rule.PropagationFlags -band [Security.AccessControl.PropagationFlags]::InheritOnly) -eq 0 -and
          ($rule.FileSystemRights -band [Security.AccessControl.FileSystemRights]::Modify) -eq
            [Security.AccessControl.FileSystemRights]::Modify) { $allowsOwner = $true }
    }
  }
  if (-not $allowsOwner) { throw 'OWNER_ACCESS_UNAVAILABLE' }
  Assert-A1ScanBudget $Scan
  return @{ Directory = [bool]$item.PSIsContainer; Rules = $rules }
}

function Assert-A1Tree {
  param([string]$Target, [string]$ProtectionRoot, [string]$LabRoot, [string]$OwnerSid,
    [hashtable]$Scan, [int]$Depth = 0,
    [Security.AccessControl.FileSystemAccessRule[]]$ParentRules = @())
  Assert-A1ScanBudget $Scan $Depth
  $entry = Get-A1CheckedEntry $Target $ProtectionRoot $LabRoot $OwnerSid $Scan $ParentRules
  if ($Depth -eq 0 -and -not $entry.Directory) { throw 'DIRECTORY_REQUIRED' }
  # Metadata, reparse and ACL admission precede enumeration at every depth.
  if ($entry.Directory) {
    foreach ($child in @(Get-A1Children $Target $Scan)) {
      Assert-A1Tree $child $ProtectionRoot $LabRoot $OwnerSid $Scan ($Depth + 1) $entry.Rules
    }
  }
  Assert-A1ScanBudget $Scan $Depth
}

function Assert-A1FirewallBoundary {
  # Pass Stop explicitly to module cmdlets; a provider error is never evidence
  # of an empty rule set. Enabled is an enum, not a PowerShell Boolean.
  $firewall = @(Get-NetFirewallProfile -PolicyStore ActiveStore -ErrorAction Stop)
  if ($firewall.Count -ne 3 -or @($firewall | Where-Object {
    $_.Enabled -ne 'True' -or $_.DefaultOutboundAction -ne 'Block'
  }).Count -ne 0) { throw 'EGRESS_NOT_DENIED' }
  # A provider-side ByQuery search can emit ObjectNotFound for zero matches.
  # Enumerate successfully first, then filter locally so zero is unambiguous.
  $rules = @(Get-NetFirewallRule -PolicyStore ActiveStore -ErrorAction Stop)
  $outboundAllow = @($rules | Where-Object {
    $_.Enabled -eq 'True' -and $_.Direction -eq 'Outbound' -and $_.Action -eq 'Allow'
  })
  if ($outboundAllow.Count -ne 0) { throw 'OUTBOUND_ALLOW_RULE_PRESENT' }
}

try {
  $scan = @{ Clock = [Diagnostics.Stopwatch]::StartNew(); Entries = 0;
    MaximumDepth = 32; MaximumEntries = 4096; MaximumMilliseconds = 6000 }
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $ownerSid = $identity.User.Value
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'ELEVATED_EXECUTION_DENIED'
  }
  $root = 'C:\FinneyA1Lab'
  $profileRoot = Join-Path (Join-Path (Join-Path $root 'profiles') $Network) $Profile
  $paths = @($root, (Join-Path $root 'runtime'), (Join-Path $root 'profiles'), (Join-Path (Join-Path $root 'profiles') $Network))
  $protectionRoot = Join-Path (Join-Path $root 'runtime') "a1-userdata-$Network-$Profile"
  foreach ($target in $paths) {
    $entry = Get-A1CheckedEntry $target $protectionRoot $root $ownerSid $scan
    if (-not $entry.Directory) { throw 'DIRECTORY_REQUIRED' }
  }
  foreach ($optional in @($protectionRoot, $profileRoot)) {
    # Enumerate a verified parent: inaccessible is not the same as absent.
    $children = @(Get-A1Children ([IO.Path]::GetDirectoryName($optional)) $scan)
    if ($optional -in $children) { Assert-A1Tree $optional $protectionRoot $root $ownerSid $scan }
  }
  Assert-A1FirewallBoundary
  Assert-A1ScanBudget $scan
  @{ version = 1; ownerSid = $ownerSid; profileRoot = $profileRoot;
     outbound = 'block'; outboundAllowRules = 0 } | ConvertTo-Json -Compress
} catch {
  [Console]::Error.WriteLine('BOUNDARY_UNVERIFIED')
  exit 1
}
