const fs = require('fs')
const path = require('path')
const electron = require('electron')
const { app, BrowserWindow, protocol, session, safeStorage, Menu } = electron
const { LAB_ROOT, GuardError, refuse, parseRecord, validateConfig, validateLaunch, SHELL_URL, STYLE_URL } = require('./policy')
const { inspectBoundary, acquireProfile, regularPath } = require('./profile')
const { closeNativeRoutes, guardSession, guardContents, windowOptions } = require('./guards')

let profile
let window

function fail(error) {
  const code = error instanceof GuardError ? error.code : 'STARTUP_UNAVAILABLE'
  process.stderr.write(`${code}\n`)
  if (profile) {
    try { profile.close() } catch { process.stderr.write('PROFILE_LOCK_CLEANUP_FAILED\n') }
  }
  app.exit(1)
}

try {
  if (!app.isPackaged) refuse('PACKAGED_ENTRY_REQUIRED')
  if (process.versions.electron !== '44.3.0') refuse('UNQUALIFIED_RUNTIME')
  const config = validateConfig(parseRecord(fs.readFileSync(path.join(__dirname, 'configuration.json'), 'utf8')))
  const launch = validateLaunch(process.argv.slice(1), process.env)
  for (const flag of ['no-sandbox', 'disable-setuid-sandbox', 'disable-web-security',
    'remote-debugging-port', 'remote-debugging-pipe', 'inspect', 'inspect-brk',
    'js-flags', 'load-extension', 'user-data-dir']) {
    if (app.commandLine.hasSwitch(flag)) refuse('UNSAFE_RUNTIME_SWITCH')
  }
  const boundary = inspectBoundary(config.network, launch.profile)
  profile = acquireProfile(boundary, launch.create)
  const protectionDirectory = path.join(LAB_ROOT, 'runtime',
    `a1-userdata-${config.network}-${launch.profile}`)
  if (launch.create) fs.mkdirSync(protectionDirectory)
  else if (!fs.existsSync(protectionDirectory)) refuse('PROTECTION_STATE_MISSING')
  regularPath(protectionDirectory, true)
  if (!launch.create) {
    const localState = path.join(protectionDirectory, 'Local State')
    if (!fs.existsSync(localState)) refuse('PROTECTION_STATE_MISSING')
    regularPath(localState, false)
  }
  // Electron 44 stores Windows OSCrypt's Local State under sessionData.
  // Both paths must survive process exit; the renderer partition is in-memory.
  app.setPath('userData', protectionDirectory)
  app.setPath('sessionData', protectionDirectory)
  app.enableSandbox()
  app.commandLine.appendSwitch('disable-background-networking')
  app.commandLine.appendSwitch('disable-component-update')
  app.commandLine.appendSwitch('disable-domain-reliability')
  app.commandLine.appendSwitch('no-proxy-server')
  app.commandLine.appendSwitch('host-resolver-rules', 'MAP * ~NOTFOUND')
  app.commandLine.appendSwitch('disable-features', 'MediaRouter')
  app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'disable_non_proxied_udp')
  protocol.registerSchemesAsPrivileged([{ scheme: 'finney-offline',
    privileges: { standard: true, secure: true, supportFetchAPI: false, allowServiceWorkers: false } }])
  closeNativeRoutes(electron)
  app.on('web-contents-created', (_event, contents) => guardContents(contents))
  app.on('certificate-error', (event, _contents, _url, _error, _certificate, callback) => {
    event.preventDefault()
    callback(false)
  })
  app.on('login', (event, _contents, _details, _authInfo, callback) => {
    event.preventDefault()
    callback()
  })
  app.on('open-url', event => event.preventDefault())
  app.on('open-file', event => event.preventDefault())
  app.whenReady().then(async () => {
    profile.finish(safeStorage)
    const offlineSession = session.fromPartition('finney-a1-offline', { cache: false })
    if (offlineSession.isPersistent()) refuse('PERSISTENT_RENDERER_SESSION_DENIED')
    guardSession(session.defaultSession)
    guardSession(offlineSession)
    const assets = new Map([
      [SHELL_URL, { bytes: fs.readFileSync(path.join(__dirname, 'shell.html')), type: 'text/html; charset=utf-8' }],
      [STYLE_URL, { bytes: fs.readFileSync(path.join(__dirname, 'shell.css')), type: 'text/css; charset=utf-8' }],
    ])
    offlineSession.protocol.handle('finney-offline', request => {
      const asset = request.method === 'GET' && assets.get(request.url)
      if (!asset) return new Response(null, { status: 403 })
      return new Response(asset.bytes, { headers: {
        'Content-Type': asset.type, 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; style-src 'self'; script-src 'none'; connect-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      } })
    })
    Menu.setApplicationMenu(null)
    window = new BrowserWindow(windowOptions(offlineSession))
    const visible = new Promise(resolve => window.once('ready-to-show', () => {
      window.show()
      resolve()
    }))
    window.webContents.on('render-process-gone', () => app.exit(1))
    await window.loadURL(SHELL_URL)
    await visible
    process.stdout.write(JSON.stringify({ event: 'offline-shell-ready', stage: 'A1',
      network: config.network, profile: launch.profile, versions: process.versions,
      processId: process.pid, windowVisible: window.isVisible(),
      storage: { userData: app.getPath('userData'), sessionData: app.getPath('sessionData'),
        rendererPersistent: offlineSession.isPersistent() },
      preferences: { sandbox: window.webContents.getLastWebPreferences().sandbox,
        contextIsolation: window.webContents.getLastWebPreferences().contextIsolation,
        nodeIntegration: window.webContents.getLastWebPreferences().nodeIntegration,
        preload: window.webContents.getLastWebPreferences().preload || null },
      capabilities: 'none', outbound: 'denied', wallet: 'not-created' }) + '\n')
  }).catch(fail)
} catch (error) {
  fail(error)
}

app.on('window-all-closed', () => app.quit())
app.on('will-quit', () => {
  if (profile) {
    try { profile.close() } catch { process.stderr.write('PROFILE_LOCK_CLEANUP_FAILED\n') }
  }
})
