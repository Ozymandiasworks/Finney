const fs = require('fs')
const path = require('path')
const { LAB_ROOT, refuse } = require('./app/policy')

function requireGuest(phase) {
  if (process.platform !== 'win32' || process.arch !== 'x64') refuse('WINDOWS_X64_GUEST_REQUIRED')
  const root = fs.realpathSync.native(path.resolve(__dirname, '../..'))
  const expected = path.win32.join(LAB_ROOT, 'source')
  if (root.toLowerCase() !== expected.toLowerCase()) refuse('ISOLATED_CHECKOUT_REQUIRED')
  const filename = path.win32.join(LAB_ROOT, 'execution-approval.json')
  const stat = fs.lstatSync(filename)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16384) refuse('ISOLATION_EVIDENCE_REQUIRED')
  const evidence = JSON.parse(fs.readFileSync(filename, 'utf8'))
  if (evidence.version !== 1 || evidence.phase !== phase || evidence.platform !== 'windows-x64' ||
      evidence.disposable !== true || evidence.personalDataPresent !== false ||
      evidence.hostCredentialsPresent !== false || evidence.sharedClipboard !== false ||
      !Array.isArray(evidence.sensitiveMounts) || evidence.sensitiveMounts.length !== 0 ||
      typeof evidence.evidenceDirectory !== 'string' ||
      evidence.evidenceDirectory !== path.win32.join(LAB_ROOT, 'evidence') ||
      typeof evidence.ownerApproval !== 'string' || evidence.ownerApproval.trim().length < 1) {
    refuse('ISOLATION_EVIDENCE_REQUIRED')
  }
  if (!fs.statSync(evidence.evidenceDirectory).isDirectory()) refuse('ISOLATION_EVIDENCE_REQUIRED')
  if (phase === 'offline') require('./app/profile').inspectBoundary('xec-testnet', 'client-a')
  return evidence
}

module.exports = { requireGuest }
