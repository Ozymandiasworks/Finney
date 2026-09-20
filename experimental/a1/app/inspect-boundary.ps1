param(
  [Parameter(Mandatory = $true)][ValidateSet('xec-testnet','xec-regtest')][string]$Network,
  [Parameter(Mandatory = $true)][ValidateSet('client-a','client-b')][string]$Profile
)
$ErrorActionPreference = 'Stop'
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
        if ($rule.IdentityReference.Value -notin $allowedSids) { throw 'FOREIGN_PATH_ACCESS' }
        if ($rule.IdentityReference.Value -eq $ownerSid -and
            ($rule.FileSystemRights -band [Security.AccessControl.FileSystemRights]::Modify) -eq
              [Security.AccessControl.FileSystemRights]::Modify) { $allowsOwner = $true }
      }
    }
    if (-not $allowsOwner) { throw 'OWNER_ACCESS_UNAVAILABLE' }
  }
  $firewall = @(Get-NetFirewallProfile -PolicyStore ActiveStore)
  if ($firewall.Count -ne 3 -or @($firewall | Where-Object {
    -not $_.Enabled -or $_.DefaultOutboundAction -ne 'Block'
  }).Count -ne 0) { throw 'EGRESS_NOT_DENIED' }
  $outboundAllow = @(Get-NetFirewallRule -PolicyStore ActiveStore -Enabled True -Direction Outbound -Action Allow)
  if ($outboundAllow.Count -ne 0) { throw 'OUTBOUND_ALLOW_RULE_PRESENT' }
  @{ version = 1; ownerSid = $ownerSid; profileRoot = $profileRoot;
     outbound = 'block'; outboundAllowRules = 0 } | ConvertTo-Json -Compress
} catch {
  [Console]::Error.WriteLine('BOUNDARY_UNVERIFIED')
  exit 1
}
