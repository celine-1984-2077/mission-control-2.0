import type { DocsState } from '../../hooks/useDocsState'
import { Modal } from '../ui/Modal'

interface CreateProjectModalProps {
  docs: DocsState
}

export function CreateProjectModal({ docs }: CreateProjectModalProps) {
  const {
    showProjectModal, setShowProjectModal,
    newProjectName, setNewProjectName,
    newProjectSlug, setNewProjectSlug,
    newProjectDesc, setNewProjectDesc,
    createProject, creatingProject, actionError,
  } = docs

  function handleClose() {
    setShowProjectModal(false)
    setNewProjectName('')
    setNewProjectSlug('')
    setNewProjectDesc('')
  }

  function autoSlug(v: string) {
    return v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  return (
    <Modal open={showProjectModal} onClose={handleClose}>
      <div className="detail-layout">
        <div className="detail-header">
          <h2 style={{ font: `var(--font-size-lg) / 1 var(--font-display)`, color: 'var(--color-text-primary)' }}>
            创建新项目
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={handleClose}>✕</button>
        </div>

        <div className="detail-body">
          {actionError && (
            <div className="wizard-error" style={{ marginBottom: 'var(--space-3)' }}>{actionError}</div>
          )}

          <div className="form-group">
            <label className="form-label">项目名称</label>
            <input
              className="form-input"
              placeholder="例：前端设计系统"
              value={newProjectName}
              onChange={(e) => {
                setNewProjectName(e.target.value)
                if (!newProjectSlug) setNewProjectSlug(autoSlug(e.target.value))
              }}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">项目标识符</label>
            <input
              className="form-input"
              placeholder="例：frontend-design"
              value={newProjectSlug}
              onChange={(e) => setNewProjectSlug(autoSlug(e.target.value))}
            />
            <div className="form-hint">只能包含小写字母、数字和连字符</div>
          </div>

          <div className="form-group">
            <label className="form-label">描述 <span className="label-optional">（可选）</span></label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="简要描述这个项目的用途..."
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
            />
          </div>
        </div>

        <div className="detail-footer">
          <div />
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn-ghost btn-sm" onClick={handleClose} disabled={creatingProject}>
              取消
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={createProject}
              disabled={creatingProject}
            >
              {creatingProject ? '创建中...' : '创建项目'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
