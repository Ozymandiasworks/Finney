const assert = require('assert')
const { channels, registerSignalIpc } = require('../src-electron/signal-ipc')

const handlers = new Map()
const sender = {}
registerSignalIpc({
  ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
  getWebContents: () => sender,
})

assert.strictEqual(handlers.size, 5)
assert.deepStrictEqual(handlers.get(channels.capabilities)({ sender }), {
  enabled: false,
  version: 0,
})
assert.throws(
  () => handlers.get(channels.capabilities)({ sender: {} }),
  /Untrusted/,
)
for (const channel of [
  channels.publishProfile,
  channels.setupSession,
  channels.encrypt,
  channels.decrypt,
]) {
  assert.throws(() => handlers.get(channel)({ sender }), /not enabled/)
}
console.log('PASS: Signal IPC is fixed-purpose, sender-bound and disabled')
