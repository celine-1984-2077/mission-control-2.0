import type {
  Task, PlanItem, ClarificationQuestion, VerificationState, VerificationCheck,
  ColumnKey, PlanItemStatus, CreateTaskKind, CreateQaPreference, CreateUrlMode,
} from '../types'
import { DEFAULT_HARNESS_CAPABILITIES } from './constants'

export function isLikelyWebsiteTask(task: Pick<Task, 'title' | 'objective' | 'targetUrl' | 'tags'>) {
  const text = [task.title, task.objective, ...(task.tags ?? [])].join(' ').toLowerCase()
  return Boolean(task.targetUrl?.trim()) || /(web|website|网页|页面|ui|frontend|button|click|browser|截图|playwright|qa|docs)/.test(text)
}

export function buildDefaultClarificationQuestions(
  task: Pick<Task, 'title' | 'objective' | 'targetUrl' | 'tags'>,
): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = [
    {
      id: 'definition-of-done',
      header: 'Outcome',
      question: 'What should feel obviously successful when this task is done?',
      required: false,
      options: [
        { label: 'Visible UI', description: 'A user-facing screen or interaction should clearly change.' },
        { label: 'Behavior fix', description: 'An existing bug or broken flow should work reliably.' },
        { label: 'Automation', description: 'The system should run something for me automatically.' },
      ],
      answer: '',
      notes: '',
      status: 'pending',
    },
  ]

  if (isLikelyWebsiteTask(task) && !task.targetUrl?.trim()) {
    questions.push({
      id: 'target-url',
      header: 'Target URL',
      question: 'Which page should browser QA open first?',
      required: true,
      options: [
        { label: 'Local app', description: 'Use the default local app URL from this workspace.' },
        { label: 'Specific URL', description: 'I will provide the exact URL in the task.' },
        { label: 'Infer it', description: 'Infer the best local URL from the project setup.' },
      ],
      answer: '',
      notes: '',
      status: 'pending',
    })
  }

  questions.push({
    id: 'risk-focus',
    header: 'Focus',
    question: 'Where should verification be strictest?',
    required: false,
    options: [
      { label: 'Happy path', description: 'Prioritize the main user flow and expected behavior.' },
      { label: 'Edge cases', description: 'Probe error handling and retries.' },
      { label: 'Visual polish', description: 'Pay extra attention to design and browser details.' },
    ],
    answer: '',
    notes: '',
    status: 'pending',
  })

  return questions
}

export function buildDefaultPlanItems(task: Pick<Task, 'clarificationQuestions'>): PlanItem[] {
  const hasBlockingClarification = (task.clarificationQuestions ?? []).some(
    (q) => q.required && !q.answer?.trim(),
  )
  return [
    { id: 'clarify', title: 'Clarify the task with the user', status: hasBlockingClarification ? 'running' : 'done', kind: 'clarify' },
    { id: 'implement', title: 'Implement the requested work', status: 'pending', kind: 'implement' },
    { id: 'verify', title: 'Run verification and browser QA', status: 'pending', kind: 'verify' },
  ]
}

export function buildDefaultVerification(
  task: Pick<Task, 'targetUrl' | 'title' | 'objective' | 'tags'>,
): VerificationState {
  const checks: VerificationCheck[] = [
    { id: 'build', label: 'Build or type-check the project', status: 'pending' },
    { id: 'tests', label: 'Run automated tests where available', status: 'pending' },
    ...(isLikelyWebsiteTask(task)
      ? [{ id: 'browser', label: 'Exercise the UI in a browser and capture evidence', status: 'pending' as const }]
      : []),
    { id: 'regression', label: 'Probe regressions and edge cases', status: 'pending' },
  ]
  return { status: 'pending', summary: '', evidence: [], checks }
}

export function normalizeTask(task: Task): Task {
  const clarificationQuestions = (
    task.clarificationQuestions?.length ? task.clarificationQuestions : buildDefaultClarificationQuestions(task)
  ).map((question) => ({
    ...question,
    answer: question.answer ?? '',
    notes: question.notes ?? '',
    status: (question.answer?.trim() ? 'answered' : 'pending') as 'pending' | 'answered',
  }))

  const planItems = (
    task.planItems?.length ? task.planItems : buildDefaultPlanItems({ clarificationQuestions })
  ).map((item) => ({
    ...item,
    details: item.details ?? '',
  }))

  return {
    ...task,
    plan: task.plan?.length ? task.plan : planItems.map((item) => item.title),
    clarificationQuestions,
    planItems,
    verification: task.verification ?? buildDefaultVerification(task),
    harnessCapabilities: task.harnessCapabilities ?? DEFAULT_HARNESS_CAPABILITIES,
    imageAttachments: task.imageAttachments ?? [],
    acceptanceCriteria: task.acceptanceCriteria ?? [],
    tags: task.tags ?? [],
  }
}

export function taskNeedsClarification(task: Task) {
  return (task.clarificationQuestions ?? []).some((question) => question.required && !question.answer?.trim())
}

export function statusGlyph(status: PlanItemStatus) {
  if (status === 'done') return '✓'
  if (status === 'failed') return '✗'
  if (status === 'aborted') return '⊘'
  if (status === 'running') return '●'
  return '○'
}

export function userLaneLabel(lane: ColumnKey) {
  if (lane === 'backlog') return 'Idea'
  if (lane === 'triaged') return 'Ready to Start'
  if (lane === 'in_progress') return 'Working on It'
  return 'Needs Your Review'
}

export function userFacingTaskState(task: Task): string {
  if (task.dispatchBlockedReason === 'clarification_required') return 'Waiting for your answer'
  if (task.verification?.verdict === 'partial') return 'Needs a little help'
  if (task.verification?.verdict === 'fail') return 'Needs a fix'
  if (task.verification?.verdict === 'pass') return 'Finished'
  if (task.lane === 'backlog') return 'Idea'
  if (task.lane === 'triaged') return 'Ready to run'
  if (task.lane === 'in_progress') return 'Working on it'
  return 'Waiting for your review'
}

export function userFacingVerificationStatus(task: Task): string {
  if (task.verification?.verdict === 'pass') return 'Finished'
  if (task.verification?.verdict === 'fail') return 'Failed checks'
  if (task.verification?.verdict === 'partial') return 'Blocked or incomplete'
  if (task.verification?.status === 'running') return 'Checking now'
  if (task.verification?.status === 'passed') return 'Finished'
  if (task.verification?.status === 'failed') return 'Failed checks'
  return 'Not checked yet'
}

export function buildAcceptanceCriteriaFromWizard(
  kind: CreateTaskKind,
  qaPreference: CreateQaPreference,
  goal: string,
): string[] {
  const trimmedGoal = goal.trim()
  const subject = trimmedGoal || 'the requested task'
  const criteria: string[] = []

  if (kind === 'design') {
    criteria.push(`The visual design change for "${subject}" is clearly visible and coherent.`)
    criteria.push('The updated UI feels intentional on desktop and mobile.')
  } else if (kind === 'bugfix') {
    criteria.push(`The original issue in "${subject}" is no longer reproducible.`)
    criteria.push('Related behavior still works after the fix.')
  } else if (kind === 'feature') {
    criteria.push(`The new feature for "${subject}" is usable end to end.`)
    criteria.push('The main happy path works without manual intervention.')
  } else {
    criteria.push(`The documentation or memory entry for "${subject}" is saved and readable.`)
    criteria.push('The content stays available after refresh or reload.')
  }

  if (qaPreference !== 'skip') {
    criteria.push('Verification includes concrete evidence before the task is considered done.')
  }

  return criteria
}

export function buildTaskDraftFromWizard(input: {
  goal: string
  kind: CreateTaskKind
  qaPreference: CreateQaPreference
  urlMode: CreateUrlMode
  specificUrl: string
}) {
  const goal = input.goal.trim()
  const prefix = input.kind === 'design' ? 'Design'
    : input.kind === 'bugfix' ? 'Fix'
    : input.kind === 'feature' ? 'Build'
    : 'Document'
  const title = goal ? `${prefix}: ${goal}` : ''
  const objectiveParts: string[] = [goal]

  if (input.kind === 'design') objectiveParts.push('Prioritize a polished user-facing result.')
  if (input.kind === 'bugfix') objectiveParts.push('Focus on the broken behavior first, then confirm the regression is gone.')
  if (input.kind === 'feature') objectiveParts.push('Implement the missing behavior end to end.')
  if (input.kind === 'docs') objectiveParts.push('Make the result understandable for future reuse.')

  if (input.qaPreference === 'browser') objectiveParts.push('Use browser QA as part of the default verification path.')
  if (input.qaPreference === 'skip') objectiveParts.push('Skip browser QA unless the implementation clearly requires it.')

  if (input.urlMode === 'home') objectiveParts.push('Start verification from the local home page.')
  if (input.urlMode === 'infer') objectiveParts.push('Infer the best local page to test from the project setup.')
  if (input.urlMode === 'specific' && input.specificUrl.trim())
    objectiveParts.push(`Use ${input.specificUrl.trim()} as the primary page for QA.`)

  const targetUrl = input.urlMode === 'specific'
    ? input.specificUrl.trim() || undefined
    : input.urlMode === 'home'
    ? 'http://127.0.0.1:5173'
    : undefined

  const tags = [input.kind, ...(input.qaPreference === 'browser' ? ['browser-qa'] : []), 'MissionControl']

  return {
    title,
    objective: objectiveParts.filter(Boolean).join(' '),
    acceptanceCriteria: buildAcceptanceCriteriaFromWizard(input.kind, input.qaPreference, goal),
    targetUrl,
    tags,
  }
}

export function getRunningPlanItem(task: Task) {
  return task.planItems?.find((item) => item.status === 'running') ?? null
}

export function getAgentPhase(task: Task | null): 'idle' | 'thinking' | 'doing' {
  if (!task) return 'idle'
  if (task.lane !== 'in_progress') return 'idle'
  const running = getRunningPlanItem(task)
  if (!running) return 'idle'
  if (running.kind === 'clarify') return 'thinking'
  return 'doing'
}
