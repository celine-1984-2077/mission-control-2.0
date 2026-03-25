import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const root = process.cwd()
const statePath = path.join(root, 'automation/board-state.json')
const qaPath = path.join(root, 'automation/qa-results/MC-10.json')
const outputPath = path.join(root, 'automation/qa-results/MC-10-discord-attachment-check.json')

const evidenceImageRel = 'automation/qa-results/MC-1-qa-ui.png'
const evidenceImageAbs = path.join(root, evidenceImageRel)
if (!fs.existsSync(evidenceImageAbs)) {
  throw new Error(`Missing evidence image: ${evidenceImageAbs}`)
}

const originalState = fs.existsSync(statePath)
  ? fs.readFileSync(statePath, 'utf8')
  : JSON.stringify({ tasks: [], activity: [], updatedAt: null }, null, 2)

const originalQa = fs.existsSync(qaPath) ? fs.readFileSync(qaPath, 'utf8') : null

const webhookEvents = []
const webhookServer = http.createServer((req, res) => {
  const chunks = []
  req.on('data', (chunk) => chunks.push(chunk))
  req.on('end', () => {
    const buf = Buffer.concat(chunks)
    const body = buf.toString('latin1')
    webhookEvents.push({
      method: req.method,
      url: req.url,
      contentType: req.headers['content-type'] || '',
      hasMultipart: String(req.headers['content-type'] || '').includes('multipart/form-data'),
      hasExpectedFilename: body.includes('filename="MC-1-qa-ui.png"'),
      hasExpectedEvidenceLine: body.includes('Evidence: attached image'),
      bodyPreview: body.slice(0, 500),
      size: buf.length,
      at: new Date().toISOString(),
    })
    res.writeHead(204)
    res.end()
  })
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let bridge
try {
  await new Promise((resolve, reject) => {
    webhookServer.once('error', reject)
    webhookServer.listen(9797, '127.0.0.1', resolve)
  })

  const testState = {
    tasks: [
      {
        id: 'MC-10',
        title: 'QA阶段的截图还是没有被推送到discord',
        objective: '验证 QA evidence 描述字符串中的截图路径可以作为 webhook 附件发出',
        lane: 'testing',
        resultSummary: 'Builder says parser fixed for descriptive evidence strings.',
        dispatchedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
        qaDispatchedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
        qaStatus: 'running',
        qaSessionKey: 'qa-mock-mc10',
        qaRunId: 'QARUN-MC10-MOCK',
        qaSpawnedPid: 999999,
      },
    ],
    activity: [],
    updatedAt: new Date().toISOString(),
  }

  const qaResult = {
    taskId: 'MC-10',
    status: 'pass',
    summary: 'Mock QA pass for Discord screenshot attachment regression verification.',
    failureReasons: [],
    guidancePrompt: '',
    evidence: [
      `UI evidence screenshot saved here: ${evidenceImageRel}`,
    ],
  }

  fs.writeFileSync(statePath, JSON.stringify(testState, null, 2))
  fs.writeFileSync(qaPath, JSON.stringify(qaResult, null, 2))

  bridge = spawn('node', ['automation/board-bridge-server.mjs'], {
    cwd: root,
    env: {
      ...process.env,
      BOARD_BRIDGE_PORT: '8799',
      BOARD_DISPATCH_INTERVAL_MS: '500',
      BOARD_QA_STALE_MS: '1000',
      DISCORD_WEBHOOK_URL: 'http://127.0.0.1:9797/hook',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const bridgeLogs = []
  bridge.stdout.on('data', (d) => bridgeLogs.push(String(d)))
  bridge.stderr.on('data', (d) => bridgeLogs.push(String(d)))

  const deadline = Date.now() + 10000
  while (Date.now() < deadline && webhookEvents.length === 0) {
    await sleep(200)
  }

  const event = webhookEvents[0] || null
  const result = {
    ok: Boolean(event?.hasMultipart && event?.hasExpectedFilename),
    webhookReceived: Boolean(event),
    webhookEvent: event,
    bridgeLogs: bridgeLogs.join('').slice(-2000),
  }

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))

  if (!result.ok) process.exitCode = 1
} finally {
  if (bridge && !bridge.killed) bridge.kill('SIGTERM')
  await sleep(200)
  webhookServer.close()

  fs.writeFileSync(statePath, originalState)
  if (originalQa == null) fs.rmSync(qaPath, { force: true })
  else fs.writeFileSync(qaPath, originalQa)
}
