import { Menu, Tray, nativeImage } from 'electron'
import { APP_NAME } from '../shared/constants'

export interface TrayController {
  tray: Tray
  updateTooltip: (count: number) => void
  destroy: () => void
}

interface CreateTrayOptions {
  showMainWindow: () => void
  openQuickAdd: () => void
  quit: () => void
}

const TRAY_ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAkElEQVR4nM2TsQ3CMBBFn7uRIkWKhGQBIgEXwAUswA1sQbqAjVhAJUQ4gR24gQ20IJzYjt2EuSyJf3h7tpw7eS52nsp8fQ5xgaJEdBxAtG7BwaZHWGxgCh4a7BMBERpIJxGd2kUdAwQzgF91BWW4gVm0oYAP6M5jVEavS6gZW7Jp4AHv6bIRlU2idI7vSuNvc9NQ+9Nx6d3iLBaWW8M98gD2XvceEC7nXwAAAABJRU5ErkJggg=='

function buildMenu(options: CreateTrayOptions): Menu {
  return Menu.buildFromTemplate([
    { label: 'Show App', click: options.showMainWindow },
    { label: 'Quick Capture', click: options.openQuickAdd },
    { type: 'separator' },
    { label: 'Quit', click: options.quit }
  ])
}

export function createAppTray(options: CreateTrayOptions): TrayController {
  const icon = nativeImage.createFromBuffer(Buffer.from(TRAY_ICON_BASE64, 'base64'))
  const tray = new Tray(icon)

  tray.setToolTip(`${APP_NAME} - ready`)
  tray.setContextMenu(buildMenu(options))
  tray.on('click', options.showMainWindow)

  return {
    tray,
    updateTooltip(count: number) {
      const suffix = count === 1 ? 'item' : 'items'
      tray.setToolTip(`${APP_NAME} - ${count} ${suffix} today`)
    },
    destroy() {
      tray.destroy()
    }
  }
}
