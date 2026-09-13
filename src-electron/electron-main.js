/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import {
  app,
  BrowserWindow,
  nativeTheme,
  Tray,
  Menu,
  shell,
  nativeImage,
  safeStorage,
  session,
} from 'electron'
import path from 'path'
import fs from 'fs'
import Badge from 'electron-windows-badge'
import { verifyPrivateStateRuntime, verifySignalRuntime } from './signal-runtime'

// Development test instances may use separate Electron user-data roots so two
// independent Finney identities can run on the same Windows account without
// sharing IndexedDB/LevelDB/session state. Production/default launches keep the
// normal Finney userData path.
const FINNEY_INSTANCE_ID = process.env.FINNEY_INSTANCE_ID || ''
if (FINNEY_INSTANCE_ID) {
  const defaultUserData = app.getPath('userData')
  app.setPath('userData', `${defaultUserData}-${FINNEY_INSTANCE_ID}`)
  console.log(
    `Finney isolated test instance ${FINNEY_INSTANCE_ID}: ${app.getPath('userData')}`,
  )
}

// Chromium's single-instance lock is scoped after the isolated userData path is
// selected, allowing Test-A and Test-B to coexist while still preventing two
// copies of the same identity store from opening accidentally.
const isSingleInstance = app.requestSingleInstanceLock()
if (!isSingleInstance) {
  console.warn(
    `Another Finney instance${
      FINNEY_INSTANCE_ID ? ` (${FINNEY_INSTANCE_ID})` : ''
    } is already running; check the Windows system tray.`,
  )
  app.quit()
}

try {
  if (
    process.platform === 'win32' &&
    nativeTheme.shouldUseDarkColors === true
  ) {
    fs.unlinkSync(path.join(app.getPath('userData'), 'DevTools Extensions'))
  }
  // eslint-disable-next-line no-empty
} catch (_) {}

/**
 * Set `__statics` path to static files in production;
 * The reason we are setting it here is that the path needs to be evaluated at runtime
 */
if (process.env.PROD) {
  global.__statics = __dirname
}

function getIconPNGPath() {
  // NOTE: This use to be platform specific, and may need to be again in the future.
  return path.join(__dirname, '../icons/linux-512x512.png')
}

let mainWindow
let tray
let windowsBadgeUpdater
const nativeIconSmall = nativeImage
  .createFromPath(getIconPNGPath())
  .resize({ width: 16, height: 16 })
const nativeIcon = nativeImage.createFromPath(getIconPNGPath())

// Privacy-by-design transport: all external renderer HTTP(S) and WebSocket
// traffic is forced through a SOCKS5 Tor proxy. There is intentionally no
// direct-network fallback. Localhost remains direct for the development relay
// and Quasar dev server.
const TOR_PROXY = process.env.FINNEY_TOR_PROXY || 'socks5://127.0.0.1:9050'

function isSafeExternalHttpUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch (_) {
    return false
  }
}

async function configurePrivacyTransport() {
  await session.defaultSession.setProxy({
    mode: 'fixed_servers',
    proxyRules: TOR_PROXY,
    proxyBypassRules: '<local>',
  })

  console.log(`Finney privacy transport configured: ${TOR_PROXY}`)
}

function createWindow() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Finney',
      click: function () {
        mainWindow.show()
      },
    },
    {
      label: 'Quit Finney',
      click: function () {
        mainWindow.destroy()
        app.quit()
      },
    },
  ])

  tray = new Tray(nativeIconSmall)
  tray.setContextMenu(contextMenu)
  tray.setToolTip(
    FINNEY_INSTANCE_ID ? `Finney (${FINNEY_INSTANCE_ID})` : 'Finney',
  )

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    icon: nativeIcon,
    useContentSize: true,
    title: FINNEY_INSTANCE_ID ? `Finney (${FINNEY_INSTANCE_ID})` : 'Finney',
    webPreferences: {
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD),
      contextIsolation: true,
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  })

  windowsBadgeUpdater = new Badge(mainWindow, {})


  let forceQuit = false
  if (process.platform === 'darwin') {
    app.on('before-quit', function () {
      forceQuit = true
    })
  }

  mainWindow.loadURL(process.env.APP_URL)

  mainWindow.on('close', function (event) {
    if (forceQuit) {
      return
    }
    event.preventDefault()
    mainWindow.hide()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (url !== e.sender.getURL()) {
      e.preventDefault()
      if (isSafeExternalHttpUrl(url)) {
        shell.openExternal(url)
      } else {
        console.warn('Blocked unsupported external navigation')
      }
    }
  })
}

app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  }
})

app.whenReady().then(async () => {
  try {
    if (process.env.FINNEY_SIGNAL_RUNTIME_SMOKE === '1') {
      await verifySignalRuntime()
      await verifyPrivateStateRuntime({
        location: path.join(app.getPath('temp'), 'finney-private-state-smoke'),
        safeStorage,
      })
      app.quit()
      return
    }
    await configurePrivacyTransport()
    createWindow()
  } catch (err) {
    // Fail closed. Starting without the requested privacy transport would
    // violate Finney's transport assumptions.
    console.error('Unable to configure Finney Tor transport:', err)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
