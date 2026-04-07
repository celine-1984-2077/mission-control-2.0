import type { PlanItem } from '../../types'
import { statusGlyph } from '../../lib/taskUtils'
import { Tooltip } from '../ui/Tooltip'
import { useI18n } from '../../contexts/I18nContext'

interface PlanItemRowProps {
  item: PlanItem
  onAbort?: (id: string) => void
}

const PLAN_TITLE_ZH: Record<string, string> = {
  'Clarify the task with the user': '与用户确认任务',
  'Implement the requested work': '执行实现',
  'Run verification and browser QA': '运行验收和浏览器测试',
  'Clarify and structure the task': '澄清并整理任务',
  'Execute implementation': '执行实现',
  'Run tests': '运行测试',
  'Run browser QA': '运行浏览器验收',
  'Write tests': '编写测试',
  'Review and refine': '检查和完善',
}

const PLAN_DETAIL_ZH: Record<string, string> = {
  'Waiting for required user answers before dispatch.': '等待用户回答必填问题后才能派发。',
  'Pending': '等待中',
  'In progress': '进行中',
  'Done': '已完成',
  'Failed': '已失败',
}

const STATUS_TOOLTIP_KEYS: Record<string, 'tooltip.planPending' | 'tooltip.planRunning' | 'tooltip.planDone' | 'tooltip.planFailed' | 'tooltip.planAborted'> = {
  pending: 'tooltip.planPending',
  running: 'tooltip.planRunning',
  done: 'tooltip.planDone',
  failed: 'tooltip.planFailed',
  aborted: 'tooltip.planAborted',
}

export function PlanItemRow({ item, onAbort }: PlanItemRowProps) {
  const { t, language } = useI18n()
  const zh = language === 'zh'
  const tooltipKey = STATUS_TOOLTIP_KEYS[item.status] ?? 'tooltip.planPending'
  const title = zh ? (PLAN_TITLE_ZH[item.title] ?? item.title) : item.title
  const detail = zh && item.details ? (PLAN_DETAIL_ZH[item.details] ?? item.details) : item.details

  return (
    <div className="plan-item-row" data-status={item.status}>
      <Tooltip content={t(tooltipKey)}>
        <span className="plan-item-icon" data-status={item.status} aria-label={item.status}>
          {statusGlyph(item.status)}
        </span>
      </Tooltip>
      <div className="plan-item-content">
        <div className="plan-item-title" data-status={item.status}>{title}</div>
        {detail && <div className="plan-item-detail">{detail}</div>}
      </div>
      {item.userAbortable && item.status === 'running' && onAbort && (
        <button
          className="plan-item-abort"
          onClick={() => onAbort(item.id)}
          aria-label={t('common.stop')}
        >
          {t('common.stop')}
        </button>
      )}
    </div>
  )
}
