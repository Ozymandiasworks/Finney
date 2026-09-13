const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { createRequire } = require('module')
const { randomBytes } = require('crypto')
const ts = require('typescript')
const { PrivateKey, crypto } = require('bitcore-lib-xec')
const { Message, MessageSet, Stamp } = require('../src/cashweb/relay/relay_pb')

function loadTs(relative, overrides = {}) {
  const sourcePath = path.join(__dirname, '..', relative)
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
    require: request => overrides[request] || sourceRequire(request),
    Buffer,
    Uint8Array,
  })
  return exportsObject
}

const cryptoModule = loadTs('src/cashweb/relay/crypto.ts')
const { PayloadConstructor } = cryptoModule
const { messageMixin } = loadTs('src/cashweb/relay/extension.ts', {
  './crypto': cryptoModule,
})

function makeLegacyMessage() {
  const sender = new PrivateKey()
  const recipient = new PrivateKey()
  const payloadConstructor = new PayloadConstructor({ networkName: 'livenet' })
  const plaintext = Buffer.from('versioned envelope compatibility')
  const salt = randomBytes(32)
  const sharedKey = payloadConstructor.constructSharedKey(
    sender,
    recipient.toPublicKey(),
    salt,
  )
  const payload = payloadConstructor.encrypt(sharedKey, plaintext)
  const payloadDigest = crypto.Hash.sha256(Buffer.from(payload))
  const payloadHmac = payloadConstructor.constructPayloadHmac(
    sharedKey,
    payloadDigest,
  )
  const message = new Message()
  message.setSourcePublicKey(sender.toPublicKey().toBuffer())
  message.setDestinationPublicKey(recipient.toPublicKey().toBuffer())
  message.setPayloadDigest(payloadDigest)
  message.setStamp(new Stamp())
  message.setScheme(Message.EncryptionScheme.EPHEMERALDH)
  message.setSalt(salt)
  message.setPayloadHmac(payloadHmac)
  message.setPayloadSize(payload.length)
  message.setPayload(payload)
  return { message, plaintext, recipient }
}

async function main() {
  const { message, plaintext, recipient } = makeLegacyMessage()
  const restored = Message.deserializeBinary(message.serializeBinary())
  const parsed = messageMixin('livenet', restored).parse()
  assert.deepStrictEqual(Buffer.from(parsed.open(recipient)), plaintext)
  console.log('PASS: legacy versioned envelope round trips')

  for (const scheme of [Message.EncryptionScheme.NONE, 2]) {
    const unsupported = Message.deserializeBinary(message.serializeBinary())
    unsupported.setScheme(scheme)
    assert.throws(
      () => messageMixin('livenet', unsupported).parse().open(recipient),
      /Unsupported message encryption scheme/,
    )
  }
  console.log('PASS: missing and future encryption schemes fail closed')

  const messageSet = new MessageSet()
  messageSet.addMessages(Message.deserializeBinary(message.serializeBinary()))
  const initial = Buffer.from(messageSet.serializeBinary())
  const attempts = []
  let failuresRemaining = 1

  async function pushOnce() {
    attempts.push(Buffer.from(messageSet.serializeBinary()))
    if (failuresRemaining > 0) {
      failuresRemaining -= 1
      throw new Error('temporary relay failure')
    }
  }

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await pushOnce()
      break
    } catch (err) {
      if (attempt === 2) throw err
    }
  }

  assert.strictEqual(attempts.length, 2)
  assert.deepStrictEqual(attempts[0], initial)
  assert.deepStrictEqual(attempts[1], initial)
  console.log('PASS: retry attempts preserve the serialized paid envelope')
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
