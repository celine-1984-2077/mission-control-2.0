import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const PORT = Number(process.env.BOARD_BRIDGE_PORT || 8787)
const DISPATCH_INTERVAL_MS = Number(process.env.BOARD_DISPATCH_INTERVAL_MS || 10_000)
const QA_STALE_MS = Number(process.env.BOARD_QA_STALE_MS || 20 * 60 * 1000)
const MISSION_CONTROL_ROOT = process.cwd()
const WORKSPACE_ROOT = path.resolve(MISSION_CONTROL_ROOT, '..')

const STATE_PATH = path.resolve(MISSION_CONTROL_ROOT, 'automation/board-state.json')
const WEBHOOK_PATH = path.resolve(MISSION_CONTROL_ROOT, 'automation/discord-webhook.txt')
const DISPATCH_QUEUE_PATH = path.resolve(MISSION_CONTROL_ROOT, 'automation/dispatch-queue.jsonl')
const QA_RESULTS_DIR = path.resolve(MISSION_CONTROL_ROOT, 'automation/qa-results')
const RUN_LOGS_DIR = path.resolve(MISSION_CONTROL_ROOT, 'automation/run-logs')
const TASK_ATTACHMENTS_DIR = path.resolve(MISSION_CONTROL_ROOT, 'automation/task-attachments')
const DOC_STORE_ROOT = path.resolve(WORKSPACE_ROOT, '.mc-docs')
const DOC_STORE_INDEX_PATH = path.join(DOC_STORE_ROOT, 'index.json')

const OPENCLAW_HOME = process.env.OPENCLAW_HOME || path.resolve(process.env.HOME ?? '', '.openclaw')
const SESSION_STORE_DIR = process.env.BOARD_SESSION_STORE_DIR || path.resolve(OPENCLAW_HOME, 'agents/main/sessions')

let nextPickupAtMs = Date.now() + DISPATCH_INTERVAL_MS

function nowIso() {
  return new Date().toISOString()
}

function makeId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function ensureStateFile() {
  if (!fs.existsSync(STATE_PATH)) {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true })
    fs.writeFileSync(STATE_PATH, JSON.stringify({ tasks: [], activity: [], updatedAt: null }, null, 2))
  }
}

function ensureQaResultsDir() {
  fs.mkdirSync(QA_RESULTS_DIR, { recursive: true })
}

function ensureTaskAttachmentsDir() {
  fs.mkdirSync(TASK_ATTACHMENTS_DIR, { recursive: true })
}

function ensureDocStore() {
  fs.mkdirSync(DOC_STORE_ROOT, { recursive: true })
  if (!fs.existsSync(DOC_STORE_INDEX_PATH)) {
    fs.writeFileSync(DOC_STORE_INDEX_PATH, JSON.stringify({ projects: [], docs: [] }, null, 2))
  }
}

function readDocStoreIndex() {
  ensureDocStore()
  try {
    const parsed = JSON.parse(fs.readFileSync(DOC_STORE_INDEX_PATH, 'utf8'))
    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      docs: Array.isArray(parsed.docs) ? parsed.docs : [],
    }
  } catch {
    return { projects: [], docs: [] }
  }
}

function writeDocStoreIndex(next) {
  ensureDocStore()
  const payload = {
    projects: Array.isArray(next?.projects) ? next.projects : [],
    docs: Array.isArray(next?.docs) ? next.docs : [],
  }
  fs.writeFileSync(DOC_STORE_INDEX_PATH, JSON.stringify(payload, null, 2))
  return payload
}

function slugify(value, fallback = 'item') {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || fallback
}

function sanitizeDocTags(tags) {
  if (!Array.isArray(tags)) return []
  return Array.from(new Set(tags
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)
    .slice(0, 12)))
}

function readState() {
  ensureStateFile()
  const parsed = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'))
  if (!Array.isArray(parsed.tasks)) parsed.tasks = []
  if (!Array.isArray(parsed.activity)) parsed.activity = []
  return parsed
}

function writeState(next) {
  ensureStateFile()
  const payload = {
    ...next,
    tasks: Array.isArray(next?.tasks) ? next.tasks : [],
    activity: Array.isArray(next?.activity) ? next.activity : [],
    updatedAt: nowIso(),
  }
  fs.writeFileSync(STATE_PATH, JSON.stringify(payload, null, 2))
  return payload
}

function appendDispatchQueue(item) {
  fs.mkdirSync(path.dirname(DISPATCH_QUEUE_PATH), { recursive: true })
  fs.appendFileSync(DISPATCH_QUEUE_PATH, `${JSON.stringify(item)}\n`)
}

function pushActivity(state, entry) {
  state.activity = [entry, ...(state.activity ?? [])].slice(0, 300)
}

function buildAcceptanceList(task) {
  const items = Array.isArray(task?.acceptanceCriteria) ? task.acceptanceCriteria.filter(Boolean) : []
  if (!items.length) return 'No explicit acceptance criteria provided.'
  return items.map((line, idx) => `${idx + 1}. ${line}`).join('\n')
}

function decodeDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return null
  const match = dataUrl.match(/^data:([^;,]+)?;base64,(.+)$/)
  if (!match) return null
  const mimeType = match[1] || 'application/octet-stream'
  const base64Body = match[2]
  return { mimeType, buffer: Buffer.from(base64Body, 'base64') }
}

function writeTaskAttachments(task) {
  const attachments = Array.isArray(task?.imageAttachments) ? task.imageAttachments : []
  if (!attachments.length) return []

  ensureTaskAttachmentsDir()
  const taskDir = path.join(TASK_ATTACHMENTS_DIR, String(task.id || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_'))
  fs.mkdirSync(taskDir, { recursive: true })

  const written = []
  for (const [index, attachment] of attachments.entries()) {
    const decoded = decodeDataUrl(attachment?.dataUrl)
    if (!decoded) continue

    const rawName = typeof attachment?.name === 'string' && attachment.name.trim() ? attachment.name.trim() : `image-${index + 1}.png`
    const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const ext = path.extname(safeName)
    const fallbackExt = decoded.mimeType.split('/')[1] ? `.${decoded.mimeType.split('/')[1]}` : '.bin'
    const finalName = ext ? safeName : `${safeName}${fallbackExt}`
    const outputPath = path.join(taskDir, finalName)

    fs.writeFileSync(outputPath, decoded.buffer)
    written.push(outputPath)
  }

  return written
}

function isLikelyWebsiteTask(task) {
  const text = [task?.title, task?.objective, ...(Array.isArray(task?.tags) ? task.tags : [])]
    .join(' ')
    .toLowerCase()

  if (task?.targetUrl && typeof task.targetUrl === 'string' && task.targetUrl.trim()) return true

  return /(web|website|网页|页面|ui|frontend|front-end|button|click|点击|截图|screenshot|browser|浏览器|mini program|spa|react|vite)/.test(text)
}

function getWebhookUrl() {
  if (process.env.DISCORD_WEBHOOK_URL) return process.env.DISCORD_WEBHOOK_URL.trim()
  if (fs.existsSync(WEBHOOK_PATH)) {
    const raw = fs.readFileSync(WEBHOOK_PATH, 'utf8').trim()
    if (raw) return raw
  }
  return ''
}

function collectPlaywrightImagesForTask(task, maxImages = 4) {
  const taskId = String(task?.id ?? '').trim()
  if (!taskId) return []

  const dispatchedAtMs = task?.dispatchedAt ? new Date(task.dispatchedAt).getTime() : Number.NaN
  const minMtimeMs = Number.isFinite(dispatchedAtMs) ? dispatchedAtMs - 2 * 60 * 1000 : Date.now() - 60 * 60 * 1000
  const directories = [
    path.resolve(MISSION_CONTROL_ROOT, 'automation/run-logs'),
    path.resolve(MISSION_CONTROL_ROOT, 'automation/qa-results'),
  ]

  const imageFilePattern = /\.(png|jpe?g|webp|gif)$/i
  const playwrightLikePattern = /(playwright|qa|before|after|screenshot|home)/i
  const candidates = []

  for (const dir of directories) {
    if (!fs.existsSync(dir)) continue
    let entries = []
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (!entry.isFile()) continue
      if (!imageFilePattern.test(entry.name)) continue
      if (!entry.name.includes(taskId)) continue
      if (!playwrightLikePattern.test(entry.name)) continue

      const fullPath = path.join(dir, entry.name)
      let stat
      try {
        stat = fs.statSync(fullPath)
      } catch {
        continue
      }

      if (!Number.isFinite(stat.mtimeMs) || stat.mtimeMs < minMtimeMs) continue
      candidates.push({ path: fullPath, mtimeMs: stat.mtimeMs })
    }
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return candidates.slice(0, maxImages).map((x) => x.path)
}

function resolveEvidenceImagePath(rawPath) {
  if (typeof rawPath !== 'string') return null
  const trimmed = rawPath.trim()
  if (!trimmed) return null

  const extractedImageLikePaths = []
  const imagePathPattern = /(?:\.?\.?\/)?[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|gif)/ig
  for (const match of trimmed.matchAll(imagePathPattern)) {
    if (match?.[0]) extractedImageLikePaths.push(match[0])
  }

  const candidatePaths = [
    trimmed,
    ...extractedImageLikePaths,
  ]

  const resolvedCandidates = []
  for (const candidate of candidatePaths) {
    const value = String(candidate || '').trim()
    if (!value) continue

    resolvedCandidates.push(value)
    resolvedCandidates.push(path.resolve(MISSION_CONTROL_ROOT, value))
    resolvedCandidates.push(path.resolve(QA_RESULTS_DIR, value))
  }

  for (const candidate of resolvedCandidates) {
    const absolute = path.resolve(candidate)
    if (!fs.existsSync(absolute)) continue

    let stat
    try {
      stat = fs.statSync(absolute)
    } catch {
      continue
    }

    if (!stat.isFile()) continue
    if (!/\.(png|jpe?g|webp|gif)$/i.test(absolute)) continue
    return absolute
  }

  return null
}

function collectQaEvidenceImages(task, qaVerdict, maxImages = 4) {
  const fromQa = Array.isArray(qaVerdict?.evidence)
    ? qaVerdict.evidence
        .map((evidencePath) => resolveEvidenceImagePath(evidencePath))
        .filter(Boolean)
    : []

  const unique = []
  const seen = new Set()
  for (const fullPath of fromQa) {
    if (seen.has(fullPath)) continue
    seen.add(fullPath)
    unique.push(fullPath)
    if (unique.length >= maxImages) return unique
  }

  const fallback = collectPlaywrightImagesForTask(task, maxImages)
  for (const fullPath of fallback) {
    if (seen.has(fullPath)) continue
    seen.add(fullPath)
    unique.push(fullPath)
    if (unique.length >= maxImages) break
  }

  return unique
}

function mimeTypeFromImagePath(imagePath) {
  const ext = path.extname(String(imagePath || '')).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  return 'application/octet-stream'
}

function buildTaskImageAttachmentsFromPaths(imagePaths) {
  const out = []
  for (const imagePath of Array.isArray(imagePaths) ? imagePaths : []) {
    try {
      const absolute = path.resolve(String(imagePath || ''))
      const stat = fs.statSync(absolute)
      if (!stat.isFile()) continue

      const buffer = fs.readFileSync(absolute)
      const mimeType = mimeTypeFromImagePath(absolute)
      out.push({
        name: path.basename(absolute),
        mimeType,
        size: stat.size,
        dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
      })
    } catch {
      // Ignore unreadable files.
    }
  }

  return out
}

async function postWebhook(content, options = {}) {
  const webhookUrl = getWebhookUrl()
  if (!webhookUrl) return

  const filePaths = Array.isArray(options.files) ? options.files.filter((x) => typeof x === 'string' && x.trim()) : []
  if (!filePaths.length) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }).catch(() => undefined)
    return
  }

  const form = new FormData()
  form.set('payload_json', JSON.stringify({ content }))

  let fileIndex = 0
  for (const filePath of filePaths) {
    try {
      const buffer = fs.readFileSync(filePath)
      const fileName = path.basename(filePath)
      form.append(`files[${fileIndex}]`, new Blob([buffer]), fileName)
      fileIndex += 1
    } catch {
      // Ignore unreadable files and continue.
    }
  }

  if (fileIndex === 0) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }).catch(() => undefined)
    return
  }

  await fetch(webhookUrl, {
    method: 'POST',
    body: form,
  }).catch(() => undefined)
}

function startExecutionSession(task) {
  const sessionId = `mc2-${task.id}-${Date.now()}`
  const imagePaths = writeTaskAttachments(task)
  const message = [
    'Mission Control 2.0 execution task',
    `Task ID: ${task.id}`,
    `Title: ${task.title ?? ''}`,
    `Objective: ${task.objective ?? ''}`,
    `Target URL: ${task.targetUrl ?? 'not specified'}`,
    `Acceptance Criteria:\n${buildAcceptanceList(task)}`,
    imagePaths.length
      ? `Reference images (${imagePaths.length}):\n${imagePaths.map((p, i) => `${i + 1}. ${p}`).join('\n')}\nUse these images as context for implementation.`
      : 'Reference images: none provided.',
    `Working directory: ${MISSION_CONTROL_ROOT}`,
    'Execution contract:',
    '1) Implement the task in code.',
    `2) Append progress notes to automation/run-logs/${task.id}.md.`,
    '3) On success: update automation/board-state.json for this task lane=testing and set resultSummary + completedAt.',
    '4) On failure: set lane=triaged and write resultSummary + completedAt + failure reason.',
  ].join('\n\n')

  const child = spawn('openclaw', ['agent', '--session-id', sessionId, '--message', message], {
    cwd: MISSION_CONTROL_ROOT,
    stdio: 'ignore',
  })

  if (!child.pid) {
    throw new Error(`Failed to spawn execution session for ${task.id}`)
  }

  return { sessionId, pid: child.pid, child }
}

function qaResultPathForTask(taskId) {
  ensureQaResultsDir()
  const safeTaskId = String(taskId).replace(/[^a-zA-Z0-9._-]/g, '_')
  return path.join(QA_RESULTS_DIR, `${safeTaskId}.json`)
}

function startQaSession(task) {
  const sessionId = `qa-${task.id}-${Date.now()}`
  const qaResultPath = qaResultPathForTask(task.id)
  fs.rmSync(qaResultPath, { force: true })

  const likelyWebsite = isLikelyWebsiteTask(task)
  const message = [
    'Mission Control 2.0 QA task',
    `Task ID: ${task.id}`,
    `Title: ${task.title ?? ''}`,
    `Objective: ${task.objective ?? ''}`,
    `Target URL: ${task.targetUrl ?? 'not specified'}`,
    `Likely website/frontend task: ${likelyWebsite ? 'yes' : 'no'}`,
    `Acceptance Criteria:\n${buildAcceptanceList(task)}`,
    `Builder result summary: ${task.resultSummary ?? 'No execution summary available.'}`,
    `Working directory: ${MISSION_CONTROL_ROOT}`,
    'QA contract (must follow):',
    '1) Evaluate whether this task meets acceptance criteria.',
    '2) If this is website/frontend related, use the Agent Browser skill to open the relevant page, interact with UI (click/type/navigation as needed), and capture evidence (screenshots/log observations).',
    '3) If no target URL is provided, infer it from local defaults (for example local dev URL) and state what URL was tested.',
    `4) Write machine-readable QA result JSON to: ${qaResultPath}`,
    '5) JSON schema:',
    '{',
    '  "taskId": "string",',
    '  "status": "pass" | "fail",',
    '  "summary": "string",',
    '  "failureReasons": ["string", ...],',
    '  "guidancePrompt": "string",',
    '  "evidence": ["string", ...]',
    '}',
    `6) Append QA notes to automation/run-logs/${task.id}-qa.md.`,
    '7) Keep result concise and concrete. If QA fails, guidancePrompt must contain implementation guidance for the coder.',
  ].join('\n\n')

  const child = spawn('openclaw', ['agent', '--session-id', sessionId, '--message', message], {
    cwd: MISSION_CONTROL_ROOT,
    stdio: 'ignore',
  })

  if (!child.pid) {
    throw new Error(`Failed to spawn QA session for ${task.id}`)
  }

  return { sessionId, pid: child.pid, child, qaResultPath, likelyWebsite }
}

function readQaResult(taskId) {
  try {
    const resultPath = qaResultPathForTask(taskId)
    if (!fs.existsSync(resultPath)) return null
    const raw = fs.readFileSync(resultPath, 'utf8').trim()
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function normalizeQaResult(task, qaResult, exitCode) {
  const status = qaResult?.status === 'pass' ? 'pass' : qaResult?.status === 'fail' ? 'fail' : null
  const summary = typeof qaResult?.summary === 'string' && qaResult.summary.trim()
    ? qaResult.summary.trim()
    : (exitCode === 0 ? 'QA session finished but returned no structured summary.' : `QA session exited with code ${exitCode}.`)

  const failureReasons = Array.isArray(qaResult?.failureReasons)
    ? qaResult.failureReasons.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim())
    : []

  const evidence = Array.isArray(qaResult?.evidence)
    ? qaResult.evidence.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim())
    : []

  const guidancePrompt = typeof qaResult?.guidancePrompt === 'string' && qaResult.guidancePrompt.trim()
    ? qaResult.guidancePrompt.trim()
    : `Please fix task ${task.id} (${task.title ?? ''}) to satisfy acceptance criteria. Include concrete UI and behavior checks and provide evidence.`

  if (status) {
    return { status, summary, failureReasons, evidence, guidancePrompt }
  }

  return {
    status: exitCode === 0 ? 'fail' : 'fail',
    summary,
    failureReasons: failureReasons.length ? failureReasons : ['QA result JSON missing or malformed.'],
    evidence,
    guidancePrompt,
  }
}

function nextTaskId(tasks) {
  const maxTaskNumber = (tasks ?? []).reduce((max, task) => {
    const match = String(task?.id ?? '').match(/^MC-(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `MC-${maxTaskNumber + 1}`
}

function createQaFixTask(tasks, sourceTask, qaVerdict, qaEvidenceImages = []) {
  const id = nextTaskId(tasks)
  const reasonBullets = qaVerdict.failureReasons.length
    ? qaVerdict.failureReasons.map((line) => `- ${line}`)
    : ['- No explicit failure reasons were provided by QA.']

  const evidenceLines = qaEvidenceImages.length
    ? qaEvidenceImages.map((img, idx) => `${idx + 1}. ${img}`).join('\n')
    : 'No screenshot evidence was captured by QA.'

  const objective = [
    `Fix QA failure from ${sourceTask.id} (${sourceTask.title ?? ''}).`,
    '',
    `QA Summary: ${qaVerdict.summary}`,
    '',
    'Why failed:',
    ...reasonBullets,
    '',
    'Screenshot evidence:',
    evidenceLines,
    '',
    'Implementation guidance prompt:',
    qaVerdict.guidancePrompt,
  ].join('\n')

  return {
    id,
    title: `[QA Fix] ${sourceTask.title ?? sourceTask.id}`,
    objective,
    acceptanceCriteria: Array.isArray(sourceTask.acceptanceCriteria) ? sourceTask.acceptanceCriteria : [],
    plan: ['Review QA findings', 'Implement targeted fix', 'Prepare for QA re-test'],
    next: '',
    tags: Array.from(new Set([...(Array.isArray(sourceTask.tags) ? sourceTask.tags : []), 'qa-fix', 'qa-fail', 'MissionControl'])),
    lane: 'backlog',
    createdAt: nowIso(),
    targetUrl: sourceTask.targetUrl,
    sourceTaskId: sourceTask.id,
    qaSummary: qaVerdict.summary,
    qaGuidancePrompt: qaVerdict.guidancePrompt,
    imageAttachments: buildTaskImageAttachmentsFromPaths(qaEvidenceImages),
  }
}

function isProcessAlive(pid) {
  const numericPid = Number(pid)
  if (!Number.isFinite(numericPid) || numericPid <= 0) return false
  try {
    process.kill(numericPid, 0)
    return true
  } catch {
    return false
  }
}

async function finalizeQaTaskOutcome(latestState, task, qaSessionKey, exitCode, completionReason = 'qa_session_closed') {
  const currentIndex = (latestState.tasks ?? []).findIndex((x) => x.id === task.id)
  if (currentIndex === -1) return false

  const current = latestState.tasks[currentIndex]
  if (qaSessionKey && current.qaSessionKey && current.qaSessionKey !== qaSessionKey) return false

  const qaResultRaw = readQaResult(task.id)
  const qaVerdict = normalizeQaResult(current, qaResultRaw, exitCode)
  const finishedAt = nowIso()

  latestState.tasks.splice(currentIndex, 1)

  const qaEvidenceImages = collectQaEvidenceImages(current, qaVerdict)
  const qaEvidenceLine = qaEvidenceImages.length
    ? `Evidence: attached image${qaEvidenceImages.length > 1 ? 's' : ''} (${qaEvidenceImages.map((p) => path.basename(p)).join(', ')})`
    : 'Evidence missing: no QA screenshot/artifact image was found.'

  if (qaVerdict.status === 'pass') {
    pushActivity(latestState, {
      id: makeId('act'),
      title: `${current.id} completed`,
      detail: `${current.title ?? current.id} passed QA and was archived. ${qaVerdict.summary}`,
      time: 'just now',
      createdAt: finishedAt,
    })

    appendDispatchQueue({
      type: 'qa_dispatch_complete',
      at: finishedAt,
      taskId: current.id,
      qaRunId: current.qaRunId,
      qaSessionKey: current.qaSessionKey ?? qaSessionKey,
      exitCode,
      qaStatus: 'pass',
      summary: qaVerdict.summary,
      completionReason,
      status: 'completed',
    })

    await postWebhook([
      '✅ Mission Control QA Passed',
      `Task: ${current.title ?? current.id}`,
      'Action: removed from board as completed.',
      `Summary: ${qaVerdict.summary}`,
      qaEvidenceLine,
    ].join('\n'), {
      files: qaEvidenceImages,
    })
  } else {
    const followUp = createQaFixTask(latestState.tasks, current, qaVerdict, qaEvidenceImages)
    latestState.tasks.unshift(followUp)

    pushActivity(latestState, {
      id: makeId('act'),
      title: `${current.id} QA failed`,
      detail: `${current.title ?? current.id} failed QA. Created ${followUp.id} in backlog.`,
      time: 'just now',
      createdAt: finishedAt,
    })

    appendDispatchQueue({
      type: 'qa_dispatch_complete',
      at: finishedAt,
      taskId: current.id,
      qaRunId: current.qaRunId,
      qaSessionKey: current.qaSessionKey ?? qaSessionKey,
      exitCode,
      qaStatus: 'fail',
      summary: qaVerdict.summary,
      followUpTaskId: followUp.id,
      completionReason,
      status: 'completed',
    })

    const reasonLines = qaVerdict.failureReasons.length
      ? qaVerdict.failureReasons.map((line) => `- ${line}`)
      : ['- no explicit reason returned by QA.']

    await postWebhook([
      '❌ Mission Control QA Failed',
      `Task: ${current.title ?? current.id}`,
      `Created follow-up backlog task: ${followUp.id}`,
      `Summary: ${qaVerdict.summary}`,
      'Why failed:',
      ...reasonLines,
      qaEvidenceLine,
    ].join('\n'), {
      files: qaEvidenceImages,
    })
  }

  fs.rmSync(qaResultPathForTask(task.id), { force: true })
  writeState(latestState)
  return true
}

function mergeIncomingTasks(previousTasks, incomingTasks) {
  const previousById = new Map((previousTasks ?? []).map((task) => [task.id, task]))
  return (incomingTasks ?? []).map((task) => {
    const previous = previousById.get(task?.id)
    if (!previous) return task
    return { ...previous, ...task }
  })
}

function pushTaskCompletionActivity(previousState, nextState) {
  const previousById = new Map((previousState?.tasks ?? []).map((task) => [task.id, task]))

  for (const task of nextState?.tasks ?? []) {
    const previous = previousById.get(task.id)
    if (!previous) continue

    if (previous.lane === 'in_progress' && task.lane !== 'in_progress') {
      const completedAt = task.completedAt ?? nowIso()
      if (!task.completedAt) task.completedAt = completedAt
      if (!task.resultSummary) {
        task.resultSummary = task.lane === 'testing'
          ? 'Execution session ended.'
          : `Task moved from in_progress to ${task.lane}.`
      }

      pushActivity(nextState, {
        id: makeId('act'),
        title: `${task.id} execution ended`,
        detail: `${task.title ?? task.id} moved to ${task.lane}. ${task.resultSummary}`,
        time: 'just now',
        createdAt: completedAt,
      })
    }
  }
}

async function notifyBoardEvents(previousState, nextState) {
  const previousTasks = previousState?.tasks ?? []
  const nextTasks = nextState?.tasks ?? []

  const previousById = new Map(previousTasks.map((task) => [task.id, task]))

  for (const task of nextTasks) {
    const previous = previousById.get(task.id)
    if (!previous) {
      await postWebhook([
        '🆕 Mission Control New Task',
        `Name: ${task.title ?? task.id}`,
        `Description: ${task.objective ?? ''}`,
        `Status: ${task.lane ?? 'backlog'}`,
      ].join('\n'))
      continue
    }

    if (previous.lane !== task.lane && (task.lane === 'testing' || task.lane === 'in_progress')) {
      await postWebhook([
        '🔄 Mission Control Task Status Changed',
        `Name: ${task.title ?? task.id}`,
        `Description: ${task.objective ?? ''}`,
        `Status: ${task.lane}`,
        task.resultSummary ? `Summary: ${task.resultSummary}` : '',
      ].filter(Boolean).join('\n'))
    }
  }
}

async function dispatchTriagedTasksFromBoard() {
  const state = readState()
  const tasks = state?.tasks ?? []
  let changed = false

  for (const task of tasks) {
    if (task?.lane !== 'triaged') continue
    if (task?.dispatchedAt) continue

    const now = nowIso()
    const { sessionId: sessionKey, pid, child } = startExecutionSession(task)

    task.dispatchedAt = now
    task.lane = 'in_progress'
    task.runId = task.runId ?? makeId('RUN')
    task.dispatchSessionKey = sessionKey
    changed = true

    appendDispatchQueue({
      type: 'dispatch_request',
      at: now,
      task: {
        id: task.id,
        title: task.title,
        objective: task.objective,
        acceptanceCriteria: task.acceptanceCriteria ?? [],
      },
      runId: task.runId,
      sessionKey,
      spawnedPid: pid,
      spawnMethod: 'openclaw-agent-direct',
      status: 'started',
    })

    child.on('close', async (code) => {
      try {
        const latest = readState()
        const current = (latest.tasks ?? []).find((x) => x.id === task.id)
        if (!current) return

        const completedAt = nowIso()
        current.lane = 'testing'
        current.completedAt = completedAt
        current.resultSummary = code === 0
          ? (current.resultSummary || 'Execution session ended.')
          : `Execution session exited with code ${code}.`

        pushActivity(latest, {
          id: makeId('act'),
          title: `${current.id} execution ended`,
          detail: `${current.title ?? current.id} moved to testing (waiting for QA).`,
          time: 'just now',
          createdAt: completedAt,
        })

        writeState(latest)
        appendDispatchQueue({
          type: 'dispatch_complete',
          at: completedAt,
          taskId: current.id,
          runId: current.runId,
          sessionKey: current.dispatchSessionKey,
          exitCode: code,
          status: 'completed',
        })

        const playwrightImages = collectPlaywrightImagesForTask(current)
        await postWebhook([
          '✅ Mission Control Task Execution Ended',
          `Name: ${current.title ?? current.id}`,
          `Description: ${current.objective ?? ''}`,
          `Status: ${current.lane ?? 'in_progress'}`,
          `Summary: ${current.resultSummary}`,
          playwrightImages.length ? `Playwright images: ${playwrightImages.map((p) => path.basename(p)).join(', ')}` : '',
        ].filter(Boolean).join('\n'), {
          files: playwrightImages,
        })
      } catch (error) {
        console.error('[board-bridge] execution close handler error', error)
      }
    })

    await postWebhook([
      '🚀 Mission Control Dispatch Requested',
      `Name: ${task.title ?? task.id}`,
      `Description: ${task.objective ?? ''}`,
      'Status: in_progress',
      `Run: ${task.runId}`,
    ].join('\n'))
  }

  if (changed) writeState(state)
}

async function dispatchTestingTasksForQa() {
  const state = readState()
  const tasks = state?.tasks ?? []
  let changed = false

  for (const task of tasks) {
    if (task?.lane !== 'testing') continue
    if (task?.qaDispatchedAt || task?.qaStatus === 'running') continue

    const now = nowIso()
    const { sessionId, pid, child, qaResultPath, likelyWebsite } = startQaSession(task)

    task.qaDispatchedAt = now
    task.qaStatus = 'running'
    task.qaSessionKey = sessionId
    task.qaRunId = task.qaRunId ?? makeId('QARUN')
    task.qaResultPath = qaResultPath
    changed = true

    pushActivity(state, {
      id: makeId('act'),
      title: `${task.id} QA started`,
      detail: `${task.title ?? task.id} entered QA in testing lane.`,
      time: 'just now',
      createdAt: now,
    })

    task.qaSpawnedPid = pid

    appendDispatchQueue({
      type: 'qa_dispatch_request',
      at: now,
      task: {
        id: task.id,
        title: task.title,
        objective: task.objective,
        targetUrl: task.targetUrl ?? null,
        acceptanceCriteria: task.acceptanceCriteria ?? [],
      },
      qaRunId: task.qaRunId,
      qaSessionKey: sessionId,
      spawnedPid: pid,
      qaResultPath,
      likelyWebsite,
      status: 'started',
    })

    child.on('close', async (code) => {
      try {
        const latest = readState()
        await finalizeQaTaskOutcome(latest, task, sessionId, code, 'qa_session_closed')
      } catch (error) {
        console.error('[board-bridge] QA close handler error', error)
      }
    })

    await postWebhook([
      '🧪 Mission Control QA Started',
      `Task: ${task.title ?? task.id}`,
      `Testing lane item is now being reviewed in a dedicated QA session (${task.qaSessionKey}).`,
      `Website task: ${likelyWebsite ? 'yes' : 'no'}`,
    ].join('\n'))
  }

  if (changed) writeState(state)
}

async function recoverStaleOrMissingQaSessions() {
  const state = readState()
  const tasks = state?.tasks ?? []

  for (const task of tasks) {
    if (task?.lane !== 'testing') continue
    if (task?.qaStatus !== 'running') continue

    const dispatchedAtMs = task?.qaDispatchedAt ? new Date(task.qaDispatchedAt).getTime() : Number.NaN
    const stale = Number.isFinite(dispatchedAtMs) ? (Date.now() - dispatchedAtMs > QA_STALE_MS) : true
    const resultReady = Boolean(readQaResult(task.id))
    const processAlive = isProcessAlive(task?.qaSpawnedPid)

    if (!resultReady && processAlive && !stale) continue

    const completionReason = resultReady
      ? 'qa_result_detected'
      : processAlive
        ? 'qa_session_stale_timeout'
        : 'qa_session_missing_or_exited'

    const syntheticExitCode = resultReady ? 0 : 1
    const latest = readState()
    await finalizeQaTaskOutcome(latest, task, task?.qaSessionKey, syntheticExitCode, completionReason)
  }
}

function readSessionLog(sessionId) {
  try {
    if (!sessionId) return []
    const safe = String(sessionId).replace(/[^a-zA-Z0-9._-]/g, '')
    if (!safe) return []

    const file = path.join(SESSION_STORE_DIR, `${safe}.jsonl`)
    if (!fs.existsSync(file)) return []

    const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).slice(-40)
    const out = []
    for (const line of lines) {
      try {
        const row = JSON.parse(line)
        if (!row || typeof row !== 'object') continue

        const message = row.message && typeof row.message === 'object' ? row.message : row
        const role = message.role ?? row.role ?? 'assistant'

        const text = typeof row.text === 'string'
          ? row.text
          : typeof message.text === 'string'
            ? message.text
            : Array.isArray(message.content)
              ? message.content
                .map((c) => {
                  if (!c || typeof c !== 'object') return ''
                  if (typeof c.text === 'string') return c.text
                  if (typeof c.thinking === 'string') return c.thinking
                  if (typeof c.type === 'string' && c.type === 'toolCall' && typeof c.name === 'string') return `[toolCall] ${c.name}`
                  return ''
                })
                .join('\n')
                .trim()
              : Array.isArray(row.content)
                ? row.content.map((c) => c?.text || c?.thinking || '').join('\n').trim()
                : ''

        if (text) out.push({ role, text })
      } catch {}
    }
    return out
  } catch (error) {
    console.error('[board-bridge] failed to read session log', error)
    return []
  }
}

function collectTaskArtifactImages(taskId) {
  const safeTaskId = String(taskId || '').trim().toUpperCase()
  if (!safeTaskId) return []

  const dirs = [QA_RESULTS_DIR, RUN_LOGS_DIR]
  const imageExt = /\.(png|jpe?g|webp|gif)$/i
  const names = new Set()
  const files = []

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue
    for (const name of fs.readdirSync(dir)) {
      if (!name.toUpperCase().startsWith(safeTaskId)) continue
      if (!imageExt.test(name)) continue
      const fullPath = path.join(dir, name)
      if (!fs.statSync(fullPath).isFile()) continue
      if (names.has(fullPath)) continue
      names.add(fullPath)
      files.push(fullPath)
    }
  }

  files.sort((a, b) => {
    const aTime = fs.statSync(a).mtimeMs
    const bTime = fs.statSync(b).mtimeMs
    return bTime - aTime
  })

  return files.map((fullPath) => ({
    name: path.basename(fullPath),
    sourcePath: fullPath,
  }))
}

function resolveSafeArtifactPath(rawPath) {
  if (!rawPath) return null
  const resolved = path.resolve(String(rawPath))
  const roots = [QA_RESULTS_DIR, RUN_LOGS_DIR]
  for (const root of roots) {
    const normalizedRoot = `${path.resolve(root)}${path.sep}`
    if (resolved.startsWith(normalizedRoot)) return resolved
  }
  return null
}

function classifyDocTags(filePath, fileName) {
  const lowerPath = filePath.toLowerCase()
  const lowerName = fileName.toLowerCase()
  const tags = []
  if (lowerName.includes('readme')) tags.push('readme')
  if (lowerName.includes('claude')) tags.push('claude')
  if (lowerName.includes('agent')) tags.push('agent')
  if (lowerName.includes('memory')) tags.push('memory')
  if (lowerPath.includes('/docs/')) tags.push('docs')
  if (!tags.length) tags.push('general')
  return Array.from(new Set(tags))
}

function collectProjectDocs() {
  const docs = []
  const maxDocs = 240
  const includeFiles = new Set(['README.md', 'CLAUDE.md', 'AGENTS.md', 'MEMORY.md'])
  const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.openclaw', '.mc-docs', 'Library'])

  function visitDir(rootDir, relDir = '', depth = 0, projectName = '') {
    if (docs.length >= maxDocs || depth > 4) return

    let entries = []
    try {
      entries = fs.readdirSync(path.join(rootDir, relDir), { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (docs.length >= maxDocs) break
      const relPath = relDir ? path.join(relDir, entry.name) : entry.name
      const fullPath = path.join(rootDir, relPath)

      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue
        visitDir(rootDir, relPath, depth + 1, projectName)
        continue
      }

      if (!entry.isFile()) continue
      const isMarkdown = /\.md$/i.test(entry.name)
      if (!isMarkdown && !includeFiles.has(entry.name)) continue

      let stat
      let content = ''
      try {
        stat = fs.statSync(fullPath)
        content = fs.readFileSync(fullPath, 'utf8')
      } catch {
        continue
      }

      docs.push({
        id: `${projectName}:${relPath}`,
        project: projectName,
        title: entry.name,
        path: relPath,
        absPath: fullPath,
        tags: classifyDocTags(relPath, entry.name),
        modifiedAt: stat.mtime.toISOString(),
        content,
        readOnly: true,
        source: 'imported',
      })
    }
  }

  let workspaceEntries = []
  try {
    workspaceEntries = fs.readdirSync(WORKSPACE_ROOT, { withFileTypes: true })
  } catch {
    return []
  }

  for (const entry of workspaceEntries) {
    if (!entry.isDirectory()) continue
    if (skipDirs.has(entry.name)) continue
    visitDir(path.join(WORKSPACE_ROOT, entry.name), '', 0, entry.name)
  }

  // Also include top-level workspace memory/docs files under a virtual project.
  const personalProject = 'personal-memory'
  for (const fileName of ['MEMORY.md', 'USER.md', 'SOUL.md', 'AGENTS.md']) {
    const fullPath = path.join(WORKSPACE_ROOT, fileName)
    if (!fs.existsSync(fullPath)) continue
    try {
      const stat = fs.statSync(fullPath)
      const content = fs.readFileSync(fullPath, 'utf8')
      docs.push({
        id: `${personalProject}:${fileName}`,
        project: personalProject,
        title: fileName,
        path: fileName,
        absPath: fullPath,
        tags: classifyDocTags(fileName, fileName),
        modifiedAt: stat.mtime.toISOString(),
        content,
        readOnly: true,
        source: 'imported',
      })
    } catch {}
  }

  docs.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
  return docs.slice(0, maxDocs)
}

function readAuthoredDocs() {
  const index = readDocStoreIndex()
  const projects = Array.isArray(index.projects) ? index.projects : []
  const docsMeta = Array.isArray(index.docs) ? index.docs : []
  const projectBySlug = new Map(projects.map((project) => [project.slug, project]))
  const docs = []

  for (const doc of docsMeta) {
    const project = projectBySlug.get(doc.projectSlug)
    if (!project) continue
    const absPath = path.join(DOC_STORE_ROOT, 'projects', doc.projectSlug, `${doc.slug}.md`)
    if (!fs.existsSync(absPath)) continue

    let content = ''
    let stat
    try {
      content = fs.readFileSync(absPath, 'utf8')
      stat = fs.statSync(absPath)
    } catch {
      continue
    }

    docs.push({
      id: `authored:${doc.projectSlug}:${doc.slug}`,
      project: project.name,
      projectSlug: project.slug,
      title: doc.title,
      path: `.mc-docs/projects/${doc.projectSlug}/${doc.slug}.md`,
      absPath,
      tags: sanitizeDocTags(doc.tags),
      modifiedAt: (doc.updatedAt || stat.mtime.toISOString()),
      content,
      readOnly: false,
      source: 'authored',
    })
  }

  docs.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
  return { projects, docs }
}

function createDocProject(input) {
  const name = String(input?.name || '').trim()
  const description = String(input?.description || '').trim()
  if (!name) throw new Error('Project name is required')

  const index = readDocStoreIndex()
  const baseSlug = slugify(input?.slug || name, 'project')
  let slug = baseSlug
  let i = 1
  while (index.projects.some((project) => project.slug === slug)) {
    i += 1
    slug = `${baseSlug}-${i}`
  }

  const project = {
    slug,
    name,
    description,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  index.projects = [project, ...index.projects]
  writeDocStoreIndex(index)

  fs.mkdirSync(path.join(DOC_STORE_ROOT, 'projects', slug), { recursive: true })
  return project
}

function saveAuthoredDoc(input) {
  const projectSlug = String(input?.projectSlug || '').trim()
  const title = String(input?.title || '').trim()
  const content = String(input?.content || '')
  if (!projectSlug) throw new Error('projectSlug is required')
  if (!title) throw new Error('title is required')

  const index = readDocStoreIndex()
  const project = index.projects.find((item) => item.slug === projectSlug)
  if (!project) throw new Error(`Unknown project: ${projectSlug}`)

  const tags = sanitizeDocTags(input?.tags)
  const maybeDocId = String(input?.docId || '')
  const isUpdating = maybeDocId.startsWith('authored:')

  let slug = slugify(input?.slug || title, 'doc')
  if (isUpdating) {
    const existingSlug = maybeDocId.split(':')[2]
    if (existingSlug) slug = existingSlug
  } else {
    let i = 1
    const base = slug
    while (index.docs.some((doc) => doc.projectSlug === projectSlug && doc.slug === slug)) {
      i += 1
      slug = `${base}-${i}`
    }
  }

  const docDir = path.join(DOC_STORE_ROOT, 'projects', projectSlug)
  fs.mkdirSync(docDir, { recursive: true })
  const absPath = path.join(docDir, `${slug}.md`)
  fs.writeFileSync(absPath, content, 'utf8')

  const now = nowIso()
  const existingIndex = index.docs.findIndex((doc) => doc.projectSlug === projectSlug && doc.slug === slug)
  const nextMeta = {
    projectSlug,
    slug,
    title,
    tags,
    createdAt: existingIndex >= 0 ? index.docs[existingIndex].createdAt : now,
    updatedAt: now,
  }

  if (existingIndex >= 0) index.docs[existingIndex] = nextMeta
  else index.docs.unshift(nextMeta)

  project.updatedAt = now
  writeDocStoreIndex(index)

  return {
    id: `authored:${projectSlug}:${slug}`,
    project: project.name,
    projectSlug,
    title,
    path: `.mc-docs/projects/${projectSlug}/${slug}.md`,
    absPath,
    tags,
    modifiedAt: now,
    content,
    readOnly: false,
    source: 'authored',
  }
}

function collectDocsPayload() {
  const imported = collectProjectDocs()
  const authored = readAuthoredDocs()
  return {
    docs: [...authored.docs, ...imported].sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()),
    projects: authored.projects,
  }
}

process.on('uncaughtException', (error) => {
  console.error('[board-bridge] uncaught exception', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('[board-bridge] unhandled rejection', reason)
})

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (url.pathname === '/state' && req.method === 'GET') {
    const state = readState()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ...state, nextPickupAt: new Date(nextPickupAtMs).toISOString() }))
    return
  }

  if (url.pathname === '/session-log' && req.method === 'GET') {
    const sessionId = url.searchParams.get('sessionId') || ''
    const messages = readSessionLog(sessionId)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ sessionId, messages }))
    return
  }

  if (url.pathname === '/task-artifacts' && req.method === 'GET') {
    const taskId = url.searchParams.get('taskId') || ''
    const origin = `http://${req.headers.host || `127.0.0.1:${PORT}`}`
    const images = collectTaskArtifactImages(taskId).map((img) => ({
      ...img,
      url: `${origin}/artifact-file?path=${encodeURIComponent(img.sourcePath)}`,
    }))
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ taskId, images }))
    return
  }

  if (url.pathname === '/docs' && req.method === 'GET') {
    const payload = collectDocsPayload()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(payload))
    return
  }

  if (url.pathname === '/docs/projects' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 100_000) req.destroy()
    })
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}')
        const project = createDocProject(parsed)
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ ok: true, project }))
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Failed to create project' }))
      }
    })
    return
  }

  if (url.pathname === '/docs/doc' && (req.method === 'POST' || req.method === 'PUT')) {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1_500_000) req.destroy()
    })
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}')
        const doc = saveAuthoredDoc(parsed)
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ ok: true, doc }))
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Failed to save document' }))
      }
    })
    return
  }

  if (url.pathname === '/artifact-file' && req.method === 'GET') {
    const filePath = resolveSafeArtifactPath(url.searchParams.get('path'))
    if (!filePath || !fs.existsSync(filePath)) {
      res.writeHead(404)
      res.end('Not found')
      return
    }

    const ext = path.extname(filePath).toLowerCase()
    const contentType = ext === '.png'
      ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.webp'
          ? 'image/webp'
          : ext === '.gif'
            ? 'image/gif'
            : 'application/octet-stream'

    res.setHeader('Content-Type', contentType)
    fs.createReadStream(filePath).pipe(res)
    return
  }

  if (url.pathname === '/state' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 2_000_000) req.destroy()
    })
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}')
        const previous = readState()
        const baseUpdatedAt = typeof parsed.baseUpdatedAt === 'string' ? parsed.baseUpdatedAt : ''
        if (baseUpdatedAt && previous.updatedAt && baseUpdatedAt !== previous.updatedAt) {
          res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: false, conflict: true, state: previous }))
          return
        }

        const incomingTasks = Array.isArray(parsed.tasks)
          ? mergeIncomingTasks(previous.tasks, parsed.tasks)
          : (previous.tasks ?? [])

        const { baseUpdatedAt: _ignoredBaseUpdatedAt, ...parsedWithoutBase } = parsed
        const merged = {
          ...previous,
          ...parsedWithoutBase,
          tasks: incomingTasks,
          activity: Array.isArray(parsed.activity) ? parsed.activity : (previous.activity ?? []),
        }

        pushTaskCompletionActivity(previous, merged)
        const saved = writeState(merged)
        await notifyBoardEvents(previous, saved)

        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ ok: true, state: saved }))
      } catch (error) {
        res.writeHead(400)
        res.end(JSON.stringify({ ok: false, error: String(error) }))
      }
    })
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[board-bridge] listening on http://127.0.0.1:${PORT}`)
  console.log(`[board-bridge] state path: ${STATE_PATH}`)
  console.log(`[board-bridge] session store: ${SESSION_STORE_DIR}`)
  console.log(`[board-bridge] self-dispatch scan every ${DISPATCH_INTERVAL_MS}ms`)
})

setInterval(() => {
  nextPickupAtMs = Date.now() + DISPATCH_INTERVAL_MS
  dispatchTriagedTasksFromBoard()
    .then(() => dispatchTestingTasksForQa())
    .then(() => recoverStaleOrMissingQaSessions())
    .catch((error) => {
      console.error('[board-bridge] dispatch scan error', error)
    })
}, DISPATCH_INTERVAL_MS)
