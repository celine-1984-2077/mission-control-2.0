# AGENTS.md (mission-control-2.0)

If user asks to "run/start the website", use this exact flow from repo root:

```bash
npm run run:website
```

This command should:
1. bootstrap local files/env/templates
2. start frontend (default 5173)
3. start board bridge (default 8787)

Health check command:

```bash
npm run doctor
```

Stop all command:

```bash
npm run stop:all
```
