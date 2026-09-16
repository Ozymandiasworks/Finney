const { randomInt } = require('crypto')
const { createStagedSignalStore, identityKey } = require('./signal-store')
const {
  parsePublicBundle,
  serializePublicBundle,
} = require('./signal-profile-bundle')

const MAX_REGISTRATION_ID = 16380

function publicProfileKey(identityId) {
  if (typeof identityId !== 'string' || !identityId) {
    throw new Error('Invalid Signal identity id')
  }

  return 'signal-profile/' + Buffer.from(identityId).toString('base64url')
}

async function provisionSignalProfile({ signal, privateState, identityId }) {
  const profileKey = publicProfileKey(identityId)
  const existing = await privateState.get(profileKey)
  if (existing) {
    if (typeof existing.bundle !== 'string') {
      throw new Error('Invalid stored Signal profile bundle')
    }
    return parsePublicBundle(Buffer.from(existing.bundle, 'base64'))
  }

  let localIdentity = await privateState.get(identityKey(identityId))
  if (!localIdentity) {
    const identity = signal.PrivateKey.generate()
    localIdentity = {
      privateKey: Buffer.from(identity.serialize()).toString('base64'),
      registrationId: randomInt(1, MAX_REGISTRATION_ID + 1),
    }
    await privateState.put(identityKey(identityId), localIdentity)
  }

  const staged = await createStagedSignalStore({
    signal,
    privateState,
    identityId,
  })
  try {
    const identity = await staged.store.getIdentityKey()
    const preKey = signal.PrivateKey.generate()
    const signedPreKey = signal.PrivateKey.generate()
    const kyberPreKey = signal.KEMKeyPair.generate()
    const signedPreKeySignature = identity.sign(
      signedPreKey.getPublicKey().serialize(),
    )
    const kyberPreKeySignature = identity.sign(
      kyberPreKey.getPublicKey().serialize(),
    )

    await staged.store.savePreKey(
      1,
      signal.PreKeyRecord.new(1, preKey.getPublicKey(), preKey),
    )
    await staged.store.saveSignedPreKey(
      2,
      signal.SignedPreKeyRecord.new(
        2,
        Date.now(),
        signedPreKey.getPublicKey(),
        signedPreKey,
        signedPreKeySignature,
      ),
    )
    await staged.store.saveKyberPreKey(
      3,
      signal.KyberPreKeyRecord.new(
        3,
        Date.now(),
        kyberPreKey,
        kyberPreKeySignature,
      ),
    )

    const bundle = {
      registrationId: localIdentity.registrationId,
      deviceId: 1,
      identityKey: Buffer.from(identity.getPublicKey().serialize()),
      preKey: {
        id: 1,
        publicKey: Buffer.from(preKey.getPublicKey().serialize()),
      },
      signedPreKey: {
        id: 2,
        publicKey: Buffer.from(signedPreKey.getPublicKey().serialize()),
        signature: Buffer.from(signedPreKeySignature),
      },
      kyberPreKey: {
        id: 3,
        publicKey: Buffer.from(kyberPreKey.getPublicKey().serialize()),
        signature: Buffer.from(kyberPreKeySignature),
      },
    }
    const serialized = serializePublicBundle(bundle)
    await staged.commit([
      {
        type: 'put',
        key: profileKey,
        value: {
          bundle: serialized.toString('base64'),
        },
      },
    ])
    return bundle
  } catch (error) {
    staged.discard()
    throw error
  }
}

module.exports = {
  provisionSignalProfile,
  publicProfileKey,
}