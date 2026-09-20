const { denyCapability, requestAllowed, SHELL_URL } = require('./policy')

function blockMethods(target, names) {
  for (const name of names) {
    if (typeof target[name] === 'function') {
      Object.defineProperty(target, name, { value: denyCapability, writable: false, configurable: false })
    }
  }
}

function closeNativeRoutes(electron) {
  blockMethods(require('http'), ['request', 'get', 'createServer'])
  blockMethods(require('https'), ['request', 'get', 'createServer'])
  const net = require('net')
  blockMethods(net, ['connect', 'createConnection', 'createServer'])
  blockMethods(net.Socket.prototype, ['connect'])
  blockMethods(require('tls'), ['connect', 'createServer'])
  blockMethods(require('dgram'), ['createSocket'])
  for (const dns of [require('dns'), require('dns').promises]) {
    blockMethods(dns, Object.keys(dns).filter(name => /^(lookup|resolve|reverse|setServers)/.test(name)))
    blockMethods(dns.Resolver.prototype, Object.getOwnPropertyNames(dns.Resolver.prototype)
      .filter(name => /^(resolve|reverse|setServers)/.test(name)))
  }
  blockMethods(require('child_process'), ['spawn', 'spawnSync', 'exec', 'execSync',
    'execFile', 'execFileSync', 'fork'])
  blockMethods(require('worker_threads'), ['Worker'])
  blockMethods(electron.net, ['request', 'fetch', 'resolveHost'])
  blockMethods(electron.shell, ['openExternal', 'openPath', 'showItemInFolder', 'trashItem'])
  blockMethods(electron.utilityProcess, ['fork'])
  blockMethods(electron.autoUpdater, ['setFeedURL', 'checkForUpdates', 'quitAndInstall'])
  blockMethods(globalThis, ['fetch', 'WebSocket', 'EventSource'])
  require('module').syncBuiltinESMExports()
}

function guardSession(session) {
  session.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !requestAllowed(details.url, details.method, details.resourceType) })
  })
  session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  session.setPermissionCheckHandler(() => false)
  session.setDevicePermissionHandler(() => false)
  session.setDisplayMediaRequestHandler((_request, callback) => callback({}))
  session.on('will-download', event => event.preventDefault())
  blockMethods(session, ['resolveHost', 'fetch', 'createInterruptedDownload', 'downloadURL'])
}

function guardContents(contents) {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
  for (const name of ['will-navigate', 'will-frame-navigate', 'will-redirect', 'will-attach-webview']) {
    contents.on(name, event => event.preventDefault())
  }
  contents.on('select-bluetooth-device', (event, _devices, callback) => {
    event.preventDefault()
    callback('')
  })
  contents.on('will-prevent-unload', event => event.preventDefault())
}

function windowOptions(session) {
  return {
    width: 800, height: 520, show: false, title: 'Finney — Offline experiment',
    webPreferences: {
      session, sandbox: true, contextIsolation: true, nodeIntegration: false,
      nodeIntegrationInWorker: false, nodeIntegrationInSubFrames: false,
      webviewTag: false, webSecurity: true, allowRunningInsecureContent: false,
      devTools: false, navigateOnDragDrop: false, spellcheck: false,
      disableDialogs: true,
    },
  }
}

module.exports = { closeNativeRoutes, guardSession, guardContents, windowOptions, SHELL_URL }
