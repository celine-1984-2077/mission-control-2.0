import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const PORT = Number(process.env.BOARD_BRIDGE_PORT || 8787)
const DISPATCH_INTERVAL_MS = 10_000
const MISSION_CONTROL_ROOT = process.cwd()
const WORKSPACE_ROOT = path.resolve(MISSION_CONTROL_ROOT, '..')

const STATE_PATH = path.resolve(MISSION_CONTROL_ROOT, 'automation/board-state.json')
const WEBHOOK_PATH = path.resolve(MISSION_CONTROL_ROOT, 'automation/discord-webhook.txt')
const DISPATCH_QUEUE_PATH = path.resolve(MISSION_CONTROL_ROOT, 'automation/dispatch-queue.jsonl')
const QA_RESULTS_DIR = path.resolve(MISSION_CONTROL_ROOT, 'automation/qa-results')

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

async function postWebhook(content) {
  const webhookUrl = getWebhookUrl()
  if (!webhookUrl) return
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  }).catch(() => undefined)
}

function startExecutionSession(task) {
  const sessionId = `mc2-${task.id}-${Date.now()}`
  const message = [
    'Mission Control 2.0 execution task',
    `Task ID: ${task.id}`,
    `Title: ${task.title ?? ''}`,
    `Objective: ${task.objective ?? ''}`,
    `Target URL: ${task.targetUrl ?? 'not specified'}`,
    `Acceptance Criteria:\n${buildAcceptanceList(task)}`,
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

function createQaFixTask(tasks, sourceTask, qaVerdict) {
  const id = nextTaskId(tasks)
  const reasons = qaVerdict.failureReasons.length
    ? qaVerdict.failureReasons.map((line, idx) => `${idx + 1}. ${line}`).join('\n')
    : 'No explicit failure reasons were provided by QA.'

  const objective = [
    `Fix QA failure from ${sourceTask.id} (${sourceTask.title ?? ''}).`,
    '',
    `QA Summary: ${qaVerdict.summary}`,
    '',
    'Failure reasons:',
    reasons,
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
    tags: Array.from(new Set([...(Array.isArray(sourceTask.tags) ? sourceTask.tags : []), 'qa-fix', 'MissionControl'])),
    lane: 'triaged',
    createdAt: nowIso(),
    targetUrl: sourceTask.targetUrl,
    sourceTaskId: sourceTask.id,
    qaSummary: qaVerdict.summary,
    qaGuidancePrompt: qaVerdict.guidancePrompt,
  }
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

        await postWebhook([
          '✅ Mission Control Task Execution Ended',
          `Name: ${current.title ?? current.id}`,
          `Description: ${current.objective ?? ''}`,
          `Status: ${current.lane ?? 'in_progress'}`,
          `Summary: ${current.resultSummary}`,
        ].join('\n'))
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
        const currentIndex = (latest.tasks ?? []).findIndex((x) => x.id === task.id)
        if (currentIndex === -1) return

        const current = latest.tasks[currentIndex]
        if (current.qaSessionKey && current.qaSessionKey !== sessionId) return

        const qaResultRaw = readQaResult(task.id)
        const qaVerdict = normalizeQaResult(current, qaResultRaw, code)
        const finishedAt = nowIso()

        latest.tasks.splice(currentIndex, 1)

        if (qaVerdict.status === 'pass') {
          pushActivity(latest, {
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
            qaSessionKey: sessionId,
            exitCode: code,
            qaStatus: 'pass',
            summary: qaVerdict.summary,
            status: 'completed',
          })

          await postWebhook([
            '✅ Mission Control QA Passed',
            `Task: ${current.title ?? current.id}`,
            'Action: removed from board as completed.',
            `Summary: ${qaVerdict.summary}`,
          ].join('\n'))
        } else {
          const followUp = createQaFixTask(latest.tasks, current, qaVerdict)
          latest.tasks.unshift(followUp)

          pushActivity(latest, {
            id: makeId('act'),
            title: `${current.id} QA failed`,
            detail: `${current.title ?? current.id} failed QA. Created ${followUp.id} in triaged.`,
            time: 'just now',
            createdAt: finishedAt,
          })

          appendDispatchQueue({
            type: 'qa_dispatch_complete',
            at: finishedAt,
            taskId: current.id,
            qaRunId: current.qaRunId,
            qaSessionKey: sessionId,
            exitCode: code,
            qaStatus: 'fail',
            summary: qaVerdict.summary,
            followUpTaskId: followUp.id,
            status: 'completed',
          })

          await postWebhook([
            '❌ Mission Control QA Failed',
            `Task: ${current.title ?? current.id}`,
            `Created follow-up triage task: ${followUp.id}`,
            `Summary: ${qaVerdict.summary}`,
          ].join('\n'))
        }

        fs.rmSync(qaResultPathForTask(task.id), { force: true })
        writeState(latest)
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

process.on('uncaughtException', (error) => {
  console.error('[board-bridge] uncaught exception', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('[board-bridge] unhandled rejection', reason)
})

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
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

        const incomingTasks = Array.isArray(parsed.tasks)
          ? mergeIncomingTasks(previous.tasks, parsed.tasks)
          : (previous.tasks ?? [])

        const merged = {
          ...previous,
          ...parsed,
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
    .catch((error) => {
      console.error('[board-bridge] dispatch scan error', error)
    })
}, DISPATCH_INTERVAL_MS)
