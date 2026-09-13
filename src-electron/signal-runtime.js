import { rm } from 'fs/promises'
import privateState from './private-state'

const { createPrivateStateStore } = privateState

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

export async function verifyPrivateStateRuntime({ location, safeStorage }) {
  const store = await createPrivateStateStore({ location, safeStorage })
  try {
    await store.batch([
      { type: 'put', key: 'meta/schema', value: 1 },
      { type: 'put', key: 'identity/smoke', value: { protected: true } },
    ])
    const identity = await store.get('identity/smoke')
    if (!identity || identity.protected !== true) {
      throw new Error('Private-state runtime smoke test failed')
    }
  } finally {
    await store.close()
    await rm(location, { recursive: true, force: true })
  }
}
