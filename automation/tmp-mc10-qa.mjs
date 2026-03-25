import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'

const baseUrl = 'http://127.0.0.1:4173'
const evidenceDir = 'automation/qa-results/evidence/MC-10'
await fs.mkdir(evidenceDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

const logs = []
const stamp = (msg) => logs.push(`${new Date().toISOString()} ${msg}`)

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: '+ New Task' }).click()
  await page.getByRole('heading', { name: 'Create New Task' }).waitFor({ state: 'visible' })
  stamp('Opened New Task modal')

  await page.fill('textarea', 'Drag/drop close regression test content')
  await page.screenshot({ path: `${evidenceDir}/01-modal-open.png`, fullPage: true })

  // Simulate text-drop sequence ending outside modal overlay.
  const overlay = page.locator('.modal-overlay').first()
  await overlay.dispatchEvent('drop')
  await overlay.click({ position: { x: 10, y: 10 } })

  const stillVisible = await page.getByRole('heading', { name: 'Create New Task' }).isVisible()
  stamp(`Modal visible immediately after drop+click outside: ${stillVisible}`)

  await page.screenshot({ path: `${evidenceDir}/02-after-drop-click.png`, fullPage: true })

  // Normal outside click after debounce window should close modal.
  await page.waitForTimeout(320)
  await overlay.click({ position: { x: 12, y: 12 } })
  const closedAfterDelay = !(await page.getByRole('heading', { name: 'Create New Task' }).isVisible().catch(() => false))
  stamp(`Modal closed after delayed outside click: ${closedAfterDelay}`)

  await page.screenshot({ path: `${evidenceDir}/03-after-delayed-click.png`, fullPage: true })

  const result = {
    stillVisible,
    closedAfterDelay,
    logs,
  }
  await fs.writeFile('automation/qa-results/evidence/MC-10/observations.json', JSON.stringify(result, null, 2))

  if (!stillVisible || !closedAfterDelay) {
    process.exitCode = 1
  }
} finally {
  await browser.close()
}
