import assert from 'node:assert/strict'
import { randomInt, randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { createPrivateStateStore } = require('../src-electron/private-state')
const {
  createStagedSignalStore,
  identityKey,
  preKeyKey,
  sessionKey,
  usedKyberPreKey,
} = require('../src-electron/signal-store')
const signal = await import('@signalapp/libsignal-client')

const encode = value => Buffer.from(value).toString('base64')

class TestSafeStorage {
  isEncryptionAvailable() {
    return true
  }

  encryptString(value) {
    return Buffer.from(value.split('').reverse().join(''))
  }

  decryptString(value) {
    return Buffer.from(value).toString().split('').reverse().join('')
  }
}

async function createIdentity(privateState, id) {
  const key = signal.PrivateKey.generate()
  await privateState.put(identityKey(id), {
    privateKey: encode(key.serialize()),
    registrationId: randomInt(1, 16380),
  })
}

async function createBundle(adapter) {
  const identity = await adapter.store.getIdentityKey()
  const prekey = signal.PrivateKey.generate()
  const signed = signal.PrivateKey.generate()
  const kyber = signal.KEMKeyPair.generate()
  const signedSignature = identity.sign(signed.getPublicKey().serialize())
  const kyberSignature = identity.sign(kyber.getPublicKey().serialize())

  await adapter.store.savePreKey(
    1,
    signal.PreKeyRecord.new(1, prekey.getPublicKey(), prekey),
  )
  await adapter.store.saveSignedPreKey(
    2,
    signal.SignedPreKeyRecord.new(
      2,
      Date.now(),
      signed.getPublicKey(),
      signed,
      signedSignature,
    ),
  )
  await adapter.store.saveKyberPreKey(
    3,
    signal.KyberPreKeyRecord.new(3, Date.now(), kyber, kyberSignature),
  )
  return signal.PreKeyBundle.new(
    await adapter.store.getLocalRegistrationId(),
    1,
    1,
    prekey.getPublicKey(),
    2,
    signed.getPublicKey(),
    signedSignature,
    identity.getPublicKey(),
    3,
    kyber.getPublicKey(),
    kyberSignature,
  )
}

async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'finney-signal-store-'))
  const privateState = await createPrivateStateStore({
    location: directory,
    safeStorage: new TestSafeStorage(),
  })
  const aliceId = 'alice'
  const bobId = 'bob'
  const aliceAddress = signal.ProtocolAddress.new(randomUUID(), 1)
  const bobAddress = signal.ProtocolAddress.new(randomUUID(), 1)

  try {
    await createIdentity(privateState, aliceId)
    await createIdentity(privateState, bobId)

    const bobProvision = await createStagedSignalStore({
      signal,
      privateState,
      identityId: bobId,
    })
    const bundle = await createBundle(bobProvision)
    assert.strictEqual(await privateState.get(preKeyKey(bobId, 1)), undefined)
    await bobProvision.commit()

    const aliceSetup = await createStagedSignalStore({
      signal,
      privateState,
      identityId: aliceId,
    })
    await signal.processPreKeyBundle(
      bundle,
      bobAddress,
      aliceAddress,
      aliceSetup.store,
      aliceSetup.store,
    )
    assert.strictEqual(await privateState.get(sessionKey(aliceId, bobAddress)), undefined)
    await aliceSetup.commit([{ type: 'put', key: 'outbox/prepared', value: { revision: 1 } }])
    assert.deepStrictEqual(await privateState.get('outbox/prepared'), {
      revision: 1,
    })

    const discardedSend = await createStagedSignalStore({
      signal,
      privateState,
      identityId: aliceId,
    })
    const beforeDiscard = await privateState.get(sessionKey(aliceId, bobAddress))
    await signal.signalEncrypt(
      Buffer.from('discarded'),
      bobAddress,
      aliceAddress,
      discardedSend.store,
      discardedSend.store,
    )
    discardedSend.discard()
    assert.deepStrictEqual(
      await privateState.get(sessionKey(aliceId, bobAddress)),
      beforeDiscard,
    )

    const send = await createStagedSignalStore({
      signal,
      privateState,
      identityId: aliceId,
    })
    const ciphertext = await signal.signalEncrypt(
      Buffer.from('staged delivery'),
      bobAddress,
      aliceAddress,
      send.store,
      send.store,
    )
    await send.commit([{ type: 'put', key: 'outbox/delivery', value: { prepared: true } }])

    const receive = await createStagedSignalStore({
      signal,
      privateState,
      identityId: bobId,
    })
    const plaintext = await signal.signalDecryptPreKey(
      signal.PreKeySignalMessage.deserialize(ciphertext.serialize()),
      aliceAddress,
      bobAddress,
      receive.store,
      receive.store,
      receive.store,
      receive.store,
      receive.store,
    )
    assert.equal(Buffer.from(plaintext).toString(), 'staged delivery')
    assert.notStrictEqual(await privateState.get(preKeyKey(bobId, 1)), undefined)
    assert.strictEqual(await privateState.get(usedKyberPreKey(bobId, 3)), undefined)
    await receive.commit([{ type: 'put', key: 'receipt/delivery', value: { received: true } }])
    assert.strictEqual(await privateState.get(preKeyKey(bobId, 1)), undefined)
    assert.notStrictEqual(await privateState.get(usedKyberPreKey(bobId, 3)), undefined)
    assert.deepStrictEqual(await privateState.get('receipt/delivery'), {
      received: true,
    })

    console.log('PASS: staged Signal mutations commit with durable outbox and receipts')
  } finally {
    await privateState.close()
    await fs.rm(directory, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
