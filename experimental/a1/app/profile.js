const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const { LAB_ROOT, refuse, parseRecord, validateIdentity, validateMarkerHeader, validateMarker } = require('./policy')

function inspectBoundary(network, profile) {
  validateIdentity(network, profile, 'S-1-5-21-1-2-3-1001')
  if (process.platform !== 'win32' || process.arch !== 'x64') refuse('UNSUPPORTED_PLATFORM')
  const script = fs.readFileSync(path.join(__dirname, 'inspect-boundary.ps1'), 'utf8')
  const input = `& {\n${script}\n} -Network '${network}' -Profile '${profile}'\n`
  const result = spawnSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(input, 'utf16le').toString('base64')], {
      encoding: 'utf8', timeout: 10000, maxBuffer: 8192, windowsHide: true,
      cwd: 'C:\\Windows\\System32',
      env: { SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows',
        PSModulePath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules' },
    })
  if (result.error || result.status !== 0) refuse('BOUNDARY_UNVERIFIED')
  let resultValue
  try { resultValue = JSON.parse(result.stdout.trim()) } catch { refuse('BOUNDARY_UNVERIFIED') }
  const expectedPath = path.win32.join(LAB_ROOT, 'profiles', network, profile)
  if (resultValue.version !== 1 || resultValue.profileRoot !== expectedPath ||
      resultValue.outbound !== 'block' || resultValue.outboundAllowRules !== 0) {
    refuse('BOUNDARY_UNVERIFIED')
  }
  return { directory: expectedPath,
    identity: validateIdentity(network, profile, resultValue.ownerSid) }
}

function regularPath(target, directory) {
  const info = fs.lstatSync(target)
  if (info.isSymbolicLink() || info.isDirectory() !== directory ||
      (!directory && (!info.isFile() || info.nlink !== 1))) refuse('UNSAFE_PROFILE_PATH')
  if (fs.realpathSync.native(target).toLowerCase() !== path.resolve(target).toLowerCase()) {
    refuse('UNSAFE_PROFILE_PATH')
  }
}

function acquireProfile(boundary, create) {
  const directory = boundary.directory
  const marker = path.join(directory, 'profile.json')
  const lock = path.join(directory, '.guard.lock')
  let admittedBytes
  if (fs.existsSync(directory)) {
    regularPath(directory, true)
    if (create) refuse('PROFILE_ALREADY_EXISTS')
    if (!fs.existsSync(marker)) refuse('INCOMPLETE_PROFILE')
    regularPath(marker, false)
    if (fs.statSync(marker).size > 4096) refuse('INVALID_PROFILE_RECORD')
    admittedBytes = fs.readFileSync(marker, 'utf8')
    validateMarkerHeader(parseRecord(admittedBytes), boundary.identity)
    const allowed = new Set(['profile.json', '.guard.lock'])
    if (fs.readdirSync(directory).some(name => !allowed.has(name))) refuse('CONFLICTING_PROFILE')
  } else {
    if (!create) refuse('PROFILE_MISSING')
    fs.mkdirSync(directory)
  }
  let descriptor
  try { descriptor = fs.openSync(lock, 'wx') } catch { refuse('PROFILE_IN_USE_OR_UNCLEAN') }
  const lockIdentity = fs.fstatSync(descriptor, { bigint: true })
  let closed = false
  return {
    directory,
    finish(safeStorage) {
      if (!safeStorage.isEncryptionAvailable()) refuse('PROTECTION_UNAVAILABLE')
      if (create) {
        let proof
        try { proof = safeStorage.encryptString(JSON.stringify(boundary.identity)).toString('base64') }
        catch { refuse('PROTECTION_UNAVAILABLE') }
        const record = { ...boundary.identity, proof }
        validateMarker(record, boundary.identity, safeStorage)
        const fd = fs.openSync(marker, 'wx')
        try { fs.writeFileSync(fd, JSON.stringify(record)); fs.fsyncSync(fd) }
        finally { fs.closeSync(fd) }
      } else {
        regularPath(marker, false)
        if (fs.statSync(marker).size > 4096) refuse('INVALID_PROFILE_RECORD')
        const current = fs.readFileSync(marker, 'utf8')
        if (current !== admittedBytes) refuse('PROFILE_CHANGED_DURING_ADMISSION')
        validateMarker(parseRecord(current), boundary.identity, safeStorage)
      }
    },
    close() {
      if (closed) return
      closed = true
      fs.closeSync(descriptor)
      regularPath(lock, false)
      const current = fs.statSync(lock, { bigint: true })
      if (current.ino !== lockIdentity.ino || current.dev !== lockIdentity.dev) {
        refuse('LOCK_REPLACED')
      }
      fs.unlinkSync(lock)
    },
  }
}

module.exports = { inspectBoundary, regularPath, acquireProfile }
