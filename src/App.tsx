import { useMemo, useRef, useState, type DragEvent } from 'react'
import './App.css'

type ColumnKey = 'backlog' | 'triaged' | 'in_progress' | 'testing'

type Task = {
  id: string
  title: string
  objective: string
  plan: string[]
  next?: string
  tags: string[]
  lane: ColumnKey
}

type Activity = {
  id: string
  title: string
  detail: string
  time: string
}

const navItems = ['Tasks', 'Content', 'Approvals', 'Council', 'Calendar', 'Projects', 'Memory', 'Docs', 'People', 'Office', 'Team']

const lanes: Array<{ key: ColumnKey; label: string }> = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'triaged', label: 'Triaged' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'testing', label: 'Testing' },
]

const initialTasks: Task[] = [
  {
    id: 'MC-1',
    title: '如果有任务created要给discord发消息',
    objective: '发在celine-notification channel里',
    plan: ['Clarify and structure the task', 'Execute implementation'],
    next: '',
    tags: ['urgent', 'Céline', 'MissionControl'],
    lane: 'backlog',
  },
]

const initialActivity: Activity[] = [
  {
    id: 'a1',
    title: 'MC-1 details updated',
    detail: 'Objective, acceptance criteria, boundaries, or doc-sync fields changed.',
    time: '10m ago',
  },
  {
    id: 'a2',
    title: 'Task created: 如果有任务created要给discord发消息',
    detail: 'Entered backlog with 1 acceptance criteria item(s).',
    time: '12m ago',
  },
]

function App() {
  const [activeNav, setActiveNav] = useState('Tasks')
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [activity] = useState<Activity[]>(initialActivity)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dragOverLane, setDragOverLane] = useState<ColumnKey | null>(null)
  const draggingTaskRef = useRef<string | null>(null)

  const grouped = useMemo(() => ({
    backlog: tasks.filter((t) => t.lane === 'backlog'),
    triaged: tasks.filter((t) => t.lane === 'triaged'),
    in_progress: tasks.filter((t) => t.lane === 'in_progress'),
    testing: tasks.filter((t) => t.lane === 'testing'),
  }), [tasks])

  const inProgressCount = grouped.in_progress.length
  const completion = tasks.length ? Math.round((grouped.testing.length / tasks.length) * 100) : 0

  function moveTask(taskId: string, lane: ColumnKey, beforeTaskId?: string) {
    setTasks((current) => {
      const moving = current.find((t) => t.id === taskId)
      if (!moving) return current

      const moved: Task = { ...moving, lane }
      const withoutMoving = current.filter((t) => t.id !== taskId)

      if (!beforeTaskId) {
        const targetIndexes = withoutMoving
          .map((t, idx) => ({ id: t.id, idx }))
          .filter((x) => withoutMoving[x.idx].lane === lane)
        if (!targetIndexes.length) return [moved, ...withoutMoving]
        const lastTargetIndex = targetIndexes[targetIndexes.length - 1].idx
        const clone = [...withoutMoving]
        clone.splice(lastTargetIndex + 1, 0, moved)
        return clone
      }

      const beforeIndex = withoutMoving.findIndex((t) => t.id === beforeTaskId)
      if (beforeIndex === -1) return [moved, ...withoutMoving]
      const clone = [...withoutMoving]
      clone.splice(beforeIndex, 0, moved)
      return clone
    })

    setDraggingTaskId(null)
    setDragOverLane(null)
    draggingTaskRef.current = null
  }

  function getDraggedId(e: DragEvent) {
    return e.dataTransfer.getData('text/task-id') || e.dataTransfer.getData('text/plain') || draggingTaskRef.current || draggingTaskId
  }

  return (
    <div className="mc-shell">
      <aside className="mc-sidebar panel">
        <div className="brand-block">
          <p>TONY × CÉLINE</p>
          <h1>Mission Control</h1>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button key={item} className={`nav-item ${activeNav === item ? 'active' : ''}`} onClick={() => setActiveNav(item)}>
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <main className="mc-main">
        <header className="panel top-header">
          <div>
            <h2>Tasks</h2>
            <p>Organize work and track progress</p>
          </div>
          <div className="header-actions">
            <span className="chip">🌙 Dark</span>
            <span className="chip">EN</span>
            <button className="ghost">Run Smoke Test</button>
            <button className="primary">+ New Task</button>
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
                <div
                  key={lane.key}
                  className={`lane ${dragOverLane === lane.key ? 'lane-over' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOverLane(lane.key)
                  }}
                  onDragLeave={() => setDragOverLane((prev) => (prev === lane.key ? null : prev))}
                >
                  <div className="lane-header">{lane.label}</div>
                  <div
                    className="lane-body"
                    onDrop={(e) => {
                      e.preventDefault()
                      const draggedId = getDraggedId(e)
                      if (!draggedId) return
                      moveTask(draggedId, lane.key)
                    }}
                  >
                    {grouped[lane.key].map((task) => (
                      <article
                        key={task.id}
                        draggable
                        className={`task-card ${draggingTaskId === task.id ? 'dragging' : ''}`}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/task-id', task.id)
                          e.dataTransfer.setData('text/plain', task.id)
                          e.dataTransfer.effectAllowed = 'move'
                          draggingTaskRef.current = task.id
                          setDraggingTaskId(task.id)
                        }}
                        onDragEnd={() => {
                          setDragOverLane(null)
                          window.setTimeout(() => {
                            setDraggingTaskId(null)
                            draggingTaskRef.current = null
                          }, 0)
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          const draggedId = getDraggedId(e)
                          if (!draggedId || draggedId === task.id) return
                          moveTask(draggedId, lane.key, task.id)
                        }}
                      >
                        <h3>{task.title}</h3>
                        <div className="meta-block">
                          <span>Objective</span>
                          <p>{task.objective}</p>
                        </div>
                        <div className="meta-block">
                          <span>Plan</span>
                          <p>{task.plan.map((step, idx) => `${idx + 1}) ${step}`).join('\n')}</p>
                        </div>
                        <div className="next-line"><strong>Next:</strong> {task.next || ''}</div>
                        <div className="live-pill">Live activity: [UX Plan]</div>
                        <div className="tag-row">
                          {task.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="panel activity-panel">
            <h3>ACTIVITY</h3>
            <div className="running-box">
              <span>NOW RUNNING</span>
              <p>Idle</p>
            </div>

            <div className="activity-list">
              {activity.map((item) => (
                <article className="activity-item" key={item.id}>
                  <span className="dot" />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    <small>{item.time}</small>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}

function Stat({ value, label, color }: { value: string; label: string; color: 'green' | 'blue' | 'white' | 'purple' }) {
  return (
    <div className={`stat ${color}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

export default App
