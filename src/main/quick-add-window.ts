import { BrowserWindow, ipcMain } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

let quickAddWindow: BrowserWindow | null = null
const moduleDir = dirname(fileURLToPath(import.meta.url))

interface OpenQuickAddWindowOptions {
  value?: string
}

function loadQuickAddWindow(
  window: BrowserWindow,
  { value = '' }: OpenQuickAddWindowOptions = {}
): void {
  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  const query = new URLSearchParams()
  if (value) {
    query.set('value', value)
  }

  if (rendererUrl) {
    void window.loadURL(`${rendererUrl}/quick-add.html?${query.toString()}`)
    return
  }

  void window.loadFile(join(moduleDir, '../renderer/quick-add.html'), {
    search: `?${query.toString()}`
  })
}

export function openQuickAddWindow(options: OpenQuickAddWindowOptions = {}): void {
  if (quickAddWindow && !quickAddWindow.isDestroyed()) {
    loadQuickAddWindow(quickAddWindow, options)
    quickAddWindow.focus()
    return
  }

  quickAddWindow = new BrowserWindow({
    width: 480,
    height: 440,
    frame: false,
    resizable: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(moduleDir, '../preload/index.mjs'),
      contextIsolation: true,
      sandbox: false
    }
  })

  loadQuickAddWindow(quickAddWindow, options)

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
