import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const signal = await import('@signalapp/libsignal-client')
const { createPrivateStateStore } = require('../src-electron/private-state')
const {
  provisionSignalProfile,
  publicProfileKey,
} = require('../src-electron/signal-profile')
const { toPreKeyBundle } = require('../src-electron/signal-profile-bundle')
const { identityKey } = require('../src-electron/signal-store')

class TestSafeStorage {
  isEncryptionAvailable() {
    return true
  }

  encryptString(value) {
    return Buffer.from('protected:' + value)
  }

  decryptString(value) {
    const decoded = Buffer.from(value).toString()
    assert(decoded.startsWith('protected:'))
    return decoded.slice('protected:'.length)
  }
}

const directory = await mkdtemp(path.join(os.tmpdir(), 'finney-signal-profile-'))
try {
  let privateState = await createPrivateStateStore({
    location: directory,
    safeStorage: new TestSafeStorage(),
  })
  const first = await provisionSignalProfile({
    signal,
    privateState,
    identityId: 'alice',
  })
  const serialized = JSON.stringify(first)
  const second = await provisionSignalProfile({
    signal,
    privateState,
    identityId: 'alice',
  })
  assert.equal(JSON.stringify(second), serialized)
  const libsignalBundle = toPreKeyBundle(signal, first)
  assert.equal(libsignalBundle.registrationId(), first.registrationId)
  assert(await privateState.get(identityKey('alice')))
  assert(await privateState.get(publicProfileKey('alice')))
  console.log('PASS: Signal profile provisioning persists one stable public bundle')

  await privateState.close()
  privateState = await createPrivateStateStore({
    location: directory,
    safeStorage: new TestSafeStorage(),
  })
  const restored = await provisionSignalProfile({
    signal,
    privateState,
    identityId: 'alice',
  })
  assert.equal(JSON.stringify(restored), serialized)
  console.log('PASS: Signal profile provisioning survives protected-store restart')
  await privateState.close()
} finally {
  await rm(directory, { recursive: true, force: true })
}