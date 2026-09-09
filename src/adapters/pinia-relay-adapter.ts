import { RelayClient } from '../cashweb/relay'
import { defaultRelayUrl, networkName } from '../utils/constants'
import { store as levelDbStore } from './level-message-store'
import { toRaw, reactive } from 'vue'
import { Wallet } from 'src/cashweb/wallet'
import { useContactStore } from 'src/stores/contacts'
import { useChatStore } from 'src/stores/chats'

export async function getRelayClient({
  wallet,
  relayUrl = defaultRelayUrl,
}: {
  wallet: Wallet
  relayUrl: string
}) {
  const contacts = useContactStore()
  const chats = useChatStore()

  const observables = reactive({ connected: false })
  const client = new RelayClient(relayUrl, wallet, {
    getPubKey: address => {
      const destPubKey = contacts.getPubKey(address)
      return destPubKey ?? null
    },
    networkName,
    messageStore: await levelDbStore,
  })
  client.events.on('disconnected', () => {
    observables.connected = false
  })
  client.events.on('error', err => {
    console.log(err)
  })
  client.events.on('opened', () => {
    observables.connected = true
  })
  client.events.on(
    'messageSending',
    ({
      address,
      senderAddress,
      index,
      items,
      outpoints,
      // transactions,
      previousHash,
    }) => {
      chats.sendMessageLocal({
        address,
        senderAddress,
        index,
        items,
        outpoints: toRaw(outpoints),
        // transactions,
        previousHash,
        status: 'sending',
      })
    },
  )
  client.events.on(
    'messageSendError',
    ({
      address,
      senderAddress,
      index,
      items,
      outpoints,
      // transactions,
      previousHash,
    }) => {
      chats.sendMessageLocal({
        address,
        senderAddress,
        index,
        items,
        outpoints: toRaw(outpoints),
        // transactions,
        previousHash,
        status: 'error',
      })
    },
  )
  client.events.on(
    'messageSent',
    ({
      address,
      senderAddress,
      index,
      items,
      outpoints,
      // transactions,
      previousHash,
    }) => {
      chats.sendMessageLocal({
        address,
        senderAddress,
        index,
        items,
        outpoints: toRaw(outpoints),
        // transactions,
        previousHash,
        status: 'confirmed',
      })
    },
  )
  client.events.on('receivedMessages', messages => {
    chats.receiveMessages(messages)
  })

  // Received stamp private keys are deterministic and intentionally are not
  // serialized with messages. Reconstruct them into the live wallet on every
  // startup so persisted received stamps remain spendable after restart.
  try {
    await client.rehydrateReceivedStampUtxos()
  } catch (err) {
    console.error('Unable to rehydrate received stamp UTXOs', err)
  }

  return { client, observables }
}
