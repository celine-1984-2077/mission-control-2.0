# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mission Control 2.0 is a local-first task board + automation bridge for OpenClaw workflows. It combines a React-based Kanban UI with a Node.js bridge server that automatically dispatches tasks to OpenClaw coder and QA sessions.

## Common Commands

### Development
```bash
# Recommended: bootstrap + start frontend + bridge
npm run run:website

# Start frontend + bridge in background
npm run dev:all

# Stop all processes
npm run stop:all

# Health check (tests frontend/bridge/openclaw availability)
npm run doctor

# Frontend only (dev server)
npm run dev

# Build frontend
npm run build

# Lint
npm run lint
```

### Bootstrapping
The `npm run run:website` command automatically:
1. Creates `.env` from `.env.example` if missing
2. Prompts for Discord webhook URL (if interactive and not configured)
3. Creates `automation/board-state.json` from example
4. Installs dependencies if needed
5. Starts frontend (port 5173) and bridge (port 8787)

## Architecture

### Components
- **Frontend** (`src/`): React + TypeScript + Vite
  - Single-page Kanban board UI
  - Polls bridge API every 2 seconds for state updates
  - Autosaves changes via POST to `/state`
  - Located at `http://127.0.0.1:5173` by default

- **Bridge Server** (`automation/board-bridge-server.mjs`): Node.js HTTP server
  - REST API for board state (`GET/POST /state`)
  - Session log endpoint (`GET /session-log?sessionId=...`)
  - Self-dispatch mechanism (every 10 seconds)
  - Spawns OpenClaw agent sessions for execution and QA
  - Discord webhook notifications
  - Located at `http://127.0.0.1:8787` by default

- **Task Flow Automation**:
  1. Task enters **triaged** lane → bridge auto-dispatches to coder session
  2. Coder session completes → task moves to **testing** lane
  3. Bridge auto-dispatches QA session for testing tasks
  4. QA result determines outcome:
     - **pass**: task archived (removed from board)
     - **fail**: creates QA-fix task in triaged lane

### State Management
- Primary state: `automation/board-state.json` (gitignored runtime file)
- Frontend polls and updates via bridge API
- Bridge merges incoming changes with previous task metadata
- State includes: tasks array, activity log, update timestamp

### Task Structure
Each task has:
- `id`: e.g., "MC-1", "MC-2"
- `title`, `objective`, `acceptanceCriteria[]`
- `lane`: "backlog" | "triaged" | "in_progress" | "testing"
- `targetUrl`: optional website URL (triggers browser QA)
- `dispatchSessionKey`: OpenClaw session ID for coder
- `qaSessionKey`: OpenClaw session ID for QA
- `resultSummary`: execution/QA summary
- `runId`, `qaRunId`: tracking identifiers

### OpenClaw Integration
**Execution Contract** (triaged → in_progress):
- Bridge spawns: `openclaw agent --session-id <id> --message <contract>`
- Contract specifies: task details, working directory, output expectations
- Expected: implement task, write to `automation/run-logs/<task-id>.md`, update board state

**QA Contract** (testing lane):
- Bridge spawns QA session with task details and acceptance criteria
- For website tasks: instructs to use Agent Browser skill for UI testing
- Expected: evaluate task, write result JSON to `automation/qa-results/<task-id>.json`
- QA result schema: `{ taskId, status: "pass"|"fail", summary, failureReasons[], guidancePrompt, evidence[] }`

### Website Task Detection
Bridge automatically detects website tasks based on:
- Presence of `targetUrl` field
- Keywords in title/objective/tags: "web", "website", "ui", "frontend", "button", "click", "browser", etc.
- Detected website tasks get browser automation instructions in QA sessions

## Configuration

### Environment Variables (.env)
```bash
MISSION_CONTROL_PORT=5173              # Frontend port
BOARD_BRIDGE_PORT=8787                 # Bridge API port
VITE_BOARD_BRIDGE_BASE_URL=http://127.0.0.1:8787  # Bridge URL for frontend
OPENCLAW_HOME=$HOME/.openclaw          # Optional: OpenClaw home directory
BOARD_SESSION_STORE_DIR=...            # Optional: session storage path
DISCORD_WEBHOOK_URL=https://...        # Optional: Discord notifications
```

### Runtime Files (gitignored)
- `automation/board-state.json` - live board state
- `automation/dispatch-queue.jsonl` - dispatch audit log
- `automation/qa-results/` - QA result JSON files
- `automation/run-logs/` - execution/QA markdown logs
- `automation/*.log`, `automation/*.pid` - process logs/pids

### Committed Templates
- `automation/board-state.example.json`
- `automation/tasks.example.json`
- `automation/discord-webhook.example.txt`

## Key Implementation Details

### Bridge Self-Dispatch Loop
- Runs every 10 seconds (`DISPATCH_INTERVAL_MS`)
- Scans for triaged tasks without `dispatchedAt` timestamp
- Scans for testing tasks without QA dispatch
- Uses child process events to handle session completion

### Session Log Reading
Bridge can read OpenClaw session logs from:
- Default: `$OPENCLAW_HOME/agents/main/sessions/<session-id>.jsonl`
- Format: JSONL with message objects
- Frontend can view session transcript via `/session-log` endpoint

### Discord Notifications
Bridge posts webhook messages for:
- New task creation
- Task status changes (to in_progress or testing)
- Dispatch requested
- Execution ended
- QA started/passed/failed

### QA Follow-up Task Creation
When QA fails:
- Bridge creates new task with ID `MC-<next>`
- Title: `[QA Fix] <original-title>`
- Objective includes: QA summary, failure reasons, guidance prompt
- Inherits: acceptanceCriteria, tags, targetUrl from original
- Added tags: "qa-fix", "MissionControl"
- Lane: triaged (ready for auto-dispatch)

## Frontend Details

### Main Component (src/App.tsx)
- Lane-based Kanban board: backlog, triaged, in_progress, testing
- Drag-and-drop task movement between lanes
- Task creation modal with title, objective, targetUrl, acceptanceCriteria
- Task detail modal:
  - Backlog tasks: editable
  - Other lanes: read-only with session transcript
- Activity feed sidebar showing recent events
- Auto-refresh every 2 seconds via polling
- Autosave on task changes (debounced with suppressSaveRef)

### Drag-and-Drop Behavior
- Tasks can be dropped on lane body (append to end)
- Tasks can be dropped on other tasks (insert before)
- Uses DataTransfer API with fallback to ref tracking

### URL Configuration
Frontend reads bridge URL from:
- `VITE_BOARD_BRIDGE_BASE_URL` env var
- Default: `http://127.0.0.1:8787`

## Testing Strategy

When modifying automation logic:
1. Use `npm run doctor` to verify services are running
2. Create test task in UI and move to triaged lane
3. Watch `automation/logs/bridge.log` for dispatch activity
4. Check `automation/dispatch-queue.jsonl` for audit trail
5. Verify session logs in `$OPENCLAW_HOME/agents/main/sessions/`
6. For QA testing: move task to testing lane and observe QA dispatch

## Important Notes

- **Bridge runs from project root**: All coder/QA sessions execute with `cwd: MISSION_CONTROL_ROOT`
- **Workspace root**: Bridge calculates `WORKSPACE_ROOT` as parent directory of mission-control-2.0
- **Race condition prevention**: Frontend uses `suppressSaveRef` to avoid overwriting state immediately after loading from server
- **Task ID generation**: Auto-increments from highest existing MC-N number
- **Process supervision**: `automation/run-board-bridge.sh` provides auto-restart loop for bridge
- **Session key uniqueness**: Includes timestamp to prevent ID collisions
- **QA result cleanup**: QA result JSON files are deleted after processing
