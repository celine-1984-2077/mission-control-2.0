import type { ColumnKey, PlanItemStatus } from './common'

export type TaskImageAttachment = {
  name: string
  mimeType: string
  dataUrl: string
  size: number
}

export type PlanItem = {
  id: string
  title: string
  status: PlanItemStatus
  details?: string
  kind?: string
  updatedAt?: string
  sessionId?: string
  userAbortable?: boolean
}

export type ClarificationOption = {
  label: string
  description: string
}

export type ClarificationQuestion = {
  id: string
  header: string
  question: string
  required: boolean
  options: ClarificationOption[]
  answer?: string
  notes?: string
  status?: 'pending' | 'answered'
}

export type VerificationCheck = {
  id: string
  label: string
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
  detail?: string
}

export type VerificationState = {
  status: 'pending' | 'running' | 'passed' | 'failed'
  verdict?: 'pass' | 'fail' | 'partial'
  summary?: string
  evidence?: string[]
  checks?: VerificationCheck[]
}

export type HarnessCapabilities = {
  browser: string[]
  qa: string[]
  design: string[]
}

export type Task = {
  id: string
  title: string
  objective: string
  targetUrl?: string
  acceptanceCriteria?: string[]
  imageAttachments?: TaskImageAttachment[]
  plan: string[]
  planItems?: PlanItem[]
  clarificationQuestions?: ClarificationQuestion[]
  verification?: VerificationState
  harnessCapabilities?: HarnessCapabilities
  dispatchBlockedReason?: string
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

export type SessionLogMessage = { role: string; text: string }

export type TaskArtifactImage = {
  name: string
  url: string
  sourcePath: string
}
