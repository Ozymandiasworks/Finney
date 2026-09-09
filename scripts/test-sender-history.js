const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const chats = fs.readFileSync(path.join(root, 'src/stores/chats.ts'), 'utf8')
const relay = fs.readFileSync(path.join(root, 'src/cashweb/relay/index.ts'), 'utf8')

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(
  chats.includes('this.chats[displayAddress] = chat') &&
    chats.includes('chat.messages.push(message)'),
  'Sender chat state is not created/populated for a new outbound conversation',
)
assert(
  chats.includes('senderDisplayAddress === displayAddress'),
  'Self-send guard is missing',
)
assert(
  relay.includes('this.messageStore.saveMessage(persistedOutgoingMessage)'),
  'Successful outbound messages are not persisted locally',
)

console.log('PASS: sender-side chat display and persistence guards present')
