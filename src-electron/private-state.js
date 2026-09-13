const level = require('level')

const recordVersion = 1

function isNotFoundError(error) {
  return error && error.type === 'NotFoundError'
}

function assertKey(key) {
  if (
    typeof key !== 'string' ||
    key.length === 0 ||
    key.length > 1024 ||
    key.includes('\0')
  ) {
    throw new Error('Invalid private-state key')
  }
}

function assertSafeStorage(safeStorage, platform) {
  if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
    throw new Error('Protected local storage is unavailable')
  }

  if (platform === 'linux' && safeStorage.getSelectedStorageBackend) {
    const backend = safeStorage.getSelectedStorageBackend()
    if (backend === 'basic_text' || backend === 'unknown') {
      throw new Error('Protected local storage backend is unavailable')
    }
  }
}

class PrivateStateStore {
  constructor(database, safeStorage) {
    this.database = database
    this.safeStorage = safeStorage
  }

  encrypt(value) {
    if (value === undefined) {
      throw new Error('Private-state values must be defined')
    }
    return this.safeStorage
      .encryptString(JSON.stringify({ version: recordVersion, value }))
      .toString('base64')
  }

  decrypt(value) {
    let record
    try {
      record = JSON.parse(
        this.safeStorage.decryptString(Buffer.from(value, 'base64')),
      )
    } catch (_) {
      throw new Error('Unable to decrypt private-state record')
    }

    if (!record || record.version !== recordVersion || !('value' in record)) {
      throw new Error('Invalid private-state record')
    }

    return record.value
  }

  async get(key) {
    assertKey(key)
    try {
      return this.decrypt(await this.database.get(key))
    } catch (error) {
      if (isNotFoundError(error)) {
        return
      }
      throw error
    }
  }

  async getMany(keys) {
    return Promise.all(keys.map(key => this.get(key)))
  }

  async put(key, value) {
    assertKey(key)
    await this.database.put(key, this.encrypt(value))
  }

  async del(key) {
    assertKey(key)
    await this.database.del(key)
  }

  async batch(operations) {
    const encryptedOperations = operations.map(operation => {
      assertKey(operation.key)
      if (operation.type === 'del') {
        return { type: 'del', key: operation.key }
      }
      if (operation.type === 'put') {
        return {
          type: 'put',
          key: operation.key,
          value: this.encrypt(operation.value),
        }
      }
      throw new Error('Invalid private-state batch operation')
    })
    await this.database.batch(encryptedOperations)
  }

  async close() {
    await this.database.close()
  }
}

async function createPrivateStateStore({ location, safeStorage, platform }) {
  assertSafeStorage(safeStorage, platform || process.platform)
  return new PrivateStateStore(level(location, { valueEncoding: 'utf8' }), safeStorage)
}

module.exports = {
  PrivateStateStore,
  createPrivateStateStore,
}
