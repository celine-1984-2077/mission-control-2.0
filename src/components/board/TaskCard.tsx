import type { DragEvent } from 'react'
import type { Task } from '../../types'
import { getRunningPlanItem } from '../../lib/taskUtils'
import { StatusPill } from '../ui/StatusPill'
import { Tag } from '../ui/Tag'
import { Tooltip } from '../ui/Tooltip'
import { PlanRail } from './PlanRail'
import { useI18n } from '../../contexts/I18nContext'

interface TaskCardProps {
  task: Task
  isDragging: boolean
  isDropTarget: boolean
  onDragStart: (e: DragEvent, id: string) => void
  onDragEnd: () => void
  onDragOver: (e: DragEvent) => void
  onDrop: (e: DragEvent) => void
  onClick: () => void
  onDelete: (id: string) => void
  onMarkDone?: (id: string) => void
}

export function TaskCard({
  task, isDragging, isDropTarget,
  onDragStart, onDragEnd, onDragOver, onDrop,
  onClick, onDelete, onMarkDone,
}: TaskCardProps) {
  const { t } = useI18n()
  const isBlocked = task.dispatchBlockedReason === 'clarification_required'
  const runningItem = getRunningPlanItem(task)
  const canDelete = task.lane === 'backlog' || task.lane === 'triaged'
  const canMarkDone = task.lane === 'testing'

  return (
    <div
      className="task-card"
      data-lane={task.lane}
      data-dragging={isDragging}
      data-drop-target={isDropTarget}
      data-blocked={isBlocked}
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`Task: ${task.title}`}
    >
      {/* 被阻塞横幅 */}
      {isBlocked && (
        <div className="task-card-blocked-banner">
          <span>⚠</span>
          <span>{t('task.state.waitingAnswer')} →</span>
        </div>
      )}

      {/* 卡片头部 */}
      <div className="task-card-header">
        <div className="flex-center gap-2">
          {task.lane === 'in_progress' && runningItem && (
            <span className="task-card-agent-dot" title={runningItem.title} />
          )}
          <Tooltip content={t('tooltip.sessionKey')}>
            <span className="task-card-id">{task.id}</span>
          </Tooltip>
        </div>
        <div className="task-card-actions">
          <StatusPill task={task} />
          {canMarkDone && onMarkDone && (
            <button
              className="btn btn-outline btn-sm"
              onClick={(e) => { e.stopPropagation(); onMarkDone(task.id) }}
              title={t('common.done')}
            >
              ✓
            </button>
          )}
          {canDelete && (
            <button
              className="btn btn-danger btn-sm"
              onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
              title={t('common.delete')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 标题 */}
      <div className="task-card-title line-clamp-2">{task.title || t('common.untitled')}</div>

      {/* 目标（悬浮时显示）*/}
      {task.objective && (
        <div className="task-card-objective">{task.objective}</div>
      )}

      {/* 计划步骤轨道 */}
      {task.planItems && task.planItems.length > 0 && (
        <PlanRail planItems={task.planItems} />
      )}

      {/* 标签 */}
      {task.tags.length > 0 && (
        <div className="task-card-footer">
          <div className="task-card-tags">
            {task.tags.slice(0, 3).map((tag) => (
              <Tag key={tag} label={tag} />
            ))}
            {task.tags.length > 3 && (
              <span className="task-card-id">+{task.tags.length - 3}</span>
            )}
          </div>
          {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
            <span className="task-card-id" title={`${task.acceptanceCriteria.length} criteria`}>
              {task.acceptanceCriteria.length}✓
            </span>
          )}
        </div>
      )}
    </div>
  )
}
