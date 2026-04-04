import type { Task } from '../../types'
import { userFacingTaskState } from '../../lib/taskUtils'

interface StatusPillProps {
  task: Task
}

function getPillVariant(task: Task): string {
  if (task.dispatchBlockedReason === 'clarification_required') return 'amber'
  if (task.verification?.verdict === 'pass') return 'green'
  if (task.verification?.verdict === 'fail') return 'red'
  if (task.verification?.verdict === 'partial') return 'amber'
  if (task.lane === 'in_progress') return 'amber'
  if (task.lane === 'testing') return 'green'
  if (task.lane === 'triaged') return 'blue'
  return 'default'
}

export function StatusPill({ task }: StatusPillProps) {
  const label = userFacingTaskState(task)
  const variant = getPillVariant(task)
  return <span className={`status-pill status-pill-${variant}`}>{label}</span>
}
