const assert = require('assert')

async function main() {
  const { PrivateKey } = await import('@signalapp/libsignal-client')
  const sender = PrivateKey.generate()
  const recipient = PrivateKey.generate()
  const plaintext = new TextEncoder().encode('finney-signal-runtime')
  const ciphertext = recipient
    .getPublicKey()
    .seal(plaintext, 'finney-signal-runtime')

  assert.strictEqual(
    new TextDecoder().decode(recipient.open(ciphertext, 'finney-signal-runtime')),
    'finney-signal-runtime',
  )
  assert.strictEqual(sender.getPublicKey().equals(recipient.getPublicKey()), false)
  console.log('PASS: Signal native runtime seal/open works')
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})