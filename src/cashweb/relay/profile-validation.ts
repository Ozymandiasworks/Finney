import assert from 'assert'
import { PublicKey, crypto } from 'bitcore-lib-xec'
import { SignedPayload } from '../signed_payload/payload_pb'

const ECDSA_SCHEME = 1
const COMPACT_SIGNATURE_HEADER = 32
const COMPACT_SIGNATURE_LENGTH = 64

export function verifyProfileMetadata(
  metadata: SignedPayload,
  address: string,
  networkName: string,
) {
  assert(
    metadata.getScheme() === ECDSA_SCHEME,
    'unsupported profile signature scheme',
  )

  const rawPublicKey = metadata.getPublicKey()
  const rawSignature = metadata.getSignature()
  const rawPayload = metadata.getPayload()
  assert(typeof rawPublicKey !== 'string', 'invalid profile public key')
  assert(typeof rawSignature !== 'string', 'invalid profile signature')
  assert(typeof rawPayload !== 'string', 'invalid profile payload')
  assert(
    rawSignature.length === COMPACT_SIGNATURE_LENGTH,
    'invalid profile signature length',
  )

  const publicKey = PublicKey.fromBuffer(Buffer.from(rawPublicKey))
  const profileAddress = publicKey.toAddress(networkName).toCashAddress()
  assert(
    profileAddress === address,
    'profile signing key does not match address',
  )

  const signature = crypto.Signature.fromCompact(
    Buffer.concat([
      Buffer.from([COMPACT_SIGNATURE_HEADER]),
      Buffer.from(rawSignature),
    ]),
  )
  const digest = crypto.Hash.sha256(Buffer.from(rawPayload))
  assert(
    crypto.ECDSA.verify(digest, signature, publicKey),
    'invalid profile signature',
  )

  return {
    publicKey,
    rawPayload,
  }
}
