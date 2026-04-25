import 'dotenv/config'
import { join } from 'node:path'
import cron from 'node-cron'
import { BrowserWindow, app, globalShortcut, ipcMain, shell } from 'electron'
import { MIDNIGHT_CRON, REMINDER_CHECK_CRON } from '../shared/constants'
import { addToCalendar } from './calendar'
import { fireMorningDigest, shouldFireDigest } from './cron/morning-digest'
import { notifyMidnight, runMidnightPromotion } from './cron/midnight'
import { checkReminders } from './cron/reminders'
import { getDb } from './db/connection'
import { getItemsByPriority } from './api/items'
import { openQuickAddWindow } from './quick-add-window'
import { startServer } from './server'
import { startTelegramPoller } from './telegram/poller'
import { createAppTray, TrayController } from './tray'

let mainWindow: BrowserWindow | null = null
let trayController: TrayController | null = null
let isQuitting = false
let stopTelegramPoller = () => {}

function registerIpcHandlers(): void {
  ipcMain.removeHandler('calendar:add')
  ipcMain.handle('calendar:add', async (_event, options) => addToCalendar(options))

  ipcMain.removeHandler('autostart:get')
  ipcMain.handle('autostart:get', () => {
    if (process.platform !== 'win32') {
      return false
    }
    return app.getLoginItemSettings().openAtLogin
  })

  ipcMain.removeHandler('autostart:set')
  ipcMain.handle('autostart:set', (_event, enabled: boolean) => {
    if (process.platform === 'win32') {
      app.setLoginItemSettings({ openAtLogin: enabled })
    }
  })
}

function getMainWindowUrl(): string {
  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  if (rendererUrl) {
    return rendererUrl
  }

  return join(__dirname, '../renderer/index.html')
}

function updateTrayCounts(): void {
  if (!trayController) {
    return
  }

  const db = getDb()
  const todayCount = getItemsByPriority(db, 'today').length
  const forNowCount = getItemsByPriority(db, 'for-now').length
  trayController.updateTooltip(todayCount + forNowCount)
}

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow()
    return
  }

  mainWindow.show()
  mainWindow.focus()
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1120,
    minHeight: 720,
    show: false,
    backgroundColor: '#020617',
    title: 'Cortex',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(getMainWindowUrl())
  } else {
    void mainWindow.loadFile(getMainWindowUrl())
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    updateTrayCounts()
  })
  mainWindow.webContents.once('did-finish-load', () => {
    if (!mainWindow?.isVisible()) {
      mainWindow?.show()
    }
    updateTrayCounts()
  })

  mainWindow.on('close', (event) => {
    if (isQuitting) {
      return
    }

    event.preventDefault()
    mainWindow?.hide()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  registerIpcHandlers()

  startServer(getDb(), {
    onItemsChanged: updateTrayCounts
  })

  createMainWindow()
  stopTelegramPoller = startTelegramPoller(getDb(), (count) => {
    updateTrayCounts()
    console.log(`[telegram] ${count} new item(s) from Telegram`)
  })

  trayController = createAppTray({
    showMainWindow,
    openQuickAdd: openQuickAddWindow,
    quit: () => {
      isQuitting = true
      app.quit()
    }
  })
  updateTrayCounts()

  globalShortcut.register('CommandOrControl+Shift+N', () => {
    openQuickAddWindow()
  })

  cron.schedule(REMINDER_CHECK_CRON, () => {
    checkReminders(getDb())
    updateTrayCounts()
  })

  cron.schedule(MIDNIGHT_CRON, () => {
    const result = runMidnightPromotion(getDb())
    notifyMidnight(result)
    updateTrayCounts()
  })

  cron.schedule(REMINDER_CHECK_CRON, () => {
    if (shouldFireDigest(getDb())) {
      fireMorningDigest(getDb())
    }
  })

  app.on('activate', () => {
    showMainWindow()
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  trayController?.destroy()
  stopTelegramPoller()
})
