import { test, expect } from '@playwright/test'

test('MC-1 screenshot visibility and activity drill-down', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })

  const testingLane = page.locator('.lane').filter({ has: page.locator('.lane-header:has-text("Testing")') })
  await expect(testingLane).toBeVisible()

  await testingLane.locator('.task-card:has-text("MC-1")').first().click()
  await expect(page.locator('.modal-card:has-text("MC-1 Detail")')).toBeVisible()

  const screenshots = page.locator('.artifact-item')
  const fromTestingCount = await screenshots.count()
  expect(fromTestingCount).toBeGreaterThan(0)
  await page.screenshot({ path: 'automation/qa-results/MC-1-detail-from-testing.png', fullPage: true })

  await page.locator('.modal-card .ghost:has-text("Close")').first().click()
  await expect(page.locator('.modal-card:has-text("MC-1 Detail")')).toHaveCount(0)

  await page.locator('.activity-item:has-text("MC-1 execution ended")').first().click()
  await expect(page.locator('.modal-card:has-text("MC-1 Detail")')).toBeVisible()

  const fromActivityCount = await page.locator('.artifact-item').count()
  expect(fromActivityCount).toBeGreaterThan(0)
  await page.screenshot({ path: 'automation/qa-results/MC-1-detail-from-activity.png', fullPage: true })

  console.log(JSON.stringify({
    testedUrl: 'http://127.0.0.1:5173/',
    fromTestingCount,
    fromActivityCount,
  }))
})
