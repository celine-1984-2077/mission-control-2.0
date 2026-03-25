import { test, expect } from '@playwright/test'

test('probe mc3 modal dom', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
  const testingLane = page.locator('.lane').filter({ has: page.locator('.lane-header:has-text("Testing")') })
  await testingLane.locator('.task-card:has-text("MC-3")').first().click()
  const modal = page.locator('.modal-card').first()
  await expect(modal).toBeVisible()
  const info = await modal.evaluate((el) => {
    const classList = Array.from(el.querySelectorAll('*')).map(n => n.className).filter(Boolean)
    const imgs = Array.from(el.querySelectorAll('img')).map(i => ({src:i.getAttribute('src'), alt:i.getAttribute('alt'), w:i.clientWidth, h:i.clientHeight}))
    const scrollables = Array.from(el.querySelectorAll('*')).map(n => {
      const cs = getComputedStyle(n)
      if (['auto','scroll'].includes(cs.overflowY) && n.scrollHeight > n.clientHeight + 4) {
        return { cls: n.className, sh:n.scrollHeight, ch:n.clientHeight, oy:cs.overflowY }
      }
      return null
    }).filter(Boolean)
    return { text: el.textContent?.slice(0,1200), classList: classList.slice(0,200), imgs, scrollables }
  })
  console.log(JSON.stringify(info))
})