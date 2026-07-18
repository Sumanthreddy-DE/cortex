import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import cron from 'node-cron'
import { BrowserWindow, app, clipboard, globalShortcut, ipcMain, shell } from 'electron'
import { nanoid } from 'nanoid'
import { APP_NAME, MIDNIGHT_CRON, REMINDER_CHECK_CRON } from '../shared/constants'
import { fetchAndUpdateLinkTitle } from './api/link-fetch'
import { addToCalendar } from './calendar'
import { fireMorningDigest, shouldFireDigest } from './cron/morning-digest'
import { notifyMidnight, runMidnightPromotion } from './cron/midnight'
import { checkReminders } from './cron/reminders'
import { getDb } from './db/connection'
import {
  appendItemNote,
  archiveItem,
  completeItem,
  createItem,
  deleteItemPermanently,
  getAllItems,
  getArchivedItems,
  getCompletedItems,
  getDistinctTags,
  getItemsByPriority,
  restoreItem,
  touchItem,
  uncompleteItem,
  updateItem
} from './api/items'
import { searchItems } from './api/search'
import { getSettings, patchSettings } from './api/settings'
import {
  addItemToSpace,
  createSpace,
  getSpaces,
  removeItemFromSpace,
  setSpaceItemPinned
} from './api/spaces'
import { openQuickAddWindow } from './quick-add-window'
import { loadRuntimeEnv } from './runtime-env'
import { startServer } from './server'
import { startDiscordPoller } from './discord/poller'
import { startTelegramPoller } from './telegram/poller'
import { createAppTray, TrayController } from './tray'

let mainWindow: BrowserWindow | null = null
let trayController: TrayController | null = null
let isQuitting = false
let stopTelegramPoller = () => {}
let stopDiscordPoller = () => {}
const moduleDir = dirname(fileURLToPath(import.meta.url))
const isTestEnv = process.env.PLAYWRIGHT_TEST === '1'

// Unpackaged runs (npm run dev) default userData to %APPDATA%\Electron,
// splitting the DB and .env from the packaged app. Pin both to %APPDATA%\Cortex.
app.setName(APP_NAME)
const hasSingleInstanceLock = isTestEnv || app.requestSingleInstanceLock()

function registerGlobalShortcut(accelerator: string, handler: () => void): void {
  const success = globalShortcut.register(accelerator, handler)
  if (!success) {
    console.warn(`[shortcuts] failed to register ${accelerator}`)
  }
}

function getClipboardUrl(): string {
  const clipboardText = clipboard.readText().trim()
  return /^https?:\/\//i.test(clipboardText) ? clipboardText : ''
}

function registerIpcHandlers(): void {
  ipcMain.removeHandler('data:get-items')
  ipcMain.handle('data:get-items', () => getAllItems(getDb()))

  ipcMain.removeHandler('data:get-archived')
  ipcMain.handle('data:get-archived', () => getArchivedItems(getDb()))

  ipcMain.removeHandler('data:get-completed')
  ipcMain.handle('data:get-completed', () => getCompletedItems(getDb()))

  ipcMain.removeHandler('data:create-item')
  ipcMain.handle('data:create-item', (_event, payload: any) => {
    const db = getDb()
    const item = createItem(db, {
      id: nanoid(),
      type: payload?.type === 'link' ? 'link' : 'idea',
      title: typeof payload?.title === 'string' ? payload.title : '',
      url: typeof payload?.url === 'string' ? payload.url : null,
      note: typeof payload?.note === 'string' ? payload.note : null,
      priority:
        typeof payload?.priority === 'string' &&
        ['inbox', 'today', 'tomorrow', 'this-week', 'someday'].includes(payload.priority)
          ? payload.priority
          : 'inbox',
      tags: Array.isArray(payload?.tags)
        ? payload.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
        : [],
      favicon_url: typeof payload?.favicon_url === 'string' ? payload.favicon_url : null,
      remind_at: typeof payload?.remind_at === 'number' ? payload.remind_at : null
    })
    if (item.type === 'link' && item.url) {
      void fetchAndUpdateLinkTitle(db, item.id, item.url)
    }
    updateTrayCounts()
    return item
  })

  ipcMain.removeHandler('data:fetch-link-title')
  ipcMain.handle('data:fetch-link-title', async (_event, id: string, url: string) => {
    await fetchAndUpdateLinkTitle(getDb(), id, url)
  })

  ipcMain.removeHandler('data:update-item')
  ipcMain.handle('data:update-item', (_event, id: string, patch: any) => {
    const item = updateItem(getDb(), id, patch ?? {})
    if (!item) {
      throw new Error('Item not found')
    }
    updateTrayCounts()
    return item
  })

  ipcMain.removeHandler('data:append-item-note')
  ipcMain.handle('data:append-item-note', (_event, id: string, content: string) => {
    const item = appendItemNote(getDb(), id, content ?? '')
    if (!item) {
      throw new Error('Idea not found')
    }
    updateTrayCounts()
    return item
  })

  ipcMain.removeHandler('data:archive-item')
  ipcMain.handle('data:archive-item', (_event, id: string) => {
    if (!archiveItem(getDb(), id)) {
      throw new Error('Item not found')
    }
    updateTrayCounts()
  })

  ipcMain.removeHandler('data:delete-item')
  ipcMain.handle('data:delete-item', (_event, id: string) => {
    if (!deleteItemPermanently(getDb(), id)) {
      throw new Error('Item not found')
    }
    updateTrayCounts()
  })

  ipcMain.removeHandler('data:restore-item')
  ipcMain.handle('data:restore-item', (_event, id: string) => {
    if (!restoreItem(getDb(), id)) {
      throw new Error('Item not found')
    }
    updateTrayCounts()
  })

  ipcMain.removeHandler('data:complete-item')
  ipcMain.handle('data:complete-item', (_event, id: string) => {
    const item = completeItem(getDb(), id)
    if (!item) {
      throw new Error('Item not found')
    }
    updateTrayCounts()
    return item
  })

  ipcMain.removeHandler('data:uncomplete-item')
  ipcMain.handle('data:uncomplete-item', (_event, id: string) => {
    const item = uncompleteItem(getDb(), id)
    if (!item) {
      throw new Error('Item not found')
    }
    updateTrayCounts()
    return item
  })

  ipcMain.removeHandler('data:search')
  ipcMain.handle('data:search', (_event, query: string) => searchItems(getDb(), query ?? ''))

  ipcMain.removeHandler('data:get-tags')
  ipcMain.handle('data:get-tags', () => getDistinctTags(getDb()))

  ipcMain.removeHandler('data:get-settings')
  ipcMain.handle('data:get-settings', () => getSettings(getDb()))

  ipcMain.removeHandler('data:get-spaces')
  ipcMain.handle('data:get-spaces', () => getSpaces(getDb()))

  ipcMain.removeHandler('data:create-space')
  ipcMain.handle('data:create-space', (_event, name: string) => createSpace(getDb(), name ?? ''))

  ipcMain.removeHandler('data:add-item-to-space')
  ipcMain.handle('data:add-item-to-space', (_event, spaceId: string, itemId: string, pinned?: boolean) => {
    addItemToSpace(getDb(), spaceId, itemId, Boolean(pinned))
    return getAllItems(getDb())
  })

  ipcMain.removeHandler('data:remove-item-from-space')
  ipcMain.handle('data:remove-item-from-space', (_event, spaceId: string, itemId: string) => {
    removeItemFromSpace(getDb(), spaceId, itemId)
    return getAllItems(getDb())
  })

  ipcMain.removeHandler('data:set-space-item-pinned')
  ipcMain.handle('data:set-space-item-pinned', (_event, spaceId: string, itemId: string, pinned: boolean) => {
    setSpaceItemPinned(getDb(), spaceId, itemId, pinned)
    return getAllItems(getDb())
  })

  ipcMain.removeHandler('data:touch-item')
  ipcMain.handle('data:touch-item', (_event, id: string) => touchItem(getDb(), id))

  ipcMain.removeHandler('data:update-settings')
  ipcMain.handle('data:update-settings', (_event, patch: any) => {
    const db = getDb()
    const nextPatch =
      typeof patch?.morning_digest_time === 'string' && /^\d{2}:\d{2}$/.test(patch.morning_digest_time)
        ? { morning_digest_time: patch.morning_digest_time }
        : {}
    return patchSettings(db, nextPatch)
  })

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

  return join(moduleDir, '../renderer/index.html')
}

function updateTrayCounts(): void {
  if (!trayController) {
    return
  }

  const db = getDb()
  const todayCount = getItemsByPriority(db, 'today').length
  trayController.updateTooltip(todayCount)
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
      preload: join(moduleDir, '../preload/index.mjs'),
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

if (!hasSingleInstanceLock) {
  isQuitting = true
  app.quit()
} else {
  app.on('second-instance', () => {
    showMainWindow()
  })

  app.whenReady().then(() => {
  // Skip in Playwright runs so tests stay hermetic (no real tokens/pollers)
  const envPath = isTestEnv ? null : loadRuntimeEnv()
  if (envPath) {
    console.log(`[config] loaded environment from ${envPath}`)
  }

  if (process.platform === 'win32') {
    app.setAppUserModelId('com.suman.cortex')
  }

  registerIpcHandlers()

  startServer(getDb(), {
    onItemsChanged: updateTrayCounts
  })

  createMainWindow()

  // Backfill og:title for existing link items that still have raw URLs as titles
  void (async () => {
    const db = getDb()
    const stale = db
      .prepare(
        `SELECT id, url FROM items
         WHERE type = 'link' AND url IS NOT NULL
           AND (title LIKE 'http://%' OR title LIKE 'https://%' OR title LIKE 'www.%')
           AND archived = 0`
      )
      .all() as Array<{ id: string; url: string }>
    if (stale.length > 0) {
      console.log(`[link-fetch] Backfilling ${stale.length} item(s) with missing titles...`)
      for (const row of stale) {
        await fetchAndUpdateLinkTitle(db, row.id, row.url)
      }
      console.log('[link-fetch] Backfill complete')
    }
  })()

  stopTelegramPoller = startTelegramPoller(getDb(), (count) => {
    updateTrayCounts()
    console.log(`[telegram] ${count} new item(s) from Telegram`)
  })

  stopDiscordPoller = startDiscordPoller(getDb(), (count) => {
    updateTrayCounts()
    console.log(`[discord] ${count} new item(s) from Discord`)
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

  const openQuickCapture = () => {
    openQuickAddWindow({ value: getClipboardUrl() })
  }

  registerGlobalShortcut('CommandOrControl+Shift+S', openQuickCapture)
  registerGlobalShortcut('CommandOrControl+Shift+N', openQuickCapture)

  cron.schedule(REMINDER_CHECK_CRON, () => {
    checkReminders(getDb())
    if (shouldFireDigest(getDb())) {
      fireMorningDigest(getDb())
    }
    updateTrayCounts()
  })

  cron.schedule(MIDNIGHT_CRON, () => {
    const result = runMidnightPromotion(getDb())
    notifyMidnight(result)
    updateTrayCounts()
  })

  app.on('activate', () => {
    showMainWindow()
  })
  })
}

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  trayController?.destroy()
  stopTelegramPoller()
  stopDiscordPoller()
})
