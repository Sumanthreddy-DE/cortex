import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { _electron as electron, expect, test } from '@playwright/test'

test('launches the built Cortex desktop app', async () => {
  const appEntry = join(process.cwd(), 'out', 'main', 'index.js')
  test.skip(!existsSync(appEntry), 'Run npm run build first')

  const app = await electron.launch({
    args: [appEntry],
    cwd: process.cwd()
  })

  const window = app.windows()[0] ?? (await app.waitForEvent('window', { timeout: 30_000 }))
  await expect(window.getByText('Cortex')).toBeVisible()
  await expect(window.getByPlaceholder('Search links, notes, tags... (/ or Ctrl+K)')).toBeVisible()

  await app.close()
})
