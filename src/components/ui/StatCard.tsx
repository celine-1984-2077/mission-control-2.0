interface StatCardProps {
  value: number | string
  label: string
  color?: 'blue' | 'amber' | 'green' | 'violet' | 'default'
  icon?: React.ReactNode
}

export function StatCard({ value, label, color = 'default', icon }: StatCardProps) {
  return (
    <div className={`stat-card stat-card-${color}`}>
      {icon && <div className="stat-card-icon">{icon}</div>}
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  )
}
