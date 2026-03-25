import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'

const baseUrl = 'http://127.0.0.1:5173/'
const outDir = new URL('./qa-results/', import.meta.url)
await fs.mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const result = {
  testedUrl: baseUrl,
  taskFound: false,
  beforeCount: null,
  afterCount: null,
  doneButtonVisible: false,
  removedFromTesting: false,
  activityLogged: false,
  errors: []
}

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForSelector('[data-testid="lane-testing"]', { timeout: 15000 })

  const lane = page.locator('[data-testid="lane-testing"]')
  const cards = lane.locator('.task-card')
  result.beforeCount = await cards.count()

  const targetCard = lane.locator('[data-testid="task-card-MC-12"]')
  if (await targetCard.count()) {
    result.taskFound = true
  }

  const chosenCard = result.taskFound ? targetCard.first() : cards.first()

  if (result.beforeCount === 0) {
    result.errors.push('No cards found in Testing lane to validate Done behavior.')
  } else {
    const doneBtn = chosenCard.locator('button.done-btn')
    result.doneButtonVisible = await doneBtn.isVisible()

    await page.screenshot({ path: new URL('MC-12-before-done.png', outDir).pathname, fullPage: true })

    if (result.doneButtonVisible) {
      const cardId = await chosenCard.getAttribute('data-testid')
      await doneBtn.click()
      await page.waitForTimeout(700)

      result.afterCount = await lane.locator('.task-card').count()
      result.removedFromTesting = result.afterCount === result.beforeCount - 1

      if (cardId) {
        const stillThere = await lane.locator(`[data-testid="${cardId}"]`).count()
        if (stillThere > 0) {
          result.removedFromTesting = false
          result.errors.push(`Card ${cardId} still present in Testing lane after clicking Done.`)
        }
      }

      result.activityLogged = (await page.locator('.activity-item strong', { hasText: 'marked done' }).count()) > 0
      await page.screenshot({ path: new URL('MC-12-after-done.png', outDir).pathname, fullPage: true })
    } else {
      result.errors.push('Done button not visible on Testing card.')
    }
  }
} catch (err) {
  result.errors.push(String(err))
} finally {
  await browser.close()
}

await fs.writeFile(new URL('MC-12-qa-observations.json', outDir), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
