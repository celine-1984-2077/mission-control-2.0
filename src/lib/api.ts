import type { Task, Activity, ProjectDoc, DocProject, BridgeSettings, SessionLogMessage, TaskArtifactImage } from '../types'
import { normalizeTask } from './taskUtils'
import {
  BOARD_BRIDGE_URL, SESSION_LOG_URL, TASK_ARTIFACTS_URL,
  DOCS_URL, DOC_PROJECTS_URL, DOC_SAVE_URL, SETTINGS_URL,
} from './constants'

// ── Board State ──────────────────────────────────────────────

export async function loadBoardState(): Promise<{
  tasks: Task[]
  activity: Activity[]
  updatedAt: string
  nextPickupAt: string
}> {
  const res = await fetch(BOARD_BRIDGE_URL)
  if (!res.ok) throw new Error(`Bridge error: ${res.status}`)
  const data = await res.json() as {
    tasks?: Task[]
    activity?: Activity[]
    updatedAt?: string
    nextPickupAt?: string
  }
  return {
    tasks: (data.tasks ?? []).map(normalizeTask),
    activity: data.activity ?? [],
    updatedAt: data.updatedAt ?? '',
    nextPickupAt: data.nextPickupAt ?? '',
  }
}

export async function saveBoardState(
  tasks: Task[],
  activity: Activity[],
  baseUpdatedAt: string,
): Promise<{ ok: boolean; conflict: boolean; state?: { tasks: Task[]; activity: Activity[]; updatedAt: string } }> {
  const res = await fetch(BOARD_BRIDGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks, activity, baseUpdatedAt }),
  })
  if (res.status === 409) {
    const data = await res.json() as { state?: { tasks?: Task[]; activity?: Activity[]; updatedAt?: string } }
    const st = data.state
    return {
      ok: false,
      conflict: true,
      state: st ? {
        tasks: (st.tasks ?? []).map(normalizeTask),
        activity: st.activity ?? [],
        updatedAt: st.updatedAt ?? '',
      } : undefined,
    }
  }
  if (!res.ok) throw new Error(`Save error: ${res.status}`)
  return { ok: true, conflict: false }
}

// ── Session Logs ─────────────────────────────────────────────

export async function loadSessionLog(sessionId: string): Promise<SessionLogMessage[]> {
  const res = await fetch(`${SESSION_LOG_URL}?sessionId=${encodeURIComponent(sessionId)}`)
  if (!res.ok) return []
  const data = await res.json() as { messages?: SessionLogMessage[] }
  return data.messages ?? []
}

// ── Task Artifacts ────────────────────────────────────────────

export async function loadTaskArtifacts(taskId: string): Promise<TaskArtifactImage[]> {
  const res = await fetch(`${TASK_ARTIFACTS_URL}?taskId=${encodeURIComponent(taskId)}`)
  if (!res.ok) return []
  const data = await res.json() as { images?: TaskArtifactImage[] }
  return data.images ?? []
}

// ── Docs ─────────────────────────────────────────────────────

export async function loadDocs(): Promise<{ docs: ProjectDoc[]; projects: DocProject[] }> {
  const res = await fetch(DOCS_URL)
  if (!res.ok) throw new Error(`Docs error: ${res.status}`)
  const data = await res.json() as { docs?: ProjectDoc[]; projects?: DocProject[] }
  return {
    docs: data.docs ?? [],
    projects: data.projects ?? [],
  }
}

export async function createDocProject(params: {
  name: string
  slug?: string
  description?: string
}): Promise<DocProject> {
  const res = await fetch(DOC_PROJECTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`Create project error: ${res.status}`)
  const data = await res.json() as { project: DocProject }
  return data.project
}

export async function saveDoc(params: {
  projectSlug: string
  docId?: string
  slug?: string
  title: string
  content: string
  tags: string[]
}, method: 'POST' | 'PUT' = 'POST'): Promise<ProjectDoc> {
  const res = await fetch(DOC_SAVE_URL, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`Save doc error: ${res.status}`)
  const data = await res.json() as { doc: ProjectDoc }
  return data.doc
}

// ── Settings ──────────────────────────────────────────────────

export async function loadSettings(): Promise<BridgeSettings> {
  const res = await fetch(SETTINGS_URL)
  if (!res.ok) throw new Error(`Settings error: ${res.status}`)
  const data = await res.json() as { settings: BridgeSettings }
  return data.settings
}

export async function saveSettings(webhookUrl: string): Promise<BridgeSettings> {
  const res = await fetch(SETTINGS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webhookUrl }),
  })
  if (!res.ok) throw new Error(`Save settings error: ${res.status}`)
  const data = await res.json() as { settings: BridgeSettings }
  return data.settings
}
