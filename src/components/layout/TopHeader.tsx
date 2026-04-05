import type { ReactNode } from 'react'

interface TopHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  meta?: ReactNode
}

export function TopHeader({ title, subtitle, actions, meta }: TopHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
        {meta && <div style={{ marginTop: '6px' }}>{meta}</div>}
      </div>
      {actions && <div className="page-header-right">{actions}</div>}
    </div>
  )
}
