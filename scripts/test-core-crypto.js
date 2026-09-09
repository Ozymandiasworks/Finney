const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { createRequire } = require('module')
const { randomBytes } = require('crypto')
const ts = require('typescript')

const sourcePath = path.join(__dirname, '../src/cashweb/relay/crypto.ts')
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
    esModuleInterop: true,
  },
}).outputText
const exportsObject = {}
const sourceRequire = createRequire(sourcePath)
vm.runInNewContext(compiled, {
  exports: exportsObject,
  require: sourceRequire,
  Buffer,
  Uint8Array,
})

const { PayloadConstructor } = exportsObject
const { PrivateKey } = sourceRequire('bitcore-lib-xec')
const payload = new PayloadConstructor({ networkName: 'livenet' })
const sender = new PrivateKey()
const recipient = new PrivateKey()
const salt = randomBytes(32)
const sharedKey = payload.constructSharedKey(
  sender,
  recipient.toPublicKey(),
  salt,
)
const receivedKey = payload.constructSharedKey(
  recipient,
  sender.toPublicKey(),
  salt,
)
assert.deepStrictEqual(sharedKey, receivedKey)
console.log('PASS: sender and recipient derive the same shared key')

for (const length of [0, 1, 15, 16, 17, 300, 4096]) {
  const plaintext = new Uint8Array(randomBytes(length))
  const ciphertext = payload.encrypt(sharedKey, plaintext)
  assert(ciphertext.length > 0)
  assert.strictEqual(ciphertext.length % 16, 0)
  assert.deepStrictEqual(payload.decrypt(receivedKey, ciphertext), plaintext)
}
console.log(
  'PASS: encryption round trips across empty, block and large payloads',
)

const stealthPublic = payload.constructStealthPublicKey(
  sender,
  recipient.toPublicKey(),
)
const stealthPrivate = payload.constructStealthPrivateKey(
  sender.toPublicKey(),
  recipient,
)
assert.deepStrictEqual(
  stealthPublic.stealthPublicKey.toBuffer(),
  stealthPrivate.stealthPrivateKey.toPublicKey().toBuffer(),
)
console.log('PASS: stealth public and private keys agree')

const digest = randomBytes(32)
const restoredRecipient = PrivateKey.fromWIF(recipient.toWIF())
const stampPublic = payload.constructStampPublicKey(
  digest,
  recipient.toPublicKey(),
)
const stampPrivate = payload.constructStampPrivateKey(digest, restoredRecipient)
assert.deepStrictEqual(
  stampPublic.toBuffer(),
  stampPrivate.toPublicKey().toBuffer(),
)
assert.deepStrictEqual(
  payload.constructStampHDPublicKey(digest, recipient.toPublicKey()).toString(),
  payload
    .constructStampHDPrivateKey(digest, restoredRecipient)
    .hdPublicKey.toString(),
)
console.log('PASS: restored recipient key reconstructs stamp and HD stamp keys')

const changedDigest = Buffer.from(digest)
changedDigest[0] ^= 1
assert.notDeepStrictEqual(
  payload.constructPayloadHmac(sharedKey, digest),
  payload.constructPayloadHmac(sharedKey, changedDigest),
)
assert.notDeepStrictEqual(
  stampPublic.toBuffer(),
  payload
    .constructStampPublicKey(changedDigest, recipient.toPublicKey())
    .toBuffer(),
)
console.log('PASS: payload changes alter the HMAC and stamp commitment')
