import { chromium } from 'playwright'
import fs from 'node:fs'

const url = 'http://127.0.0.1:5173/'
const outDir = 'automation/qa-results'
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url, { waitUntil: 'networkidle' })

const testingLane = page.locator('.lane').filter({ has: page.locator('.lane-header:has-text("Testing")') })
const backlogLane = page.locator('.lane').filter({ has: page.locator('.lane-header:has-text("Backlog")') })

const mc7TestingCount = await testingLane.locator('.task-card:has-text("MC-7")').count()
const mc7BacklogCount = await backlogLane.locator('.task-card:has-text("MC-7")').count()

await page.screenshot({ path: `${outDir}/MC-7-testing-stuck.png`, fullPage: true })

console.log(JSON.stringify({
  testedUrl: url,
  mc7TestingCount,
  mc7BacklogCount,
  screenshot: `${outDir}/MC-7-testing-stuck.png`
}, null, 2))

await browser.close()
