interface BadgeProps {
  count: number
  max?: number
  variant?: 'default' | 'amber' | 'blue' | 'green' | 'red'
}

export function Badge({ count, max = 99, variant = 'default' }: BadgeProps) {
  if (count <= 0) return null
  const display = count > max ? `${max}+` : String(count)
  return <span className={`badge badge-${variant}`}>{display}</span>
}
