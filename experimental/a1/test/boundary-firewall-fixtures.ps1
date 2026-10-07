# Executed only by guards.test.js after requireGuest('offline'). The actual
# policy function runs against a mock module; no firewall settings are changed.
$ErrorActionPreference = 'Stop'
$inspector = 'C:\FinneyA1Lab\source\experimental\a1\app\inspect-boundary.ps1'
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile($inspector, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -ne 0) { throw 'INVALID_INSPECTOR_SYNTAX' }
$functions = @($ast.FindAll({ param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and
    $node.Name -eq 'Assert-A1FirewallBoundary'
}, $true))
if ($functions.Count -ne 1) { throw 'FIREWALL_POLICY_FUNCTION_NOT_UNIQUE' }
. ([scriptblock]::Create($functions[0].Extent.Text))

# A separate module scope with Continue reproduces the important difference
# between ambient preference and an explicit -ErrorAction Stop at the caller.
$provider = New-Module -ScriptBlock {
  $ErrorActionPreference = 'Continue'
  $fixture = $null
  function Set-A1FirewallFixture {
    param($Value)
    $script:fixture = $Value
  }
  function Get-NetFirewallProfile {
    [CmdletBinding()]
    param([string]$PolicyStore)
    if ($PolicyStore -ne 'ActiveStore') { throw 'WRONG_POLICY_STORE' }
    if ($script:fixture.Fault -eq 'profiles-partial') { $script:fixture.Profiles }
    if ($script:fixture.Fault -like 'profiles*') { Write-Error 'PROFILE_QUERY_FAILED' }
    $script:fixture.Profiles
  }
  function Get-NetFirewallRule {
    [CmdletBinding()]
    param([string]$PolicyStore)
    if ($PolicyStore -ne 'ActiveStore') { throw 'WRONG_POLICY_STORE' }
    if ($script:fixture.Fault -eq 'rules-partial') { $script:fixture.Rules }
    if ($script:fixture.Fault -like 'rules*') { Write-Error 'RULE_QUERY_FAILED' }
    $script:fixture.Rules
  }
  Export-ModuleMember -Function Set-A1FirewallFixture, Get-NetFirewallProfile, Get-NetFirewallRule
}
Import-Module $provider -Force
$healthy = @('Domain', 'Private', 'Public' | ForEach-Object {
  [pscustomobject]@{ Name = $_; Enabled = 'True'; DefaultOutboundAction = 'Block' }
})
$benign = @(
  [pscustomobject]@{ Enabled = 'True'; Direction = 'Inbound'; Action = 'Allow' },
  [pscustomobject]@{ Enabled = 'False'; Direction = 'Outbound'; Action = 'Allow' },
  [pscustomobject]@{ Enabled = 'True'; Direction = 'Outbound'; Action = 'Block' }
)
$results = [Collections.Generic.List[string]]::new()
function Assert-FirewallCase {
  param([string]$Name, [object[]]$Profiles = $healthy, [object[]]$Rules = @(),
    [string]$Fault = '', [string]$Expected = '')
  Set-A1FirewallFixture ([pscustomobject]@{ Profiles = $Profiles; Rules = $Rules; Fault = $Fault })
  $failure = ''
  $output = @()
  try { $output = @(Assert-A1FirewallBoundary) } catch { $failure = $_.Exception.Message }
  if ($failure -ne $Expected -or $output.Count -ne 0) {
    throw "FIREWALL_POLICY_FAILURE: $Name; expected=$Expected; actual=$failure"
  }
  $results.Add($Name)
}
try {
  Assert-FirewallCase 'successful-empty-enumeration'
  Assert-FirewallCase 'no-enabled-outbound-allow' -Rules $benign
  $allow = [pscustomobject]@{ Enabled = 'True'; Direction = 'Outbound'; Action = 'Allow' }
  Assert-FirewallCase 'reject-enabled-outbound-allow' -Rules ($benign + $allow) -Expected 'OUTBOUND_ALLOW_RULE_PRESENT'
  foreach ($name in @('Domain', 'Private', 'Public')) {
    $disabled = @($healthy | ForEach-Object {
      [pscustomobject]@{ Name = $_.Name; Enabled = $(if ($_.Name -eq $name) { 'False' } else { 'True' }); DefaultOutboundAction = 'Block' }
    })
    Assert-FirewallCase "reject-disabled-$name" -Profiles $disabled -Expected 'EGRESS_NOT_DENIED'
  }
  $unknown = [pscustomobject]@{ Name = 'Public'; Enabled = 'NotConfigured'; DefaultOutboundAction = 'Block' }
  Assert-FirewallCase 'reject-unconfigured-profile' -Profiles @($healthy[0], $healthy[1], $unknown) -Expected 'EGRESS_NOT_DENIED'
  $open = [pscustomobject]@{ Name = 'Public'; Enabled = 'True'; DefaultOutboundAction = 'Allow' }
  Assert-FirewallCase 'reject-outbound-default-allow' -Profiles @($healthy[0], $healthy[1], $open) -Expected 'EGRESS_NOT_DENIED'
  Assert-FirewallCase 'reject-incomplete-profile-read' -Profiles @($healthy[0], $healthy[1]) -Expected 'EGRESS_NOT_DENIED'
  Assert-FirewallCase 'reject-profile-read-error' -Fault 'profiles' -Expected 'PROFILE_QUERY_FAILED'
  Assert-FirewallCase 'reject-rule-read-error' -Fault 'rules' -Expected 'RULE_QUERY_FAILED'
  Assert-FirewallCase 'reject-partial-rule-read' -Rules $benign -Fault 'rules-partial' -Expected 'RULE_QUERY_FAILED'
  Assert-FirewallCase 'reject-partial-profile-read' -Fault 'profiles-partial' -Expected 'PROFILE_QUERY_FAILED'
  @{ result = 'synthetic-firewall-policy-pass'; cases = $results.Count } | ConvertTo-Json -Compress
} finally {
  Remove-Module $provider
}
