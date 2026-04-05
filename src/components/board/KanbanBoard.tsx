import type { Task } from '../../types'
import type { ColumnKey } from '../../types'
import type { BoardState } from '../../hooks/useBoardState'
import { Lane } from './Lane'
import { ActivityPanel } from './ActivityPanel'
import { LaneFlowIndicator } from '../onboarding/LaneFlowIndicator'

interface KanbanBoardProps {
  board: BoardState
  filteredGrouped: Record<ColumnKey, Task[]>
  visibleTasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask: () => void
}

export function KanbanBoard({ board, filteredGrouped, visibleTasks, onTaskClick, onAddTask }: KanbanBoardProps) {
  const { tasks, activity, draggingTaskId, dragOverLane, dragOverTaskId,
    onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
    deleteTask, markTaskDone } = board

  const lanes = ['backlog', 'triaged', 'in_progress', 'testing'] as const

  return (
    <div className="board-column-wrap">
      {/* 行1: 流程指引条（与下方泳道列对齐）*/}
      <div className="board-wrap board-wrap-indicator">
        <LaneFlowIndicator
          tasks={visibleTasks}
          grouped={filteredGrouped}
          onCreateTask={onAddTask}
        />
        <div /> {/* activity panel 占位 */}
      </div>

      {/* 行2: 泳道 + 活动面板 */}
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
