import type { Task } from '../../types'
import type { ColumnKey } from '../../types'
import { FlowArrow } from '../ui/FlowArrow'
import { useI18n } from '../../contexts/I18nContext'

interface LaneFlowIndicatorProps {
  tasks?: Task[]
  grouped: Record<ColumnKey, Task[]>
  onCreateTask: () => void
}

const LANE_KEYS: ColumnKey[] = ['backlog', 'triaged', 'in_progress', 'testing']

// 最活跃泳道优先级（越靠前越优先成为 dominant）
const DOMINANT_PRIORITY: ColumnKey[] = ['testing', 'in_progress', 'triaged', 'backlog']

export function LaneFlowIndicator({ grouped, onCreateTask }: LaneFlowIndicatorProps) {
  const { t } = useI18n()

  // 找出 dominant 泳道（任务最多且优先级最高）
  const dominantLane = DOMINANT_PRIORITY.find((k) => grouped[k].length > 0) ?? null

  const steps = [
    { key: 'backlog'     as ColumnKey, name: t('lane.backlog'),      hint: t('lane.backlog.hint') },
    { key: 'triaged'     as ColumnKey, name: t('lane.triaged'),      hint: t('lane.triaged.hint') },
    { key: 'in_progress' as ColumnKey, name: t('lane.in_progress'),  hint: t('lane.in_progress.hint') },
    { key: 'testing'     as ColumnKey, name: t('lane.testing'),      hint: t('lane.testing.hint') },
  ]

  return (
    <div className="lane-flow-indicator">
      {steps.map((step, i) => {
        const count = grouped[step.key].length
        const isActive = count > 0
        const isDominant = step.key === dominantLane
        const isBacklog = step.key === 'backlog'

        // 两端泳道均有任务时箭头才脉冲
        const arrowActive = i < steps.length - 1
          ? (grouped[LANE_KEYS[i]].length > 0 && grouped[LANE_KEYS[i + 1]].length > 0)
          : false

        return (
          <span key={step.key} style={{ display: 'contents' }}>
            <div
              className="flow-node"
              data-lane={step.key}
              data-active={isActive}
              data-dominant={isDominant}
            >
              {/* 计数徽章 */}
              {count > 0 && (
                <span className="flow-node-badge" data-lane={step.key} data-active={isActive}>
                  {count}
                </span>
              )}

              <span className="flow-node-name">{step.name}</span>
              <span className="flow-node-hint">{step.hint}</span>

              {/* Backlog 节点的 "+" 添加按钮 */}
              {isBacklog && (
                <button
                  className="flow-node-add-btn"
                  onClick={onCreateTask}
                  title={t('board.newTask')}
                  aria-label={t('board.newTask')}
                >
                  +
                </button>
              )}
            </div>

            {i < steps.length - 1 && (
              <FlowArrow active={arrowActive} />
            )}
          </span>
        )
      })}
    </div>
  )
}
