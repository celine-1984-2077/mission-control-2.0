import type { Task } from '../../types'
import type { BoardState } from '../../hooks/useBoardState'
import { Lane } from './Lane'
import { ActivityPanel } from './ActivityPanel'
import { LaneFlowIndicator } from '../onboarding/LaneFlowIndicator'

interface KanbanBoardProps {
  board: BoardState
  onTaskClick: (task: Task) => void
  onAddTask: () => void
}

export function KanbanBoard({ board, onTaskClick, onAddTask }: KanbanBoardProps) {
  const { grouped, tasks, activity, draggingTaskId, dragOverLane, dragOverTaskId,
    onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
    deleteTask, markTaskDone } = board

  const lanes = ['backlog', 'triaged', 'in_progress', 'testing'] as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--space-3)' }}>
      <LaneFlowIndicator tasks={tasks} />
      <div className="board-wrap" style={{ flex: 1, minHeight: 0 }}>
        <div className="lanes-grid">
          {lanes.map((laneKey) => (
            <Lane
              key={laneKey}
              laneKey={laneKey}
              tasks={grouped[laneKey]}
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
