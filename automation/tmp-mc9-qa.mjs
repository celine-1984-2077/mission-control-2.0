import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const baseUrl = 'http://127.0.0.1:5173/'
const outDir = 'automation/qa-results'
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const evidence = []
const observations = { baseUrl, beforeCancelCount: 0, afterCancelCount: 0, hasRemoveButton: false }

await page.goto(baseUrl, { waitUntil: 'networkidle' })

await page.getByRole('button', { name: '+ New Task' }).click()
await page.locator('label:has-text("Task 名称") input').fill('MC-9 QA TEMP - image cancel in create modal')
await page.locator('label:has-text("任务描述") textarea').fill('Temporary QA task to verify removing an uploaded image before create.')

const imagePath = path.resolve('automation/task-attachments/MC-7/Screenshot_2026-03-25_at_3.31.35_PM.png')
await page.locator('input[type="file"]').first().setInputFiles(imagePath)

const selectedItems = page.locator('.selected-image-item')
await selectedItems.first().waitFor()
observations.beforeCancelCount = await selectedItems.count()

const removeBtn = page.locator('.selected-image-item .image-remove-btn').first()
observations.hasRemoveButton = await removeBtn.isVisible()

await page.screenshot({ path: `${outDir}/MC-9-before-cancel.png`, fullPage: true })
evidence.push('automation/qa-results/MC-9-before-cancel.png')

await removeBtn.click()
await page.waitForTimeout(300)
observations.afterCancelCount = await selectedItems.count()

await page.screenshot({ path: `${outDir}/MC-9-after-cancel.png`, fullPage: true })
evidence.push('automation/qa-results/MC-9-after-cancel.png')

fs.writeFileSync(`${outDir}/MC-9-qa-observations.json`, JSON.stringify({ ...observations, evidence }, null, 2))

await browser.close()
console.log(JSON.stringify({ ...observations, evidence }, null, 2))
