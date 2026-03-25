import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const outDir = 'automation/qa-results';
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const tried = [];
let url = null;
for (const candidate of ['http://127.0.0.1:5173/', 'http://127.0.0.1:5174/']) {
  try {
    const r = await page.goto(candidate, { waitUntil: 'domcontentloaded', timeout: 8000 });
    if (r && r.ok()) { url = candidate; break; }
  } catch {}
  tried.push(candidate);
}
if (!url) throw new Error(`Unable to open local app. tried=${tried.join(',')}`);

await page.waitForSelector('[data-testid="mc-shell"]');

const laneSel = (k) => `[data-testid="lane-${k}"]`;

async function laneCount(key) {
  const txt = await page.locator(`${laneSel(key)} .lane-count`).innerText();
  return Number(txt.trim());
}

async function firstTaskInLane(key) {
  const lane = page.locator(laneSel(key));
  const card = lane.locator('.task-card').first();
  return (await card.count()) ? card : null;
}

// Ensure backlog empty so + button should appear in default empty state.
let backlogCount = await laneCount('backlog');
if (backlogCount > 0) {
  const triagedLane = page.locator(laneSel('triaged'));
  while (backlogCount > 0) {
    const card = await firstTaskInLane('backlog');
    if (!card) break;
    await card.dragTo(triagedLane.locator('.lane-body'));
    await page.waitForTimeout(150);
    backlogCount = await laneCount('backlog');
  }
}

const plusButton = page.locator(`${laneSel('backlog')} .lane-add-task[aria-label="Create new task"]`);
const plusVisible = await plusButton.isVisible();
if (plusVisible) {
  await plusButton.click();
  await page.waitForSelector('.modal-card:has-text("Create New Task")');
  const closeBtn = page.locator('.modal-card:has-text("Create New Task") .ghost:has-text("Close")').first();
  if (await closeBtn.count()) await closeBtn.click();
  await page.waitForTimeout(120);
}

const triagedDropTextAttr = await page.locator(`${laneSel('triaged')} .lane-body`).getAttribute('data-empty-text');

// Pick a draggable task from triaged/backlog
let sourceLane = 'triaged';
let sourceCard = await firstTaskInLane('triaged');
if (!sourceCard) {
  sourceCard = await firstTaskInLane('backlog');
  sourceLane = 'backlog';
}
if (!sourceCard) {
  // create one task through UI (validates plus click behavior too)
  const openModal = page.locator('.modal-card:has-text("Create New Task")');
  if (await openModal.count()) {
    const closeExisting = openModal.locator('.ghost:has-text("Close")').first();
    if (await closeExisting.count()) await closeExisting.click();
    await page.waitForTimeout(120);
  }
  const createBtn = page.locator(`${laneSel('backlog')} .lane-add-task[aria-label="Create new task"]`);
  if (!(await createBtn.isVisible())) throw new Error('No draggable task found and create (+) button not visible.');
  await createBtn.click();
  await page.waitForSelector('.modal-card:has-text("Create New Task")');
  await page.locator('.modal-form input').first().fill('MC-4 QA temp task');
  await page.locator('.modal-form textarea').first().fill('Temporary task for drag/drop QA');
  await page.locator('.modal-actions .primary').click();
  await page.waitForTimeout(200);
  sourceCard = await firstTaskInLane('backlog');
  sourceLane = 'backlog';
}

const sourceTaskId = (await sourceCard.getAttribute('data-testid'))?.replace('task-card-', '') || 'UNKNOWN';

const beforeInProgress = await laneCount('in_progress');
const beforeTesting = await laneCount('testing');

await sourceCard.dragTo(page.locator(`${laneSel('in_progress')} .lane-body`));
await page.waitForTimeout(150);
const afterInProgress = await laneCount('in_progress');
const laneAfterInProgressDrop = await page.locator(`[data-testid="task-card-${sourceTaskId}"]`).first().locator('xpath=ancestor::*[contains(@data-testid,"lane-")][1]').getAttribute('data-testid').catch(()=>null);

// re-select source card
const sourceCard2 = page.locator(`[data-testid="task-card-${sourceTaskId}"]`).first();
await sourceCard2.dragTo(page.locator(`${laneSel('testing')} .lane-body`));
await page.waitForTimeout(150);
const afterTesting = await laneCount('testing');

await page.screenshot({ path: `${outDir}/MC-4-board-after-qa.png`, fullPage: true });
await page.locator(laneSel('backlog')).screenshot({ path: `${outDir}/MC-4-backlog-empty-plus.png` });
await page.locator(laneSel('triaged')).screenshot({ path: `${outDir}/MC-4-triaged-drop-hint.png` });
await page.locator(laneSel('in_progress')).screenshot({ path: `${outDir}/MC-4-in-progress-locked.png` });
await page.locator(laneSel('testing')).screenshot({ path: `${outDir}/MC-4-testing-locked.png` });

const result = {
  testedUrl: url,
  plusVisible,
  triagedDropTextAttr,
  sourceLane,
  sourceTaskId,
  beforeInProgress,
  afterInProgress,
  beforeTesting,
  afterTesting,
  laneAfterInProgressDrop,
};

await fs.writeFile(`${outDir}/MC-4-qa-observations.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

await browser.close();
