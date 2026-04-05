import type { Task } from '../../types'
import { getAgentPhase, getRunningPlanItem } from '../../lib/taskUtils'
import { useI18n } from '../../contexts/I18nContext'

interface AgentStatusBoxProps {
  tasks: Task[]
}

export function AgentStatusBox({ tasks }: AgentStatusBoxProps) {
  const { t } = useI18n()
  const runningTask = tasks.find((t) => t.lane === 'in_progress') ?? null
  const phase = getAgentPhase(runningTask)
  const runningItem = runningTask ? getRunningPlanItem(runningTask) : null

  const statusLabel = phase === 'idle'
    ? t('activity.agentStatus.idle')
    : phase === 'thinking'
    ? t('activity.agentStatus.thinking')
    : t('activity.agentStatus.doing')

  const currentStep = runningItem?.title ?? runningTask?.title ?? ''

  return (
    <div className="agent-status-box" data-state={phase}>
      <div className="agent-status-header">
        <span className="agent-status-dot" data-state={phase} />
        <span className="agent-status-label" data-state={phase}>
          {statusLabel}
        </span>
      </div>
      {phase !== 'idle' && currentStep && (
        <div className="agent-status-current" data-state={phase}>
          {currentStep}
        </div>
      )}
    </div>
  )
}
