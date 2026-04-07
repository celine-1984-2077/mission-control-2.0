import { useEffect, useRef } from 'react'
import type { SessionLogMessage } from '../../types'

interface SessionTranscriptProps {
  title: string
  messages: SessionLogMessage[]
  isLive?: boolean
}

export function SessionTranscript({ title, messages, isLive = false }: SessionTranscriptProps) {
  const bodyRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (bodyRef.current && isLive) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [messages, isLive])

  if (!messages.length) return null

  return (
    <div className="session-transcript">
      <div className="session-transcript-header">
        <span className="session-transcript-title">{title}</span>
        <span className="task-card-id">{messages.length} msgs</span>
      </div>
      <div className="session-transcript-body" ref={bodyRef}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className="session-message"
            data-role={msg.role}
          >
            <span className="session-message-role">{msg.role}</span>
            <span className="session-message-text">{msg.text}</span>
          </div>
        ))}
        {isLive && (
          <div className="session-message" data-role="assistant">
            <span className="session-cursor" aria-hidden />
          </div>
        )}
      </div>
    </div>
  )
}
