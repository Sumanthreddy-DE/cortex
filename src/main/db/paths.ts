import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)

interface ElectronAppLike {
  getPath(name: 'userData'): string
}

function getElectronApp(): ElectronAppLike | null {
  if (!process.versions.electron) {
    return null
  }

  try {
    const electron = require('electron') as { app?: ElectronAppLike }
    return electron.app ?? null
  } catch {
    return null
  }
}

export function getDataDirectory(): string {
  const override = process.env.CORTEX_DATA_DIR?.trim()
  const electronApp = getElectronApp()

  const dataDir = override || electronApp?.getPath('userData') || join(process.cwd(), '.cortex-local')
  mkdirSync(dataDir, { recursive: true })
  return dataDir
}
