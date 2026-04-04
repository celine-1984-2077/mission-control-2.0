import type { VerificationState } from '../../types'

interface VerificationChecklistProps {
  verification: VerificationState
}

function checkIcon(status: string) {
  if (status === 'passed') return '✓'
  if (status === 'failed') return '✗'
  if (status === 'running') return '●'
  if (status === 'skipped') return '–'
  return '○'
}

function statusText(status: string) {
  if (status === 'passed') return 'passed'
  if (status === 'failed') return 'failed'
  if (status === 'running') return 'running...'
  if (status === 'skipped') return 'skipped'
  return 'waiting'
}

export function VerificationChecklist({ verification }: VerificationChecklistProps) {
  const checks = verification.checks ?? []

  return (
    <div className="verification-list">
      {checks.map((check) => (
        <div key={check.id} className="verification-item">
          <span className="verification-icon" data-status={check.status} aria-label={check.status}>
            {checkIcon(check.status)}
          </span>
          <span className="verification-label" data-status={check.status}>{check.label}</span>
          <span className="verification-status-text">{statusText(check.status)}</span>
        </div>
      ))}
    </div>
  )
}
