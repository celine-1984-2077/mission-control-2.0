import type { Task } from '../../types'
import { FlowArrow } from '../ui/FlowArrow'
import { useI18n } from '../../contexts/I18nContext'

interface LaneFlowIndicatorProps {
  tasks: Task[]
}

export function LaneFlowIndicator({ tasks }: LaneFlowIndicatorProps) {
  const { t } = useI18n()
  const hasRunning = tasks.some((t) => t.lane === 'in_progress')

  const steps = [
    { name: t('lane.backlog'), hint: t('lane.backlog.hint'), activeKey: 'backlog' },
    { name: t('lane.triaged'), hint: t('lane.triaged.hint'), activeKey: 'triaged' },
    { name: t('lane.in_progress'), hint: t('lane.in_progress.hint'), activeKey: 'in_progress' },
    { name: t('lane.testing'), hint: t('lane.testing.hint'), activeKey: 'testing' },
  ] as const

  return (
    <div className="lane-flow-indicator">
      {steps.map((step, i) => {
        const isActive = step.activeKey === 'in_progress' ? hasRunning : false
        return (
          <span key={step.activeKey} style={{ display: 'contents' }}>
            <div className="lane-flow-step" data-active={isActive}>
              <span className="lane-flow-step-name">{step.name}</span>
              <span className="lane-flow-step-hint">{step.hint}</span>
            </div>
            {i < steps.length - 1 && (
              <FlowArrow active={i === 1 && hasRunning} />
            )}
          </span>
        )
      })}
    </div>
  )
}
