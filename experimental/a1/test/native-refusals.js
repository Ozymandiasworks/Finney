require('../guest').requireGuest('offline')
const assert = require('assert')
const { closeNativeRoutes } = require('../app/guards')
const noop = () => { throw new Error('Unblocked fixture') }
const electron = { net: { request: noop, fetch: noop, resolveHost: noop },
  shell: { openExternal: noop, openPath: noop, showItemInFolder: noop, trashItem: noop },
  utilityProcess: { fork: noop }, autoUpdater: { setFeedURL: noop, checkForUpdates: noop } }
closeNativeRoutes(electron)
const attempts = [
  () => require('http').get('http://127.0.0.1:1'),
  () => require('https').request('https://example.invalid'),
  () => require('net').connect(1, '127.0.0.1'),
  () => new (require('net').Socket)().connect(1, '127.0.0.1'),
  () => require('tls').connect(1, '127.0.0.1'),
  () => require('dgram').createSocket('udp4'),
  () => require('dns').lookup('example.invalid', () => {}),
  () => require('dns').promises.resolve('example.invalid'),
  () => new (require('dns').Resolver)().resolve('example.invalid', () => {}),
  () => require('child_process').spawn('fixture.exe'),
  () => require('child_process').execFileSync('fixture.exe'),
  () => new (require('worker_threads').Worker)('fixture.js'),
  () => globalThis.fetch('https://example.invalid'),
  () => new globalThis.WebSocket('ws://127.0.0.1:1'),
  () => electron.net.request('https://example.invalid'),
  () => electron.utilityProcess.fork('fixture.js'),
  () => electron.shell.openExternal('https://example.invalid'),
]
for (const attempt of attempts) assert.throws(attempt, error => error.code === 'CAPABILITY_NOT_ACTIVATED')
process.stdout.write('NATIVE_REFUSALS_OK\n')
