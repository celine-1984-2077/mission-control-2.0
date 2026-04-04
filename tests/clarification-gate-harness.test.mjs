import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const BRIDGE_SOURCE = path.join(ROOT, 'automation', 'board-bridge-server.mjs')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

test('triaged website task waits for clarification before coder dispatch', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mc2-clarification-'))
  const automationDir = path.join(tempRoot, 'automation')
  const binDir = path.join(tempRoot, 'bin')
  const spawnLog = path.join(tempRoot, 'spawn-count.txt')

  fs.mkdirSync(automationDir, { recursive: true })
  fs.mkdirSync(binDir, { recursive: true })
  fs.copyFileSync(BRIDGE_SOURCE, path.join(automationDir, 'board-bridge-server.mjs'))

  const statePath = path.join(automationDir, 'board-state.json')
  fs.writeFileSync(statePath, JSON.stringify({
    tasks: [
      {
        id: 'MC-1',
        title: 'Website hero polish',
        objective: 'Update the website hero section and verify it in the browser.',
        lane: 'triaged',
        tags: ['frontend'],
      },
    ],
    activity: [],
    updatedAt: null,
  }, null, 2))

  const fakeOpenclawPath = path.join(binDir, 'openclaw')
  fs.writeFileSync(fakeOpenclawPath, `#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const file = ${JSON.stringify(spawnLog)}
const current = fs.existsSync(file) ? Number(fs.readFileSync(file, 'utf8')) : 0
fs.writeFileSync(file, String(current + 1))
process.exit(0)
`)
  fs.chmodSync(fakeOpenclawPath, 0o755)

  const bridge = spawn(process.execPath, [path.join(automationDir, 'board-bridge-server.mjs')], {
    cwd: tempRoot,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      BOARD_BRIDGE_PORT: '18788',
      BOARD_DISPATCH_INTERVAL_MS: '150',
    },
    stdio: 'ignore',
  })

  try {
    await sleep(600)
    const current = readJson(statePath)
    const task = current.tasks.find((entry) => entry.id === 'MC-1')
    assert.ok(task, 'task should still exist')
    assert.equal(task.lane, 'triaged')
    assert.equal(task.dispatchedAt, undefined)
    assert.equal(task.dispatchBlockedReason, 'clarification_required')
    assert.equal(fs.existsSync(spawnLog), false, 'openclaw should not be spawned while clarification is missing')
  } finally {
    bridge.kill('SIGTERM')
  }
})
