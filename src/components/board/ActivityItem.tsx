import type { Activity } from '../../types'
import { formatActivityTime } from '../../lib/formatters'

interface ActivityItemProps {
  activity: Activity
  onClick?: () => void
}

export function ActivityItem({ activity, onClick }: ActivityItemProps) {
  const { primary } = formatActivityTime(activity)

  return (
    <div
      className="activity-item"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className="activity-dot" />
      <div className="activity-item-content">
        <div className="activity-item-title">{activity.title}</div>
        <div className="activity-item-time">{primary}</div>
      </div>
    </div>
  )
}
