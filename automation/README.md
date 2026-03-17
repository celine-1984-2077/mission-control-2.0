# automation/

Runtime and bridge layer for Mission Control 2.0.

## Included starter files

- `board-bridge-server.mjs` — task dispatch + QA dispatch bridge API (`/state`, `/session-log`)
- `run-board-bridge.sh` — optional loop runner for bridge restart behavior
- `board-state.example.json` — starter board-state template
- `tasks.example.json` — starter tasks template
- `discord-webhook.example.txt` — optional webhook template

## Runtime files (gitignored)

- `board-state.json`
- `tasks.json`
- `dispatch-queue.jsonl`
- `run-logs/`
- `qa-results/`
- `*.log`, `*.pid`
- `discord-webhook.txt`

## Notes

If `automation/discord-webhook.txt` exists (or `DISCORD_WEBHOOK_URL` env is set), bridge sends notifications.
