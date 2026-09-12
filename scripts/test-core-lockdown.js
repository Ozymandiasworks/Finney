#!/usr/bin/env node

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function sha256(relative) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(root, relative)))
    .digest('hex')
}

// These three files define the proven stamp-key math, message/stamp constructor,
// and canonical eCash transaction-id behavior. Alpha.20 deliberately locks them
// to the alpha.19 core-working baseline. Future protocol changes must update this
// manifest intentionally rather than silently changing the proven mechanism.
const coreHashes = {
  'src/cashweb/relay/crypto.ts':
    'cf6e163925a7e6d88792da945dd914555d16eda3bfc75c9138ed3fee02ac00ee',
  'src/cashweb/relay/constructors.ts':
    'f184f025f345d02f044a0cc542f3374b5f457b7d55d9184c9d849d58f94186ab',
  'local_modules/bitcore-lib-xec/lib/transaction/transaction.js':
    'b6174070999db7b69922655dad5b36ac70c3ff087a43e3a9d45d138ee1975f5b',
}

for (const [file, expected] of Object.entries(coreHashes)) {
  const actual = sha256(file)
  assert(actual === expected, `Core-lock hash changed for ${file}: ${actual}`)
  console.log(`PASS: core-lock hash ${file}`)
}

const constants = read('src/utils/constants.ts')
assert(
  /export const SATS_PER_XEC = 100\b/.test(constants),
  '1 XEC must remain exactly 100 satoshis',
)
assert(
  /export const XEC_DUST_SATS = 546\b/.test(constants),
  'XEC dust/message stamp baseline must remain 546 satoshis',
)
assert(
  /export const defaultAcceptancePrice = XEC_DUST_SATS\b/.test(constants),
  'Default recipient acceptance price no longer equals XEC dust',
)
assert(
  /export const defaultStampAmount = XEC_DUST_SATS\b/.test(constants),
  'Default outbound stamp amount no longer equals XEC dust',
)
console.log('PASS: XEC denomination and 5.46 XEC stamp constants locked')

const relay = read('src/cashweb/relay/index.ts')
const sendStart = relay.indexOf('  async sendMessageImpl({')
const sendEnd = relay.indexOf('\n  // Stub for original API', sendStart)
assert(sendStart >= 0 && sendEnd > sendStart, 'Unable to isolate sendMessageImpl')
const send = relay.slice(sendStart, sendEnd)

function ordered(...needles) {
  let cursor = -1
  for (const needle of needles) {
    const found = send.indexOf(needle, cursor + 1)
    assert(found >= 0, `sendMessageImpl is missing ${needle}`)
    assert(found > cursor, `sendMessageImpl ordering changed around ${needle}`)
    cursor = found
  }
}

ordered(
  'constructMessage(',
  'checkAndFixUtxos(stagedUtxos)',
  'validateMessages(destinationAddress, messageSet)',
  'chronikClient.broadcastTxs(',
  'pushMessagesWithRetry(destinationAddress, messageSet)',
  'this.messageStore.saveMessage(persistedOutgoingMessage)',
  "this.events.emit('messageSent'",
)
assert(
  (send.match(/chronikClient\.broadcastTxs\(/g) || []).length === 1,
  'sendMessageImpl contains more than one XEC broadcast path',
)
assert(
  !send.includes('this.sendMessageImpl('),
  'sendMessageImpl recursively calls itself and could repay a stamp on retry',
)
assert(
  send.includes('deliveryPending: true'),
  'post-broadcast relay failures are not marked delivery-pending',
)
assert(
  send.includes('No replacement stamp was created'),
  'single-paid-stamp safety diagnostic is missing',
)
console.log('PASS: preflight-before-broadcast and one-paid-stamp retry invariants locked')

const retryStart = relay.indexOf('  async pushMessagesWithRetry(')
const retryEnd = relay.indexOf('\n  async sendMessageImpl', retryStart)
assert(
  retryStart >= 0 && retryEnd > retryStart,
  'Unable to isolate pushMessagesWithRetry',
)
const retry = relay.slice(retryStart, retryEnd)
assert(
  retry.includes('await this.pushMessages(address, messageSet)'),
  'relay retry does not reuse the supplied message set',
)
assert(
  !retry.includes('new MessageSet') &&
    !retry.includes('constructMessage(') &&
    !retry.includes('broadcastTxs('),
  'relay retry can rebuild a message or create another paid stamp',
)
console.log('PASS: relay retry reuses one immutable paid envelope')

const chats = read('src/stores/chats.ts')
assert(
  chats.includes('this.chats[displayAddress] = chat') &&
    chats.includes('chat.messages.push(message)'),
  'Sender chat creation/display regression detected',
)
assert(
  relay.includes('this.messageStore.saveMessage(persistedOutgoingMessage)'),
  'Sender history persistence regression detected',
)
console.log('PASS: sender display and persistence invariants locked')

assert(
  relay.includes('deriveReceivedStampKeys(') &&
    relay.includes('resolveLiveReceivedStamp(') &&
    relay.includes('Resolved legacy received stamp to canonical XEC outpoint'),
  'Received-stamp restart/canonical recovery path is missing',
)
console.log('PASS: recipient stamp restart/canonical recovery path present')

const chatMessage = read('src/components/chat/messages/ChatMessage.vue')
assert(
  chatMessage.includes('const showDevelopmentStampControls = false'),
  'Development stamp redemption control is not hidden from normal chat UI',
)
console.log('PASS: development redemption control hidden from normal UI')

const topic = read('src/pages/Topic.vue')
assert(
  topic.includes('const topicRefreshIntervalMs = 15_000'),
  'Topic polling is not using the stabilized 15-second interval',
)
assert(
  !topic.includes('setTimeout(timedRefresh, 1000)'),
  'Inherited one-second topic polling is still active',
)
console.log('PASS: inherited one-second topic polling removed')

const secondLauncher = read('scripts/run-second-test-client.ps1')
assert(
  !secondLauncher.includes('Do not fund either test identity yet'),
  'Obsolete launcher funding warning is still present',
)
const launcher = read('scripts/run-windows.ps1')
assert(
  launcher.includes('$logName') &&
    launcher.includes('All output is also being saved to '),
  'Launcher no longer reports the per-instance log filename',
)
console.log('PASS: launcher diagnostics reflect current test workflow')

console.log('Finney alpha.20 core-lock regression checks passed.')
