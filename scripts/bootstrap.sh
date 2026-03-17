#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "[bootstrap] created .env from .env.example"
fi

mkdir -p automation

# Interactive webhook setup (optional but recommended)
if ! grep -q '^DISCORD_WEBHOOK_URL=' .env; then
  echo "DISCORD_WEBHOOK_URL=" >> .env
fi

current_webhook="$(grep '^DISCORD_WEBHOOK_URL=' .env | head -n1 | cut -d'=' -f2- || true)"
if [ -z "$current_webhook" ] && [ -t 0 ]; then
  echo
  echo "[bootstrap] Optional: configure Discord webhook for Mission Control notifications"
  echo "If you want notifications now, paste webhook URL. Otherwise press Enter to skip."
  read -r -p "DISCORD_WEBHOOK_URL: " input_webhook
  if [ -n "$input_webhook" ]; then
    # replace existing key in .env
    if grep -q '^DISCORD_WEBHOOK_URL=' .env; then
      sed -i.bak "s#^DISCORD_WEBHOOK_URL=.*#DISCORD_WEBHOOK_URL=$input_webhook#" .env && rm -f .env.bak
    else
      echo "DISCORD_WEBHOOK_URL=$input_webhook" >> .env
    fi
    echo "[bootstrap] saved DISCORD_WEBHOOK_URL to .env"
  else
    echo "[bootstrap] skipped webhook setup"
  fi
fi

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
