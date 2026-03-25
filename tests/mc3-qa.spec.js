import { test, expect } from '@playwright/test'

test('MC-3 modal readability and scrolling', async ({ page }) => {
  const url = 'http://127.0.0.1:5173/'
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(url, { waitUntil: 'networkidle' })

  const testingLane = page.locator('.lane').filter({ has: page.locator('.lane-header:has-text("Testing")') })
  await expect(testingLane).toBeVisible()

  await testingLane.locator('.task-card:has-text("MC-3")').first().click()
  const modal = page.locator('.modal-card:has-text("MC-3")').first()
  await expect(modal).toBeVisible()

  const screenshotItems = modal.locator('.artifact-item')
  const screenshotCount = await screenshotItems.count()

  // Try selecting second screenshot thumbnail if present
  let secondThumbnailSelected = false
  if (screenshotCount > 1) {
    await screenshotItems.nth(1).click()
    secondThumbnailSelected = true
  }

  const sessionMessages = modal.locator('.session-messages, .session-message-list, [data-testid="session-messages"]').first()
  const hasSessionMessagesRegion = await sessionMessages.count().then(c => c > 0)

  await page.screenshot({ path: 'automation/qa-results/MC-3-modal-1440x900.png', fullPage: true })

  // Collect layout signals from computed dimensions/overflow styles
  const layout = await modal.evaluate((el) => {
    const cs = window.getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    return {
      width: rect.width,
      height: rect.height,
      viewportH: window.innerHeight,
      overflowY: cs.overflowY,
      maxHeight: cs.maxHeight,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }
  })

  console.log(JSON.stringify({
    testedUrl: url,
    screenshotCount,
    secondThumbnailSelected,
    hasSessionMessagesRegion,
    layout,
  }))
})
