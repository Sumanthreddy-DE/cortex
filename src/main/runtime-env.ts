import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import { config as loadDotenv } from 'dotenv'

function getEnvCandidates(): string[] {
  const candidates = [join(process.cwd(), '.env')]

  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
  if (portableDir) {
    candidates.unshift(join(portableDir, '.env'))
  }

  try {
    candidates.unshift(join(dirname(app.getPath('exe')), '.env'))
  } catch {
    // `app.getPath('exe')` is not always available before app initialization.
  }

  try {
    candidates.unshift(join(app.getPath('userData'), '.env'))
  } catch {
    // `app.getPath('userData')` is only needed after the app is ready.
  }

  return [...new Set(candidates)]
}

export function loadRuntimeEnv(): string | null {
  for (const candidate of getEnvCandidates()) {
    if (!existsSync(candidate)) {
      continue
    }

    const result = loadDotenv({ path: candidate, override: false })
    if (!result.error) {
      return candidate
    }
  }

  return null
}
