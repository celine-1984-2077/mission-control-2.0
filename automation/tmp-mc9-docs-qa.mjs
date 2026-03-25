import { chromium } from '@playwright/test'
import fs from 'node:fs'

const baseUrl = 'http://127.0.0.1:5173/'
const outDir = 'automation/qa-results'
fs.mkdirSync(outDir, { recursive: true })

const now = Date.now()
const projectName = `MC9 QA Project ${now}`
const docTitle = `MC9 QA Doc ${now}`
const docBody = `# MC-9 QA\n\nInitial content ${now}`
const editedLine = `\n\nEdited pass ${now}`

const observations = {
  baseUrl,
  projectName,
  docTitle,
  projectCreated: false,
  docSaved: false,
  persistedAfterReload: false,
  editableDocTextareaEnabled: false,
  editedDocPersisted: false,
  readOnlyDocFound: false,
  readOnlyTextareaDisabled: null,
  statusTextAfterProjectCreate: '',
  statusTextAfterDocSave: '',
  evidence: [],
}

async function openDocs(page) {
  await page.locator('.nav-item', { hasText: 'Docs' }).first().click()
  await page.waitForSelector('h2:has-text("Docs")')
}

async function getStatusText(page) {
  const ok = await page.locator('.docs-content .muted').allTextContents()
  const err = await page.locator('.docs-content .create-error').allTextContents()
  return [...ok, ...err].join(' | ')
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await openDocs(page)

  await page.getByRole('button', { name: '+ New project' }).click()
  await page.locator('.modal-card label:has-text("Project name") input').fill(projectName)
  await page.locator('.modal-card label:has-text("Description") textarea').fill('Created by MC-9 QA automation')
  await page.getByRole('button', { name: 'Create Project' }).click()
  await page.waitForTimeout(1200)
  observations.statusTextAfterProjectCreate = await getStatusText(page)
  observations.projectCreated = observations.statusTextAfterProjectCreate.includes('Project created:')

  await page.getByRole('button', { name: '+ New doc' }).click()
  await page.locator('.docs-editor-form label:has-text("Project") select').selectOption({ label: projectName })
  await page.locator('.docs-editor-form label:has-text("Title") input').fill(docTitle)
  await page.locator('.docs-editor-form label:has-text("Tags") input').fill('qa,mc9')
  const markdownArea = page.locator('.docs-editor-form label:has-text("Markdown") textarea')
  await markdownArea.fill(docBody)
  await page.getByRole('button', { name: 'Save' }).click()
  await page.waitForTimeout(1000)
  observations.statusTextAfterDocSave = await getStatusText(page)
  observations.docSaved = observations.statusTextAfterDocSave.includes('Document saved.')

  await page.screenshot({ path: `${outDir}/MC-9-doc-created.png`, fullPage: true })
  observations.evidence.push('automation/qa-results/MC-9-doc-created.png')

  await page.reload({ waitUntil: 'networkidle' })
  await openDocs(page)
  const search = page.locator('input.docs-search')
  await search.fill(docTitle)
  const docCard = page.locator('.doc-card', { hasText: docTitle }).first()
  await docCard.waitFor({ timeout: 10000 })
  observations.persistedAfterReload = await docCard.isVisible()

  await docCard.click()
  const markdownAfterReload = page.locator('.docs-editor-form label:has-text("Markdown") textarea')
  observations.editableDocTextareaEnabled = await markdownAfterReload.isEnabled()

  await markdownAfterReload.fill(docBody + editedLine)
  await page.getByRole('button', { name: 'Save' }).click()
  await page.waitForTimeout(1000)

  await page.reload({ waitUntil: 'networkidle' })
  await openDocs(page)
  await page.locator('input.docs-search').fill(docTitle)
  await page.locator('.doc-card', { hasText: docTitle }).first().click()
  const persistedText = await page.locator('.docs-editor-form label:has-text("Markdown") textarea').inputValue()
  observations.editedDocPersisted = persistedText.includes(editedLine.trim())

  const readOnlyCard = page.locator('.doc-card small', { hasText: 'read-only' }).first()
  if (await readOnlyCard.count()) {
    observations.readOnlyDocFound = true
    await readOnlyCard.locator('xpath=ancestor::button[1]').click()
    const roArea = page.locator('.docs-editor-form label:has-text("Markdown") textarea')
    observations.readOnlyTextareaDisabled = !(await roArea.isEnabled())
  }

  await page.screenshot({ path: `${outDir}/MC-9-doc-persistence.png`, fullPage: true })
  observations.evidence.push('automation/qa-results/MC-9-doc-persistence.png')

  fs.writeFileSync(`${outDir}/MC-9-qa-observations.json`, JSON.stringify(observations, null, 2))
  console.log(JSON.stringify(observations, null, 2))
} finally {
  await browser.close()
}
