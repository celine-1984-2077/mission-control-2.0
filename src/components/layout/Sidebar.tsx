import { useI18n } from '../../contexts/I18nContext'
import { useTheme } from '../../contexts/ThemeContext'
import type { NavTab } from '../../types'

interface SidebarProps {
  activeNav: NavTab
  onNavChange: (tab: NavTab) => void
}

const NAV_ITEMS: Array<{ key: NavTab; icon: string; labelKey: 'nav.project' | 'nav.docs' | 'nav.settings' }> = [
  { key: 'Project', icon: '⬡', labelKey: 'nav.project' },
  { key: 'Docs',    icon: '≡', labelKey: 'nav.docs' },
  { key: 'Settings', icon: '⚙', labelKey: 'nav.settings' },
]

export function Sidebar({ activeNav, onNavChange }: SidebarProps) {
  const { t, language, setLanguage } = useI18n()
  const { theme, toggleTheme } = useTheme()

  return (
    <aside className="mc-sidebar">
      {/* 品牌标识 */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-text">MISSION</div>
        <div className="sidebar-brand-sub sidebar-label">CONTROL 2.0</div>
      </div>

      {/* 导航 */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`sidebar-nav-item ${activeNav === item.key ? 'active' : ''}`.trim()}
            onClick={() => onNavChange(item.key)}
            title={t(item.labelKey)}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-label">{t(item.labelKey)}</span>
          </button>
        ))}
      </nav>

      {/* 底部控件：主题 + 语言 */}
      <div className="sidebar-footer">
        <div className="sidebar-controls">
          {/* 主题切换 */}
          <button
            className="icon-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? t('settings.theme.light') : t('settings.theme.dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀' : '◑'}
          </button>

          {/* 语言切换 */}
          <div className="lang-toggle" role="group" aria-label="Language">
            <button
              className={`lang-toggle-btn ${language === 'en' ? 'active' : ''}`.trim()}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
            <button
              className={`lang-toggle-btn ${language === 'zh' ? 'active' : ''}`.trim()}
              onClick={() => setLanguage('zh')}
            >
              中
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
