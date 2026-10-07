require('../guest').requireGuest('offline')

const fs = require('fs')
const path = require('path')
const assert = require('assert/strict')
const { spawn, spawnSync } = require('child_process')
const { NETWORKS, LAB_ROOT, refuse } = require('../app/policy')
const { verifyFuses } = require('../fuses')

const network = process.argv[2]
if (process.argv.length !== 3 || !NETWORKS.includes(network)) refuse('INVALID_TEST_TARGET')
const executable = path.resolve(__dirname, '../../../dist/a1', network, 'package/win-unpacked/FinneyA1.exe')
verifyFuses(fs.readFileSync(executable))

function start(args, environment = {}) {
  // This is a visible GUI test. Hidden startup can prevent Windows from finding
  // a main window even after Electron has emitted its readiness event.
  return spawn(executable, args, { env: { ...process.env, ...environment }, windowsHide: false,
    stdio: ['ignore', 'pipe', 'pipe'], cwd: LAB_ROOT })
}

function collect(child, ready = false) {
  return new Promise((resolve, reject) => {
    let output = ''
    let errors = ''
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error(`Packaged smoke timeout while ${ready ? 'waiting for visible shell' : 'waiting for exit'}; ` +
        `retain fixture and inspect its lock; stdout=${output.slice(-2000)} stderr=${errors.slice(-2000)}`))
    }, 60000)
    child.on('error', error => { clearTimeout(timeout); reject(error) })
    child.stdout.on('data', bytes => {
      output += bytes.toString()
      if (ready && output.includes('"event":"offline-shell-ready"')) {
        clearTimeout(timeout)
        try {
          resolve(JSON.parse(output.split(/\r?\n/).find(line => line.includes('"event":"offline-shell-ready"'))))
        } catch (error) { reject(error) }
      }
    })
    child.stderr.on('data', bytes => { errors += bytes.toString() })
    child.on('exit', code => {
      clearTimeout(timeout)
      if (ready) reject(new Error(`Safe start failed: ${code}; ${errors}`))
      else resolve({ code, output, errors })
    })
  })
}

async function closeWindow(child) {
  const exited = collect(child)
  // Attach a rejection handler immediately while the synchronous helper runs.
  exited.catch(() => {})
  try {
    assert.ok(Number.isSafeInteger(child.pid) && child.pid > 0)
    const script = `
$ErrorActionPreference = 'Stop'
$targetProcess = Get-Process -Id ${child.pid}
if ($targetProcess.ProcessName -ne 'FinneyA1') { throw 'UNEXPECTED_CLOSE_TARGET' }
$deadline = [DateTime]::UtcNow.AddSeconds(10)
$requested = $false
do {
  $targetProcess.Refresh()
  if ($targetProcess.HasExited) { throw 'PROCESS_EXITED_BEFORE_CLOSE' }
  $handle = $targetProcess.MainWindowHandle.ToInt64()
  $title = $targetProcess.MainWindowTitle
  if ($handle -ne 0) { $requested = $targetProcess.CloseMainWindow() }
  if ($requested) { break }
  Start-Sleep -Milliseconds 100
} while ([DateTime]::UtcNow -lt $deadline)
@{ processId = ${child.pid}; handle = $handle; title = $title; requested = $requested } | ConvertTo-Json -Compress
`
    const close = spawnSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
      { windowsHide: true, encoding: 'utf8', timeout: 15000 })
    assert.equal(close.status, 0, close.error?.message || close.stderr)
    const result = JSON.parse(close.stdout.trim())
    assert.equal(result.processId, child.pid)
    assert.equal(result.requested, true, `Windows could not request a normal close: ${close.stdout.trim()}`)
    assert.equal((await exited).code, 0, 'packaged process did not exit cleanly')
    return result
  } catch (error) {
    if (child.exitCode === null) child.kill()
    await exited.catch(() => {})
    throw error
  }
}

function assertState(state, child, protectionDirectory) {
  assert.equal(state.wallet, 'not-created')
  assert.equal(state.network, network)
  assert.equal(state.profile, 'client-a')
  assert.equal(state.processId, child.pid)
  assert.equal(state.windowVisible, true)
  assert.deepEqual(state.preferences, { sandbox: true, contextIsolation: true, nodeIntegration: false, preload: null })
  assert.deepEqual(state.storage, { userData: protectionDirectory,
    sessionData: protectionDirectory, rendererPersistent: false })
}

function encryptedKey(localStatePath) {
  const key = JSON.parse(fs.readFileSync(localStatePath, 'utf8')).os_crypt?.encrypted_key
  assert.ok(typeof key === 'string' && key.length > 0, 'Windows encryption key state was not persisted')
  return key
}

async function main() {
  const directory = path.win32.join(LAB_ROOT, 'profiles', network, 'client-a')
  const protectionDirectory = path.win32.join(LAB_ROOT, 'runtime', `a1-userdata-${network}-client-a`)
  const localStatePath = path.join(protectionDirectory, 'Local State')
  if (fs.existsSync(directory) || fs.existsSync(protectionDirectory)) refuse('FRESH_SMOKE_FIXTURE_REQUIRED')
  const absent = await collect(start(['--profile=client-a']))
  assert.notEqual(absent.code, 0)
  assert.match(absent.errors, /PROFILE_MISSING/)
  assert.equal(fs.existsSync(directory), false)
  assert.equal(fs.existsSync(protectionDirectory), false)
  for (const args of [[], ['--profile=client-a', '--no-sandbox'],
    ['--profile=client-a', '--enable-live'], ['--profile=client-a', '--network=mainnet']]) {
    assert.notEqual((await collect(start(args))).code, 0)
  }
  assert.notEqual((await collect(start(['--profile=client-a'], { FINNEY_LIVE: '1' }))).code, 0)
  assert.notEqual((await collect(start(['--profile=client-a'], { ELECTRON_RUN_AS_NODE: '1' }))).code, 0)
  const fixtureRoot = path.join(LAB_ROOT, 'fixtures')
  fs.mkdirSync(fixtureRoot, { recursive: true })
  const injectionDirectory = fs.mkdtempSync(path.join(fixtureRoot, 'a1-node-options-'))
  const injectionMarker = path.join(injectionDirectory, 'executed.fixture')
  const injectionModule = path.join(injectionDirectory, 'injection.cjs')
  fs.writeFileSync(injectionModule,
    `require('fs').writeFileSync(${JSON.stringify(injectionMarker)}, 'nonsecret injection canary')`, { flag: 'wx' })
  assert.notEqual((await collect(start(['--profile=client-a'],
    { NODE_OPTIONS: `--require=${injectionModule}` }))).code, 0)
  assert.equal(fs.existsSync(injectionMarker), false, 'NODE_OPTIONS executed before admission')
  const active = start(['--profile=client-a', '--create-profile'])
  try {
    const state = await collect(active, true)
    assertState(state, active, protectionDirectory)
    const markerBefore = fs.readFileSync(path.join(directory, 'profile.json'), 'utf8')
    const duplicate = await collect(start(['--profile=client-a']))
    assert.notEqual(duplicate.code, 0)
    assert.match(duplicate.errors, /PROFILE_IN_USE_OR_UNCLEAN/)
    const firstClose = await closeWindow(active)
    assert.equal(fs.existsSync(path.join(directory, '.guard.lock')), false)
    const keyBefore = encryptedKey(localStatePath)
    const reopened = start(['--profile=client-a'])
    let reopenedState
    let secondClose
    try {
      reopenedState = await collect(reopened, true)
      assertState(reopenedState, reopened, protectionDirectory)
      secondClose = await closeWindow(reopened)
    } finally {
      if (reopened.exitCode === null) reopened.kill()
    }
    assert.equal(fs.existsSync(path.join(directory, '.guard.lock')), false)
    assert.ok(fs.readFileSync(path.join(directory, 'profile.json'), 'utf8') === markerBefore,
      'reopen changed the existing profile proof')
    assert.ok(encryptedKey(localStatePath) === keyBefore, 'reopen replaced the Windows encryption key state')
    process.stdout.write(JSON.stringify({ result: 'packaged-smoke-pass', state, reopenedState,
      normalCloseRequests: [firstClose, secondClose], unchangedProfileProof: true, unchangedProtectionKey: true,
      limitation: 'Not an OS packet capture, forged-renderer campaign, or backend qualification' }) + '\n')
  } finally {
    if (active.exitCode === null) active.kill()
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })
