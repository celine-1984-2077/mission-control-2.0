#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "[bootstrap] created .env from .env.example"
fi

mkdir -p automation

if [ ! -f automation/board-state.json ] && [ -f automation/board-state.example.json ]; then
  cp automation/board-state.example.json automation/board-state.json
  echo "[bootstrap] created automation/board-state.json"
fi

if [ ! -f automation/tasks.json ] && [ -f automation/tasks.example.json ]; then
  cp automation/tasks.example.json automation/tasks.json
  echo "[bootstrap] created automation/tasks.json"
fi

if [ ! -d node_modules ]; then
  echo "[bootstrap] installing dependencies..."
  npm install
fi

echo "[bootstrap] done"
