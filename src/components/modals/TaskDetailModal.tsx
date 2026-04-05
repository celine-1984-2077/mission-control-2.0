import type { BoardState } from '../../hooks/useBoardState'
import type { TaskDetailState } from '../../hooks/useTaskDetail'
import { Modal } from '../ui/Modal'
import { TaskDetailBacklog } from './TaskDetailBacklog'
import { TaskDetailActive } from './TaskDetailActive'

interface TaskDetailModalProps {
  detail: TaskDetailState
  board: BoardState
}

export function TaskDetailModal({ detail, board }: TaskDetailModalProps) {
  const { selectedTask, closeTaskDetail, shouldIgnoreModalBackdropClose, markModalDragEvent } = detail

  function handleClose() {
    if (shouldIgnoreModalBackdropClose()) return
    closeTaskDetail()
  }

  return (
    <Modal
      open={selectedTask !== null}
      onClose={handleClose}
      wide
      noBackdropClose
    >
      {selectedTask && (
        <div
          onDragStart={markModalDragEvent}
          onDragEnd={markModalDragEvent}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
        >
          {selectedTask.lane === 'backlog' ? (
            <TaskDetailBacklog
              task={selectedTask}
              detail={detail}
              board={board}
              onClose={closeTaskDetail}
            />
          ) : (
            <TaskDetailActive
              task={selectedTask}
              detail={detail}
              board={board}
              onClose={closeTaskDetail}
            />
          )}
        </div>
      )}
    </Modal>
  )
}
