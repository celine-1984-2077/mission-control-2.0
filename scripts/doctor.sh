#!/usr/bin/env bash
set -euo pipefail

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

FRONTEND_PORT="${MISSION_CONTROL_PORT:-5173}"
BRIDGE_PORT="${BOARD_BRIDGE_PORT:-8787}"

ok=true

echo "Checking frontend on :$FRONTEND_PORT"
if curl -fsS "http://127.0.0.1:${FRONTEND_PORT}/" >/dev/null; then
  echo "  ✅ frontend reachable"
else
  echo "  ❌ frontend not reachable"
  ok=false
fi

echo "Checking board bridge on :$BRIDGE_PORT"
if curl -fsS "http://127.0.0.1:${BRIDGE_PORT}/state" >/dev/null; then
  echo "  ✅ board bridge reachable"
else
  echo "  ❌ board bridge not reachable"
  ok=false
fi

echo "Checking OpenClaw CLI"
if command -v openclaw >/dev/null 2>&1; then
  echo "  ✅ openclaw found"
else
  echo "  ❌ openclaw not found"
  ok=false
fi

if [ "$ok" = true ]; then
  echo "All checks passed"
  exit 0
else
  echo "One or more checks failed"
  exit 1
fi
