const channels = {
  capabilities: 'finney:signal:capabilities',
  publishProfile: 'finney:signal:publish-profile',
  setupSession: 'finney:signal:setup-session',
  encrypt: 'finney:signal:encrypt',
  decrypt: 'finney:signal:decrypt',
}

function registerSignalIpc({ ipcMain, getWebContents }) {
  ipcMain.handle(channels.capabilities, event => {
    if (event.sender !== getWebContents()) {
      throw new Error('Untrusted Signal IPC sender')
    }
    return { enabled: false, version: 0 }
  })

  for (const channel of [
    channels.publishProfile,
    channels.setupSession,
    channels.encrypt,
    channels.decrypt,
  ]) {
    ipcMain.handle(channel, event => {
      if (event.sender !== getWebContents()) {
        throw new Error('Untrusted Signal IPC sender')
      }
      throw new Error('Signal messaging is not enabled')
    })
  }
}

module.exports = { channels, registerSignalIpc }
