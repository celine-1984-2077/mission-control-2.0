import type { ColumnKey, HarnessCapabilities } from '../types'

export const BRIDGE_BASE_URL = (import.meta.env.VITE_BOARD_BRIDGE_BASE_URL as string | undefined) || 'http://127.0.0.1:8787'

export const BOARD_BRIDGE_URL = `${BRIDGE_BASE_URL}/state`
export const SESSION_LOG_URL = `${BRIDGE_BASE_URL}/session-log`
export const TASK_ARTIFACTS_URL = `${BRIDGE_BASE_URL}/task-artifacts`
export const ARTIFACT_FILE_URL = `${BRIDGE_BASE_URL}/artifact-file`
export const DOCS_URL = `${BRIDGE_BASE_URL}/docs`
export const DOC_PROJECTS_URL = `${BRIDGE_BASE_URL}/docs/projects`
export const DOC_SAVE_URL = `${BRIDGE_BASE_URL}/docs/doc`
export const SETTINGS_URL = `${BRIDGE_BASE_URL}/settings`

export const DEFAULT_HARNESS_CAPABILITIES: HarnessCapabilities = {
  browser: ['playwright', 'session-log-screenshots'],
  qa: ['structured-verdict', 'evidence-images', 'discord-webhook'],
  design: ['reference-images', 'project-docs'],
}

export const NAV_ITEMS = ['Project', 'Docs', 'Settings'] as const

export const LANE_DEFINITIONS: Array<{ key: ColumnKey; labelKey: string }> = [
  { key: 'backlog', labelKey: 'lane.backlog' },
  { key: 'triaged', labelKey: 'lane.triaged' },
  { key: 'in_progress', labelKey: 'lane.in_progress' },
  { key: 'testing', labelKey: 'lane.testing' },
]

export const POLL_INTERVAL_MS = 2000
