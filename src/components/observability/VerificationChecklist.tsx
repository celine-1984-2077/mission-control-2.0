import type { VerificationState } from '../../types'
import { useI18n } from '../../contexts/I18nContext'

interface VerificationChecklistProps {
  verification: VerificationState
}

const CHECK_LABEL_ZH: Record<string, string> = {
  'Build or type-check the project': '构建/类型检查',
  'Run automated tests where available': '运行自动化测试',
  'Exercise the UI in a browser and capture evidence': '浏览器 UI 验收并截图',
  'Probe regressions and edge cases': '检查回归和边缘情况',
  'Check visual appearance': '检查视觉效果',
  'Verify core functionality': '验证核心功能',
  'Check error handling': '检查错误处理',
}

const STATUS_ZH: Record<string, string> = {
  passed: '通过',
  failed: '失败',
  running: '运行中...',
  skipped: '已跳过',
  pending: '等待',
}

function checkIcon(status: string) {
  if (status === 'passed') return '✓'
  if (status === 'failed') return '✗'
  if (status === 'running') return '●'
  if (status === 'skipped') return '–'
  return '○'
}

export function VerificationChecklist({ verification }: VerificationChecklistProps) {
  const { language } = useI18n()
  const zh = language === 'zh'
  const checks = verification.checks ?? []

  return (
    <div className="verification-list">
      {checks.map((check) => (
        <div key={check.id} className="verification-item">
          <span className="verification-icon" data-status={check.status} aria-label={check.status}>
            {checkIcon(check.status)}
          </span>
          <span className="verification-label" data-status={check.status}>
            {zh ? (CHECK_LABEL_ZH[check.label] ?? check.label) : check.label}
          </span>
          <span className="verification-status-text">
            {zh ? (STATUS_ZH[check.status] ?? check.status) : (check.status === 'pending' ? 'waiting' : check.status === 'running' ? 'running...' : check.status)}
          </span>
        </div>
      ))}
    </div>
  )
}
