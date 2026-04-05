import type { DragEvent } from 'react'
import type { Task, ColumnKey } from '../../types'
import { TaskCard } from './TaskCard'
import { useI18n } from '../../contexts/I18nContext'

interface LaneProps {
  laneKey: ColumnKey
  tasks: Task[]
  draggingTaskId: string | null
  dragOverLane: ColumnKey | null
  dragOverTaskId: string | null
  onDragStart: (e: DragEvent, id: string) => void
  onDragEnd: () => void
  onDragOver: (e: DragEvent, lane: ColumnKey, taskId?: string) => void
  onDragLeave: () => void
  onDrop: (e: DragEvent, lane: ColumnKey, beforeTaskId?: string) => void
  onTaskClick: (task: Task) => void
  onTaskDelete: (id: string) => void
  onMarkDone?: (id: string) => void
  onAddTask?: () => void
}

const LANE_LABEL_KEYS: Record<ColumnKey, 'lane.backlog' | 'lane.triaged' | 'lane.in_progress' | 'lane.testing'> = {
  backlog: 'lane.backlog',
  triaged: 'lane.triaged',
  in_progress: 'lane.in_progress',
  testing: 'lane.testing',
}

const LANE_EMPTY_KEYS: Record<ColumnKey, 'lane.backlog.empty' | 'lane.triaged.empty' | 'lane.in_progress.empty' | 'lane.testing.empty'> = {
  backlog: 'lane.backlog.empty',
  triaged: 'lane.triaged.empty',
  in_progress: 'lane.in_progress.empty',
  testing: 'lane.testing.empty',
}

const DROPPABLE_LANES: ColumnKey[] = ['backlog', 'triaged']

export function Lane({
  laneKey, tasks, draggingTaskId, dragOverLane, dragOverTaskId,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  onTaskClick, onTaskDelete, onMarkDone, onAddTask,
}: LaneProps) {
  const { t } = useI18n()
  const isDropActive = dragOverLane === laneKey && DROPPABLE_LANES.includes(laneKey)
  const canDrop = DROPPABLE_LANES.includes(laneKey)

  return (
    <div
      className="lane"
      data-lane={laneKey}
      data-drop-active={isDropActive}
    >
      {/* 泳道标题 */}
      <div className="lane-header">
        <span className="lane-title">{t(LANE_LABEL_KEYS[laneKey])}</span>
        <span className="lane-count">{tasks.length}</span>
      </div>

      {/* 泳道主体 */}
      <div
        className="lane-body"
        onDragOver={(e) => { if (canDrop) onDragOver(e, laneKey) }}
        onDragLeave={onDragLeave}
        onDrop={(e) => { if (canDrop) onDrop(e, laneKey) }}
      >
        {tasks.length === 0 ? (
          <div className="lane-empty">
            {laneKey === 'backlog' && onAddTask ? (
              <button
                className="btn btn-primary btn-lg"
                onClick={onAddTask}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                + {t('board.newTask')}
              </button>
            ) : (
              <div className="lane-empty-dashed">
                <span className="lane-empty-hint">{t(LANE_EMPTY_KEYS[laneKey])}</span>
              </div>
            )}
          </div>
        ) : (
          <>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isDragging={draggingTaskId === task.id}
                isDropTarget={dragOverTaskId === task.id}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={(e) => {
                  if (canDrop) onDragOver(e, laneKey, task.id)
                  else e.preventDefault()
                }}
                onDrop={(e) => { if (canDrop) onDrop(e, laneKey, task.id) }}
                onClick={() => onTaskClick(task)}
                onDelete={onTaskDelete}
                onMarkDone={onMarkDone}
              />
            ))}
            {/* Backlog 泳道末尾的添加按钮 */}
            {laneKey === 'backlog' && onAddTask && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={onAddTask}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                + {t('board.newTask')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
