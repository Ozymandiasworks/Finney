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
  return spawn(executable, args, { env: { ...process.env, ...environment }, windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'], cwd: LAB_ROOT })
}

function collect(child, ready = false) {
  return new Promise((resolve, reject) => {
    let output = ''
    let errors = ''
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error('Packaged smoke timeout; retain fixture and inspect its lock'))
    }, 20000)
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

async function main() {
  const directory = path.win32.join(LAB_ROOT, 'profiles', network, 'client-a')
  if (fs.existsSync(directory)) refuse('FRESH_SMOKE_FIXTURE_REQUIRED')
  const absent = await collect(start(['--profile=client-a']))
  assert.notEqual(absent.code, 0)
  assert.match(absent.errors, /PROFILE_MISSING/)
  assert.equal(fs.existsSync(directory), false)
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
    assert.equal(state.wallet, 'not-created')
    assert.equal(state.network, network)
    assert.deepEqual(state.preferences, { sandbox: true, contextIsolation: true, nodeIntegration: false, preload: null })
    const duplicate = await collect(start(['--profile=client-a']))
    assert.notEqual(duplicate.code, 0)
    assert.match(duplicate.errors, /PROFILE_IN_USE_OR_UNCLEAN/)
    const exited = collect(active)
    const close = spawnSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', `(Get-Process -Id ${active.pid}).CloseMainWindow()`],
      { windowsHide: true, encoding: 'utf8', timeout: 5000 })
    assert.equal(close.status, 0)
    assert.equal((await exited).code, 0)
    assert.equal(fs.existsSync(path.join(directory, '.guard.lock')), false)
    process.stdout.write(JSON.stringify({ result: 'packaged-smoke-pass', state,
      limitation: 'Not an OS packet capture, forged-renderer campaign, or backend qualification' }) + '\n')
  } finally {
    if (active.exitCode === null) active.kill()
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })
