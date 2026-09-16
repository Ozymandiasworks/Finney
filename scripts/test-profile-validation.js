const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { createRequire } = require('module')
const ts = require('typescript')

const sourcePath = path.join(
  __dirname,
  '../src/cashweb/relay/profile-validation.ts',
)
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
})

const { verifyProfileMetadata } = exportsObject
const { PrivateKey, Networks, crypto } = sourceRequire('bitcore-lib-xec')
const { SignedPayload } = sourceRequire('../signed_payload/payload_pb')

function makeMetadata(privateKey, payload) {
  const digest = crypto.Hash.sha256(payload)
  const signature = crypto.ECDSA.sign(digest, privateKey)
  const metadata = new SignedPayload()
  metadata.setPublicKey(privateKey.toPublicKey().toBuffer())
  metadata.setSignature(signature.toCompact(1, true).slice(1))
  metadata.setScheme(1)
  metadata.setPayload(payload)
  return metadata
}

const privateKey = new PrivateKey()
const address = privateKey
  .toPublicKey()
  .toAddress(Networks.get('livenet'))
  .toCashAddress()
const payload = Buffer.from('signed profile payload')
const metadata = makeMetadata(privateKey, payload)

const verified = verifyProfileMetadata(metadata, address, 'livenet')
assert.deepStrictEqual(Buffer.from(verified.rawPayload), payload)
assert.deepStrictEqual(
  verified.publicKey.toBuffer(),
  privateKey.toPublicKey().toBuffer(),
)
console.log('PASS: signed profile payload is bound to its XEC address')

const alteredPayload = makeMetadata(privateKey, payload)
alteredPayload.setPayload(Buffer.from('altered profile payload'))
assert.throws(
  () => verifyProfileMetadata(alteredPayload, address, 'livenet'),
  /invalid profile signature/,
)
console.log('PASS: altered profile payload is rejected')

const alteredSignature = makeMetadata(privateKey, payload)
const signature = Buffer.from(alteredSignature.getSignature_asU8())
signature[0] ^= 1
alteredSignature.setSignature(signature)
assert.throws(
  () => verifyProfileMetadata(alteredSignature, address, 'livenet'),
  /invalid profile signature/,
)
console.log('PASS: altered profile signature is rejected')

const otherAddress = new PrivateKey()
  .toPublicKey()
  .toAddress(Networks.get('livenet'))
  .toCashAddress()
assert.throws(
  () => verifyProfileMetadata(metadata, otherAddress, 'livenet'),
  /profile signing key does not match address/,
)
console.log('PASS: profile keys must match the requested XEC address')

const unsupportedScheme = makeMetadata(privateKey, payload)
unsupportedScheme.setScheme(0)
assert.throws(
  () => verifyProfileMetadata(unsupportedScheme, address, 'livenet'),
  /unsupported profile signature scheme/,
)
console.log('PASS: unsupported profile signature schemes are rejected')