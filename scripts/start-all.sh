#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

mkdir -p automation/pids automation/logs

FRONTEND_PID_FILE="automation/pids/frontend.pid"
BRIDGE_PID_FILE="automation/pids/bridge.pid"

if [ -f "$FRONTEND_PID_FILE" ] && ps -p "$(cat "$FRONTEND_PID_FILE")" >/dev/null 2>&1; then
  echo "frontend already running (pid $(cat "$FRONTEND_PID_FILE"))"
else
  nohup npm run dev -- --host 127.0.0.1 --port "${MISSION_CONTROL_PORT:-5173}" > automation/logs/frontend.log 2>&1 &
  echo $! > "$FRONTEND_PID_FILE"
  echo "started frontend pid $!"
fi

if [ -f "$BRIDGE_PID_FILE" ] && ps -p "$(cat "$BRIDGE_PID_FILE")" >/dev/null 2>&1; then
  echo "bridge already running (pid $(cat "$BRIDGE_PID_FILE"))"
else
  nohup node automation/board-bridge-server.mjs > automation/logs/bridge.log 2>&1 &
  echo $! > "$BRIDGE_PID_FILE"
  echo "started bridge pid $!"
fi

echo "Mission Control started"
echo "- Frontend: http://127.0.0.1:${MISSION_CONTROL_PORT:-5173}"
echo "- Bridge:   http://127.0.0.1:${BOARD_BRIDGE_PORT:-8787}/state"
