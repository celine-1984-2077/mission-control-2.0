import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const baseUrl = 'http://127.0.0.1:5173/'
const outDir = 'automation/qa-results'
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const evidence = []
const observations = { baseUrl, readonly: {}, backlog: {} }

await page.goto(baseUrl, { waitUntil: 'networkidle' })

// Readonly task modal check using existing non-backlog task card (MC-7)
await page.locator('[data-testid="task-card-MC-7"]').first().click()
await page.waitForSelector('.detail-reference-images')

const readonlyThumbs = page.locator('.detail-reference-images .reference-item')
observations.readonly.thumbnailCount = await readonlyThumbs.count()
observations.readonly.firstHrefPrefix = await readonlyThumbs.first().getAttribute('href')?.then(v => (v || '').slice(0, 30))
observations.readonly.hasTargetBlank = (await readonlyThumbs.first().getAttribute('target')) === '_blank'

await page.screenshot({ path: `${outDir}/MC-6-readonly-reference-images.png`, fullPage: true })
evidence.push('automation/qa-results/MC-6-readonly-reference-images.png')

await page.getByRole('button', { name: 'Close' }).click()

// Backlog editable modal check by creating a temp task with image attachment
const imagePath = path.resolve('automation/task-attachments/MC-7/Screenshot_2026-03-25_at_3.31.35_PM.png')
await page.getByRole('button', { name: '+ New Task' }).click()
await page.locator('label:has-text("Task 名称") input').fill('MC-6 QA TEMP - backlog image preview')
await page.locator('label:has-text("任务描述") textarea').fill('Temporary QA task to verify backlog detail shows uploaded reference image thumbnails.')
await page.locator('input[type="file"]').first().setInputFiles(imagePath)
await page.getByRole('button', { name: 'Create Task' }).click()

const tempCard = page.locator('article.task-card', { hasText: 'MC-6 QA TEMP - backlog image preview' }).first()
await tempCard.click()
await page.waitForSelector('.modal-form .reference-grid')

const backlogThumbs = page.locator('.modal-form .reference-item')
observations.backlog.thumbnailCount = await backlogThumbs.count()
observations.backlog.firstHrefPrefix = await backlogThumbs.first().getAttribute('href')?.then(v => (v || '').slice(0, 30))
observations.backlog.hasTargetBlank = (await backlogThumbs.first().getAttribute('target')) === '_blank'

await page.screenshot({ path: `${outDir}/MC-6-backlog-reference-images.png`, fullPage: true })
evidence.push('automation/qa-results/MC-6-backlog-reference-images.png')

await page.getByRole('button', { name: 'Close' }).click()

fs.writeFileSync(`${outDir}/MC-6-qa-observations.json`, JSON.stringify({ ...observations, evidence }, null, 2))

await browser.close()
console.log(JSON.stringify({ ...observations, evidence }, null, 2))
