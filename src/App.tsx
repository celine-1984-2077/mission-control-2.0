import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react'
import './App.css'

type ColumnKey = 'backlog' | 'triaged' | 'in_progress' | 'testing'

type Task = {
  id: string
  title: string
  objective: string
  targetUrl?: string
  acceptanceCriteria?: string[]
  plan: string[]
  next?: string
  tags: string[]
  lane: ColumnKey
  createdAt?: string
  dispatchedAt?: string
  dispatchSessionKey?: string
  runId?: string
  resultSummary?: string
}

type Activity = {
  id: string
  title: string
  detail: string
  time: string
  createdAt?: string
}

type SessionLogMessage = { role: string; text: string }

const navItems = ['Tasks', 'Content', 'Approvals', 'Council', 'Calendar', 'Projects', 'Memory', 'Docs', 'People', 'Office', 'Team']
const lanes: Array<{ key: ColumnKey; label: string }> = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'triaged', label: 'Triaged' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'testing', label: 'Testing' },
]

const BRIDGE_BASE_URL = (import.meta.env.VITE_BOARD_BRIDGE_BASE_URL as string | undefined) || 'http://127.0.0.1:8787'
const BOARD_BRIDGE_URL = `${BRIDGE_BASE_URL}/state`
const SESSION_LOG_URL = `${BRIDGE_BASE_URL}/session-log`

const initialActivity: Activity[] = []

function formatActivityTime(item: Activity) {
  const raw = item.createdAt ?? item.time
  const parsed = raw ? new Date(raw) : null
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return { primary: item.time || 'Unknown time', secondary: '' }
  }

  const primary = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
  const secondary = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)

  return { primary, secondary }
}

function App() {
  const [activeNav, setActiveNav] = useState('Tasks')
  const [tasks, setTasks] = useState<Task[]>([])
  const [activity, setActivity] = useState<Activity[]>(initialActivity)
  const [nextPickupAt, setNextPickupAt] = useState<string>('')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [hydrated, setHydrated] = useState(false)

  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dragOverLane, setDragOverLane] = useState<ColumnKey | null>(null)
  const draggingTaskRef = useRef<string | null>(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskObjective, setNewTaskObjective] = useState('')
  const [newTaskAcceptance, setNewTaskAcceptance] = useState('')
  const [newTaskTargetUrl, setNewTaskTargetUrl] = useState('')
  const [createError, setCreateError] = useState('')

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailDraft, setDetailDraft] = useState({ title: '', objective: '', targetUrl: '', acceptance: '' })
  const [sessionLog, setSessionLog] = useState<SessionLogMessage[]>([])

  const suppressSaveRef = useRef(false)

  const grouped = useMemo(() => ({
    backlog: tasks.filter((t) => t.lane === 'backlog'),
    triaged: tasks.filter((t) => t.lane === 'triaged'),
    in_progress: tasks.filter((t) => t.lane === 'in_progress'),
    testing: tasks.filter((t) => t.lane === 'testing'),
  }), [tasks])

  const inProgressCount = grouped.in_progress.length
  const completion = tasks.length ? Math.round((grouped.testing.length / tasks.length) * 100) : 0

  const countdownSeconds = useMemo(() => {
    if (!nextPickupAt) return 0
    return Math.max(0, Math.ceil((new Date(nextPickupAt).getTime() - nowMs) / 1000))
  }, [nextPickupAt, nowMs])

  async function loadBoardFromServer() {
    try {
      const response = await fetch(BOARD_BRIDGE_URL)
      if (!response.ok) return
      const payload = await response.json() as { tasks?: Task[]; activity?: Activity[]; nextPickupAt?: string }
      suppressSaveRef.current = true
      if (Array.isArray(payload.tasks)) setTasks(payload.tasks)
      if (Array.isArray(payload.activity)) setActivity(payload.activity)
      if (payload.nextPickupAt) setNextPickupAt(payload.nextPickupAt)
      setHydrated(true)
      setTimeout(() => { suppressSaveRef.current = false }, 50)
    } catch {}
  }


  async function saveBoard(nextTasks: Task[], nextActivity: Activity[]) {
    if (!hydrated) return
    if (suppressSaveRef.current) return
    fetch(BOARD_BRIDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: nextTasks, activity: nextActivity }),
    }).catch(() => undefined)
  }
  useEffect(() => {
    loadBoardFromServer()
    const poll = window.setInterval(loadBoardFromServer, 2000)
    return () => window.clearInterval(poll)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])


  function moveTask(taskId: string, lane: ColumnKey, beforeTaskId?: string) {
    const moving = tasks.find((t) => t.id === taskId)
    if (!moving) return

    const moved: Task = { ...moving, lane }
    const withoutMoving = tasks.filter((t) => t.id !== taskId)
    let nextTasks: Task[]

    if (!beforeTaskId) {
      const targetIndexes = withoutMoving.map((t, idx) => ({ id: t.id, idx })).filter((x) => withoutMoving[x.idx].lane === lane)
      if (!targetIndexes.length) nextTasks = [moved, ...withoutMoving]
      else {
        const clone = [...withoutMoving]
        clone.splice(targetIndexes[targetIndexes.length - 1].idx + 1, 0, moved)
        nextTasks = clone
      }
    } else {
      const beforeIndex = withoutMoving.findIndex((t) => t.id === beforeTaskId)
      if (beforeIndex === -1) nextTasks = [moved, ...withoutMoving]
      else {
        const clone = [...withoutMoving]
        clone.splice(beforeIndex, 0, moved)
        nextTasks = clone
      }
    }

    setTasks(nextTasks)
    saveBoard(nextTasks, activity)

    setDraggingTaskId(null)
    setDragOverLane(null)
    draggingTaskRef.current = null
  }

  function deleteTask(taskId: string) {
    const nextTasks = tasks.filter((t) => t.id !== taskId)
    const nextActivity = [{ id: `a-${Date.now()}`, title: `${taskId} deleted`, detail: 'Task removed from board.', time: 'just now' }, ...activity]
    setTasks(nextTasks)
    setActivity(nextActivity)
    saveBoard(nextTasks, nextActivity)
    if (selectedTask?.id === taskId) setSelectedTask(null)
  }

  function getDraggedId(e: DragEvent) {
    return e.dataTransfer.getData('text/task-id') || e.dataTransfer.getData('text/plain') || draggingTaskRef.current || draggingTaskId
  }

  function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newTaskTitle.trim() || !newTaskObjective.trim()) {
      setCreateError('Task 名称和任务描述都要填。')
      return
    }
    const maxTaskNumber = tasks.reduce((max, task) => {
      const match = task.id.match(/^MC-(\d+)$/)
      return match ? Math.max(max, Number(match[1])) : max
    }, 0)
    const acceptanceCriteria = newTaskAcceptance.split('\n').map((line) => line.trim()).filter(Boolean)
    const task: Task = {
      id: `MC-${maxTaskNumber + 1}`,
      title: newTaskTitle.trim(),
      objective: newTaskObjective.trim(),
      targetUrl: newTaskTargetUrl.trim() || undefined,
      acceptanceCriteria,
      plan: ['Clarify and structure the task', 'Execute implementation'],
      next: '',
      tags: ['medium', 'Céline', 'MissionControl'],
      lane: 'backlog',
      createdAt: new Date().toISOString(),
    }
    const nextTasks = [task, ...tasks]
    const nextActivity = [{ id: `a-${Date.now()}`, title: `Task created: ${task.title}`, detail: `Status backlog`, time: 'just now' }, ...activity]
    setTasks(nextTasks)
    setActivity(nextActivity)
    saveBoard(nextTasks, nextActivity)
    setNewTaskTitle('')
    setNewTaskObjective('')
    setNewTaskTargetUrl('')
    setNewTaskAcceptance('')
    setCreateError('')
    setShowCreateModal(false)
  }

  async function openTaskDetail(task: Task) {
    setSelectedTask(task)
    setDetailDraft({
      title: task.title,
      objective: task.objective,
      targetUrl: task.targetUrl ?? '',
      acceptance: (task.acceptanceCriteria ?? []).join('\n'),
    })
    if (task.lane !== 'backlog' && task.dispatchSessionKey) {
      try {
        const r = await fetch(`${SESSION_LOG_URL}?sessionId=${encodeURIComponent(task.dispatchSessionKey)}`)
        const payload = await r.json() as { messages?: SessionLogMessage[] }
        setSessionLog(Array.isArray(payload.messages) ? payload.messages : [])
      } catch {
        setSessionLog([])
      }
    } else {
      setSessionLog([])
    }
  }

  function saveBacklogDetail() {
    if (!selectedTask || selectedTask.lane !== 'backlog') return
    const nextTasks = tasks.map((t) => t.id === selectedTask.id ? {
      ...t,
      title: detailDraft.title.trim(),
      objective: detailDraft.objective.trim(),
      targetUrl: detailDraft.targetUrl.trim() || undefined,
      acceptanceCriteria: detailDraft.acceptance.split('\n').map((line) => line.trim()).filter(Boolean),
    } : t)
    setTasks(nextTasks)
    saveBoard(nextTasks, activity)
    setSelectedTask(null)
  }

  return (
    <div className="mc-shell">
      <aside className="mc-sidebar panel">
        <div className="brand-block"><p>Mission Control</p><h1>CÉLINE</h1></div>
        <nav className="nav-list">
          {navItems.map((item) => <button key={item} className={`nav-item ${activeNav === item ? 'active' : ''}`} onClick={() => setActiveNav(item)}>{item}</button>)}
        </nav>
      </aside>

      <main className="mc-main">
        <header className="panel top-header">
          <div><h2>Tasks</h2><p>Organize work and track progress</p></div>
          <div className="header-actions">
            <span className="chip">⏱ Next triage pickup in {countdownSeconds}s</span>
            <button className="ghost" onClick={loadBoardFromServer}>Refresh</button>
            <button className="primary" onClick={() => setShowCreateModal(true)}>+ New Task</button>
          </div>
        </header>

        <section className="panel stats-row">
          <Stat value="0" label="This week" color="green" />
          <Stat value={String(inProgressCount)} label="In progress" color="blue" />
          <Stat value={String(tasks.length)} label="Total" color="white" />
          <Stat value={`${completion}%`} label="Completion" color="purple" />
        </section>

        <section className="board-wrap">
          <section className="panel board-panel">
            <div className="lanes-grid">
              {lanes.map((lane) => (
                <div key={lane.key} className={`lane ${dragOverLane === lane.key ? 'lane-over' : ''}`} onDragOver={(e) => { e.preventDefault(); setDragOverLane(lane.key) }} onDragLeave={() => setDragOverLane((prev) => (prev === lane.key ? null : prev))}>
                  <div className="lane-header">
                    {lane.label}
                    <span className="lane-count">{grouped[lane.key].length}</span>
                  </div>
                  <div className="lane-body" onDrop={(e) => { e.preventDefault(); const draggedId = getDraggedId(e); if (draggedId) moveTask(draggedId, lane.key) }}>
                    {grouped[lane.key].map((task) => (
                      <article key={task.id} draggable className={`task-card ${draggingTaskId === task.id ? 'dragging' : ''}`} onDragStart={(e) => { e.dataTransfer.setData('text/task-id', task.id); e.dataTransfer.setData('text/plain', task.id); draggingTaskRef.current = task.id; setDraggingTaskId(task.id) }} onDragEnd={() => { setDragOverLane(null); setDraggingTaskId(null); draggingTaskRef.current = null }} onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const draggedId = getDraggedId(e); if (draggedId && draggedId !== task.id) moveTask(draggedId, lane.key, task.id) }} onClick={() => openTaskDetail(task)}>
                        <button className="delete-x" onClick={(e) => { e.stopPropagation(); deleteTask(task.id) }}>×</button>
                        <h3>{task.title}</h3>
                        <div className="meta-block"><span>Objective</span><p>{task.objective}</p></div>
                        {task.targetUrl && <div className="meta-block"><span>Target URL</span><p>{task.targetUrl}</p></div>}
                        <div className="meta-block"><span>Acceptance</span><p>{task.acceptanceCriteria?.length ? task.acceptanceCriteria.join('\n') : 'No explicit acceptance criteria provided.'}</p></div>
                        {task.dispatchSessionKey && <div className="meta-block"><span>Session</span><p>{task.dispatchSessionKey}</p></div>}
                        <div className="tag-row">{task.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="panel activity-panel">
            <h3>ACTIVITY</h3>
            <div className="running-box"><span>NOW RUNNING</span><p>{grouped.in_progress[0]?.title ?? 'Idle'}</p></div>
            <div className="activity-list">
              {activity.map((item) => {
                const time = formatActivityTime(item)
                return (
                  <article className="activity-item" key={item.id}>
                    <span className="dot" />
                    <div className="activity-content">
                      <div className="activity-meta">
                        <strong>{item.title}</strong>
                        <time>
                          <span>{time.primary}</span>
                          {time.secondary && <small>{time.secondary}</small>}
                        </time>
                      </div>
                      <p>{item.detail}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          </aside>
        </section>
      </main>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Create New Task</h3><button className="ghost" onClick={() => setShowCreateModal(false)}>Close</button></div>
            <form className="modal-form" onSubmit={handleCreateTask}>
              <label><span>Task 名称</span><input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} /></label>
              <label><span>任务描述</span><textarea rows={5} value={newTaskObjective} onChange={(e) => setNewTaskObjective(e.target.value)} /></label>
              <label><span>目标网址（可选）</span><input value={newTaskTargetUrl} onChange={(e) => setNewTaskTargetUrl(e.target.value)} placeholder="https://... 或 http://127.0.0.1:5173" /></label>
              <label><span>验收标准（可选，每行一条）</span><textarea rows={3} value={newTaskAcceptance} onChange={(e) => setNewTaskAcceptance(e.target.value)} /></label>
              {createError && <p className="create-error">{createError}</p>}
              <div className="modal-actions"><button type="submit" className="primary">Create Task</button></div>
            </form>
          </div>
        </div>
      )}

      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>{selectedTask.id} Detail</h3><button className="ghost" onClick={() => setSelectedTask(null)}>Close</button></div>
            {selectedTask.lane === 'backlog' ? (
              <div className="modal-form">
                <label><span>Task 名称</span><input value={detailDraft.title} onChange={(e) => setDetailDraft((d) => ({ ...d, title: e.target.value }))} /></label>
                <label><span>任务描述</span><textarea rows={5} value={detailDraft.objective} onChange={(e) => setDetailDraft((d) => ({ ...d, objective: e.target.value }))} /></label>
                <label><span>目标网址</span><input value={detailDraft.targetUrl} onChange={(e) => setDetailDraft((d) => ({ ...d, targetUrl: e.target.value }))} placeholder="https://... 或 http://127.0.0.1:5173" /></label>
                <label><span>验收标准</span><textarea rows={4} value={detailDraft.acceptance} onChange={(e) => setDetailDraft((d) => ({ ...d, acceptance: e.target.value }))} /></label>
                <div className="modal-actions"><button className="primary" onClick={saveBacklogDetail}>Save</button></div>
              </div>
            ) : (
              <div className="detail-readonly">
                <p><strong>Title:</strong> {selectedTask.title}</p>
                <p><strong>Objective:</strong> {selectedTask.objective}</p>
                <p><strong>Status:</strong> {selectedTask.lane}</p>
                <p><strong>Target URL:</strong> {selectedTask.targetUrl ?? '—'}</p>
                <p><strong>Session:</strong> {selectedTask.dispatchSessionKey ?? '—'}</p>
                <h4>Session Messages</h4>
                <div className="session-log">
                  {sessionLog.length ? sessionLog.map((m, i) => <p key={i}><strong>{m.role}:</strong> {m.text}</p>) : <p className="muted">No session transcript yet.</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ value, label, color }: { value: string; label: string; color: 'green' | 'blue' | 'white' | 'purple' }) {
  return <div className={`stat ${color}`}><strong>{value}</strong><span>{label}</span></div>
}

export default App
