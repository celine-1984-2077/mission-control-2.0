import { test, expect } from '@playwright/test'

test('MC-1 backlog edit upload + pickup', async ({ page }) => {
  const url = 'http://127.0.0.1:5173/'
  const taskSuffix = String(Date.now()).slice(-6)
  const taskTitle = `MC-QA-${taskSuffix} image persistence`

  await page.goto(url)
  await page.getByRole('button', { name: '+ New Task' }).click()
  await page.locator('label:has-text("Task 名称") input').fill(taskTitle)
  await page.locator('label:has-text("任务描述") textarea').fill('QA create backlog then edit with image')
  await page.getByRole('button', { name: 'Create Task' }).click()

  const card = page.locator('.task-card', { hasText: taskTitle }).first()
  await expect(card).toBeVisible()
  await card.click()

  await page.locator('input[type="file"]').first().setInputFiles('automation/qa-results/mc1-upload.png')
  await page.locator('.modal-actions button:has-text("Save")').click()

  await expect(card).toContainText('Images')
  await expect(card).toContainText('1 attached')

  await card.dragTo(page.locator('[data-testid="lane-triaged"] .lane-body'))
  await page.waitForTimeout(12000)

  await page.screenshot({ path: 'automation/qa-results/MC-1-qa-ui-backlog-edit-upload.png', fullPage: true })

  console.log(`TASK_TITLE=${taskTitle}`)
  console.log(`TESTED_URL=${url}`)
})
