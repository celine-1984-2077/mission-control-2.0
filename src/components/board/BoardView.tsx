import type { Task } from '../../types'
import type { BoardState } from '../../hooks/useBoardState'
import type { ColumnKey } from '../../types'
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
  selectedProjectSlug?: string | null
}

export function BoardView({ board, onTaskClick, onAddTask, selectedProjectSlug }: BoardViewProps) {
  const { t } = useI18n()
  const { tasks, inProgressCount, countdownSeconds } = board

  // 过滤当前项目的任务（仅显示层，不影响 board state）
  const visibleTasks = selectedProjectSlug
    ? tasks.filter((t) => t.projectSlug === selectedProjectSlug)
    : tasks

  // 按泳道分组过滤后的任务
  const filteredGrouped: Record<ColumnKey, Task[]> = {
    backlog:     visibleTasks.filter((t) => t.lane === 'backlog'),
    triaged:     visibleTasks.filter((t) => t.lane === 'triaged'),
    in_progress: visibleTasks.filter((t) => t.lane === 'in_progress'),
    testing:     visibleTasks.filter((t) => t.lane === 'testing'),
  }

  const touchedThisWeek = visibleTasks.filter((task) => {
    const d = task.dispatchedAt ?? task.createdAt
    return d && Date.now() - new Date(d).getTime() < 7 * 24 * 60 * 60 * 1000
  }).length

  const waitingReview = filteredGrouped.testing.length

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
          value={visibleTasks.length}
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
      {visibleTasks.length === 0 ? (
        <EmptyBoardGuide onCreateTask={onAddTask} />
      ) : (
        <KanbanBoard
          board={board}
          filteredGrouped={filteredGrouped}
          onTaskClick={onTaskClick}
          onAddTask={onAddTask}
        />
      )}
    </div>
  )
}
