import type { PlanItem } from '../../types'
import { statusGlyph } from '../../lib/taskUtils'
import { Tooltip } from '../ui/Tooltip'
import { useI18n } from '../../contexts/I18nContext'

interface PlanItemRowProps {
  item: PlanItem
  onAbort?: (id: string) => void
}

const STATUS_TOOLTIP_KEYS: Record<string, 'tooltip.planPending' | 'tooltip.planRunning' | 'tooltip.planDone' | 'tooltip.planFailed' | 'tooltip.planAborted'> = {
  pending: 'tooltip.planPending',
  running: 'tooltip.planRunning',
  done: 'tooltip.planDone',
  failed: 'tooltip.planFailed',
  aborted: 'tooltip.planAborted',
}

export function PlanItemRow({ item, onAbort }: PlanItemRowProps) {
  const { t } = useI18n()
  const tooltipKey = STATUS_TOOLTIP_KEYS[item.status] ?? 'tooltip.planPending'

  return (
    <div className="plan-item-row" data-status={item.status}>
      <Tooltip content={t(tooltipKey)}>
        <span className="plan-item-icon" data-status={item.status} aria-label={item.status}>
          {statusGlyph(item.status)}
        </span>
      </Tooltip>
      <div className="plan-item-content">
        <div className="plan-item-title" data-status={item.status}>{item.title}</div>
        {item.details && <div className="plan-item-detail">{item.details}</div>}
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
