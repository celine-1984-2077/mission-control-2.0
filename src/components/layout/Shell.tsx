import type { ReactNode } from 'react'

interface ShellProps {
  sidebar: ReactNode
  children: ReactNode
}

export function Shell({ sidebar, children }: ShellProps) {
  return (
    <div className="mc-shell">
      {sidebar}
      <main className="mc-main">
        {children}
      </main>
    </div>
  )
}
