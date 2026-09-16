import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const signal = await import('@signalapp/libsignal-client')
const {
  BUNDLE_KIND,
  BUNDLE_VERSION,
  parsePublicBundle,
  serializePublicBundle,
  toPreKeyBundle,
} = require('../src-electron/signal-profile-bundle')

const identity = signal.PrivateKey.generate()
const preKey = signal.PrivateKey.generate()
const signedPreKey = signal.PrivateKey.generate()
const kyberPreKey = signal.KEMKeyPair.generate()
const bundle = {
  registrationId: 1,
  deviceId: 1,
  identityKey: Buffer.from(identity.getPublicKey().serialize()),
  preKey: {
    id: 2,
    publicKey: Buffer.from(preKey.getPublicKey().serialize()),
  },
  signedPreKey: {
    id: 3,
    publicKey: Buffer.from(signedPreKey.getPublicKey().serialize()),
    signature: Buffer.from(identity.sign(signedPreKey.getPublicKey().serialize())),
  },
  kyberPreKey: {
    id: 4,
    publicKey: Buffer.from(kyberPreKey.getPublicKey().serialize()),
    signature: Buffer.from(identity.sign(kyberPreKey.getPublicKey().serialize())),
  },
}

const serialized = serializePublicBundle(bundle)
const parsed = parsePublicBundle(serialized)
assert.deepEqual(parsed, bundle)
const libsignalBundle = toPreKeyBundle(signal, parsed)
assert.equal(libsignalBundle.registrationId(), bundle.registrationId)
assert.equal(libsignalBundle.preKeyId(), bundle.preKey.id)
assert.equal(libsignalBundle.signedPreKeyId(), bundle.signedPreKey.id)
assert.equal(libsignalBundle.kyberPreKeyId(), bundle.kyberPreKey.id)
console.log('PASS: public Signal profile bundle round trips into libsignal')

const unsupported = JSON.parse(serialized)
unsupported.version = BUNDLE_VERSION + 1
assert.throws(
  () => parsePublicBundle(Buffer.from(JSON.stringify(unsupported))),
  /Unsupported Signal profile bundle/,
)
console.log('PASS: unknown Signal profile bundle versions are rejected')

const malformed = JSON.parse(serialized)
malformed.identityKey = 'not base64'
assert.throws(
  () => parsePublicBundle(Buffer.from(JSON.stringify(malformed))),
  /Invalid identity key/,
)
console.log('PASS: malformed Signal profile bundle fields are rejected')

const altered = parsePublicBundle(serialized)
altered.signedPreKey.signature[0] ^= 1
assert.throws(
  () => toPreKeyBundle(signal, altered),
  /Invalid Signal profile bundle signature/,
)
console.log('PASS: invalid embedded Signal key signatures are rejected')

assert.equal(BUNDLE_KIND, 'signal-v2')
assert.equal(BUNDLE_VERSION, 1)