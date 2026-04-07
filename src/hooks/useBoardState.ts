import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import type { Task, Activity, ColumnKey } from '../types'
import { normalizeTask, userLaneLabel } from '../lib/taskUtils'
import { BOARD_BRIDGE_URL, POLL_INTERVAL_MS } from '../lib/constants'

export interface BoardState {
  tasks: Task[]
  activity: Activity[]
  hydrated: boolean
  nextPickupAt: string
  countdownSeconds: number
  boardUpdatedAt: string

  // 分组
  grouped: Record<ColumnKey, Task[]>
  inProgressCount: number

  // 拖拽
  draggingTaskId: string | null
  dragOverLane: ColumnKey | null
  dragOverTaskId: string | null

  // 操作
  moveTask: (taskId: string, lane: ColumnKey, beforeTaskId?: string) => void
  deleteTask: (taskId: string) => void
  markTaskDone: (taskId: string) => void
  updateTask: (taskId: string, patch: Partial<Task>) => void
  addTask: (task: Task) => void
  saveBoard: (nextTasks: Task[], nextActivity: Activity[]) => Promise<void>

  // 拖拽操作
  onDragStart: (e: DragEvent, taskId: string) => void
  onDragEnd: () => void
  onDragOver: (e: DragEvent, lane: ColumnKey, taskId?: string) => void
  onDragLeave: () => void
  onDrop: (e: DragEvent, lane: ColumnKey, beforeTaskId?: string) => void
}

function canDropToLane(lane: ColumnKey) {
  return lane === 'backlog' || lane === 'triaged'
}

export function useBoardState(): BoardState {
  const [tasks, setTasks] = useState<Task[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [nextPickupAt, setNextPickupAt] = useState('')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [boardUpdatedAt, setBoardUpdatedAt] = useState('')
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dragOverLane, setDragOverLane] = useState<ColumnKey | null>(null)
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null)

  const suppressSaveRef = useRef(false)
  const draggingTaskRef = useRef<string | null>(null)

  const grouped = useMemo(() => ({
    backlog: tasks.filter((t) => t.lane === 'backlog'),
    triaged: tasks.filter((t) => t.lane === 'triaged'),
    in_progress: tasks.filter((t) => t.lane === 'in_progress'),
    testing: tasks.filter((t) => t.lane === 'testing'),
  }), [tasks])

  const inProgressCount = grouped.in_progress.length

  const countdownSeconds = useMemo(() => {
    if (!nextPickupAt) return 0
    return Math.max(0, Math.ceil((new Date(nextPickupAt).getTime() - nowMs) / 1000))
  }, [nextPickupAt, nowMs])

  const loadBoardFromServer = useCallback(async () => {
    try {
      const response = await fetch(BOARD_BRIDGE_URL)
      if (!response.ok) return
      const payload = await response.json() as {
        tasks?: Task[]; activity?: Activity[]
        nextPickupAt?: string; updatedAt?: string
      }
      suppressSaveRef.current = true
      if (Array.isArray(payload.tasks)) setTasks(payload.tasks.map(normalizeTask))
      if (Array.isArray(payload.activity)) setActivity(payload.activity)
      if (payload.nextPickupAt) setNextPickupAt(payload.nextPickupAt)
      if (payload.updatedAt) setBoardUpdatedAt(payload.updatedAt)
      setHydrated(true)
      setTimeout(() => { suppressSaveRef.current = false }, 50)
    } catch {
      // Bridge 未启动时静默忽略
    }
  }, [])

  const saveBoard = useCallback(async (
    nextTasks: Task[],
    nextActivity: Activity[],
    overrideBaseUpdatedAt?: string,
    retryCount = 0,
  ): Promise<void> => {
    if (!hydrated) return
    if (suppressSaveRef.current) return
    try {
      const response = await fetch(BOARD_BRIDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: nextTasks,
          activity: nextActivity,
          baseUpdatedAt: (overrideBaseUpdatedAt ?? boardUpdatedAt) || undefined,
        }),
      })
      const payload = await response.json().catch(() => ({})) as {
        conflict?: boolean; state?: { updatedAt?: string }
      }
      if (response.status === 409 && payload.conflict && payload.state?.updatedAt && retryCount < 1) {
        setBoardUpdatedAt(payload.state.updatedAt)
        await saveBoard(nextTasks, nextActivity, payload.state.updatedAt, retryCount + 1)
        return
      }
      if (!response.ok) return
      if (payload?.state?.updatedAt) setBoardUpdatedAt(payload.state.updatedAt)
    } catch {
      // 静默忽略
    }
  }, [hydrated, boardUpdatedAt])

  // 轮询
  useEffect(() => {
    void loadBoardFromServer()
    const poll = window.setInterval(() => { void loadBoardFromServer() }, POLL_INTERVAL_MS)
    return () => window.clearInterval(poll)
  }, [loadBoardFromServer])

  // 倒计时
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  function addTask(task: Task) {
    const nextTasks = [task, ...tasks]
    const nextActivity = [{
      id: `a-${Date.now()}`,
      title: `Task created: ${task.title}`,
      detail: `Status: Backlog`,
      time: 'just now',
      createdAt: new Date().toISOString(),
    }, ...activity]
    setTasks(nextTasks)
    setActivity(nextActivity)
    void saveBoard(nextTasks, nextActivity)
  }

  function updateTask(taskId: string, patch: Partial<Task>) {
    const nextTasks = tasks.map((t) => t.id === taskId ? normalizeTask({ ...t, ...patch }) : t)
    setTasks(nextTasks)
    void saveBoard(nextTasks, activity)
  }

  function moveTask(taskId: string, lane: ColumnKey, beforeTaskId?: string) {
    if (!canDropToLane(lane)) return
    const moving = tasks.find((t) => t.id === taskId)
    if (!moving) return

    const moved = normalizeTask({
      ...moving,
      lane,
      dispatchBlockedReason: lane === 'backlog' ? undefined : moving.dispatchBlockedReason,
    })
    const withoutMoving = tasks.filter((t) => t.id !== taskId)
    let nextTasks: Task[]

    if (!beforeTaskId) {
      const targetIndexes = withoutMoving.map((t, idx) => ({ id: t.id, idx }))
        .filter((x) => withoutMoving[x.idx].lane === lane)
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

    const nextActivity = [{
      id: `a-${Date.now()}`,
      title: `${taskId} moved to ${userLaneLabel(lane)}`,
      detail: lane === 'triaged'
        ? 'Task is queued for the assistant to pick up.'
        : 'Task moved back to Ideas.',
      time: 'just now',
      createdAt: new Date().toISOString(),
    }, ...activity]

    setTasks(nextTasks)
    setActivity(nextActivity)
    void saveBoard(nextTasks, nextActivity)
    setDraggingTaskId(null)
    setDragOverLane(null)
    setDragOverTaskId(null)
    draggingTaskRef.current = null
  }

  function deleteTask(taskId: string) {
    const nextTasks = tasks.filter((t) => t.id !== taskId)
    const nextActivity = [{
      id: `a-${Date.now()}`,
      title: `${taskId} deleted`,
      detail: 'Task removed from board.',
      time: 'just now',
      createdAt: new Date().toISOString(),
    }, ...activity]
    setTasks(nextTasks)
    setActivity(nextActivity)
    void saveBoard(nextTasks, nextActivity)
  }

  function markTaskDone(taskId: string) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.lane !== 'testing') return
    const nextTasks = tasks.filter((t) => t.id !== taskId)
    const nextActivity = [{
      id: `a-${Date.now()}`,
      title: `${taskId} marked done`,
      detail: 'Task completed and removed from board.',
      time: 'just now',
      createdAt: new Date().toISOString(),
    }, ...activity]
    setTasks(nextTasks)
    setActivity(nextActivity)
    void saveBoard(nextTasks, nextActivity)
  }

  // ── 拖拽处理 ──────────────────────────────────────────
  function onDragStart(e: DragEvent, taskId: string) {
    e.dataTransfer.setData('text/task-id', taskId)
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingTaskId(taskId)
    draggingTaskRef.current = taskId
  }

  function onDragEnd() {
    setDraggingTaskId(null)
    setDragOverLane(null)
    setDragOverTaskId(null)
    draggingTaskRef.current = null
  }

  function onDragOver(e: DragEvent, lane: ColumnKey, taskId?: string) {
    e.preventDefault()
    if (!canDropToLane(lane)) return
    e.dataTransfer.dropEffect = 'move'
    setDragOverLane(lane)
    setDragOverTaskId(taskId ?? null)
  }

  function onDragLeave() {
    setDragOverLane(null)
    setDragOverTaskId(null)
  }

  function onDrop(e: DragEvent, lane: ColumnKey, beforeTaskId?: string) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/task-id')
      || e.dataTransfer.getData('text/plain')
      || draggingTaskRef.current
      || draggingTaskId
    if (id) moveTask(id, lane, beforeTaskId)
    setDragOverLane(null)
    setDragOverTaskId(null)
  }

  return {
    tasks, activity, hydrated, nextPickupAt, countdownSeconds, boardUpdatedAt,
    grouped, inProgressCount,
    draggingTaskId, dragOverLane, dragOverTaskId,
    moveTask, deleteTask, markTaskDone, updateTask, addTask, saveBoard,
    onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  }
}
