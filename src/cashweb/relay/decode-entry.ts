import assert from 'assert'
import type { ReplyItem, StealthItem, ImageItem } from '../types/messages'
import { PayloadEntry } from './relay_pb'
import { entryToImage } from './images'
import stealth from './stealth_pb'
import { TextItem, MessageItem } from '../types/messages'
import { PublicKey, crypto, Transaction, HDPrivateKey } from 'bitcore-lib-xec'
import { Utxo } from '../types/utxo'

export async function decodeEntry(
  entry: PayloadEntry,
  outbound: boolean,
  {
    networkName,
    constructHDStealthPrivateKey,
  }: {
    networkName: string
    constructHDStealthPrivateKey: (pubKey: PublicKey) => HDPrivateKey
  },
): Promise<[MessageItem, Utxo[], Utxo[]] | null> {
  // If address data doesn't exist then add it
  const kind = entry.getKind()
  const outpoints: Utxo[] = []

  if (kind === 'reply') {
    const entryData = entry.getBody()
    const payloadDigest = Buffer.from(entryData).toString('hex')
    return [
      {
        type: 'reply',
        payloadDigest,
      } as ReplyItem,
      outpoints,
      [],
    ]
  }

  if (kind === 'text-utf8') {
    const entryData = entry.getBody()
    if (typeof entryData === 'string') {
      return [
        {
          type: 'text',
          text: entryData,
        } as TextItem,
        outpoints,
        [],
      ]
    }
    assert(
      typeof entryData !== 'string',
      `text entry data was a string ${entryData}`,
    )
    const text = new TextDecoder().decode(entryData)
    return [
      {
        type: 'text',
        text,
      } as TextItem,
      outpoints,
      [],
    ]
  }

  if (kind === 'stealth-payment') {
    const walletUtxos: Utxo[] = []
    const entryData = entry.getBody()
    assert(
      typeof entryData !== 'string',
      'entryData should not have string type',
    )
    const stealthMessage =
      stealth.StealthPaymentEntry.deserializeBinary(entryData)

    // Add stealth outputs
    const outpointsList = stealthMessage.getOutpointsList()
    const ephemeralPubKeyRaw = stealthMessage.getEphemeralPubKey()
    const ephemeralPubKey = PublicKey.fromBuffer(
      Buffer.from(ephemeralPubKeyRaw),
    )
    const stealthHDPrivKey = constructHDStealthPrivateKey(ephemeralPubKey)

    let stealthValue = 0
    for (const [i, outpoint] of outpointsList.entries()) {
      const stealthTxRaw = Buffer.from(outpoint.getStealthTx())
      const stealthTx = new Transaction(stealthTxRaw)
      const txId = stealthTx.txid
      const vouts = outpoint.getVoutsList()

      for (const [j, outputIndex] of vouts.entries()) {
        if (
          !Number.isInteger(outputIndex) ||
          outputIndex < 0 ||
          outputIndex >= stealthTx.outputs.length
        ) {
          return null
        }
        const output = stealthTx.outputs[outputIndex]
        const satoshis = output.satoshis
        if (!Number.isSafeInteger(satoshis) || satoshis <= 0) {
          return null
        }

        const outpointPrivKey = stealthHDPrivKey
          .deriveChild(44)
          .deriveChild(145)
          .deriveChild(i)
          .deriveChild(j).privateKey
        const address = output.script.toAddress(networkName) // TODO: Make generic
        // Network doesn't really matter here, just serves as a placeholder to avoid needing to compute the
        // HASH160(SHA256(point)) ourself
        // Also, ensure the point is compressed first before calculating the address so the hash is deterministic
        const computedAddress = new PublicKey(
          crypto.Point.pointToCompressed(outpointPrivKey.toPublicKey().point),
        ).toAddress(networkName)
        if (
          !outbound &&
          !address.toBuffer().equals(computedAddress.toBuffer())
        ) {
          console.error('invalid stealth address, ignoring')
          return null
        }
        // total up the satoshis only if we know the txn was valid
        stealthValue += satoshis

        const stampOutput = {
          type: 'stealth',
          address: address.toCashAddress(),
          satoshis,
          outputIndex,
          txId,
        } as Utxo
        outpoints.push(stampOutput)
        if (outbound) {
          continue
        }
        walletUtxos.push({
          ...stampOutput,
          privKey: Object.freeze(outpointPrivKey),
        })
      }
    }
    return [
      {
        type: 'stealth',
        amount: stealthValue,
      } as StealthItem,
      outpoints,
      walletUtxos,
    ]
  }

  if (kind === 'image') {
    const image = entryToImage(entry)
    return [
      {
        type: 'image',
        image,
      } as ImageItem,
      outpoints,
      [],
    ]
  }

  console.error('Unknown entry Kind', kind)
  return null
}
