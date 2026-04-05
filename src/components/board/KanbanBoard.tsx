import type { Task } from '../../types'
import type { ColumnKey } from '../../types'
import type { BoardState } from '../../hooks/useBoardState'
import { Lane } from './Lane'
import { ActivityPanel } from './ActivityPanel'
import { LaneFlowIndicator } from '../onboarding/LaneFlowIndicator'

interface KanbanBoardProps {
  board: BoardState
  filteredGrouped: Record<ColumnKey, Task[]>
  onTaskClick: (task: Task) => void
  onAddTask: () => void
}

export function KanbanBoard({ board, filteredGrouped, onTaskClick, onAddTask }: KanbanBoardProps) {
  const { tasks, activity, draggingTaskId, dragOverLane, dragOverTaskId,
    onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
    deleteTask, markTaskDone } = board

  const lanes = ['backlog', 'triaged', 'in_progress', 'testing'] as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--space-2)' }}>
      {/* 流程指引条：margin-right 与活动面板对齐，使节点与泳道列水平对齐 */}
      <div style={{ marginRight: `calc(var(--activity-panel-width) + var(--space-3))`, flexShrink: 0 }}>
        <LaneFlowIndicator
          grouped={filteredGrouped}
          onCreateTask={onAddTask}
        />
      </div>

      {/* 泳道 + 活动面板 */}
      <div className="board-wrap" style={{ flex: 1, minHeight: 0 }}>
        <div className="lanes-grid">
          {lanes.map((laneKey) => (
            <Lane
              key={laneKey}
              laneKey={laneKey}
              tasks={filteredGrouped[laneKey]}
              draggingTaskId={draggingTaskId}
              dragOverLane={dragOverLane}
              dragOverTaskId={dragOverTaskId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onTaskClick={onTaskClick}
              onTaskDelete={deleteTask}
              onMarkDone={markTaskDone}
              onAddTask={laneKey === 'backlog' ? onAddTask : undefined}
            />
          ))}
        </div>
        <ActivityPanel
          tasks={tasks}
          activity={activity}
          onTaskClick={onTaskClick}
        />
      </div>
    </div>
  )
}
