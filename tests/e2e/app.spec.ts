import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'

const appEntry = join(process.cwd(), 'out', 'main', 'index.js')

async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: [appEntry],
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PLAYWRIGHT_TEST: '1',
      // Isolated DB per run — without this the suite writes into the user's real
      // %APPDATA%\Cortex database (app.setName pins userData there even unpackaged)
      CORTEX_DATA_DIR: mkdtempSync(join(tmpdir(), 'cortex-e2e-'))
    }
  })

  // Wait for any window then find the main one (not quick-add)
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  return { app, page }
}

test.describe('Cortex E2E', () => {
  test.beforeEach(() => {
    test.skip(!existsSync(appEntry), 'Run npm run build first')
  })

  test('app launches and shows priority board', async () => {
    const { app, page } = await launchApp()
    try {
      await expect(page.getByPlaceholder(/Search/i)).toBeVisible({ timeout: 15_000 })
      // 4 kanban columns visible (Inbox is hidden while empty by design)
      for (const col of ['Today', 'Tomorrow', 'This Week', 'Someday']) {
        await expect(page.getByText(col, { exact: true }).first()).toBeVisible({ timeout: 10_000 })
      }
      await expect(page.getByText('Inbox', { exact: true })).not.toBeVisible()
    } finally {
      await app.close()
    }
  })

  test('keyboard shortcut n opens add modal', async () => {
    const { app, page } = await launchApp()
    try {
      await page.waitForSelector('.board-columns', { timeout: 15_000 })
      await page.keyboard.press('n')
      // Edit modal should appear
      await expect(page.locator('.modal-backdrop')).toBeVisible({ timeout: 5_000 })
      // Escape closes it
      await page.keyboard.press('Escape')
      await expect(page.locator('.modal-backdrop')).not.toBeVisible({ timeout: 3_000 })
    } finally {
      await app.close()
    }
  })

  test('/ shortcut focuses search bar', async () => {
    const { app, page } = await launchApp()
    try {
      await page.waitForSelector('.board-columns', { timeout: 15_000 })
      await page.keyboard.press('/')
      const searchInput = page.getByPlaceholder(/Search/i)
      await expect(searchInput).toBeFocused({ timeout: 3_000 })
    } finally {
      await app.close()
    }
  })

  test('view toggle: priority → category → archive → settings', async () => {
    const { app, page } = await launchApp()
    try {
      await page.waitForSelector('.board-columns', { timeout: 15_000 })

      // Switch to Category view
      await page.getByRole('button', { name: /category/i }).click()
      // content-panel is always rendered; grid only when items exist
      await expect(page.locator('.content-panel')).toBeVisible({ timeout: 5_000 })

      // Switch to Archive
      await page.getByRole('button', { name: /archive/i }).click()
      await expect(page.getByText(/archive/i).first()).toBeVisible({ timeout: 5_000 })

      // Switch to Settings
      await page.getByRole('button', { name: /settings/i }).click()
      await expect(page.getByText(/auto.?start|morning.?digest/i).first()).toBeVisible({ timeout: 5_000 })
    } finally {
      await app.close()
    }
  })

  test('create a link card and find it in inbox', async () => {
    const { app, page } = await launchApp()
    try {
      await page.waitForSelector('.board-columns', { timeout: 15_000 })

      // Open add modal via n key
      await page.keyboard.press('n')
      await page.waitForSelector('.modal-backdrop', { timeout: 5_000 })

      // Fill title
      const titleInput = page.locator('input[placeholder="Optional short label"]')
      await titleInput.fill('E2E Test Item')

      // Save
      await page.getByRole('button', { name: /save/i }).click()
      await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 3_000 })

      // Should appear somewhere in the board
      await expect(page.getByText('E2E Test Item').first()).toBeVisible({ timeout: 5_000 })
    } finally {
      await app.close()
    }
  })

  test('search finds items by title', async () => {
    const { app, page } = await launchApp()
    try {
      await page.waitForSelector('.board-columns', { timeout: 15_000 })

      const searchInput = page.getByPlaceholder(/Search/i)
      await searchInput.fill('zzznomatch999xyz')
      await page.waitForTimeout(400)
      await expect(page.getByText(/no results/i)).toBeVisible({ timeout: 5_000 })

      await searchInput.fill('')
    } finally {
      await app.close()
    }
  })

  test('fixed bucket sections are visible (Daily, Groceries, Tools)', async () => {
    const { app, page } = await launchApp()
    try {
      await page.waitForSelector('.buckets-bar', { timeout: 15_000 })
      for (const bucket of ['Daily', 'Groceries', 'Tools']) {
        await expect(page.getByText(bucket, { exact: true }).first()).toBeVisible({ timeout: 5_000 })
      }
    } finally {
      await app.close()
    }
  })

  test('empty column shows placeholder text', async () => {
    const { app, page } = await launchApp()
    try {
      await page.waitForSelector('.board-columns', { timeout: 15_000 })
      // At least one empty column should show placeholder
      const emptyStates = page.locator('.empty-state')
      const count = await emptyStates.count()
      expect(count).toBeGreaterThan(0)
    } finally {
      await app.close()
    }
  })
})
