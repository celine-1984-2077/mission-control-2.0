# Mission Control 2.0 (Starter)

Mission Control 2.0 is a local-first task board + automation bridge for OpenClaw workflows.

It provides:
- Kanban board UI (`http://127.0.0.1:5173` by default)
- Local bridge API (`http://127.0.0.1:8787/state`)
- Auto dispatch from board lanes to OpenClaw coder/QA sessions
- QA result ingestion + follow-up task generation

## Requirements

- Node.js 20+
- OpenClaw CLI installed and working (`openclaw` in PATH)

## Quick start

```bash
npm install
cp .env.example .env
npm run dev:all
```

## One-command run (recommended for OpenClaw use)

After clone/pull, ask OpenClaw to run this in the repo:

```bash
npm run run:website
```

This runs bootstrap + starts frontend + starts bridge.

During bootstrap, if `DISCORD_WEBHOOK_URL` is not configured and the command is interactive, it will prompt for a webhook URL and write it into `.env` automatically.

Open:
- UI: <http://127.0.0.1:5173>
- Bridge state endpoint: <http://127.0.0.1:8787/state>

Stop everything:

```bash
npm run stop:all
```

Health check:

```bash
npm run doctor
```

## Configuration

Use `.env` (from `.env.example`):

- `MISSION_CONTROL_PORT` (default: `5173`)
- `BOARD_BRIDGE_PORT` (default: `8787`)
- `OPENCLAW_HOME` (optional)
- `BOARD_SESSION_STORE_DIR` (optional)
- `DISCORD_WEBHOOK_URL` (optional)

Optional webhook file fallback:
- `automation/discord-webhook.txt` (gitignored)

## How the automation loop works

1. Task enters **triaged** lane → bridge dispatches coder session via `openclaw agent`.
2. On coder completion, task moves to **testing** lane.
3. Bridge dispatches QA session for testing tasks.
4. QA writes structured result JSON into `automation/qa-results/`.
5. Bridge ingests QA result:
   - pass → complete/archive
   - fail → create follow-up QA-fix task in triaged

## Repository hygiene (important)

Runtime/machine-specific files are ignored by git:
- logs, pid files
- live board state
- dispatch queue
- qa-results
- run-logs
- local webhook file

Starter templates are committed:
- `automation/board-state.example.json`
- `automation/tasks.example.json`
- `automation/discord-webhook.example.txt`

## Scripts

- `npm run dev` — frontend only
- `npm run build` — build frontend
- `npm run dev:all` — start frontend + bridge in background
- `npm run stop:all` — stop frontend + bridge
- `npm run doctor` — check frontend/bridge/openclaw availability
