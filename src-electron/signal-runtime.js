import { rm } from 'fs/promises'
import privateState from './private-state'
import signalStore from './signal-store'

const { createPrivateStateStore } = privateState
const { createStagedSignalStore, identityKey } = signalStore

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
    const { PrivateKey } = await import('@signalapp/libsignal-client')
    const messagingKey = PrivateKey.generate()
    await store.put(identityKey('smoke'), {
      privateKey: Buffer.from(messagingKey.serialize()).toString('base64'),
      registrationId: 1,
    })
    const staged = await createStagedSignalStore({
      signal: await import('@signalapp/libsignal-client'),
      privateState: store,
      identityId: 'smoke',
    })
    if (!(await staged.store.getIdentityKey()).equals(messagingKey)) {
      throw new Error('Staged Signal store runtime smoke test failed')
    }
    staged.discard()
  } finally {
    await store.close()
    await rm(location, { recursive: true, force: true })
  }
}
