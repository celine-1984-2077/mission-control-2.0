import { useState } from 'react'
import { useI18n } from '../../contexts/I18nContext'
import { useTheme } from '../../contexts/ThemeContext'
import { FileTree } from './FileTree'
import type { Task } from '../../types/task'
import type { ProjectDoc, DocProject } from '../../types/docs'

interface SidebarProps {
  tasks: Task[]
  docs: ProjectDoc[]
  docProjectsMeta: DocProject[]
  selectedProjectSlug: string | null
  onSelectProject: (slug: string | null) => void
  onSelectTask: (task: Task) => void
  onSelectDoc: (docId: string) => void
  onOpenSettings: () => void
  onCreateProject: () => void
  onDeleteProject: (slug: string) => void
}

export function Sidebar({
  tasks,
  docs,
  docProjectsMeta,
  selectedProjectSlug,
  onSelectProject,
  onSelectTask,
  onSelectDoc,
  onOpenSettings,
  onCreateProject,
  onDeleteProject,
}: SidebarProps) {
  const { t, language, setLanguage } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <aside className="mc-sidebar">
      {/* 品牌标识 */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-text">MISSION</div>
        <div className="sidebar-brand-sub sidebar-label">CONTROL 2.0</div>
      </div>

      {/* 全局搜索 */}
      <div className="sidebar-search-wrap sidebar-label">
        <span className="sidebar-search-icon">🔍</span>
        <input
          className="sidebar-search"
          placeholder={language === 'zh' ? '搜索项目、任务、文档…' : 'Search…'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 文件树区域标题 + 新建项目按钮 */}
      <div className="sidebar-tree-header sidebar-label">
        <span className="sidebar-tree-title">项目目录</span>
        <button
          className="sidebar-tree-add-btn"
          onClick={onCreateProject}
          title="新建项目"
          aria-label="新建项目"
        >
          +
        </button>
      </div>

      {/* 文件树 */}
      <div className="sidebar-tree-wrap sidebar-label">
        <FileTree
          tasks={tasks}
          docs={docs}
          docProjectsMeta={docProjectsMeta}
          selectedProjectSlug={selectedProjectSlug}
          searchQuery={searchQuery}
          onSelectProject={onSelectProject}
          onSelectTask={onSelectTask}
          onSelectDoc={onSelectDoc}
          onDeleteProject={onDeleteProject}
        />
      </div>

      {/* 底部控件 */}
      <div className="sidebar-footer">
        <div className="sidebar-controls">
          {/* 设置 */}
          <button
            className="icon-btn"
            onClick={onOpenSettings}
            title={t('nav.settings')}
            aria-label="Settings"
          >
            ⚙
          </button>

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
          <div className="lang-toggle sidebar-label" role="group" aria-label="Language">
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
