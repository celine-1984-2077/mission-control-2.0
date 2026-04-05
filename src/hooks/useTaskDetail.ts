import { useCallback, useRef, useState } from 'react'
import type { Task, SessionLogMessage, TaskArtifactImage } from '../types'
import { SESSION_LOG_URL, TASK_ARTIFACTS_URL } from '../lib/constants'

export interface TaskDetailState {
  selectedTask: Task | null
  setSelectedTask: (task: Task | null) => void
  closeTaskDetail: () => void

  // 草稿编辑（仅 backlog 任务）
  detailDraft: { title: string; objective: string; targetUrl: string; acceptance: string }
  setDetailDraft: (v: { title: string; objective: string; targetUrl: string; acceptance: string }) => void
  detailImageFiles: File[]
  setDetailImageFiles: (files: File[]) => void
  detailError: string
  setDetailError: (e: string) => void
  detailImageInputRef: React.RefObject<HTMLInputElement | null>

  // Session 日志
  coderSessionLog: SessionLogMessage[]
  qaSessionLog: SessionLogMessage[]

  // 截图
  taskArtifacts: TaskArtifactImage[]
  artifactLoading: boolean
  activeArtifactUrl: string
  setActiveArtifactUrl: (url: string) => void

  // 模态框交互
  modalDragEventAtRef: React.RefObject<number>
  markModalDragEvent: () => void
  shouldIgnoreModalBackdropClose: () => boolean
}

export function useTaskDetail(): TaskDetailState {
  const [selectedTask, setSelectedTaskState] = useState<Task | null>(null)
  const [detailDraft, setDetailDraft] = useState({ title: '', objective: '', targetUrl: '', acceptance: '' })
  const [detailImageFiles, setDetailImageFiles] = useState<File[]>([])
  const [detailError, setDetailError] = useState('')
  const [coderSessionLog, setCoderSessionLog] = useState<SessionLogMessage[]>([])
  const [qaSessionLog, setQaSessionLog] = useState<SessionLogMessage[]>([])
  const [taskArtifacts, setTaskArtifacts] = useState<TaskArtifactImage[]>([])
  const [artifactLoading, setArtifactLoading] = useState(false)
  const [activeArtifactUrl, setActiveArtifactUrl] = useState('')
  const detailImageInputRef = useRef<HTMLInputElement | null>(null)
  const modalDragEventAtRef = useRef<number>(0)

  const loadSessionLogs = useCallback(async (task: Task) => {
    const coderKey = task.dispatchSessionKey
    const qaKey = task.qaSessionKey
    const results = await Promise.allSettled([
      coderKey ? fetch(`${SESSION_LOG_URL}?sessionId=${encodeURIComponent(coderKey)}`).then((r) => r.json()) : Promise.resolve({ messages: [] }),
      qaKey ? fetch(`${SESSION_LOG_URL}?sessionId=${encodeURIComponent(qaKey)}`).then((r) => r.json()) : Promise.resolve({ messages: [] }),
    ])
    if (results[0].status === 'fulfilled') {
      setCoderSessionLog((results[0].value as { messages?: SessionLogMessage[] }).messages ?? [])
    }
    if (results[1].status === 'fulfilled') {
      setQaSessionLog((results[1].value as { messages?: SessionLogMessage[] }).messages ?? [])
    }
  }, [])

  const loadArtifacts = useCallback(async (task: Task) => {
    setArtifactLoading(true)
    try {
      const res = await fetch(`${TASK_ARTIFACTS_URL}?taskId=${encodeURIComponent(task.id)}`)
      if (!res.ok) return
      const data = await res.json() as { images?: TaskArtifactImage[] }
      setTaskArtifacts(data.images ?? [])
    } catch {
      // 静默忽略
    } finally {
      setArtifactLoading(false)
    }
  }, [])

  function setSelectedTask(task: Task | null) {
    setSelectedTaskState(task)
    if (!task) {
      setCoderSessionLog([])
      setQaSessionLog([])
      setTaskArtifacts([])
      setDetailError('')
      return
    }
    setDetailDraft({
      title: task.title,
      objective: task.objective,
      targetUrl: task.targetUrl ?? '',
      acceptance: (task.acceptanceCriteria ?? []).join('\n'),
    })
    if (task.lane !== 'backlog') {
      void loadSessionLogs(task)
      void loadArtifacts(task)
    }
  }

  function closeTaskDetail() {
    setSelectedTaskState(null)
    setCoderSessionLog([])
    setQaSessionLog([])
    setTaskArtifacts([])
    setDetailError('')
    setDetailImageFiles([])
  }

  const markModalDragEvent = () => { modalDragEventAtRef.current = Date.now() }
  const shouldIgnoreModalBackdropClose = () => Date.now() - modalDragEventAtRef.current < 250

  return {
    selectedTask, setSelectedTask, closeTaskDetail,
    detailDraft, setDetailDraft, detailImageFiles, setDetailImageFiles,
    detailError, setDetailError, detailImageInputRef,
    coderSessionLog, qaSessionLog,
    taskArtifacts, artifactLoading, activeArtifactUrl, setActiveArtifactUrl,
    modalDragEventAtRef, markModalDragEvent, shouldIgnoreModalBackdropClose,
  }
}
