const assert = require('assert')
const fs = require('fs/promises')
const os = require('os')
const path = require('path')
const level = require('level')
const { createPrivateStateStore } = require('../src-electron/private-state')

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

async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'finney-private-state-'))
  const safeStorage = new TestSafeStorage()

  try {
    const store = await createPrivateStateStore({
      location: directory,
      safeStorage,
    })
    await store.batch([
      { type: 'put', key: 'meta/schema', value: 1 },
      {
        type: 'put',
        key: 'session/alice/bob/device-1',
        value: { session: 'sensitive-session-state', revision: 1 },
      },
    ])

    assert.deepStrictEqual(
      await store.get('session/alice/bob/device-1'),
      { session: 'sensitive-session-state', revision: 1 },
    )
    await store.close()

    const rawDatabase = level(directory, { valueEncoding: 'utf8' })
    const rawRecord = await rawDatabase.get('session/alice/bob/device-1')
    assert.strictEqual(rawRecord.includes('sensitive-session-state'), false)
    await rawDatabase.close()

    const reopened = await createPrivateStateStore({
      location: directory,
      safeStorage,
    })
    assert.deepStrictEqual(
      await reopened.getMany(['meta/schema', 'session/alice/bob/device-1']),
      [1, { session: 'sensitive-session-state', revision: 1 }],
    )
    await reopened.batch([
      { type: 'del', key: 'meta/schema' },
      { type: 'put', key: 'receipt/digest-1', value: { received: true } },
    ])
    assert.strictEqual(await reopened.get('meta/schema'), undefined)
    assert.deepStrictEqual(await reopened.get('receipt/digest-1'), {
      received: true,
    })
    await reopened.close()

    await assert.rejects(
      () =>
        createPrivateStateStore({
          location: directory,
          safeStorage: { isEncryptionAvailable: () => false },
        }),
      /unavailable/,
    )
    console.log('PASS: private-state records are protected and recover atomically')
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
