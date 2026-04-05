import type { ReactNode } from 'react'

interface SettingsSectionProps {
  title: string
  description: string
  children: ReactNode
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="settings-section">
      <div className="settings-section-meta">
        <div className="settings-section-title">{title}</div>
        <div className="settings-section-desc">{description}</div>
      </div>
      <div className="settings-section-control">
        {children}
      </div>
    </div>
  )
}
