const LAB_ROOT = 'C:\\FinneyA1Lab'
const NETWORKS = Object.freeze(['xec-testnet', 'xec-regtest'])
const PROFILES = Object.freeze(['client-a', 'client-b'])
const SHELL_URL = 'finney-offline://shell/index.html'
const STYLE_URL = 'finney-offline://shell/shell.css'

class GuardError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

function refuse(code) {
  throw new GuardError(code)
}

function exactKeys(value, keys, code) {
  if (
    !value || Array.isArray(value) || typeof value !== 'object' ||
    Object.keys(value).sort().join(',') !== [...keys].sort().join(',')
  ) refuse(code)
}

function parseRecord(raw, maximum = 4096) {
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > maximum) {
    refuse('INVALID_RECORD')
  }
  let record
  try { record = JSON.parse(raw) } catch { refuse('CORRUPT_RECORD') }
  if (JSON.stringify(record) !== raw.trim()) refuse('NONCANONICAL_RECORD')
  return record
}

function validateConfig(value) {
  exactKeys(value, ['version', 'stage', 'network', 'endpointPolicy', 'indexer',
    'relay', 'registry', 'broadcast', 'activation'], 'INVALID_CONFIGURATION')
  if (value.version !== 1) refuse('UNSUPPORTED_CONFIGURATION')
  if (!NETWORKS.includes(value.network)) refuse('WRONG_NETWORK')
  if (value.stage !== 'A1' || value.endpointPolicy !== 'deny-all-v1' ||
      value.activation !== false || value.indexer !== null ||
      value.relay !== null || value.registry !== null || value.broadcast !== null) {
    refuse('NETWORK_NOT_AUTHORIZED')
  }
  return Object.freeze({ ...value })
}

function validateLaunch(argv, environment) {
  for (const key of Object.keys(environment)) {
    if (/^(FINNEY_|ELECTRON_|NODE_|CHROME_|CHROMIUM_)/.test(key.toUpperCase())) {
      refuse('ENVIRONMENT_OVERRIDE_DENIED')
    }
  }
  if (!Array.isArray(argv) || argv.length < 1 || argv.length > 2) {
    refuse('INVALID_LAUNCH')
  }
  const profileArgs = argv.filter(value => /^--profile=client-[ab]$/.test(value))
  const create = argv.includes('--create-profile')
  if (profileArgs.length !== 1 || argv.length !== (create ? 2 : 1)) {
    refuse('INVALID_LAUNCH')
  }
  return Object.freeze({ profile: profileArgs[0].slice(10), create })
}

function validateIdentity(network, profile, ownerSid) {
  if (!NETWORKS.includes(network)) refuse('WRONG_NETWORK')
  if (!PROFILES.includes(profile)) refuse('INVALID_PROFILE')
  if (typeof ownerSid !== 'string' || !/^S-1-5-21-(\d+-){3}\d+$/.test(ownerSid)) {
    refuse('INVALID_OWNER')
  }
  return { version: 1, purpose: 'finney-a1-offline', network, profile, ownerSid }
}

function validateMarkerHeader(record, expected) {
  exactKeys(record, ['version', 'purpose', 'network', 'profile', 'ownerSid', 'proof'],
    'INVALID_PROFILE_RECORD')
  if (record.version !== 1) refuse('UNSUPPORTED_PROFILE')
  if (record.network !== expected.network) refuse('FOREIGN_NETWORK_PROFILE')
  for (const key of ['purpose', 'profile', 'ownerSid']) {
    if (record[key] !== expected[key]) refuse('FOREIGN_PROFILE')
  }
  if (typeof record.proof !== 'string' || record.proof.length > 3072 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(record.proof)) refuse('INVALID_PROFILE_PROOF')
  const proof = Buffer.from(record.proof, 'base64')
  if (proof.toString('base64') !== record.proof) refuse('INVALID_PROFILE_PROOF')
  return proof
}

function validateMarker(record, expected, safeStorage) {
  const proof = validateMarkerHeader(record, expected)
  if (!safeStorage.isEncryptionAvailable()) refuse('PROTECTION_UNAVAILABLE')
  let plaintext
  try { plaintext = safeStorage.decryptString(proof) } catch { refuse('PROFILE_LOCKED') }
  if (plaintext !== JSON.stringify(expected)) refuse('FOREIGN_PROFILE')
}

function requestAllowed(url, method, resourceType) {
  return method === 'GET' && (
    (url === SHELL_URL && resourceType === 'mainFrame') ||
    (url === STYLE_URL && resourceType === 'stylesheet')
  )
}

function denyCapability() {
  refuse('CAPABILITY_NOT_ACTIVATED')
}

module.exports = { LAB_ROOT, NETWORKS, PROFILES, SHELL_URL, STYLE_URL, GuardError,
  refuse, exactKeys, parseRecord, validateConfig, validateLaunch, validateIdentity,
  validateMarkerHeader, validateMarker, requestAllowed, denyCapability }
