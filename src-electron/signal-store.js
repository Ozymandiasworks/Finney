function encode(value) {
  return Buffer.from(value).toString('base64')
}

function decode(value) {
  return Buffer.from(value, 'base64')
}

function keyPart(value) {
  return encodeURIComponent(value)
}

function identityKey(identityId) {
  return `identity/${keyPart(identityId)}`
}

function peerKey(identityId, address) {
  return `peer/${keyPart(identityId)}/${keyPart(address.toString())}`
}

function sessionKey(identityId, address) {
  return `session/${keyPart(identityId)}/${keyPart(address.toString())}`
}

function preKeyKey(identityId, id) {
  return `prekey/${keyPart(identityId)}/${id}`
}

function signedPreKeyKey(identityId, id) {
  return `signed-prekey/${keyPart(identityId)}/${id}`
}

function kyberPreKeyKey(identityId, id) {
  return `kyber-prekey/${keyPart(identityId)}/${id}`
}

function usedKyberPreKey(identityId, id) {
  return `prekey-used/${keyPart(identityId)}/${id}`
}

async function createStagedSignalStore({ signal, privateState, identityId }) {
  const localIdentity = await privateState.get(identityKey(identityId))
  if (!localIdentity || !localIdentity.privateKey || !localIdentity.registrationId) {
    throw new Error('Missing private messaging identity')
  }

  const pending = new Map()
  let finalized = false

  function assertActive() {
    if (finalized) {
      throw new Error('Signal state adapter is finalized')
    }
  }

  async function load(key) {
    const operation = pending.get(key)
    if (operation) {
      return operation.type === 'del' ? undefined : operation.value
    }
    return privateState.get(key)
  }

  function put(key, value) {
    assertActive()
    pending.set(key, { type: 'put', key, value })
  }

  function del(key) {
    assertActive()
    pending.set(key, { type: 'del', key })
  }

  class StagedSignalStore extends signal.IdentityKeyStore {
    async getIdentityKey() {
      return signal.PrivateKey.deserialize(decode(localIdentity.privateKey))
    }

    async getLocalRegistrationId() {
      return localIdentity.registrationId
    }

    async getIdentity(address) {
      const value = await load(peerKey(identityId, address))
      return value ? signal.PublicKey.deserialize(decode(value.publicKey)) : null
    }

    async isTrustedIdentity(address, key) {
      const known = await this.getIdentity(address)
      return !known || known.equals(key)
    }

    async saveIdentity(address, key) {
      const known = await this.getIdentity(address)
      put(peerKey(identityId, address), { publicKey: encode(key.serialize()) })
      return known && !known.equals(key)
        ? signal.IdentityChange.ReplacedExisting
        : signal.IdentityChange.NewOrUnchanged
    }

    async saveSession(address, record) {
      put(sessionKey(identityId, address), { record: encode(record.serialize()) })
    }

    async getSession(address) {
      const value = await load(sessionKey(identityId, address))
      return value ? signal.SessionRecord.deserialize(decode(value.record)) : null
    }

    async getExistingSessions(addresses) {
      const sessions = await Promise.all(
        addresses.map(address => this.getSession(address)),
      )
      return sessions.filter(session => session !== null)
    }

    async savePreKey(id, record) {
      put(preKeyKey(identityId, id), { record: encode(record.serialize()) })
    }

    async getPreKey(id) {
      const value = await load(preKeyKey(identityId, id))
      if (!value) {
        throw new Error('Missing prekey')
      }
      return signal.PreKeyRecord.deserialize(decode(value.record))
    }

    async removePreKey(id) {
      del(preKeyKey(identityId, id))
    }

    async saveSignedPreKey(id, record) {
      put(signedPreKeyKey(identityId, id), {
        record: encode(record.serialize()),
      })
    }

    async getSignedPreKey(id) {
      const value = await load(signedPreKeyKey(identityId, id))
      if (!value) {
        throw new Error('Missing signed prekey')
      }
      return signal.SignedPreKeyRecord.deserialize(decode(value.record))
    }

    async saveKyberPreKey(id, record) {
      put(kyberPreKeyKey(identityId, id), {
        record: encode(record.serialize()),
      })
    }

    async getKyberPreKey(id) {
      const value = await load(kyberPreKeyKey(identityId, id))
      if (!value) {
        throw new Error('Missing Kyber prekey')
      }
      return signal.KyberPreKeyRecord.deserialize(decode(value.record))
    }

    async markKyberPreKeyUsed(id, signedPreKeyId, baseKey) {
      put(usedKyberPreKey(identityId, id), {
        signedPreKeyId,
        baseKey: encode(baseKey.serialize()),
      })
    }
  }

  const store = new StagedSignalStore()

  return {
    store,
    async commit(additionalOperations = []) {
      assertActive()
      await privateState.batch([...pending.values(), ...additionalOperations])
      finalized = true
    },
    discard() {
      assertActive()
      pending.clear()
      finalized = true
    },
  }
}

module.exports = {
  createStagedSignalStore,
  identityKey,
  peerKey,
  sessionKey,
  preKeyKey,
  signedPreKeyKey,
  kyberPreKeyKey,
  usedKyberPreKey,
}
