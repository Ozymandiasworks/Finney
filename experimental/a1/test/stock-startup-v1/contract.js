const path = require('path')
const crypto = require('crypto')
const fs = require('fs')
const matrixBytes = fs.readFileSync(path.join(__dirname, '../../../../docs/a1-offline/stock-startup-v1/CASE_MATRIX.json'))
const matrix = JSON.parse(matrixBytes.toString('utf8'))
const CASE_MATRIX_SHA256 = crypto.createHash('sha256').update(matrixBytes).digest('hex')

const PACKAGE_SOURCE = 'a0e5890e612c81fda4d2698f78dbe4b81fba3e0d'
const REQUIREMENT_HASH = 'ec6524ebdc4be39279ba356e23020a8d7e45d0d06dcad878c48bb8cbf40a3fb6'
const OUTCOMES = Object.freeze(['NOT LAUNCHED', 'REFUSED', 'SUPPRESSED', 'ORDINARY SUCCESS',
  'EXCLUDED', 'UNSUPPORTED', 'INVALID FIXTURE', 'FAIL', 'INCONCLUSIVE', 'UNEXECUTED'])
const SHA256 = /^[a-f0-9]{64}$/
const SHA1 = /^[a-f0-9]{40}$/
const FORBIDDEN = /^(FINNEY_|ELECTRON_|NODE_|CHROME_|CHROMIUM_)/i

function demand(condition, code) {
  if (!condition) throw new Error(code)
}

function caseFor(id) {
  demand(matrix.version === 1 && matrix.packageSource === PACKAGE_SOURCE &&
    matrix.requirementSha256 === REQUIREMENT_HASH, 'INVALID_MATRIX_IDENTITY')
  const selected = matrix.cases.find(item => item.id === id)
  demand(selected, 'UNKNOWN_CASE')
  return selected
}

function publicArguments(profile, create) {
  demand(['client-a', 'client-b'].includes(profile), 'INVALID_PROFILE')
  demand(typeof create === 'boolean', 'INVALID_CREATE')
  return ['--profile=' + profile, ...(create ? ['--create-profile'] : [])]
}

function validatePublicArguments(argv) {
  demand(Array.isArray(argv) && argv.length >= 1 && argv.length <= 2 &&
    argv.every(value => typeof value === 'string') &&
    /^--profile=client-[ab]$/.test(argv[0]) &&
    (argv.length === 1 || argv[1] === '--create-profile'), 'INVALID_PUBLIC_ARGUMENTS')
}

function validateEnvironment(entries, exception = null) {
  demand(Array.isArray(entries) && entries.length <= 16, 'INVALID_ENVIRONMENT')
  if (exception) demand(typeof exception.name === 'string' &&
    ['NODE_PATH', 'FINNEY_LIVE', 'ELECTRON_RUN_AS_NODE', 'NODE_OPTIONS', 'NODE_EXTRA_CA_CERTS']
      .includes(exception.name.toUpperCase()), 'UNLISTED_EXCEPTION')
  const names = new Set()
  for (const entry of entries) {
    demand(entry && Object.keys(entry).sort().join(',') === 'name,value' &&
      typeof entry.name === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(entry.name) &&
      typeof entry.value === 'string' && !entry.value.includes('\0') &&
      entry.value.length <= 4096, 'INVALID_ENVIRONMENT_ENTRY')
    const normalized = entry.name.toUpperCase()
    demand(!names.has(normalized), 'DUPLICATE_ENVIRONMENT')
    names.add(normalized)
    if (FORBIDDEN.test(entry.name)) demand(exception &&
      entry.name === exception.name && entry.value === exception.value, 'ENVIRONMENT_OVERRIDE_DENIED')
    else demand(['SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP'].includes(normalized),
      'UNLISTED_ENVIRONMENT')
  }
  return entries
}

function encodeEnvironment(entries, exception = null) {
  validateEnvironment(entries, exception)
  const ordered = [...entries].sort((a, b) => {
    const x = a.name.toUpperCase()
    const y = b.name.toUpperCase()
    return x < y ? -1 : x > y ? 1 : 0
  })
  return Buffer.from(ordered.map(entry => entry.name + '=' + entry.value).join('\0') + '\0\0', 'utf16le')
}

function quoteArgument(value) {
  demand(typeof value === 'string' && !/[\0\r\n]/.test(value), 'INVALID_ARGUMENT')
  return '"' + value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, '$1$1') + '"'
}

function commandLine(executable, argv) {
  demand(typeof executable === 'string' && /^[A-Za-z]:\\/.test(executable) &&
    !/[\0\r\n"]/.test(executable), 'INVALID_EXECUTABLE')
  return [executable, ...argv].map(quoteArgument).join(' ')
}

function paths(network, profile) {
  demand(['xec-testnet', 'xec-regtest'].includes(network), 'INVALID_NETWORK')
  publicArguments(profile, false)
  return {
    profile: path.win32.join('C:\\FinneyA1Lab\\profiles', network, profile),
    protection: 'C:\\FinneyA1Lab\\runtime\\a1-userdata-' + network + '-' + profile,
  }
}

function bytesRecord(bytes) {
  return { encoding: 'UTF-16LE', base64: bytes.toString('base64'),
    sha256: crypto.createHash('sha256').update(bytes).digest('hex') }
}

function checkBytes(record) {
  if (!record || record.encoding !== 'UTF-16LE' || typeof record.base64 !== 'string' ||
    record.base64.length > 131072 || !SHA256.test(record.sha256 || '')) return false
  const bytes = Buffer.from(record.base64, 'base64')
  return bytes.length % 2 === 0 && bytes.toString('base64') === record.base64 &&
    crypto.createHash('sha256').update(bytes).digest('hex') === record.sha256
}

function matchesLaunch(record, selected) {
  try {
    if (!checkBytes(record.launch.commandLine) || !checkBytes(record.launch.environment)) return false
    const expectedCommand = commandLine(record.launch.executable,
      publicArguments(record.profile, selected.create === true)) + '\0'
    if (Buffer.from(expectedCommand, 'utf16le').toString('base64') !== record.launch.commandLine.base64) return false
    const selectedPaths = paths(record.network, record.profile)
    const entries = [
      { name: 'SystemRoot', value: 'C:\\Windows' }, { name: 'WINDIR', value: 'C:\\Windows' },
      { name: 'TEMP', value: selectedPaths.protection }, { name: 'TMP', value: selectedPaths.protection },
    ]
    let exception = null
    if (selected.environment) {
      demand(/^[a-f0-9]{32}$/.test(record.fixture.id || ''), 'INVALID_FIXTURE_ID')
      const root = 'C:\\FinneyA1Lab\\fixtures\\stock-startup-v1\\' + record.fixture.id
      const values = { $moduleDirectory: root + '\\modules',
        $requireOption: '--require="' + root + '\\injection.cjs"', $certificate: root + '\\certificate.pem' }
      exception = { name: selected.environment.name,
        value: Object.hasOwn(values, selected.environment.value) ? values[selected.environment.value] : selected.environment.value }
      entries.push(exception)
    }
    return encodeEnvironment(entries, exception).toString('base64') === record.launch.environment.base64
  } catch { return false }
}

module.exports = { PACKAGE_SOURCE, REQUIREMENT_HASH, CASE_MATRIX_SHA256, OUTCOMES, SHA1, SHA256, demand,
  caseFor, publicArguments, validatePublicArguments, validateEnvironment,
  encodeEnvironment, quoteArgument, commandLine, paths, bytesRecord, checkBytes, matchesLaunch }
