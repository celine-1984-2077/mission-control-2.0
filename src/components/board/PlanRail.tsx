import type { PlanItem } from '../../types'

interface PlanRailProps {
  planItems: PlanItem[]
}

export function PlanRail({ planItems }: PlanRailProps) {
  if (!planItems.length) return null

  return (
    <div className="plan-rail" aria-label="Plan progress">
      {planItems.map((item, i) => (
        <span key={item.id} style={{ display: 'contents' }}>
          <span
            className="plan-rail-dot"
            data-status={item.status}
            title={item.title}
            aria-label={`${item.title}: ${item.status}`}
          />
          {i < planItems.length - 1 && (
            <span className="plan-rail-line" />
          )}
        </span>
      ))}
    </div>
  )
}
