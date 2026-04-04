import type { DocsState } from '../../hooks/useDocsState'
import { useI18n } from '../../contexts/I18nContext'

interface DocsSidebarProps {
  docs: DocsState
}

export function DocsSidebar({ docs }: DocsSidebarProps) {
  const { t } = useI18n()
  const {
    docProject, setDocProject, docTag, setDocTag, docSearch, setDocSearch,
    docProjects, docTags, visibleDocList, selectedDocId, setSelectedDocId,
    selectedDoc, startCreateDoc, setShowProjectModal,
  } = docs

  const authored = visibleDocList.filter((d) => d.source === 'authored')
  const imported = visibleDocList.filter((d) => d.source !== 'authored')

  return (
    <div className="docs-sidebar">
      <div className="docs-sidebar-top">
        <input
          className="form-input"
          style={{ marginBottom: 'var(--space-3)' }}
          placeholder={t('docs.search')}
          value={docSearch}
          onChange={(e) => setDocSearch(e.target.value)}
        />

        <div className="form-group" style={{ marginBottom: 'var(--space-2)' }}>
          <select
            className="form-select"
            value={docProject}
            onChange={(e) => setDocProject(e.target.value)}
          >
            <option value="all">全部项目</option>
            {docProjects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <select
            className="form-select"
            value={docTag}
            onChange={(e) => setDocTag(e.target.value)}
          >
            <option value="all">全部标签</option>
            {docTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="docs-sidebar-actions">
        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={startCreateDoc}>
          + 新建文档
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowProjectModal(true)}>
          + 项目
        </button>
      </div>

      <div className="docs-list">
        {authored.length > 0 && (
          <div className="docs-group">
            <div className="docs-group-label label-eyebrow">我的文档</div>
            {authored.map((doc) => (
              <button
                key={doc.id}
                className="docs-list-item"
                data-active={doc.id === (selectedDoc?.id ?? selectedDocId)}
                onClick={() => setSelectedDocId(doc.id)}
              >
                <div className="docs-list-title">{doc.title}</div>
                <div className="docs-list-meta">{doc.project}</div>
              </button>
            ))}
          </div>
        )}

        {imported.length > 0 && (
          <div className="docs-group">
            <div className="docs-group-label label-eyebrow">导入的文档</div>
            {imported.map((doc) => (
              <button
                key={doc.id}
                className="docs-list-item"
                data-active={doc.id === (selectedDoc?.id ?? selectedDocId)}
                onClick={() => setSelectedDocId(doc.id)}
              >
                <div className="docs-list-title">{doc.title}</div>
                <div className="docs-list-meta">{doc.project}</div>
              </button>
            ))}
          </div>
        )}

        {visibleDocList.length === 0 && (
          <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
            <div className="empty-state-title">暂无文档</div>
          </div>
        )}
      </div>
    </div>
  )
}
