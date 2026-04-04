import { createPortal } from 'react-dom'
import { useCallback, useRef, useState, type ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  delay?: number
}

export function Tooltip({ content, children, delay = 400 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const timerRef = useRef<number | null>(null)
  const rootRef = useRef<HTMLSpanElement>(null)

  const show = useCallback(() => {
    timerRef.current = window.setTimeout(() => {
      if (!rootRef.current) return
      const rect = rootRef.current.getBoundingClientRect()
      setPos({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 6,
      })
      setVisible(true)
    }, delay)
  }, [delay])

  const hide = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setVisible(false)
  }, [])

  return (
    <span
      ref={rootRef}
      className="tooltip-root"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && createPortal(
        <div
          className="tooltip-portal"
          style={{
            left: pos.x,
            top: pos.y,
            transform: 'translateX(-50%)',
          }}
        >
          {content}
        </div>,
        document.body,
      )}
    </span>
  )
}
