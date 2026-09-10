import assert from 'node:assert/strict'
import { randomInt, randomUUID } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const libraryPath = process.argv[2]
if (!libraryPath) throw new Error('Supply the candidate library directory')
const signal = await import(
  pathToFileURL(path.resolve(libraryPath, 'dist/index.js')).href
)
const encode = value => Buffer.from(value).toString('base64')
const decode = value => Buffer.from(value, 'base64')

class TestStore extends signal.IdentityKeyStore {
  constructor() {
    super()
    this.identity = signal.PrivateKey.generate()
    this.registrationId = randomInt(1, 16380)
    this.sessions = new Map()
    this.identities = new Map()
    this.prekeys = new Map()
    this.signedPrekeys = new Map()
    this.kyberPrekeys = new Map()
    this.usedKyber = new Set()
  }

  async getIdentityKey() {
    return this.identity
  }
  async getLocalRegistrationId() {
    return this.registrationId
  }
  async getIdentity(address) {
    const value = this.identities.get(address.toString())
    return value ? signal.PublicKey.deserialize(decode(value)) : null
  }
  async isTrustedIdentity(address, key) {
    const known = await this.getIdentity(address)
    return !known || known.equals(key)
  }
  async saveIdentity(address, key) {
    const known = await this.getIdentity(address)
    this.identities.set(address.toString(), encode(key.serialize()))
    return known && !known.equals(key)
      ? signal.IdentityChange.ReplacedExisting
      : signal.IdentityChange.NewOrUnchanged
  }
  async saveSession(address, record) {
    this.sessions.set(address.toString(), encode(record.serialize()))
  }
  async getSession(address) {
    const record = this.sessions.get(address.toString())
    return record ? signal.SessionRecord.deserialize(decode(record)) : null
  }
  async getExistingSessions(addresses) {
    return Promise.all(
      addresses.map(async address => {
        const record = await this.getSession(address)
        assert(record)
        return record
      }),
    )
  }
  async savePreKey(id, record) {
    this.prekeys.set(id, encode(record.serialize()))
  }
  async getPreKey(id) {
    assert(this.prekeys.has(id), 'Missing prekey')
    return signal.PreKeyRecord.deserialize(decode(this.prekeys.get(id)))
  }
  async removePreKey(id) {
    this.prekeys.delete(id)
  }
  async saveSignedPreKey(id, record) {
    this.signedPrekeys.set(id, encode(record.serialize()))
  }
  async getSignedPreKey(id) {
    assert(this.signedPrekeys.has(id), 'Missing signed prekey')
    return signal.SignedPreKeyRecord.deserialize(
      decode(this.signedPrekeys.get(id)),
    )
  }
  async saveKyberPreKey(id, record) {
    this.kyberPrekeys.set(id, encode(record.serialize()))
  }
  async getKyberPreKey(id) {
    assert(this.kyberPrekeys.has(id), 'Missing Kyber prekey')
    return signal.KyberPreKeyRecord.deserialize(
      decode(this.kyberPrekeys.get(id)),
    )
  }
  async markKyberPreKeyUsed(id, signedId, baseKey) {
    this.usedKyber.add(`${id}:${signedId}:${encode(baseKey.serialize())}`)
  }
  snapshot() {
    return JSON.stringify({
      identity: encode(this.identity.serialize()),
      registrationId: this.registrationId,
      sessions: [...this.sessions],
      identities: [...this.identities],
      prekeys: [...this.prekeys],
      signedPrekeys: [...this.signedPrekeys],
      kyberPrekeys: [...this.kyberPrekeys],
      usedKyber: [...this.usedKyber],
    })
  }
  static restore(serialized) {
    const values = JSON.parse(serialized)
    const store = new TestStore()
    store.identity = signal.PrivateKey.deserialize(decode(values.identity))
    store.registrationId = values.registrationId
    for (const name of [
      'sessions',
      'identities',
      'prekeys',
      'signedPrekeys',
      'kyberPrekeys',
    ])
      store[name] = new Map(values[name])
    store.usedKyber = new Set(values.usedKyber)
    return store
  }
}

async function bundleFor(store) {
  const prekey = signal.PrivateKey.generate()
  const signed = signal.PrivateKey.generate()
  const kyber = signal.KEMKeyPair.generate()
  const signedSignature = store.identity.sign(signed.getPublicKey().serialize())
  const kyberSignature = store.identity.sign(kyber.getPublicKey().serialize())
  await store.savePreKey(
    1,
    signal.PreKeyRecord.new(1, prekey.getPublicKey(), prekey),
  )
  await store.saveSignedPreKey(
    2,
    signal.SignedPreKeyRecord.new(
      2,
      Date.now(),
      signed.getPublicKey(),
      signed,
      signedSignature,
    ),
  )
  await store.saveKyberPreKey(
    3,
    signal.KyberPreKeyRecord.new(3, Date.now(), kyber, kyberSignature),
  )
  return signal.PreKeyBundle.new(
    store.registrationId,
    1,
    1,
    prekey.getPublicKey(),
    2,
    signed.getPublicKey(),
    signedSignature,
    store.identity.getPublicKey(),
    3,
    kyber.getPublicKey(),
    kyberSignature,
  )
}

async function encrypt(text, from, to, store) {
  const result = await signal.signalEncrypt(
    Buffer.from(text),
    to,
    from,
    store,
    store,
  )
  return { type: result.type(), bytes: Buffer.from(result.serialize()) }
}
async function decrypt(envelope, from, to, store) {
  if (envelope.type === signal.CiphertextMessageType.PreKey) {
    return Buffer.from(
      await signal.signalDecryptPreKey(
        signal.PreKeySignalMessage.deserialize(envelope.bytes),
        from,
        to,
        store,
        store,
        store,
        store,
        store,
      ),
    ).toString()
  }
  assert.equal(envelope.type, signal.CiphertextMessageType.Whisper)
  return Buffer.from(
    await signal.signalDecrypt(
      signal.SignalMessage.deserialize(envelope.bytes),
      from,
      to,
      store,
      store,
    ),
  ).toString()
}

if (process.argv[3] === '--restore') {
  const { readFileSync } = await import('node:fs')
  const state = JSON.parse(readFileSync(0, 'utf8'))
  const store = TestStore.restore(state.store)
  const from = signal.ProtocolAddress.new(state.from, 1)
  const to = signal.ProtocolAddress.new(state.to, 1)
  const message = { type: state.type, bytes: decode(state.payload) }
  assert.equal(await decrypt(message, from, to, store), 'after-process-restart')
  await assert.rejects(decrypt(message, from, to, store))
  console.log(
    'PASS: fresh process restores session, decrypts pending message and rejects replay',
  )
  process.exit(0)
}

const aliceAddress = signal.ProtocolAddress.new(randomUUID(), 1)
const bobAddress = signal.ProtocolAddress.new(randomUUID(), 1)
let alice = new TestStore()
let bob = new TestStore()
await signal.processPreKeyBundle(
  await bundleFor(bob),
  bobAddress,
  aliceAddress,
  alice,
  alice,
)
const initial = await encrypt('initial', aliceAddress, bobAddress, alice)
assert.equal(initial.type, signal.CiphertextMessageType.PreKey)
assert.equal(await decrypt(initial, aliceAddress, bobAddress, bob), 'initial')
assert.equal(bob.prekeys.size, 0)
assert.equal(bob.usedKyber.size, 1)
const reply = await encrypt('reply', bobAddress, aliceAddress, bob)
assert.equal(await decrypt(reply, bobAddress, aliceAddress, alice), 'reply')
console.log(
  'PASS: prekey initiation, one-time prekey consumption and bidirectional delivery',
)

const pending = []
for (let i = 0; i < 3; i++)
  pending.push(await encrypt(`ordered-${i}`, aliceAddress, bobAddress, alice))
assert.equal(
  await decrypt(pending[2], aliceAddress, bobAddress, bob),
  'ordered-2',
)
alice = TestStore.restore(alice.snapshot())
bob = TestStore.restore(bob.snapshot())
for (const i of [0, 1])
  assert.equal(
    await decrypt(pending[i], aliceAddress, bobAddress, bob),
    `ordered-${i}`,
  )
const beforeReplay = bob.snapshot()
await assert.rejects(decrypt(pending[1], aliceAddress, bobAddress, bob))
assert(bob.snapshot() === beforeReplay, 'Unexpected mutation of stored state')
console.log(
  'PASS: reordered delivery, serialized store reconstruction and replay rejection',
)

const clean = await encrypt('after-tamper', aliceAddress, bobAddress, alice)
const tampered = { type: clean.type, bytes: Buffer.from(clean.bytes) }
tampered.bytes[tampered.bytes.length - 1] ^= 1
const beforeTamper = bob.snapshot()
await assert.rejects(decrypt(tampered, aliceAddress, bobAddress, bob))
assert(bob.snapshot() === beforeTamper, 'Unexpected mutation of stored state')
assert.equal(
  await decrypt(clean, aliceAddress, bobAddress, bob),
  'after-tamper',
)
console.log(
  'PASS: tampered ciphertext rejection preserves the valid pending message',
)

const changedIdentity = TestStore.restore(alice.snapshot())
await changedIdentity.saveIdentity(
  bobAddress,
  signal.PrivateKey.generate().getPublicKey(),
)
const beforeIdentityFailure = changedIdentity.snapshot()
await assert.rejects(
  encrypt('identity-change', aliceAddress, bobAddress, changedIdentity),
)
assert(
  changedIdentity.snapshot() === beforeIdentityFailure,
  'Unexpected mutation of stored state',
)
console.log(
  'PASS: changed recipient identity rejected without advancing sender state',
)

const distinctOne = await encrypt('same text', aliceAddress, bobAddress, alice)
const distinctTwo = await encrypt('same text', aliceAddress, bobAddress, alice)
assert.notDeepEqual(distinctOne.bytes, distinctTwo.bytes)
console.log('PASS: repeated plaintext produces distinct ciphertext')

const { createRequire } = await import('node:module')
const { readFileSync } = await import('node:fs')
const { fileURLToPath } = await import('node:url')
const { runInNewContext } = await import('node:vm')
const sourcePath = fileURLToPath(
  new URL('../src/cashweb/relay/crypto.ts', import.meta.url),
)
const sourceRequire = createRequire(sourcePath)
const ts = sourceRequire('typescript')
const { PrivateKey: StampPrivateKey, crypto: stampCrypto } =
  sourceRequire('bitcore-lib-xec')
const coreExports = {}
const compiled = ts.transpileModule(readFileSync(sourcePath, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
    esModuleInterop: true,
  },
}).outputText
runInNewContext(compiled, {
  exports: coreExports,
  require: sourceRequire,
  Buffer,
  Uint8Array,
})
const payload = new coreExports.PayloadConstructor({ networkName: 'livenet' })
const stampRecipient = new StampPrivateKey()
const restoredStampRecipient = StampPrivateKey.fromWIF(stampRecipient.toWIF())
for (const envelope of [
  initial,
  reply,
  ...pending,
  clean,
  distinctOne,
  distinctTwo,
]) {
  const digest = stampCrypto.Hash.sha256(envelope.bytes)
  const senderRoot = payload.constructStampHDPublicKey(
    digest,
    stampRecipient.toPublicKey(),
  )
  const receiverRoot = payload.constructStampHDPrivateKey(
    digest,
    restoredStampRecipient,
  )
  const derive = root =>
    root.deriveChild(44).deriveChild(145).deriveChild(0).deriveChild(0)
  assert.deepEqual(
    derive(senderRoot).publicKey.toBuffer(),
    derive(receiverRoot).publicKey.toBuffer(),
  )
}
const queuedBytes = Buffer.from(clean.bytes)
const queuedDigest = stampCrypto.Hash.sha256(queuedBytes)
const restoredQueue = Buffer.from(
  JSON.parse(JSON.stringify({ payload: encode(queuedBytes) })).payload,
  'base64',
)
assert.deepEqual(restoredQueue, queuedBytes)
assert.deepEqual(stampCrypto.Hash.sha256(restoredQueue), queuedDigest)
console.log(
  'PASS: ratchet ciphertext preserves stamp derivation and serialized retry commitment',
)

const handshakeSender = new TestStore()
const handshakeReceiver = new TestStore()
const receiverBundle = await bundleFor(handshakeReceiver)
const invalidSignature = Buffer.from(receiverBundle.signedPreKeySignature())
invalidSignature[0] ^= 1
const invalidBundle = signal.PreKeyBundle.new(
  receiverBundle.registrationId(),
  receiverBundle.deviceId(),
  receiverBundle.preKeyId(),
  receiverBundle.preKeyPublic(),
  receiverBundle.signedPreKeyId(),
  receiverBundle.signedPreKeyPublic(),
  invalidSignature,
  receiverBundle.identityKey(),
  receiverBundle.kyberPreKeyId(),
  receiverBundle.kyberPreKeyPublic(),
  receiverBundle.kyberPreKeySignature(),
)
const beforeInvalidBundle = handshakeSender.snapshot()
await assert.rejects(
  signal.processPreKeyBundle(
    invalidBundle,
    bobAddress,
    aliceAddress,
    handshakeSender,
    handshakeSender,
  ),
)
assert(
  handshakeSender.snapshot() === beforeInvalidBundle,
  'Unexpected mutation of stored state',
)
await signal.processPreKeyBundle(
  receiverBundle,
  bobAddress,
  aliceAddress,
  handshakeSender,
  handshakeSender,
)
const handshakeMessage = await encrypt(
  'handshake',
  aliceAddress,
  bobAddress,
  handshakeSender,
)
const brokenHandshake = {
  type: handshakeMessage.type,
  bytes: Buffer.from(handshakeMessage.bytes),
}
brokenHandshake.bytes[brokenHandshake.bytes.length - 1] ^= 1
const beforeBrokenHandshake = handshakeReceiver.snapshot()
await assert.rejects(
  decrypt(brokenHandshake, aliceAddress, bobAddress, handshakeReceiver),
)
assert(
  handshakeReceiver.snapshot() === beforeBrokenHandshake,
  'Unexpected mutation of stored state',
)
assert.equal(handshakeReceiver.prekeys.size, 1)
assert.equal(
  await decrypt(handshakeMessage, aliceAddress, bobAddress, handshakeReceiver),
  'handshake',
)
const afterHandshake = handshakeReceiver.snapshot()
await assert.rejects(
  decrypt(handshakeMessage, aliceAddress, bobAddress, handshakeReceiver),
)
assert(
  handshakeReceiver.snapshot() === afterHandshake,
  'Unexpected mutation of stored state',
)
console.log(
  'PASS: invalid prekey signature and malformed/replayed initial message preserve state',
)

const { spawnSync } = await import('node:child_process')
const afterRestart = await encrypt(
  'after-process-restart',
  aliceAddress,
  bobAddress,
  alice,
)
const restart = spawnSync(
  process.execPath,
  [fileURLToPath(import.meta.url), path.resolve(libraryPath), '--restore'],
  {
    input: JSON.stringify({
      store: bob.snapshot(),
      from: aliceAddress.name(),
      to: bobAddress.name(),
      type: afterRestart.type,
      payload: encode(afterRestart.bytes),
    }),
    encoding: 'utf8',
    timeout: 30000,
    windowsHide: true,
  },
)
assert.equal(restart.status, 0, 'Fresh-process session test failed')
assert(restart.stdout.includes('PASS: fresh process restores session'))
console.log(restart.stdout.trim())
