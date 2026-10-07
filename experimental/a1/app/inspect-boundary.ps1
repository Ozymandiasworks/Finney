param(
  [Parameter(Mandatory = $true)][ValidateSet('xec-testnet','xec-regtest')][string]$Network,
  [Parameter(Mandatory = $true)][ValidateSet('client-a','client-b')][string]$Profile
)
$ErrorActionPreference = 'Stop'

function Test-A1NetworkServiceAccess {
  param(
    [string]$Target,
    [string]$ProtectionRoot,
    [bool]$IsDirectory,
    [Security.AccessControl.FileSystemAccessRule]$Rule
  )
  # Electron 44.3.0 / Chromium 152: lpacContentNetworkService. This is a
  # directory-scoped compatibility allowance, never a general capability grant.
  $networkServiceSid = 'S-1-15-3-1024-395641907-2340533657-1796656376-1949871151-3167452726-3934347287-2361051074-3061173417'
  if (-not $IsDirectory -or $Rule.IsInherited -or
      $Rule.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or
      $Rule.IdentityReference.Value -ne $networkServiceSid) { return $false }
  $networkDirectories = @(
    (Join-Path $ProtectionRoot 'Cache'),
    (Join-Path $ProtectionRoot 'Network'),
    (Join-Path $ProtectionRoot 'Shared Dictionary')
  )
  if ($Target -notin $networkDirectories) { return $false }
  # Inherit-only ACEs can retain GENERIC_READ/WRITE/EXECUTE instead of their
  # file-specific expansion. Each expands within Modify plus Synchronize for
  # files/directories. 0xE0000000 as signed Int32; GENERIC_ALL is excluded.
  $genericReadWriteExecute = -536870912
  # .NET includes Synchronize in Allow rules. No ChangePermissions, TakeOwnership,
  # DeleteSubdirectoriesAndFiles, or other rights beyond Modify are accepted.
  $maximumRights = [int][Security.AccessControl.FileSystemRights]::Modify -bor
    [int][Security.AccessControl.FileSystemRights]::Synchronize -bor $genericReadWriteExecute
  return (([int]$Rule.FileSystemRights -band (-bnot $maximumRights)) -eq 0)
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
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $ownerSid = $identity.User.Value
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'ELEVATED_EXECUTION_DENIED'
  }
  $allowedSids = @($ownerSid, 'S-1-5-18', 'S-1-5-32-544')
  $root = 'C:\FinneyA1Lab'
  $profileRoot = Join-Path (Join-Path (Join-Path $root 'profiles') $Network) $Profile
  $paths = @($root, (Join-Path $root 'runtime'), (Join-Path $root 'profiles'), (Join-Path (Join-Path $root 'profiles') $Network))
  $protectionRoot = Join-Path (Join-Path $root 'runtime') "a1-userdata-$Network-$Profile"
  if (Test-Path -LiteralPath $protectionRoot) {
    $paths += $protectionRoot
    $paths += @(Get-ChildItem -LiteralPath $protectionRoot -Force | ForEach-Object { $_.FullName })
  }
  if (Test-Path -LiteralPath $profileRoot) {
    $paths += $profileRoot
    $paths += @(Get-ChildItem -LiteralPath $profileRoot -Force | ForEach-Object { $_.FullName })
  }
  foreach ($target in $paths) {
    $item = Get-Item -LiteralPath $target -Force
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
      throw 'REPARSE_PATH_DENIED'
    }
    $acl = Get-Acl -LiteralPath $target
    if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $ownerSid) {
      throw 'WRONG_PATH_OWNER'
    }
    if ($target -eq $root -and -not $acl.AreAccessRulesProtected) {
      throw 'UNPROTECTED_LAB_ROOT'
    }
    $allowsOwner = $false
    foreach ($rule in $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {
      if ($rule.AccessControlType -eq [Security.AccessControl.AccessControlType]::Allow) {
        if ($rule.IdentityReference.Value -notin $allowedSids -and
            -not (Test-A1NetworkServiceAccess -Target $target -ProtectionRoot $protectionRoot `
              -IsDirectory $item.PSIsContainer -Rule $rule)) { throw 'FOREIGN_PATH_ACCESS' }
        if ($rule.IdentityReference.Value -eq $ownerSid -and
            ($rule.FileSystemRights -band [Security.AccessControl.FileSystemRights]::Modify) -eq
              [Security.AccessControl.FileSystemRights]::Modify) { $allowsOwner = $true }
      }
    }
    if (-not $allowsOwner) { throw 'OWNER_ACCESS_UNAVAILABLE' }
  }
  Assert-A1FirewallBoundary
  @{ version = 1; ownerSid = $ownerSid; profileRoot = $profileRoot;
     outbound = 'block'; outboundAllowRules = 0 } | ConvertTo-Json -Compress
} catch {
  [Console]::Error.WriteLine('BOUNDARY_UNVERIFIED')
  exit 1
}
