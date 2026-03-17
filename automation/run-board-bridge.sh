#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_PATH="$ROOT_DIR/automation/board-bridge.log"
RESTART_LOG_PATH="$ROOT_DIR/automation/board-bridge-restarts.log"
PID_PATH="$ROOT_DIR/automation/board-bridge-supervisor.pid"

mkdir -p "$ROOT_DIR/automation"
echo $$ > "$PID_PATH"
cd "$ROOT_DIR" || exit 1

# Load .env when present so DISCORD_WEBHOOK_URL and other vars are available
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

while true; do
  start_ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "[$start_ts] starting board bridge" >> "$RESTART_LOG_PATH"

  set +e
  node "$ROOT_DIR/automation/board-bridge-server.mjs" >> "$LOG_PATH" 2>&1
  exit_code=$?
  set -e

  end_ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "[$end_ts] board bridge exited (code=$exit_code), restarting in 1s" >> "$RESTART_LOG_PATH"
  sleep 1
done
