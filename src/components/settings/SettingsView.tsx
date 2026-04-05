import { useEffect } from 'react'
import type { SettingsState } from '../../hooks/useSettingsState'
import { TopHeader } from '../layout/TopHeader'
import { SettingsSection } from './SettingsSection'
import { useTheme } from '../../contexts/ThemeContext'
import { useI18n } from '../../contexts/I18nContext'
import { BRIDGE_BASE_URL } from '../../lib/constants'

interface SettingsViewProps {
  settings: SettingsState
}

export function SettingsView({ settings }: SettingsViewProps) {
  const { t } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage } = useI18n()
  const { draft, setDraft, loading, saving, error, ok, load, save } = settings

  useEffect(() => {
    void load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="settings-page">
      <TopHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
      />

      <div className="settings-body">
        <SettingsSection
          title={t('settings.notifications')}
          description="粘贴一个 Discord webhook，Mission Control 会在任务状态变化时自动推送消息。留空则不推送通知。"
        >
          <div className="form-group">
            <label className="form-label">Discord Webhook URL</label>
            <input
              className="form-input"
              placeholder="https://discord.com/api/webhooks/..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && <div className="wizard-error" style={{ marginBottom: 'var(--space-2)' }}>{error}</div>}
          {ok && <div style={{ color: 'var(--color-green-400)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-2)' }}>{ok}</div>}
          <button
            className="btn btn-primary btn-sm"
            onClick={save}
            disabled={saving || loading}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </SettingsSection>

        <div className="settings-divider" />

        <SettingsSection
          title={t('settings.system')}
          description="Mission Control Bridge 是本地运行的 Node.js 服务器，连接界面与 AI Agent。必须保持运行，任务派发才能正常工作。"
        >
          <div className="settings-info-grid">
            <div className="settings-info-row">
              <span className="settings-info-label">Bridge 地址</span>
              <code className="task-id" style={{ fontSize: 'var(--font-size-xs)' }}>{BRIDGE_BASE_URL}</code>
            </div>
            <div className="settings-info-row">
              <span className="settings-info-label">配置来源</span>
              <span className="chip">{settings.settings.source}</span>
            </div>
          </div>
        </SettingsSection>

        <div className="settings-divider" />

        <SettingsSection
          title={t('settings.appearance')}
          description="外观偏好仅存储在你的浏览器本地，不会影响其他用户。"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">主题</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  className={`btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => theme !== 'dark' && toggleTheme()}
                >
                  ◑ 暗色
                </button>
                <button
                  className={`btn btn-sm ${theme === 'light' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => theme !== 'light' && toggleTheme()}
                >
                  ☀ 亮色
                </button>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">语言</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  className={`btn btn-sm ${language === 'zh' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setLanguage('zh')}
                >
                  中文
                </button>
                <button
                  className={`btn btn-sm ${language === 'en' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setLanguage('en')}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        </SettingsSection>

        <div className="settings-divider" />

        <SettingsSection
          title={t('settings.about')}
          description="Mission Control 2.0 — 本地 AI 任务调度系统"
        >
          <div className="settings-info-grid">
            <div className="settings-info-row">
              <span className="settings-info-label">版本</span>
              <span className="task-id">2.0.0</span>
            </div>
            <div className="settings-info-row">
              <span className="settings-info-label">Bridge URL</span>
              <code className="task-id" style={{ fontSize: 'var(--font-size-xs)' }}>{BRIDGE_BASE_URL}</code>
            </div>
            <div className="settings-info-row">
              <span className="settings-info-label">状态文件</span>
              <code className="task-id" style={{ fontSize: 'var(--font-size-xs)' }}>automation/board-state.json</code>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}
