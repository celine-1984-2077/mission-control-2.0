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

test('live dispatch lifecycle finalizes QA fail even when QA session is still stuck/running', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mc2-qa-live-'))
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
        id: 'MC-7',
        title: '[QA Fix] runtime stuck reproduction',
        objective: 'Simulate a real dispatch→testing→QA flow where QA process stays alive.',
        lane: 'triaged',
      },
    ],
    activity: [],
    updatedAt: null,
  }, null, 2))

  const fakeOpenclawPath = path.join(binDir, 'openclaw')
  fs.writeFileSync(fakeOpenclawPath, `#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')

const args = process.argv.slice(2)
const msgIndex = args.indexOf('--message')
const message = msgIndex >= 0 ? (args[msgIndex + 1] || '') : ''
const sessionIndex = args.indexOf('--session-id')
const sessionId = sessionIndex >= 0 ? (args[sessionIndex + 1] || '') : ''

if (sessionId.startsWith('qa-')) {
  const taskMatch = message.match(/Task ID:\\s*([^\\n]+)/)
  const qaPathMatch = message.match(/Write machine-readable QA result JSON to:\\s*([^\\n]+)/)
  const taskId = taskMatch ? taskMatch[1].trim() : 'MC-UNKNOWN'
  const qaResultPath = qaPathMatch ? qaPathMatch[1].trim() : ''

  if (qaResultPath) {
    fs.mkdirSync(path.dirname(qaResultPath), { recursive: true })
    const evidencePath = path.join(path.dirname(qaResultPath), taskId + '-stuck-evidence.png')
    const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO1x8fQAAAAASUVORK5CYII='
    fs.writeFileSync(evidencePath, Buffer.from(tinyPngBase64, 'base64'))

    fs.writeFileSync(qaResultPath, JSON.stringify({
      taskId,
      status: 'fail',
      summary: 'QA discovered stuck-session fail path.',
      failureReasons: ['Testing task was not finalized from running QA state'],
      guidancePrompt: 'Finalize QA fail path atomically with follow-up task creation.',
      evidence: [evidencePath],
    }, null, 2))
  }

  // Keep process alive long enough to emulate a stuck QA session.
  setTimeout(() => process.exit(0), 5000)
  return
}

// execution sessions exit quickly and cleanly
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
      BOARD_BRIDGE_PORT: '18788',
      BOARD_DISPATCH_INTERVAL_MS: '120',
      BOARD_QA_STALE_MS: '200',
    },
    stdio: 'ignore',
  })

  try {
    const deadline = Date.now() + 12_000
    let current = readJson(statePath)

    while (Date.now() < deadline) {
      await sleep(200)
      current = readJson(statePath)
      const hasMc7 = current.tasks.some((task) => task.id === 'MC-7')
      const followUp = current.tasks.find((task) => task.sourceTaskId === 'MC-7' && task.lane === 'backlog')
      if (!hasMc7 && followUp) break
    }

    const hasMc7 = current.tasks.some((task) => task.id === 'MC-7')
    assert.equal(hasMc7, false, 'original task should be removed from board after QA fail finalization')

    const followUp = current.tasks.find((task) => task.sourceTaskId === 'MC-7' && task.lane === 'backlog')
    assert.ok(followUp, 'follow-up QA-fix task should be created in backlog')
    assert.match(followUp.title, /^\[QA Fix\]/)
    assert.match(followUp.objective, /Why failed:/)
    assert.match(followUp.objective, /- Testing task was not finalized from running QA state/)
    assert.ok(Array.isArray(followUp.imageAttachments) && followUp.imageAttachments.length > 0, 'follow-up should include evidence screenshot attachment(s)')

    const webhookText = webhookBodies.join('\n---\n')
    assert.match(webhookText, /Mission Control QA Failed/)
    assert.match(webhookText, /Why failed:/)
    assert.match(webhookText, /Testing task was not finalized from running QA state/)
    assert.match(webhookText, /MC-7-stuck-evidence.png/)
  } finally {
    bridge.kill('SIGTERM')
    webhookServer.close()
  }
})
