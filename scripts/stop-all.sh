#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

for name in frontend bridge; do
  PID_FILE="automation/pids/${name}.pid"
  if [ -f "$PID_FILE" ]; then
    pid="$(cat "$PID_FILE")"
    if ps -p "$pid" >/dev/null 2>&1; then
      kill "$pid" || true
      echo "stopped $name pid $pid"
    fi
    rm -f "$PID_FILE"
  fi
done

echo "Mission Control stopped"
