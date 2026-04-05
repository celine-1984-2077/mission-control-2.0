import type { Activity } from '../types'

export function formatActivityTime(item: Activity) {
  const raw = item.createdAt ?? item.time
  const parsed = raw ? new Date(raw) : null
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return { primary: item.time || 'Unknown time', secondary: '' }
  }

  const primary = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
  const secondary = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)

  return { primary, secondary }
}

export function extractTaskIdFromText(...parts: Array<string | undefined>) {
  const text = parts.filter(Boolean).join(' ')
  const match = text.match(/\bMC-\d+\b/i)
  return match ? match[0].toUpperCase() : null
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  return `${diffDay}d ago`
}
