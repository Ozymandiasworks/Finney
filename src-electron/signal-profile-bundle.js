const MAX_REGISTRATION_ID = 16380
const MAX_RECORD_ID = 0xffffffff
const BUNDLE_VERSION = 1
const BUNDLE_KIND = 'signal-v2'
const DEVICE_ID = 1
const KEY_LENGTH = 33
const SIGNATURE_LENGTH = 64
const KYBER_KEY_LENGTH = 1569
const MAX_SERIALIZED_LENGTH = 4096

function assertInteger(value, name, max) {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new Error('Invalid ' + name)
  }
}

function encode(value) {
  return Buffer.from(value).toString('base64')
}

function decode(value, name, length) {
  if (typeof value !== 'string') {
    throw new Error('Invalid ' + name)
  }

  const decoded = Buffer.from(value, 'base64')
  if (decoded.length !== length || encode(decoded) !== value) {
    throw new Error('Invalid ' + name)
  }

  return decoded
}

function validateBundle(bundle) {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
    throw new Error('Invalid Signal profile bundle')
  }

  assertInteger(bundle.registrationId, 'registration id', MAX_REGISTRATION_ID)
  if (bundle.deviceId !== DEVICE_ID) {
    throw new Error('Unsupported Signal device id')
  }
  assertInteger(bundle.preKey?.id, 'pre-key id', MAX_RECORD_ID)
  assertInteger(bundle.signedPreKey?.id, 'signed pre-key id', MAX_RECORD_ID)
  assertInteger(bundle.kyberPreKey?.id, 'Kyber pre-key id', MAX_RECORD_ID)

  const identityKey = Buffer.from(bundle.identityKey)
  const preKey = Buffer.from(bundle.preKey.publicKey)
  const signedPreKey = Buffer.from(bundle.signedPreKey.publicKey)
  const signedPreKeySignature = Buffer.from(bundle.signedPreKey.signature)
  const kyberPreKey = Buffer.from(bundle.kyberPreKey.publicKey)
  const kyberPreKeySignature = Buffer.from(bundle.kyberPreKey.signature)

  for (const [name, value, length] of [
    ['identity key', identityKey, KEY_LENGTH],
    ['pre-key', preKey, KEY_LENGTH],
    ['signed pre-key', signedPreKey, KEY_LENGTH],
    ['signed pre-key signature', signedPreKeySignature, SIGNATURE_LENGTH],
    ['Kyber pre-key', kyberPreKey, KYBER_KEY_LENGTH],
    ['Kyber pre-key signature', kyberPreKeySignature, SIGNATURE_LENGTH],
  ]) {
    if (value.length !== length) {
      throw new Error('Invalid ' + name)
    }
  }

  return {
    registrationId: bundle.registrationId,
    deviceId: bundle.deviceId,
    identityKey,
    preKey: {
      id: bundle.preKey.id,
      publicKey: preKey,
    },
    signedPreKey: {
      id: bundle.signedPreKey.id,
      publicKey: signedPreKey,
      signature: signedPreKeySignature,
    },
    kyberPreKey: {
      id: bundle.kyberPreKey.id,
      publicKey: kyberPreKey,
      signature: kyberPreKeySignature,
    },
  }
}

function serializePublicBundle(bundle) {
  const normalized = validateBundle(bundle)
  return Buffer.from(
    JSON.stringify({
      kind: BUNDLE_KIND,
      version: BUNDLE_VERSION,
      registrationId: normalized.registrationId,
      deviceId: normalized.deviceId,
      identityKey: encode(normalized.identityKey),
      preKey: {
        id: normalized.preKey.id,
        publicKey: encode(normalized.preKey.publicKey),
      },
      signedPreKey: {
        id: normalized.signedPreKey.id,
        publicKey: encode(normalized.signedPreKey.publicKey),
        signature: encode(normalized.signedPreKey.signature),
      },
      kyberPreKey: {
        id: normalized.kyberPreKey.id,
        publicKey: encode(normalized.kyberPreKey.publicKey),
        signature: encode(normalized.kyberPreKey.signature),
      },
    }),
  )
}

function parsePublicBundle(serialized) {
  const raw = Buffer.from(serialized)
  if (!raw.length || raw.length > MAX_SERIALIZED_LENGTH) {
    throw new Error('Invalid Signal profile bundle length')
  }

  let value
  try {
    value = JSON.parse(raw.toString('utf8'))
  } catch (_) {
    throw new Error('Invalid Signal profile bundle encoding')
  }

  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    value.kind !== BUNDLE_KIND ||
    value.version !== BUNDLE_VERSION
  ) {
    throw new Error('Unsupported Signal profile bundle')
  }

  return validateBundle({
    registrationId: value.registrationId,
    deviceId: value.deviceId,
    identityKey: decode(value.identityKey, 'identity key', KEY_LENGTH),
    preKey: {
      id: value.preKey?.id,
      publicKey: decode(value.preKey?.publicKey, 'pre-key', KEY_LENGTH),
    },
    signedPreKey: {
      id: value.signedPreKey?.id,
      publicKey: decode(
        value.signedPreKey?.publicKey,
        'signed pre-key',
        KEY_LENGTH,
      ),
      signature: decode(
        value.signedPreKey?.signature,
        'signed pre-key signature',
        SIGNATURE_LENGTH,
      ),
    },
    kyberPreKey: {
      id: value.kyberPreKey?.id,
      publicKey: decode(
        value.kyberPreKey?.publicKey,
        'Kyber pre-key',
        KYBER_KEY_LENGTH,
      ),
      signature: decode(
        value.kyberPreKey?.signature,
        'Kyber pre-key signature',
        SIGNATURE_LENGTH,
      ),
    },
  })
}

function toPreKeyBundle(signal, bundle) {
  const normalized = validateBundle(bundle)
  const identityKey = signal.PublicKey.deserialize(normalized.identityKey)
  const preKey = signal.PublicKey.deserialize(normalized.preKey.publicKey)
  const signedPreKey = signal.PublicKey.deserialize(
    normalized.signedPreKey.publicKey,
  )
  const kyberPreKey = signal.KEMPublicKey.deserialize(
    normalized.kyberPreKey.publicKey,
  )

  if (
    !identityKey.verify(
      normalized.signedPreKey.publicKey,
      normalized.signedPreKey.signature,
    ) ||
    !identityKey.verify(
      normalized.kyberPreKey.publicKey,
      normalized.kyberPreKey.signature,
    )
  ) {
    throw new Error('Invalid Signal profile bundle signature')
  }

  return signal.PreKeyBundle.new(
    normalized.registrationId,
    normalized.deviceId,
    normalized.preKey.id,
    preKey,
    normalized.signedPreKey.id,
    signedPreKey,
    normalized.signedPreKey.signature,
    identityKey,
    normalized.kyberPreKey.id,
    kyberPreKey,
    normalized.kyberPreKey.signature,
  )
}

module.exports = {
  BUNDLE_KIND,
  BUNDLE_VERSION,
  parsePublicBundle,
  serializePublicBundle,
  toPreKeyBundle,
}