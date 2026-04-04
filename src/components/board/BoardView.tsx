import type { Task } from '../../types'
import type { BoardState } from '../../hooks/useBoardState'
import { TopHeader } from '../layout/TopHeader'
import { StatCard } from '../ui/StatCard'
import { Chip } from '../ui/Chip'
import { Tooltip } from '../ui/Tooltip'
import { KanbanBoard } from './KanbanBoard'
import { EmptyBoardGuide } from '../onboarding/EmptyBoardGuide'
import { useI18n } from '../../contexts/I18nContext'

interface BoardViewProps {
  board: BoardState
  onTaskClick: (task: Task) => void
  onAddTask: () => void
}

export function BoardView({ board, onTaskClick, onAddTask }: BoardViewProps) {
  const { t } = useI18n()
  const { tasks, grouped, inProgressCount, countdownSeconds } = board

  const touchedThisWeek = tasks.filter((task) => {
    const d = task.dispatchedAt ?? task.createdAt
    return d && Date.now() - new Date(d).getTime() < 7 * 24 * 60 * 60 * 1000
  }).length

  const waitingReview = grouped.testing.length

  const countdownLabel = countdownSeconds > 0
    ? `${countdownSeconds}s`
    : '—'

  return (
    <div className="board-page">
      {/* 页面头部 */}
      <TopHeader
        title={t('board.title')}
        subtitle={t('board.subtitle')}
        meta={
          <Tooltip content={t('tooltip.countdown')}>
            <Chip variant={inProgressCount > 0 ? 'amber' : 'default'} pulse={inProgressCount > 0} className="countdown-chip">
              ⏱ {countdownLabel}
            </Chip>
          </Tooltip>
        }
        actions={
          <button className="btn btn-primary btn-md" onClick={onAddTask}>
            {t('board.newTask')}
          </button>
        }
      />

      {/* 统计行 */}
      <div className="stats-row">
        <StatCard
          value={touchedThisWeek}
          label={t('board.stats.touchedThisWeek')}
          color="default"
        />
        <StatCard
          value={inProgressCount}
          label={t('board.stats.agentWorking')}
          color="amber"
        />
        <StatCard
          value={tasks.length}
          label={t('board.stats.openTasks')}
          color="blue"
        />
        <StatCard
          value={waitingReview}
          label={t('board.stats.waitingReview')}
          color="violet"
        />
      </div>

      {/* 看板主体 */}
      {tasks.length === 0 ? (
        <EmptyBoardGuide onCreateTask={onAddTask} />
      ) : (
        <KanbanBoard
          board={board}
          onTaskClick={onTaskClick}
          onAddTask={onAddTask}
        />
      )}
    </div>
  )
}
