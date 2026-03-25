import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type MouseEvent } from 'react'
import './App.css'

type ColumnKey = 'backlog' | 'triaged' | 'in_progress' | 'testing'

type TaskImageAttachment = {
  name: string
  mimeType: string
  dataUrl: string
  size: number
}

type Task = {
  id: string
  title: string
  objective: string
  targetUrl?: string
  acceptanceCriteria?: string[]
  imageAttachments?: TaskImageAttachment[]
  plan: string[]
  next?: string
  tags: string[]
  lane: ColumnKey
  createdAt?: string
  dispatchedAt?: string
  dispatchSessionKey?: string
  qaSessionKey?: string
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

type TaskArtifactImage = {
  name: string
  url: string
  sourcePath: string
}

type ProjectDoc = {
  id: string
  project: string
  projectSlug?: string
  title: string
  path: string
  tags: string[]
  modifiedAt: string
  content: string
  readOnly?: boolean
  source?: 'imported' | 'authored'
}

type DocProject = {
  slug: string
  name: string
  description?: string
}

const navItems = ['Project', 'Docs']
const lanes: Array<{ key: ColumnKey; label: string }> = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'triaged', label: 'Triaged' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'testing', label: 'Testing' },
]

const BRIDGE_BASE_URL = (import.meta.env.VITE_BOARD_BRIDGE_BASE_URL as string | undefined) || 'http://127.0.0.1:8787'
const BOARD_BRIDGE_URL = `${BRIDGE_BASE_URL}/state`
const SESSION_LOG_URL = `${BRIDGE_BASE_URL}/session-log`
const TASK_ARTIFACTS_URL = `${BRIDGE_BASE_URL}/task-artifacts`
const DOCS_URL = `${BRIDGE_BASE_URL}/docs`
const DOC_PROJECTS_URL = `${BRIDGE_BASE_URL}/docs/projects`
const DOC_SAVE_URL = `${BRIDGE_BASE_URL}/docs/doc`

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

function extractTaskIdFromText(...parts: Array<string | undefined>) {
  const text = parts.filter(Boolean).join(' ')
  const match = text.match(/\bMC-\d+\b/i)
  return match ? match[0].toUpperCase() : null
}

function App() {
  const [activeNav, setActiveNav] = useState('Project')
  const [tasks, setTasks] = useState<Task[]>([])
  const [activity, setActivity] = useState<Activity[]>(initialActivity)
  const [nextPickupAt, setNextPickupAt] = useState<string>('')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [hydrated, setHydrated] = useState(false)
  const [boardUpdatedAt, setBoardUpdatedAt] = useState<string>('')

  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dragOverLane, setDragOverLane] = useState<ColumnKey | null>(null)
  const draggingTaskRef = useRef<string | null>(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskObjective, setNewTaskObjective] = useState('')
  const [newTaskAcceptance, setNewTaskAcceptance] = useState('')
  const [newTaskTargetUrl, setNewTaskTargetUrl] = useState('')
  const [newTaskImageFiles, setNewTaskImageFiles] = useState<File[]>([])
  const [createError, setCreateError] = useState('')
  const createImageInputRef = useRef<HTMLInputElement | null>(null)

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailDraft, setDetailDraft] = useState({ title: '', objective: '', targetUrl: '', acceptance: '' })
  const [detailImageFiles, setDetailImageFiles] = useState<File[]>([])
  const [detailError, setDetailError] = useState('')
  const detailImageInputRef = useRef<HTMLInputElement | null>(null)
  const [coderSessionLog, setCoderSessionLog] = useState<SessionLogMessage[]>([])
  const [qaSessionLog, setQaSessionLog] = useState<SessionLogMessage[]>([])
  const [taskArtifacts, setTaskArtifacts] = useState<TaskArtifactImage[]>([])
  const [artifactLoading, setArtifactLoading] = useState(false)
  const [activeArtifactUrl, setActiveArtifactUrl] = useState<string>('')

  const [docs, setDocs] = useState<ProjectDoc[]>([])
  const [docProjectsMeta, setDocProjectsMeta] = useState<DocProject[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState('')
  const [docProject, setDocProject] = useState('all')
  const [docTag, setDocTag] = useState('all')
  const [docLanguage, setDocLanguage] = useState<'EN' | '中文'>('EN')
  const [docSearch, setDocSearch] = useState('')
  const [selectedDocId, setSelectedDocId] = useState('')
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectSlug, setNewProjectSlug] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)
  const [docsActionError, setDocsActionError] = useState('')
  const [docsActionOk, setDocsActionOk] = useState('')
  const [docDraftTitle, setDocDraftTitle] = useState('')
  const [docDraftTags, setDocDraftTags] = useState('')
  const [docDraftContent, setDocDraftContent] = useState('')
  const [docDraftProjectSlug, setDocDraftProjectSlug] = useState('')
  const [creatingDoc, setCreatingDoc] = useState(false)

  const suppressSaveRef = useRef(false)
  const modalDragEventAtRef = useRef<number>(0)

  const markModalDragEvent = () => {
    modalDragEventAtRef.current = Date.now()
  }

  const shouldIgnoreModalBackdropClose = () => Date.now() - modalDragEventAtRef.current < 250

  const handleCreateModalBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (shouldIgnoreModalBackdropClose()) return
    setShowCreateModal(false)
  }

  const handleDetailModalBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (shouldIgnoreModalBackdropClose()) return
    closeTaskDetail()
  }

  const grouped = useMemo(() => ({
    backlog: tasks.filter((t) => t.lane === 'backlog'),
    triaged: tasks.filter((t) => t.lane === 'triaged'),
    in_progress: tasks.filter((t) => t.lane === 'in_progress'),
    testing: tasks.filter((t) => t.lane === 'testing'),
  }), [tasks])

  const inProgressCount = grouped.in_progress.length
  const completion = tasks.length ? Math.round((grouped.testing.length / tasks.length) * 100) : 0

  const docProjects = useMemo(() => Array.from(new Set(docs.map((doc) => doc.project))).sort(), [docs])
  const authoredProjects = useMemo(() => docProjectsMeta, [docProjectsMeta])
  const docTags = useMemo(() => Array.from(new Set(docs.flatMap((doc) => doc.tags))).sort(), [docs])
  const filteredDocs = useMemo(() => docs.filter((doc) => {
    if (docProject !== 'all' && doc.project !== docProject) return false
    if (docTag !== 'all' && !doc.tags.includes(docTag)) return false
    const search = docSearch.trim().toLowerCase()
    if (!search) return true
    return doc.title.toLowerCase().includes(search)
      || doc.path.toLowerCase().includes(search)
      || doc.content.toLowerCase().includes(search)
  }), [docs, docProject, docTag, docSearch])

  const authoredFilteredDocs = useMemo(() => filteredDocs.filter((doc) => doc.source === 'authored'), [filteredDocs])
  const importedFilteredDocs = useMemo(() => filteredDocs.filter((doc) => doc.source !== 'authored'), [filteredDocs])
  const visibleDocList = useMemo(() => [...authoredFilteredDocs, ...importedFilteredDocs], [authoredFilteredDocs, importedFilteredDocs])

  const selectedDoc = visibleDocList.find((doc) => doc.id === selectedDocId) ?? visibleDocList[0] ?? null
  const isDocEditable = !!selectedDoc && !selectedDoc.readOnly
  const docsThisWeek = docs.filter((doc) => Date.now() - new Date(doc.modifiedAt).getTime() < 7 * 24 * 60 * 60 * 1000).length
  const docsInProgress = Math.min(1, filteredDocs.length)
  const docsCompletion = docs.length ? Math.round((filteredDocs.length / docs.length) * 100) : 0

  const countdownSeconds = useMemo(() => {
    if (!nextPickupAt) return 0
    return Math.max(0, Math.ceil((new Date(nextPickupAt).getTime() - nowMs) / 1000))
  }, [nextPickupAt, nowMs])

  async function loadBoardFromServer() {
    try {
      const response = await fetch(BOARD_BRIDGE_URL)
      if (!response.ok) return
      const payload = await response.json() as { tasks?: Task[]; activity?: Activity[]; nextPickupAt?: string; updatedAt?: string }
      suppressSaveRef.current = true
      if (Array.isArray(payload.tasks)) setTasks(payload.tasks)
      if (Array.isArray(payload.activity)) setActivity(payload.activity)
      if (payload.nextPickupAt) setNextPickupAt(payload.nextPickupAt)
      if (payload.updatedAt) setBoardUpdatedAt(payload.updatedAt)
      setHydrated(true)
      setTimeout(() => { suppressSaveRef.current = false }, 50)
    } catch {}
  }

  async function loadDocs() {
    setDocsLoading(true)
    setDocsError('')
    try {
      const response = await fetch(DOCS_URL)
      if (!response.ok) throw new Error(`Failed to fetch docs (${response.status})`)
      const payload = await response.json() as { docs?: ProjectDoc[]; projects?: DocProject[] }
      const nextDocs = Array.isArray(payload.docs) ? payload.docs : []
      setDocs(nextDocs)
      setDocProjectsMeta(Array.isArray(payload.projects) ? payload.projects : [])
      if (!selectedDocId && nextDocs[0]?.id) setSelectedDocId(nextDocs[0].id)
    } catch (error) {
      setDocsError(error instanceof Error ? error.message : 'Failed to load docs')
    } finally {
      setDocsLoading(false)
    }
  }

  async function createDocProject() {
    if (!newProjectName.trim()) {
      setDocsActionError('Project name is required.')
      return
    }

    setCreatingProject(true)
    setDocsActionError('')
    setDocsActionOk('')
    try {
      const response = await fetch(DOC_PROJECTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, slug: newProjectSlug, description: newProjectDesc }),
      })
      const payload = await response.json() as { ok?: boolean; error?: string; project?: DocProject }
      if (!response.ok || !payload.ok || !payload.project) throw new Error(payload.error || 'Failed to create project')
      setDocsActionOk(`Project created: ${payload.project.name}`)
      setShowProjectModal(false)
      setNewProjectName('')
      setNewProjectSlug('')
      setNewProjectDesc('')
      setDocProject(payload.project.name)
      await loadDocs()
    } catch (error) {
      setDocsActionError(error instanceof Error ? error.message : 'Failed to create project')
    } finally {
      setCreatingProject(false)
    }
  }

  function startCreateDoc() {
    const projectSlug = authoredProjects[0]?.slug || ''
    setCreatingDoc(true)
    setSelectedDocId('')
    setDocDraftTitle('')
    setDocDraftTags('')
    setDocDraftContent('')
    setDocDraftProjectSlug(projectSlug)
    setDocsActionError('')
    setDocsActionOk('')
  }

  async function saveDocDraft() {
    if (!docDraftTitle.trim()) {
      setDocsActionError('Document title is required.')
      return
    }
    if (!docDraftProjectSlug.trim()) {
      setDocsActionError('Choose a project for this doc.')
      return
    }

    setDocsActionError('')
    setDocsActionOk('')
    try {
      const response = await fetch(DOC_SAVE_URL, {
        method: isDocEditable ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: selectedDoc?.id,
          projectSlug: docDraftProjectSlug,
          title: docDraftTitle,
          tags: docDraftTags.split(',').map((t) => t.trim()).filter(Boolean),
          content: docDraftContent,
        }),
      })
      const payload = await response.json() as { ok?: boolean; error?: string; doc?: ProjectDoc }
      if (!response.ok || !payload.ok || !payload.doc) throw new Error(payload.error || 'Failed to save document')
      setDocsActionOk('Document saved.')
      setCreatingDoc(false)
      await loadDocs()
      setSelectedDocId(payload.doc.id)
    } catch (error) {
      setDocsActionError(error instanceof Error ? error.message : 'Failed to save document')
    }
  }

  async function saveBoard(nextTasks: Task[], nextActivity: Activity[]) {
    if (!hydrated) return
    if (suppressSaveRef.current) return
    fetch(BOARD_BRIDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: nextTasks, activity: nextActivity, baseUpdatedAt: boardUpdatedAt || undefined }),
    })
      .then(async (response) => {
        if (!response.ok) return
        const payload = await response.json() as { state?: { updatedAt?: string } }
        if (payload?.state?.updatedAt) setBoardUpdatedAt(payload.state.updatedAt)
      })
      .catch(() => undefined)
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

  useEffect(() => {
    if (activeNav === 'Docs') {
      void loadDocs()
    }
  }, [activeNav])

  useEffect(() => {
    if (!visibleDocList.length) return
    if (!visibleDocList.some((doc) => doc.id === selectedDocId)) {
      setSelectedDocId(visibleDocList[0].id)
    }
  }, [visibleDocList, selectedDocId])

  useEffect(() => {
    if (!selectedDoc || creatingDoc) return
    setDocDraftTitle(selectedDoc.title)
    setDocDraftTags((selectedDoc.tags || []).join(', '))
    setDocDraftContent(selectedDoc.content || '')
    setDocDraftProjectSlug(selectedDoc.projectSlug || authoredProjects[0]?.slug || '')
  }, [selectedDoc, creatingDoc, authoredProjects])

  function canDropToLane(lane: ColumnKey) {
    return lane === 'backlog' || lane === 'triaged'
  }

  function moveTask(taskId: string, lane: ColumnKey, beforeTaskId?: string) {
    if (!canDropToLane(lane)) return

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

  function markTaskDone(taskId: string) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.lane !== 'testing') return

    const nextTasks = tasks.filter((t) => t.id !== taskId)
    const nextActivity = [{
      id: `a-${Date.now()}`,
      title: `${taskId} marked done`,
      detail: 'Task completed and removed from Testing lane.',
      time: 'just now',
    }, ...activity]

    setTasks(nextTasks)
    setActivity(nextActivity)
    saveBoard(nextTasks, nextActivity)
    if (selectedTask?.id === taskId) setSelectedTask(null)
  }

  function getDraggedId(e: DragEvent) {
    return e.dataTransfer.getData('text/task-id') || e.dataTransfer.getData('text/plain') || draggingTaskRef.current || draggingTaskId
  }

  function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result)
        else reject(new Error('Failed to read file'))
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
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

    let imageAttachments: TaskImageAttachment[] = []
    try {
      imageAttachments = await Promise.all(newTaskImageFiles.map(async (file) => ({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: await fileToDataUrl(file),
      })))
    } catch {
      setCreateError('图片读取失败，请重试。')
      return
    }

    const task: Task = {
      id: `MC-${maxTaskNumber + 1}`,
      title: newTaskTitle.trim(),
      objective: newTaskObjective.trim(),
      targetUrl: newTaskTargetUrl.trim() || undefined,
      acceptanceCriteria,
      imageAttachments,
      plan: ['Clarify and structure the task', 'Execute implementation'],
      next: '',
      tags: ['medium', 'Céline', 'MissionControl'],
      lane: 'backlog',
      createdAt: new Date().toISOString(),
    }
    const nextTasks = [task, ...tasks]
    const nextActivity = [{ id: `a-${Date.now()}`, title: `Task created: ${task.title}`, detail: `Status backlog · ${imageAttachments.length} image(s) attached`, time: 'just now' }, ...activity]
    setTasks(nextTasks)
    setActivity(nextActivity)
    saveBoard(nextTasks, nextActivity)
    setNewTaskTitle('')
    setNewTaskObjective('')
    setNewTaskTargetUrl('')
    setNewTaskAcceptance('')
    setNewTaskImageFiles([])
    if (createImageInputRef.current) createImageInputRef.current.value = ''
    setCreateError('')
    setShowCreateModal(false)
  }

  async function loadTaskArtifacts(taskId: string) {
    setArtifactLoading(true)
    try {
      const r = await fetch(`${TASK_ARTIFACTS_URL}?taskId=${encodeURIComponent(taskId)}`)
      const payload = await r.json() as { images?: TaskArtifactImage[] }
      const images = Array.isArray(payload.images) ? payload.images : []
      setTaskArtifacts(images)
      setActiveArtifactUrl((current) => current || images[0]?.url || '')
    } catch {
      setTaskArtifacts([])
      setActiveArtifactUrl('')
    } finally {
      setArtifactLoading(false)
    }
  }

  function closeTaskDetail() {
    setSelectedTask(null)
    setDetailImageFiles([])
    setDetailError('')
    setActiveArtifactUrl('')
    setCoderSessionLog([])
    setQaSessionLog([])
  }

  async function openTaskDetail(task: Task) {
    setSelectedTask(task)
    setDetailDraft({
      title: task.title,
      objective: task.objective,
      targetUrl: task.targetUrl ?? '',
      acceptance: (task.acceptanceCriteria ?? []).join('\n'),
    })
    setDetailImageFiles([])
    setDetailError('')
    setActiveArtifactUrl('')
    if (detailImageInputRef.current) detailImageInputRef.current.value = ''
    void loadTaskArtifacts(task.id)
    if (task.lane !== 'backlog') {
      const fetchSessionLog = async (sessionId?: string) => {
        if (!sessionId) return [] as SessionLogMessage[]
        try {
          const r = await fetch(`${SESSION_LOG_URL}?sessionId=${encodeURIComponent(sessionId)}`)
          const payload = await r.json() as { messages?: SessionLogMessage[] }
          return Array.isArray(payload.messages) ? payload.messages : []
        } catch {
          return [] as SessionLogMessage[]
        }
      }

      const [coderLog, qaLog] = await Promise.all([
        fetchSessionLog(task.dispatchSessionKey),
        fetchSessionLog(task.qaSessionKey),
      ])

      setCoderSessionLog(coderLog)
      setQaSessionLog(qaLog)
    } else {
      setCoderSessionLog([])
      setQaSessionLog([])
    }
  }

  function openTaskDetailFromActivity(item: Activity) {
    const taskId = extractTaskIdFromText(item.title, item.detail)
    if (!taskId) return

    const existing = tasks.find((task) => task.id === taskId)
    if (existing) {
      void openTaskDetail(existing)
      return
    }

    const archivedTask: Task = {
      id: taskId,
      title: item.title,
      objective: item.detail,
      plan: [],
      tags: ['archived-from-activity'],
      lane: 'testing',
    }
    void openTaskDetail(archivedTask)
  }

  async function saveBacklogDetail() {
    if (!selectedTask || selectedTask.lane !== 'backlog') return

    let appendedAttachments: TaskImageAttachment[] = []
    if (detailImageFiles.length) {
      try {
        appendedAttachments = await Promise.all(detailImageFiles.map(async (file) => ({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl: await fileToDataUrl(file),
        })))
      } catch {
        setDetailError('图片读取失败，请重试。')
        return
      }
    }

    const nextTasks = tasks.map((t) => t.id === selectedTask.id ? {
      ...t,
      title: detailDraft.title.trim(),
      objective: detailDraft.objective.trim(),
      targetUrl: detailDraft.targetUrl.trim() || undefined,
      acceptanceCriteria: detailDraft.acceptance.split('\n').map((line) => line.trim()).filter(Boolean),
      imageAttachments: [...(t.imageAttachments ?? []), ...appendedAttachments],
    } : t)
    setTasks(nextTasks)
    saveBoard(nextTasks, activity)
    setDetailImageFiles([])
    setDetailError('')
    if (detailImageInputRef.current) detailImageInputRef.current.value = ''
    closeTaskDetail()
  }

  return (
    <div className="mc-shell" data-testid="mc-shell">
      <aside className="mc-sidebar panel">
        <div className="brand-block"><p>Mission Control</p><h1>CÉLINE</h1></div>
        <nav className="nav-list">
          {navItems.map((item) => <button key={item} className={`nav-item ${activeNav === item ? 'active' : ''}`} onClick={() => setActiveNav(item)}>{item}</button>)}
        </nav>
      </aside>

      <main className="mc-main">
        {activeNav === 'Docs' ? (
          <>
            <header className="panel top-header">
              <div><h2>Docs</h2><p>Project docs and notes</p></div>
              <div className="header-actions">
                <button className="ghost" onClick={() => { void loadDocs() }}>Refresh</button>
                <button className="ghost" onClick={startCreateDoc}>+ New doc</button>
                <button className="primary" onClick={() => setShowProjectModal(true)}>+ New project</button>
              </div>
            </header>

            <section className="panel stats-row">
              <Stat value={String(docsThisWeek)} label="This week" color="green" />
              <Stat value={String(docsInProgress)} label="In progress" color="blue" />
              <Stat value={String(docs.length)} label="Total" color="white" />
              <Stat value={`${docsCompletion}%`} label="Completion" color="purple" />
            </section>

            <section className="panel docs-layout">
              <aside className="docs-sidebar">
                <div className="docs-language-switch">
                  <button className={docLanguage === 'EN' ? 'active' : ''} onClick={() => setDocLanguage('EN')}>EN</button>
                  <button className={docLanguage === '中文' ? 'active' : ''} onClick={() => setDocLanguage('中文')}>中文</button>
                </div>

                <label>
                  <span>Project</span>
                  <select value={docProject} onChange={(e) => setDocProject(e.target.value)}>
                    <option value="all">All projects</option>
                    {docProjects.map((project) => <option key={project} value={project}>{project}</option>)}
                  </select>
                </label>

                <label>
                  <span>Tag</span>
                  <select value={docTag} onChange={(e) => setDocTag(e.target.value)}>
                    <option value="all">All tags</option>
                    {docTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                  </select>
                </label>

                <input
                  className="docs-search"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Search documents..."
                />

                <div className="docs-list">
                  {authoredFilteredDocs.length > 0 ? (
                    <div className="docs-group">
                      <p className="docs-group-title">Writable docs</p>
                      {authoredFilteredDocs.map((doc) => (
                        <button key={doc.id} className={`doc-card ${selectedDoc?.id === doc.id ? 'active' : ''}`} onClick={() => setSelectedDocId(doc.id)}>
                          <strong>{doc.title}</strong>
                          <small>{doc.project} · {doc.tags.join(', ') || 'no-tag'} · editable</small>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {importedFilteredDocs.length > 0 ? (
                    <div className="docs-group">
                      <p className="docs-group-title">Imported (read-only)</p>
                      {importedFilteredDocs.map((doc) => (
                        <button key={doc.id} className={`doc-card ${selectedDoc?.id === doc.id ? 'active' : ''}`} onClick={() => setSelectedDocId(doc.id)}>
                          <strong>{doc.title}</strong>
                          <small>{doc.project} · {doc.tags.join(', ') || 'no-tag'} · read-only</small>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {!docsLoading && !visibleDocList.length && <p className="muted">No docs found.</p>}
                </div>
              </aside>

              <section className="docs-content">
                {docsLoading ? <p className="muted">Loading docs...</p> : null}
                {docsError ? <p className="create-error">{docsError}</p> : null}
                {docsActionError ? <p className="create-error">{docsActionError}</p> : null}
                {docsActionOk ? <p className="muted">{docsActionOk}</p> : null}
                {(selectedDoc || creatingDoc) ? (
                  <>
                    <div className="docs-content-header">
                      <h3>{creatingDoc ? 'New document' : selectedDoc?.title}</h3>
                      <p>
                        {creatingDoc
                          ? 'Create a new writable project doc'
                          : `Modified ${selectedDoc ? new Date(selectedDoc.modifiedAt).toLocaleString() : ''} · ${selectedDoc?.path}`}
                      </p>
                    </div>

                    <div className="docs-editor-form">
                      <label><span>Project</span>
                        <select value={docDraftProjectSlug} onChange={(e) => setDocDraftProjectSlug(e.target.value)}>
                          <option value="">Select project</option>
                          {authoredProjects.map((project) => <option key={project.slug} value={project.slug}>{project.name}</option>)}
                        </select>
                      </label>
                      <label><span>Title</span><input value={docDraftTitle} onChange={(e) => setDocDraftTitle(e.target.value)} /></label>
                      <label><span>Tags (comma separated)</span><input value={docDraftTags} onChange={(e) => setDocDraftTags(e.target.value)} placeholder="memory, plan" /></label>
                      <label><span>Markdown</span><textarea rows={16} value={docDraftContent} onChange={(e) => setDocDraftContent(e.target.value)} disabled={!creatingDoc && !!selectedDoc?.readOnly} /></label>
                      {!creatingDoc && selectedDoc?.readOnly ? <p className="muted">This is an imported read-only doc. Create a new doc to write persistent notes.</p> : null}
                      <div className="modal-actions">
                        {(creatingDoc || isDocEditable) ? <button className="primary" onClick={() => { void saveDocDraft() }}>Save</button> : null}
                        {creatingDoc ? <button className="ghost" onClick={() => setCreatingDoc(false)}>Cancel</button> : null}
                      </div>
                    </div>

                    <article className="docs-markdown">
                      <pre>{docDraftContent}</pre>
                    </article>
                  </>
                ) : !docsLoading ? <p className="muted">Select a document to view.</p> : null}
              </section>
            </section>
          </>
        ) : (
          <>
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
                  {lanes.map((lane) => {
                    const laneAllowsDrop = canDropToLane(lane.key)
                    return (
                      <div
                        key={lane.key}
                        data-testid={`lane-${lane.key}`}
                        className={`lane ${dragOverLane === lane.key ? 'lane-over' : ''}`}
                        onDragOver={(e) => {
                          if (!laneAllowsDrop) return
                          e.preventDefault()
                          setDragOverLane(lane.key)
                        }}
                        onDragLeave={() => setDragOverLane((prev) => (prev === lane.key ? null : prev))}
                      >
                        <div className="lane-header">
                          {lane.label}
                          <span className="lane-count">{grouped[lane.key].length}</span>
                        </div>
                        <div
                          className={`lane-body ${laneAllowsDrop ? '' : 'lane-body-locked'}`}
                          data-empty-text={lane.key === 'triaged' ? 'Drop tasks here' : undefined}
                          onDrop={(e) => {
                            if (!laneAllowsDrop) return
                            e.preventDefault()
                            const draggedId = getDraggedId(e)
                            if (draggedId) moveTask(draggedId, lane.key)
                          }}
                        >
                          {lane.key === 'backlog' && grouped.backlog.length === 0 && (
                            <button className="lane-add-task" onClick={() => setShowCreateModal(true)} aria-label="Create new task">+</button>
                          )}
                          {grouped[lane.key].map((task) => (
                            <article
                              key={task.id}
                              data-testid={`task-card-${task.id}`}
                              draggable
                              className={`task-card ${draggingTaskId === task.id ? 'dragging' : ''}`}
                              onDragStart={(e) => { e.dataTransfer.setData('text/task-id', task.id); e.dataTransfer.setData('text/plain', task.id); draggingTaskRef.current = task.id; setDraggingTaskId(task.id) }}
                              onDragEnd={() => { setDragOverLane(null); setDraggingTaskId(null); draggingTaskRef.current = null }}
                              onDragOver={(e) => {
                                if (!laneAllowsDrop) return
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                              onDrop={(e) => {
                                if (!laneAllowsDrop) return
                                e.preventDefault()
                                e.stopPropagation()
                                const draggedId = getDraggedId(e)
                                if (draggedId && draggedId !== task.id) moveTask(draggedId, lane.key, task.id)
                              }}
                              onClick={() => openTaskDetail(task)}
                            >
                              <div className="task-card-controls">
                                {lane.key === 'testing' && (
                                  <button
                                    className="done-btn"
                                    onClick={(e) => { e.stopPropagation(); markTaskDone(task.id) }}
                                  >
                                    Done
                                  </button>
                                )}
                                <button className="delete-x" onClick={(e) => { e.stopPropagation(); deleteTask(task.id) }}>×</button>
                              </div>
                              <h3>{task.title}</h3>
                              <div className="meta-block"><span>Objective</span><p>{task.objective}</p></div>
                              {task.targetUrl && <div className="meta-block"><span>Target URL</span><p>{task.targetUrl}</p></div>}
                              <div className="meta-block"><span>Acceptance</span><p>{task.acceptanceCriteria?.length ? task.acceptanceCriteria.join('\n') : 'No explicit acceptance criteria provided.'}</p></div>
                              {!!task.imageAttachments?.length && <div className="meta-block"><span>Images</span><p>{task.imageAttachments.length} attached</p></div>}
                              {task.dispatchSessionKey && <div className="meta-block"><span>Session</span><p>{task.dispatchSessionKey}</p></div>}
                              <div className="tag-row">{task.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
                            </article>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              <aside className="panel activity-panel" data-testid="activity-panel">
                <div className="activity-header">
                  <h3>ACTIVITY</h3>
                  <span className="activity-count">{activity.length}</span>
                </div>
                <div className="running-box"><span>NOW RUNNING</span><p>{grouped.in_progress[0]?.title ?? 'Idle'}</p></div>
                <div className="activity-list">
                  {activity.length === 0 && <p className="activity-empty">No activity yet.</p>}
                  {activity.map((item) => {
                    const time = formatActivityTime(item)
                    const linkedTaskId = extractTaskIdFromText(item.title, item.detail)
                    return (
                      <article
                        className={`activity-item ${linkedTaskId ? 'clickable' : ''}`}
                        key={item.id}
                        onClick={() => linkedTaskId && openTaskDetailFromActivity(item)}
                        role={linkedTaskId ? 'button' : undefined}
                        tabIndex={linkedTaskId ? 0 : -1}
                        onKeyDown={(e) => {
                          if (!linkedTaskId) return
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            openTaskDetailFromActivity(item)
                          }
                        }}
                      >
                        <span className="dot" />
                        <div className="activity-content">
                          <div className="activity-meta">
                            <strong>{item.title}</strong>
                            <time className="activity-time">
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
          </>
        )}
      </main>

      {showProjectModal && (
        <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Create Project</h3><button className="ghost" onClick={() => setShowProjectModal(false)}>Close</button></div>
            <div className="modal-form">
              <label><span>Project name</span><input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Personal System" /></label>
              <label><span>Slug (optional)</span><input value={newProjectSlug} onChange={(e) => setNewProjectSlug(e.target.value)} placeholder="personal-system" /></label>
              <label><span>Description (optional)</span><textarea rows={4} value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} /></label>
              <div className="modal-actions"><button className="primary" onClick={() => { void createDocProject() }} disabled={creatingProject}>{creatingProject ? 'Creating…' : 'Create Project'}</button></div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={handleCreateModalBackdropClick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={markModalDragEvent}
          onDragEnd={markModalDragEvent}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()} onDrop={markModalDragEvent} onDragEnd={markModalDragEvent}>
            <div className="modal-header"><h3>Create New Task</h3><button className="ghost" onClick={() => setShowCreateModal(false)}>Close</button></div>
            <form className="modal-form" onSubmit={handleCreateTask}>
              <label><span>Task 名称</span><input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} /></label>
              <label><span>任务描述</span><textarea rows={5} value={newTaskObjective} onChange={(e) => setNewTaskObjective(e.target.value)} /></label>
              <label><span>目标网址（可选）</span><input value={newTaskTargetUrl} onChange={(e) => setNewTaskTargetUrl(e.target.value)} placeholder="https://... 或 http://127.0.0.1:5173" /></label>
              <label><span>验收标准（可选，每行一条）</span><textarea rows={3} value={newTaskAcceptance} onChange={(e) => setNewTaskAcceptance(e.target.value)} /></label>
              <label>
                <span>参考图片（可选，可多选）</span>
                <input
                  ref={createImageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setNewTaskImageFiles(Array.from(e.target.files ?? []))}
                />
                {!!newTaskImageFiles.length && (
                  <>
                    <small className="image-count">已选择 {newTaskImageFiles.length} 张图片</small>
                    <div className="selected-image-list" aria-label="Selected reference images">
                      {newTaskImageFiles.map((file, index) => (
                        <div key={`${file.name}-${file.lastModified}-${index}`} className="selected-image-item">
                          <span>{file.name}</span>
                          <button
                            type="button"
                            className="ghost image-remove-btn"
                            onClick={() => setNewTaskImageFiles((prev) => prev.filter((_, i) => i !== index))}
                            aria-label={`取消图片 ${file.name}`}
                          >
                            取消
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </label>
              {createError && <p className="create-error">{createError}</p>}
              <div className="modal-actions"><button type="submit" className="primary">Create Task</button></div>
            </form>
          </div>
        </div>
      )}

      {selectedTask && (
        <div
          className="modal-overlay"
          onClick={handleDetailModalBackdropClick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={markModalDragEvent}
          onDragEnd={markModalDragEvent}
        >
          <div className={`modal-card ${selectedTask.lane === 'backlog' ? '' : 'modal-card-detail'}`} onClick={(e) => e.stopPropagation()} onDrop={markModalDragEvent} onDragEnd={markModalDragEvent}>
            <div className="modal-header"><h3>{selectedTask.id} Detail</h3><button className="ghost" onClick={closeTaskDetail}>Close</button></div>
            {selectedTask.lane === 'backlog' ? (
              <div className="modal-form">
                <label><span>Task 名称</span><input value={detailDraft.title} onChange={(e) => setDetailDraft((d) => ({ ...d, title: e.target.value }))} /></label>
                <label><span>任务描述</span><textarea rows={5} value={detailDraft.objective} onChange={(e) => setDetailDraft((d) => ({ ...d, objective: e.target.value }))} /></label>
                <label><span>目标网址</span><input value={detailDraft.targetUrl} onChange={(e) => setDetailDraft((d) => ({ ...d, targetUrl: e.target.value }))} placeholder="https://... 或 http://127.0.0.1:5173" /></label>
                <label><span>验收标准</span><textarea rows={4} value={detailDraft.acceptance} onChange={(e) => setDetailDraft((d) => ({ ...d, acceptance: e.target.value }))} /></label>
                <label>
                  <span>参考图片（可选，可多选）</span>
                  <input
                    ref={detailImageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setDetailImageFiles(Array.from(e.target.files ?? []))}
                  />
                  {!!selectedTask.imageAttachments?.length && <small className="image-count">当前已保存 {selectedTask.imageAttachments.length} 张图片</small>}
                  {!!detailImageFiles.length && <small className="image-count">本次将新增 {detailImageFiles.length} 张图片</small>}
                </label>
                <ReferenceImageGallery images={selectedTask.imageAttachments} />
                {detailError && <p className="create-error">{detailError}</p>}
                <div className="modal-actions"><button className="primary" onClick={() => { void saveBacklogDetail() }}>Save</button></div>
              </div>
            ) : (
              <div className="detail-readonly detail-layout">
                <section className="detail-section detail-summary">
                  <p><strong>Title:</strong> {selectedTask.title}</p>
                  <p><strong>Objective:</strong> {selectedTask.objective}</p>
                  <p><strong>Status:</strong> {selectedTask.lane}</p>
                  <p><strong>Target URL:</strong> {selectedTask.targetUrl ?? '—'}</p>
                  <p><strong>Images:</strong> {selectedTask.imageAttachments?.length ? `${selectedTask.imageAttachments.length} attached` : '—'}</p>
                  <p><strong>Session:</strong> {selectedTask.dispatchSessionKey ?? '—'}</p>
                </section>

                <section className="detail-section detail-screenshots">
                  <h4>Playwright Screenshots</h4>
                  {artifactLoading ? (
                    <p className="muted">Loading screenshots...</p>
                  ) : taskArtifacts.length ? (
                    <>
                      {activeArtifactUrl && (
                        <a href={activeArtifactUrl} target="_blank" rel="noreferrer" className="artifact-preview">
                          <img src={activeArtifactUrl} alt="Selected screenshot preview" loading="eager" />
                          <span>Open full resolution</span>
                        </a>
                      )}
                      <div className="artifact-grid" role="list" aria-label="Screenshot thumbnails">
                        {taskArtifacts.map((img) => (
                          <button
                            key={img.url}
                            type="button"
                            className={`artifact-item ${img.url === activeArtifactUrl ? 'active' : ''}`}
                            onClick={() => setActiveArtifactUrl(img.url)}
                            title={img.name}
                          >
                            <img src={img.url} alt={img.name} loading="lazy" />
                            <span>{img.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="muted">No Playwright screenshots found for this task yet.</p>
                  )}
                </section>

                <section className="detail-section detail-reference-images">
                  <h4>Reference Images</h4>
                  <ReferenceImageGallery images={selectedTask.imageAttachments} compact />
                </section>

                <section className="detail-section detail-session">
                  <h4>Session Messages</h4>
                  <div className="session-logs-grid">
                    <div className="session-log-block">
                      <h5>Coder Session</h5>
                      <div className="session-log">
                        {coderSessionLog.length ? coderSessionLog.map((m, i) => <p key={i}><strong>{m.role}:</strong> {m.text}</p>) : <p className="muted">No coder transcript yet.</p>}
                      </div>
                    </div>
                    <div className="session-log-block">
                      <h5>QA Session</h5>
                      <div className="session-log">
                        {qaSessionLog.length ? qaSessionLog.map((m, i) => <p key={i}><strong>{m.role}:</strong> {m.text}</p>) : <p className="muted">No QA transcript yet.</p>}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ReferenceImageGallery({ images, compact = false }: { images?: TaskImageAttachment[]; compact?: boolean }) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  if (!images?.length) return <p className="muted">No reference images attached.</p>

  const previewImage = previewIndex === null ? null : images[previewIndex]

  return (
    <>
      <div className={`reference-grid ${compact ? 'compact' : ''}`} role="list" aria-label="Reference image thumbnails">
        {images.map((img, index) => (
          <button
            key={`${img.name}-${index}`}
            type="button"
            className="reference-item"
            title={img.name}
            onClick={() => setPreviewIndex(index)}
          >
            <img src={img.dataUrl} alt={img.name} loading="lazy" />
            <span>{img.name}</span>
          </button>
        ))}
      </div>

      {previewImage ? (
        <div
          className="image-lightbox-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            e.stopPropagation()
            setPreviewIndex(null)
          }}
        >
          <div className="image-lightbox-card" onClick={(e) => e.stopPropagation()}>
            <div className="image-lightbox-header">
              <strong>{previewImage.name}</strong>
              <button type="button" className="ghost" onClick={() => setPreviewIndex(null)}>Close</button>
            </div>
            <img src={previewImage.dataUrl} alt={previewImage.name} className="image-lightbox-full" loading="eager" />
          </div>
        </div>
      ) : null}
    </>
  )
}

function Stat({ value, label, color }: { value: string; label: string; color: 'green' | 'blue' | 'white' | 'purple' }) {
  return <div className={`stat ${color}`}><strong>{value}</strong><span>{label}</span></div>
}

export default App
