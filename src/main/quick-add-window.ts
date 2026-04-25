import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'

let quickAddWindow: BrowserWindow | null = null

function getQuickAddUrl(): string {
  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  if (rendererUrl) {
    return `${rendererUrl}/quick-add.html`
  }

  return join(__dirname, '../renderer/quick-add.html')
}

export function openQuickAddWindow(): void {
  if (quickAddWindow && !quickAddWindow.isDestroyed()) {
    quickAddWindow.focus()
    return
  }

  quickAddWindow = new BrowserWindow({
    width: 340,
    height: 180,
    frame: false,
    resizable: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      sandbox: false
    }
  })

  const target = getQuickAddUrl()
  if (process.env.ELECTRON_RENDERER_URL) {
    void quickAddWindow.loadURL(target)
  } else {
    void quickAddWindow.loadFile(target)
  }

  quickAddWindow.once('ready-to-show', () => {
    quickAddWindow?.show()
    quickAddWindow?.focus()
  })
  quickAddWindow.on('blur', () => quickAddWindow?.close())
  quickAddWindow.on('closed', () => {
    quickAddWindow = null
  })
}

ipcMain.on('quick-add:close', () => {
  quickAddWindow?.close()
})
