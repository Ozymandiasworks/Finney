/**
 * Finney Electron preload bridge.
 * Keep the renderer's privileged surface deliberately small.
 */

import { contextBridge, ipcRenderer, shell } from 'electron'
import signalIpc from './signal-ipc'

const { channels } = signalIpc

contextBridge.exposeInMainWorld('badge', {
  updateBadge: unread => {
    ipcRenderer.sendSync('update-badge', unread)
  },
  setBadgeCount(count) {
    // Reserved for platform badge support.
  },
})

contextBridge.exposeInMainWorld('url', {
  open: rawUrl => {
    try {
      const url = new URL(rawUrl)
      // Do not allow messages/UI content to invoke file:, custom protocol, or
      // other OS handlers through the Electron bridge.
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        console.warn('Blocked unsupported external URL protocol:', url.protocol)
        return
      }
      // This is an explicit user action and opens in the user's system browser;
      // it is not covered by Finney's Electron Tor session.
      shell.openExternal(url.toString())
    } catch (err) {
      console.warn('Blocked invalid external URL')
    }
  },
})

contextBridge.exposeInMainWorld('signal', {
  capabilities: () => ipcRenderer.invoke(channels.capabilities),
  publishProfile: profile => ipcRenderer.invoke(channels.publishProfile, profile),
  setupSession: bundle => ipcRenderer.invoke(channels.setupSession, bundle),
  encrypt: request => ipcRenderer.invoke(channels.encrypt, request),
  decrypt: envelope => ipcRenderer.invoke(channels.decrypt, envelope),
})
