import type { ReactNode } from 'react'

interface ChipProps {
  children: ReactNode
  variant?: 'default' | 'amber' | 'blue' | 'green' | 'red' | 'violet' | 'cyan'
  pulse?: boolean
  className?: string
  onClick?: () => void
}

export function Chip({ children, variant = 'default', pulse = false, className = '', onClick }: ChipProps) {
  return (
    <span
      className={`chip chip-${variant} ${pulse ? 'chip-pulse' : ''} ${className}`.trim()}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </span>
  )
}
