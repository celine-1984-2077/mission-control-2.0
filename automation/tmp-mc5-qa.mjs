import { chromium } from '@playwright/test'
import fs from 'node:fs'

const baseUrl = 'http://127.0.0.1:5173/'
const outDir = 'automation/qa-results'
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const evidence = []

await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Docs' }).click()
await page.waitForTimeout(1000)

await page.screenshot({ path: `${outDir}/MC-5-docs-overview.png`, fullPage: true })
evidence.push('automation/qa-results/MC-5-docs-overview.png')

const docCards = page.locator('.doc-card')
const docCount = await docCards.count()

if (docCount > 0) {
  await docCards.first().click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${outDir}/MC-5-doc-selected.png`, fullPage: true })
  evidence.push('automation/qa-results/MC-5-doc-selected.png')
}

await page.fill('input.docs-search', 'README')
await page.waitForTimeout(300)
await page.screenshot({ path: `${outDir}/MC-5-doc-search.png`, fullPage: true })
evidence.push('automation/qa-results/MC-5-doc-search.png')

const projectOptions = await page.locator('label:has-text("Project") select option').allTextContents()
const tagOptions = await page.locator('label:has-text("Tag") select option').allTextContents()

const hasNewProjectButton = await page.getByRole('button', { name: '+ New project' }).count()

const markdownTextLen = await page.locator('.docs-markdown pre').first().textContent().then(t => (t || '').length).catch(() => 0)

const result = {
  baseUrl,
  docCount,
  projectOptions,
  tagOptions,
  hasNewProjectButton: hasNewProjectButton > 0,
  markdownTextLen,
  evidence,
}

fs.writeFileSync(`${outDir}/MC-5-qa-observations.json`, JSON.stringify(result, null, 2))
await browser.close()
console.log(JSON.stringify(result, null, 2))
