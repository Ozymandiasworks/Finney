const { requireGuest } = require('../guest')
requireGuest('offline')

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const policy = require('../app/policy')
const { acquireProfile } = require('../app/profile')
const { windowOptions, guardContents, guardSession } = require('../app/guards')
const { restrictFuses, verifyFuses } = require('../fuses')

const config = network => ({ version: 1, stage: 'A1', network,
  endpointPolicy: 'deny-all-v1', indexer: null, relay: null, registry: null,
  broadcast: null, activation: false })
const owner = 'S-1-5-21-1-2-3-1001'
const identity = policy.validateIdentity('xec-testnet', 'client-a', owner)
const mockProtection = {
  isEncryptionAvailable: () => true,
  encryptString: value => Buffer.from(`fixture:${value}`),
  decryptString: value => value.toString().slice(8),
}
const marker = () => ({ ...identity,
  proof: mockProtection.encryptString(JSON.stringify(identity)).toString('base64') })
const refuses = (operation, code) => assert.throws(operation, error => error.code === code)

test('both fixed offline network configurations are accepted', () => {
  for (const network of policy.NETWORKS) assert.equal(policy.validateConfig(config(network)).network, network)
})

for (const network of ['mainnet', 'xec-livenet', 'livenet', '', null, 'xec-testnet/../mainnet']) {
  test(`network ${String(network)} cannot select a live or implicit mode`, () => {
    refuses(() => policy.validateConfig(config(network)), 'WRONG_NETWORK')
  })
}

test('missing configuration, unknown schema and extra fields refuse', () => {
  refuses(() => policy.validateConfig(null), 'INVALID_CONFIGURATION')
  refuses(() => policy.validateConfig({ ...config('xec-testnet'), version: 2 }), 'UNSUPPORTED_CONFIGURATION')
  refuses(() => policy.validateConfig({ ...config('xec-testnet'), fallback: 'mainnet' }), 'INVALID_CONFIGURATION')
})

test('endpoint identity claims and live activation cannot enable a route', () => {
  for (const field of ['indexer', 'relay', 'registry', 'broadcast']) {
    for (const value of ['http://127.0.0.1:1', 'https://example.invalid', { network: 'xec-testnet' }]) {
      refuses(() => policy.validateConfig({ ...config('xec-testnet'), [field]: value }), 'NETWORK_NOT_AUTHORIZED')
    }
  }
  refuses(() => policy.validateConfig({ ...config('xec-testnet'), activation: true }), 'NETWORK_NOT_AUTHORIZED')
})

test('launch requires an explicit fixed profile and rejects unknown flags', () => {
  assert.deepEqual(policy.validateLaunch(['--profile=client-a', '--create-profile'], {}),
    { profile: 'client-a', create: true })
  for (const args of [[], ['--profile=../wallet'], ['--profile=client-a', '--no-sandbox'],
    ['--profile=client-a', '--remote-debugging-port=9222'], ['--profile=client-a', '--profile=client-b'],
    ['--profile=client-a', '--inspect'], ['--profile=client-a', '--enable-live']]) {
    refuses(() => policy.validateLaunch(args, {}), 'INVALID_LAUNCH')
  }
})

test('environment settings cannot select legacy data or active routes', () => {
  for (const name of ['FINNEY_INSTANCE_ID', 'FINNEY_TOR_PROXY', 'FINNEY_LIVE',
    'ELECTRON_RUN_AS_NODE', 'NODE_OPTIONS', 'node_path', 'CHROME_LOG_FILE']) {
    refuses(() => policy.validateLaunch(['--profile=client-a'], { [name]: 'fixture' }), 'ENVIRONMENT_OVERRIDE_DENIED')
  }
})

test('record parsing refuses duplicate keys, corruption and excess input', () => {
  refuses(() => policy.parseRecord('{"version":1,"version":2}'), 'NONCANONICAL_RECORD')
  refuses(() => policy.parseRecord('{'), 'CORRUPT_RECORD')
  refuses(() => policy.parseRecord(' '.repeat(4097)), 'INVALID_RECORD')
})

test('mock protected metadata binds network, purpose, profile and owner', () => {
  policy.validateMarker(marker(), identity, mockProtection)
  for (const field of ['purpose', 'profile', 'ownerSid']) {
    refuses(() => policy.validateMarker({ ...marker(), [field]: 'foreign' }, identity, mockProtection), 'FOREIGN_PROFILE')
  }
  refuses(() => policy.validateMarker({ ...marker(), network: 'xec-regtest' }, identity, mockProtection), 'FOREIGN_NETWORK_PROFILE')
  refuses(() => policy.validateMarker({ ...marker(), version: 9 }, identity, mockProtection), 'UNSUPPORTED_PROFILE')
  const foreign = { ...identity, profile: 'client-b' }
  refuses(() => policy.validateMarker({ ...marker(), proof: mockProtection.encryptString(JSON.stringify(foreign)).toString('base64') }, identity, mockProtection), 'FOREIGN_PROFILE')
})

test('unavailable and failed protection have no plaintext fallback', () => {
  refuses(() => policy.validateMarker(marker(), identity,
    { ...mockProtection, isEncryptionAvailable: () => false }), 'PROTECTION_UNAVAILABLE')
  refuses(() => policy.validateMarker(marker(), identity,
    { ...mockProtection, decryptString: () => { throw new Error('fixture') } }), 'PROFILE_LOCKED')
})

function fixture(operation) {
  const base = path.join(policy.LAB_ROOT, 'fixtures')
  fs.mkdirSync(base, { recursive: true })
  const directory = fs.mkdtempSync(path.join(base, 'a1-'))
  try { operation(path.join(directory, 'profile')) } finally {
    const resolved = fs.realpathSync.native(directory)
    if (!resolved.toLowerCase().startsWith(fs.realpathSync.native(base).toLowerCase() + path.sep)) {
      throw new Error('Fixture cleanup escaped its root')
    }
    fs.rmSync(resolved, { recursive: true })
  }
}

test('missing profile never creates files without explicit creation', () => fixture(directory => {
  refuses(() => acquireProfile({ directory, identity }, false), 'PROFILE_MISSING')
  assert.equal(fs.existsSync(directory), false)
}))

test('explicit nonsecret creation reopens and duplicate ownership refuses', () => fixture(directory => {
  const first = acquireProfile({ directory, identity }, true)
  try {
    first.finish(mockProtection)
    refuses(() => acquireProfile({ directory, identity }, false), 'PROFILE_IN_USE_OR_UNCLEAN')
    refuses(() => acquireProfile({ directory, identity }, true), 'PROFILE_ALREADY_EXISTS')
  } finally { first.close() }
  const bytes = fs.readFileSync(path.join(directory, 'profile.json'))
  const second = acquireProfile({ directory, identity }, false)
  try { second.finish(mockProtection) } finally { second.close() }
  assert.deepEqual(fs.readFileSync(path.join(directory, 'profile.json')), bytes)
}))

test('failed creation remains incomplete and cannot silently reset', () => fixture(directory => {
  const handle = acquireProfile({ directory, identity }, true)
  try {
    refuses(() => handle.finish({ isEncryptionAvailable: () => false }), 'PROTECTION_UNAVAILABLE')
  } finally { handle.close() }
  refuses(() => acquireProfile({ directory, identity }, false), 'INCOMPLETE_PROFILE')
  refuses(() => acquireProfile({ directory, identity }, true), 'PROFILE_ALREADY_EXISTS')
}))

test('conflicting content and stale lock are preserved', () => fixture(directory => {
  const handle = acquireProfile({ directory, identity }, true)
  handle.finish(mockProtection)
  handle.close()
  fs.writeFileSync(path.join(directory, 'foreign-wallet.fixture'), 'nonsecret canary')
  refuses(() => acquireProfile({ directory, identity }, false), 'CONFLICTING_PROFILE')
  assert.equal(fs.readFileSync(path.join(directory, 'foreign-wallet.fixture'), 'utf8'), 'nonsecret canary')
  fs.unlinkSync(path.join(directory, 'foreign-wallet.fixture'))
  fs.writeFileSync(path.join(directory, '.guard.lock'), 'nonsecret stale lock')
  refuses(() => acquireProfile({ directory, identity }, false), 'PROFILE_IN_USE_OR_UNCLEAN')
  assert.equal(fs.readFileSync(path.join(directory, '.guard.lock'), 'utf8'), 'nonsecret stale lock')
}))

test('corrupt, unsupported and foreign records refuse before taking a writer lock', () => fixture(directory => {
  fs.mkdirSync(directory)
  const records = [
    ['{', 'CORRUPT_RECORD'],
    [JSON.stringify({ ...marker(), version: 2 }), 'UNSUPPORTED_PROFILE'],
    [JSON.stringify({ ...marker(), network: 'xec-regtest' }), 'FOREIGN_NETWORK_PROFILE'],
    [JSON.stringify({ ...marker(), ownerSid: 'S-1-5-21-4-5-6-1001' }), 'FOREIGN_PROFILE'],
  ]
  for (const [bytes, code] of records) {
    fs.writeFileSync(path.join(directory, 'profile.json'), bytes)
    refuses(() => acquireProfile({ directory, identity }, false), code)
    assert.equal(fs.existsSync(path.join(directory, '.guard.lock')), false)
    assert.equal(fs.readFileSync(path.join(directory, 'profile.json'), 'utf8'), bytes)
  }
}))

test('changed metadata is not admitted or overwritten', () => fixture(directory => {
  const created = acquireProfile({ directory, identity }, true)
  created.finish(mockProtection)
  created.close()
  const opened = acquireProfile({ directory, identity }, false)
  const changed = JSON.stringify({ ...marker(), profile: 'client-b' })
  fs.writeFileSync(path.join(directory, 'profile.json'), changed)
  try {
    refuses(() => opened.finish(mockProtection), 'PROFILE_CHANGED_DURING_ADMISSION')
    assert.equal(fs.readFileSync(path.join(directory, 'profile.json'), 'utf8'), changed)
  } finally { opened.close() }
}))

test('junction profile admission refuses before marker writes', () => fixture(directory => {
  const outside = path.join(path.dirname(directory), 'synthetic-foreign')
  fs.mkdirSync(outside)
  fs.symlinkSync(outside, directory, 'junction')
  refuses(() => acquireProfile({ directory, identity }, false), 'UNSAFE_PROFILE_PATH')
  assert.deepEqual(fs.readdirSync(outside), [])
  fs.unlinkSync(directory)
}))

test('only exact packaged documents can pass the session request filter', () => {
  assert.equal(policy.requestAllowed(policy.SHELL_URL, 'GET', 'mainFrame'), true)
  assert.equal(policy.requestAllowed(policy.STYLE_URL, 'GET', 'stylesheet'), true)
  for (const url of ['https://example.invalid', 'http://127.0.0.1:1', 'ws://127.0.0.1:1',
    'file:///C:/FinneyA1Lab/foreign.fixture', policy.SHELL_URL + '?redirect=1',
    'finney-offline://shell/../profile.json', 'data:text/html,fixture']) {
    assert.equal(policy.requestAllowed(url, 'GET', 'mainFrame'), false)
  }
  assert.equal(policy.requestAllowed(policy.SHELL_URL, 'POST', 'mainFrame'), false)
  assert.equal(policy.requestAllowed(policy.SHELL_URL, 'GET', 'subFrame'), false)
})

test('shell preferences have no Node, preload or ordinary privileged bridge', () => {
  const preferences = windowOptions({}).webPreferences
  assert.equal(preferences.sandbox, true)
  assert.equal(preferences.contextIsolation, true)
  for (const key of ['nodeIntegration', 'nodeIntegrationInWorker', 'nodeIntegrationInSubFrames', 'webviewTag', 'devTools']) {
    assert.equal(preferences[key], false)
  }
  assert.equal(preferences.preload, undefined)
})

test('navigation and popup callbacks refuse without an external launch', () => {
  const handlers = new Map()
  let open
  guardContents({ on: (name, handler) => handlers.set(name, handler),
    setWindowOpenHandler: handler => { open = handler } })
  assert.deepEqual(open({ url: 'https://example.invalid' }), { action: 'deny' })
  for (const name of ['will-navigate', 'will-frame-navigate', 'will-redirect', 'will-attach-webview']) {
    let denied = false
    handlers.get(name)({ preventDefault: () => { denied = true } })
    assert.equal(denied, true)
  }
})

test('permission and download callbacks deny unconditionally', () => {
  const handlers = {}
  guardSession({ webRequest: { onBeforeRequest: handler => { handlers.request = handler } },
    setPermissionRequestHandler: handler => { handlers.permission = handler },
    setPermissionCheckHandler: handler => { handlers.check = handler },
    setDevicePermissionHandler: handler => { handlers.device = handler },
    setDisplayMediaRequestHandler: handler => { handlers.display = handler },
    on: (name, handler) => { handlers[name] = handler } })
  handlers.permission(null, 'openExternal', allowed => assert.equal(allowed, false))
  assert.equal(handlers.check(), false)
  assert.equal(handlers.device(), false)
  handlers.display({}, result => assert.deepEqual(result, {}))
  handlers.request({ url: 'https://example.invalid', method: 'GET', resourceType: 'xhr' },
    result => assert.deepEqual(result, { cancel: true }))
})

test('Node/native refusal harness runs in a disposable subprocess', () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'native-refusals.js')],
    { encoding: 'utf8', timeout: 10000, windowsHide: true })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /NATIVE_REFUSALS_OK/)
})

test('packaging disables pre-main environment and alternate-app routes', () => {
  const wire = Buffer.concat([Buffer.from('MZ-fixture'), Buffer.from('dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX'),
    Buffer.from([1, 9]), Buffer.from('111101111')])
  refuses(() => verifyFuses(wire), 'UNSAFE_FUSE_STATE')
  const restricted = restrictFuses(wire)
  verifyFuses(restricted)
  assert.deepEqual(restrictFuses(restricted), restricted)
  refuses(() => restrictFuses(Buffer.from('invalid')), 'INVALID_FUSE_SENTINEL')
  refuses(() => restrictFuses(Buffer.concat([wire, wire])), 'INVALID_FUSE_SENTINEL')
})
