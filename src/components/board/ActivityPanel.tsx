import type { Task, Activity } from '../../types'
import { AgentStatusBox } from '../observability/AgentStatusBox'
import { ActivityItem } from './ActivityItem'
import { useI18n } from '../../contexts/I18nContext'
import { extractTaskIdFromText } from '../../lib/formatters'

interface ActivityPanelProps {
  tasks: Task[]
  activity: Activity[]
  onTaskClick: (task: Task) => void
}

export function ActivityPanel({ tasks, activity, onTaskClick }: ActivityPanelProps) {
  const { t } = useI18n()

  function handleActivityClick(item: Activity) {
    const taskId = extractTaskIdFromText(item.title, item.detail)
    if (!taskId) return
    const task = tasks.find((t) => t.id === taskId)
    if (task) onTaskClick(task)
  }

  return (
    <div className="activity-panel">
      {/* Agent 实时状态 */}
      <AgentStatusBox tasks={tasks} />

      {/* 活动标题 */}
      <div className="flex-between" style={{ padding: '0 var(--space-1)' }}>
        <span className="label-eyebrow">{t('activity.title')}</span>
      </div>

      {/* 活动流 */}
      <div className="activity-feed">
        {activity.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
            <div className="empty-state-title">{t('activity.empty')}</div>
          </div>
        ) : (
          activity.map((item) => (
            <ActivityItem
              key={item.id}
              activity={item}
              onClick={() => handleActivityClick(item)}
            />
          ))
        )}
      </div>
    </div>
  )
}
