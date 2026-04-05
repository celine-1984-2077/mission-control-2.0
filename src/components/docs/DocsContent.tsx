import type { DocsState } from '../../hooks/useDocsState'
interface DocsContentProps {
  docs: DocsState
}

export function DocsContent({ docs }: DocsContentProps) {
  const {
    selectedDoc, isDocEditable, creatingDoc,
    docDraftTitle, setDocDraftTitle,
    docDraftTags, setDocDraftTags,
    docDraftContent, setDocDraftContent,
    docDraftProjectSlug, setDocDraftProjectSlug,
    authoredProjects,
    saveDocDraft, actionError, actionOk,
  } = docs

  if (creatingDoc || (selectedDoc && isDocEditable)) {
    return (
      <div className="docs-editor">
        <div className="docs-editor-header">
          <input
            className="docs-title-input"
            placeholder="文档标题"
            value={docDraftTitle}
            onChange={(e) => setDocDraftTitle(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {actionError && <span className="wizard-error" style={{ fontSize: 'var(--font-size-sm)' }}>{actionError}</span>}
            {actionOk && <span style={{ color: 'var(--color-green-400)', fontSize: 'var(--font-size-sm)' }}>{actionOk}</span>}
            <button className="btn btn-primary btn-sm" onClick={saveDocDraft}>保存</button>
          </div>
        </div>

        <div className="docs-editor-meta">
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-3)' }}>
            <label className="form-label" style={{ whiteSpace: 'nowrap', marginBottom: 0 }}>项目</label>
            <select
              className="form-select"
              value={docDraftProjectSlug}
              onChange={(e) => setDocDraftProjectSlug(e.target.value)}
            >
              {authoredProjects.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-3)', flex: 1 }}>
            <label className="form-label" style={{ whiteSpace: 'nowrap', marginBottom: 0 }}>标签</label>
            <input
              className="form-input"
              placeholder="逗号分隔，例：api, guide"
              value={docDraftTags}
              onChange={(e) => setDocDraftTags(e.target.value)}
            />
          </div>
        </div>

        <textarea
          className="docs-editor-textarea"
          placeholder="开始写作... 支持 Markdown 格式"
          value={docDraftContent}
          onChange={(e) => setDocDraftContent(e.target.value)}
        />
      </div>
    )
  }

  if (!selectedDoc) {
    return (
      <div className="docs-empty">
        <div className="empty-state">
          <div className="empty-state-title">暂无文档</div>
          <div className="empty-state-desc">从左侧列表选择文档，或新建一份</div>
        </div>
      </div>
    )
  }

  return (
    <div className="docs-viewer">
      <div className="docs-viewer-header">
        <div>
          <h1 className="docs-viewer-title">{selectedDoc.title}</h1>
          <div className="docs-viewer-meta">
            <span className="label-eyebrow">{selectedDoc.project}</span>
            {selectedDoc.tags.map((tag) => (
              <span key={tag} className="task-tag">{tag}</span>
            ))}
          </div>
        </div>
        {selectedDoc.readOnly && (
          <span className="chip">只读</span>
        )}
      </div>
      <div className="docs-viewer-body">
        <pre className="docs-viewer-content">{selectedDoc.content}</pre>
      </div>
    </div>
  )
}
