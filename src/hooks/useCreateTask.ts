import { useMemo, useRef, useState } from 'react'
import type { Task, CreateTaskKind, CreateQaPreference, CreateUrlMode } from '../types'
import { buildTaskDraftFromWizard, normalizeTask } from '../lib/taskUtils'

export interface CreateTaskState {
  // 表单
  step: number
  goal: string
  kind: CreateTaskKind
  qaPreference: CreateQaPreference
  urlMode: CreateUrlMode
  specificUrl: string
  imageFiles: File[]
  error: string

  // 预览草稿
  draft: ReturnType<typeof buildTaskDraftFromWizard>

  // 操作
  setStep: (step: number) => void
  setGoal: (v: string) => void
  setKind: (v: CreateTaskKind) => void
  setQaPreference: (v: CreateQaPreference) => void
  setUrlMode: (v: CreateUrlMode) => void
  setSpecificUrl: (v: string) => void
  setImageFiles: (files: File[]) => void
  setError: (e: string) => void
  reset: () => void
  imageInputRef: React.RefObject<HTMLInputElement | null>
  buildTask: (existingTasks: Task[]) => Task | null
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Failed to read file'))
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export function useCreateTask(): CreateTaskState {
  const [step, setStep] = useState(1)
  const [goal, setGoal] = useState('')
  const [kind, setKind] = useState<CreateTaskKind>('feature')
  const [qaPreference, setQaPreference] = useState<CreateQaPreference>('auto')
  const [urlMode, setUrlMode] = useState<CreateUrlMode>('infer')
  const [specificUrl, setSpecificUrl] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const draft = useMemo(() => buildTaskDraftFromWizard({
    goal, kind, qaPreference, urlMode, specificUrl,
  }), [goal, kind, qaPreference, urlMode, specificUrl])

  function reset() {
    setStep(1)
    setGoal('')
    setKind('feature')
    setQaPreference('auto')
    setUrlMode('infer')
    setSpecificUrl('')
    setImageFiles([])
    setError('')
  }

  function buildTask(existingTasks: Task[]): Task | null {
    if (!goal.trim()) {
      setError('先用一句话告诉我你想完成什么。')
      return null
    }
    const maxNum = existingTasks.reduce((max, t) => {
      const m = t.id.match(/^MC-(\d+)$/)
      return m ? Math.max(max, Number(m[1])) : max
    }, 0)
    const base: Task = {
      id: `MC-${maxNum + 1}`,
      title: draft.title || goal.trim(),
      objective: draft.objective || goal.trim(),
      targetUrl: draft.targetUrl,
      acceptanceCriteria: draft.acceptanceCriteria,
      imageAttachments: [],
      plan: ['Clarify and structure the task', 'Execute implementation'],
      next: '',
      tags: Array.from(new Set(['medium', 'MissionControl', ...draft.tags])),
      lane: 'backlog',
      createdAt: new Date().toISOString(),
    }
    return normalizeTask(base)
  }

  return {
    step, goal, kind, qaPreference, urlMode, specificUrl, imageFiles, error, draft,
    setStep, setGoal, setKind, setQaPreference, setUrlMode, setSpecificUrl,
    setImageFiles, setError, reset, imageInputRef, buildTask,
  }
}

export { fileToDataUrl }
