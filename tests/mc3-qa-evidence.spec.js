import { test, expect } from '@playwright/test'

test('MC-3 evidence capture', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })

  const testingLane = page.locator('.lane').filter({ has: page.locator('.lane-header:has-text("Testing")') })
  await testingLane.locator('.task-card:has-text("MC-3")').first().click()
  const modal = page.locator('.modal-card:has-text("MC-3 Detail")').first()
  await expect(modal).toBeVisible()

  await page.screenshot({ path: 'automation/qa-results/MC-3-modal-top.png', fullPage: true })

  const metrics = await page.evaluate(() => {
    const modal = document.querySelector('.modal-card.modal-card-detail')
    const preview = document.querySelector('.artifact-preview img')
    const thumb = document.querySelector('.artifact-item img')
    const grid = document.querySelector('.artifact-grid')
    const session = document.querySelector('.session-log')

    const readRect = (el) => el ? el.getBoundingClientRect() : null
    const readScroll = (el) => el ? { clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, overflowY: getComputedStyle(el).overflowY } : null

    return {
      modalRect: readRect(modal),
      previewRect: readRect(preview),
      thumbRect: readRect(thumb),
      gridScroll: readScroll(grid),
      sessionScroll: readScroll(session)
    }
  })

  // Scroll session log and capture second evidence screenshot.
  await page.evaluate(() => {
    const session = document.querySelector('.session-log')
    if (session) session.scrollTop = session.scrollHeight
  })
  await page.screenshot({ path: 'automation/qa-results/MC-3-modal-session-scrolled.png', fullPage: true })

  console.log(JSON.stringify({ testedUrl: 'http://127.0.0.1:5173/', metrics }))
})