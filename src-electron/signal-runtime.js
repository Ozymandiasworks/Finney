export async function verifySignalRuntime() {
  const { PrivateKey } = await import('@signalapp/libsignal-client')
  const sender = PrivateKey.generate()
  const recipient = PrivateKey.generate()
  const plaintext = new TextEncoder().encode('finney-signal-runtime')
  const ciphertext = recipient
    .getPublicKey()
    .seal(plaintext, 'finney-signal-runtime')
  const restored = recipient.open(ciphertext, 'finney-signal-runtime')

  if (new TextDecoder().decode(restored) !== 'finney-signal-runtime') {
    throw new Error('Signal runtime smoke test failed')
  }
  if (sender.getPublicKey().equals(recipient.getPublicKey())) {
    throw new Error('Signal runtime generated duplicate keys')
  }
}