import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'

const baseUrl = 'http://127.0.0.1:5173/'
const outDir = new URL('./qa-results/', import.meta.url)
await fs.mkdir(outDir, { recursive: true })

const stamp = Date.now()
const projectName = `QA MC12 Project ${stamp}`
const projectSlug = `qa-mc12-${stamp}`
const docTitle = `QA MC12 Doc ${stamp}`
const docBody = `# QA MC-12\n\nSaved ${new Date().toISOString()}`

const result = {
  taskId: 'MC-12',
  testedUrl: baseUrl,
  checks: {
    docsPageLoaded: false,
    newProjectModalOpens: false,
    projectCreateSaved: false,
    newDocFlowAvailable: false,
    docSaveWorks: false,
    newProjectVisibleInFilter: false,
    newDocVisibleInList: false,
    writableAndImportedSeparated: false,
    readOnlyImportedNoSave: false,
    validationErrorShown: false,
    successFeedbackShown: false,
  },
  artifacts: [],
  errors: [],
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const snap = async (name) => {
  await page.screenshot({ path: new URL(name, outDir).pathname, fullPage: true })
  result.artifacts.push(`automation/qa-results/${name}`)
}

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.getByRole('button', { name: 'Docs' }).click()
  await page.waitForSelector('h2:has-text("Docs")', { timeout: 15000 })
  result.checks.docsPageLoaded = true

  const search = page.locator('input.docs-search')
  const sidebarProject = page.locator('.docs-sidebar label:has-text("Project") select').first()
  const sidebarTag = page.locator('.docs-sidebar label:has-text("Tag") select').first()
  await search.fill('')
  await sidebarProject.selectOption('all')
  await sidebarTag.selectOption('all')

  await snap('MC-12-docs-overview.png')

  await page.getByRole('button', { name: '+ New project' }).click()
  const modal = page.locator('.modal-card', { hasText: 'Create Project' }).first()
  await modal.waitFor({ timeout: 5000 })
  result.checks.newProjectModalOpens = true

  await modal.getByRole('button', { name: 'Create Project' }).click()
  if (await page.locator('text=Project name is required.').count()) result.checks.validationErrorShown = true

  await modal.locator('label:has-text("Project name") input').fill(projectName)
  await modal.locator('label:has-text("Slug (optional)") input').fill(projectSlug)
  await modal.locator('label:has-text("Description (optional)") textarea').fill('QA validation project')
  await modal.getByRole('button', { name: 'Create Project' }).click()

  await page.waitForSelector(`text=Project created: ${projectName}`, { timeout: 10000 })
  result.checks.projectCreateSaved = true
  result.checks.successFeedbackShown = true

  await page.getByRole('button', { name: '+ New doc' }).click()
  await page.waitForSelector('h3:has-text("New document")', { timeout: 5000 })
  result.checks.newDocFlowAvailable = true

  const editor = page.locator('.docs-editor-form').first()
  await editor.locator('label:has-text("Project") select').selectOption(projectSlug)
  await editor.locator('label:has-text("Title") input').fill(docTitle)
  await editor.locator('label:has-text("Tags (comma separated)") input').fill('memory,qa')
  await editor.locator('label:has-text("Markdown") textarea').fill(docBody)
  await editor.getByRole('button', { name: 'Save' }).click()

  await page.waitForSelector('text=Document saved.', { timeout: 10000 })
  result.checks.docSaveWorks = true

  await snap('MC-12-doc-saved.png')

  await search.fill('')
  await sidebarProject.selectOption('all')
  await sidebarTag.selectOption('all')

  const opts = await sidebarProject.locator('option').allTextContents()
  if (opts.some((t) => t.trim() === projectName)) result.checks.newProjectVisibleInFilter = true

  if (await page.locator('.docs-list .doc-card', { hasText: docTitle }).count()) result.checks.newDocVisibleInList = true

  const hasWritable = (await page.locator('.docs-group-title', { hasText: 'Writable docs' }).count()) > 0
  const hasImported = (await page.locator('.docs-group-title', { hasText: 'Imported (read-only)' }).count()) > 0
  if (hasWritable && hasImported) result.checks.writableAndImportedSeparated = true

  const importedCard = page
    .locator('.docs-group')
    .filter({ has: page.locator('.docs-group-title', { hasText: 'Imported (read-only)' }) })
    .locator('.doc-card')
    .first()

  if (await importedCard.count()) {
    await importedCard.click()
    await page.waitForTimeout(300)
    const roHint = (await page.locator('text=This is an imported read-only doc').count()) > 0
    const saveCount = await page.locator('.docs-editor-form button.primary:has-text("Save")').count()
    if (roHint && saveCount === 0) result.checks.readOnlyImportedNoSave = true
  }

  await snap('MC-12-readonly-imported.png')
} catch (err) {
  result.errors.push(String(err))
} finally {
  await browser.close()
}

await fs.writeFile(new URL('MC-12-qa-observations.json', outDir), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
