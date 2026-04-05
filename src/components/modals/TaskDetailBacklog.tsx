import { useState } from 'react'
import type { Task } from '../../types'
import type { TaskDetailState } from '../../hooks/useTaskDetail'
import type { BoardState } from '../../hooks/useBoardState'

interface TaskDetailBacklogProps {
  task: Task
  detail: TaskDetailState
  board: BoardState
  onClose: () => void
}

export function TaskDetailBacklog({ task, detail, board, onClose }: TaskDetailBacklogProps) {
  const { detailDraft, setDetailDraft, detailImageFiles, setDetailImageFiles,
    detailError, setDetailError, detailImageInputRef } = detail
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleSave() {
    if (!detailDraft.title.trim()) {
      setDetailError('任务标题不能为空')
      return
    }
    board.updateTask(task.id, {
      title: detailDraft.title.trim(),
      objective: detailDraft.objective.trim(),
      targetUrl: detailDraft.targetUrl.trim() || undefined,
      acceptanceCriteria: detailDraft.acceptance
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    })
    onClose()
  }

  function handleDelete() {
    board.deleteTask(task.id)
    onClose()
  }

  function handleDispatch() {
    board.updateTask(task.id, { lane: 'triaged' })
    onClose()
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setDetailImageFiles([...detailImageFiles, ...files])
    e.target.value = ''
  }

  return (
    <div className="detail-layout">
      <div className="detail-header">
        <div>
          <div className="task-id" style={{ marginBottom: 'var(--space-1)' }}>{task.id}</div>
          <div className="detail-lane-badge" data-lane={task.lane}>积压</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      <div className="detail-body">
        {detailError && (
          <div className="wizard-error" style={{ marginBottom: 'var(--space-3)' }}>{detailError}</div>
        )}

        <div className="form-group">
          <label className="form-label">任务标题</label>
          <input
            className="form-input"
            value={detailDraft.title}
            onChange={(e) => { setDetailDraft({ ...detailDraft, title: e.target.value }); setDetailError('') }}
            placeholder="任务标题"
          />
        </div>

        <div className="form-group">
          <label className="form-label">目标描述</label>
          <textarea
            className="form-textarea"
            rows={4}
            value={detailDraft.objective}
            onChange={(e) => setDetailDraft({ ...detailDraft, objective: e.target.value })}
            placeholder="详细描述你想要 AI 完成的目标..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">目标 URL <span className="label-optional">（可选）</span></label>
          <input
            className="form-input"
            value={detailDraft.targetUrl}
            onChange={(e) => setDetailDraft({ ...detailDraft, targetUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">验收标准</label>
          <textarea
            className="form-textarea"
            rows={4}
            value={detailDraft.acceptance}
            onChange={(e) => setDetailDraft({ ...detailDraft, acceptance: e.target.value })}
            placeholder="每行一条验收标准，AI 完成后会逐项检查..."
          />
          <div className="form-hint">每行一条</div>
        </div>

        <div className="form-group">
          <label className="form-label">参考图片 <span className="label-optional">（可选）</span></label>
          <input
            type="file"
            accept="image/*"
            multiple
            ref={detailImageInputRef}
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => detailImageInputRef.current?.click()}
          >
            + 添加图片
          </button>
          {(task.imageAttachments ?? []).length > 0 && (
            <div className="detail-images">
              {(task.imageAttachments ?? []).map((img, i) => (
                <div key={i} className="detail-image-thumb">
                  <img src={img.dataUrl} alt={img.name} />
                  <span>{img.name}</span>
                </div>
              ))}
            </div>
          )}
          {detailImageFiles.length > 0 && (
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {detailImageFiles.map((f, i) => (
                <div key={i} className="wizard-image-thumb">
                  <span>{f.name}</span>
                  <button onClick={() => setDetailImageFiles(detailImageFiles.filter((_, idx) => idx !== i))}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 删除二次确认条 */}
      {confirmDelete && (
        <div className="delete-confirm-bar">
          <span className="delete-confirm-text">⚠ 确认删除任务 {task.id}？此操作不可恢复。</span>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>取消</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>确认删除</button>
          </div>
        </div>
      )}

      <div className="detail-footer">
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setConfirmDelete(true)}
          >
            删除
          </button>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>取消</button>
          <button className="btn btn-ghost btn-sm" onClick={handleSave}>保存</button>
          <button className="btn btn-primary btn-sm" onClick={handleDispatch}>派发给 AI →</button>
        </div>
      </div>
    </div>
  )
}
