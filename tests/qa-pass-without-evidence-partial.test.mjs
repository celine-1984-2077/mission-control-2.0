import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const BRIDGE_SOURCE = path.join(ROOT, 'automation', 'board-bridge-server.mjs')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

test('frontend QA pass without evidence is downgraded to partial and creates follow-up task', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mc2-qa-partial-'))
  const automationDir = path.join(tempRoot, 'automation')
  const qaResultsDir = path.join(automationDir, 'qa-results')
  const runLogsDir = path.join(automationDir, 'run-logs')
  const binDir = path.join(tempRoot, 'bin')

  fs.mkdirSync(qaResultsDir, { recursive: true })
  fs.mkdirSync(runLogsDir, { recursive: true })
  fs.mkdirSync(binDir, { recursive: true })
  fs.copyFileSync(BRIDGE_SOURCE, path.join(automationDir, 'board-bridge-server.mjs'))

  const statePath = path.join(automationDir, 'board-state.json')
  fs.writeFileSync(statePath, JSON.stringify({
    tasks: [
      {
        id: 'MC-9',
        title: 'Frontend smoke check',
        objective: 'Verify the frontend task in a browser.',
        targetUrl: 'http://127.0.0.1:5173',
        lane: 'testing',
      },
    ],
    activity: [],
    updatedAt: null,
  }, null, 2))

  const fakeOpenclawPath = path.join(binDir, 'openclaw')
  fs.writeFileSync(fakeOpenclawPath, `#!/usr/bin/env node
const fs = require('node:fs')
const args = process.argv.slice(2)
const msgIndex = args.indexOf('--message')
const message = msgIndex >= 0 ? (args[msgIndex + 1] || '') : ''
const qaPathMatch = message.match(/Write machine-readable QA result JSON to:\\s*([^\\n]+)/)
const taskMatch = message.match(/Task ID:\\s*([^\\n]+)/)
if (qaPathMatch) {
  const qaResultPath = qaPathMatch[1].trim()
  const taskId = taskMatch ? taskMatch[1].trim() : 'MC-UNKNOWN'
  fs.mkdirSync(require('node:path').dirname(qaResultPath), { recursive: true })
  fs.writeFileSync(qaResultPath, JSON.stringify({
    taskId,
    verdict: 'pass',
    summary: 'UI looked correct at a glance.',
    reproSteps: ['Open the page.', 'Observe the main screen.'],
    failureReasons: [],
    guidancePrompt: 'Attach browser evidence before calling this passed.',
    evidence: []
  }, null, 2))
}
process.exit(0)
`)
  fs.chmodSync(fakeOpenclawPath, 0o755)

  const webhookBodies = []
  const webhookServer = http.createServer((req, res) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      webhookBodies.push(Buffer.concat(chunks).toString('utf8'))
      res.writeHead(204)
      res.end()
    })
  })
  await new Promise((resolve) => webhookServer.listen(0, '127.0.0.1', resolve))
  const webhookPort = webhookServer.address().port
  fs.writeFileSync(path.join(automationDir, 'discord-webhook.txt'), `http://127.0.0.1:${webhookPort}/webhook`)

  const bridge = spawn(process.execPath, [path.join(automationDir, 'board-bridge-server.mjs')], {
    cwd: tempRoot,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      BOARD_BRIDGE_PORT: '18789',
      BOARD_DISPATCH_INTERVAL_MS: '150',
      BOARD_QA_STALE_MS: '800',
    },
    stdio: 'ignore',
  })

  try {
    const deadline = Date.now() + 10_000
    let current = readJson(statePath)
    while (Date.now() < deadline) {
      await sleep(200)
      current = readJson(statePath)
      const hasOriginal = current.tasks.some((task) => task.id === 'MC-9')
      const hasFollowUp = current.tasks.some((task) => task.sourceTaskId === 'MC-9')
      if (!hasOriginal && hasFollowUp) break
    }

    const followUp = current.tasks.find((task) => task.sourceTaskId === 'MC-9')
    assert.ok(followUp, 'follow-up task should be created for partial verdict')
    const webhookText = webhookBodies.join('\n---\n')
    assert.match(webhookText, /"title":"QA Partial"/)
  } finally {
    bridge.kill('SIGTERM')
    webhookServer.close()
  }
})
