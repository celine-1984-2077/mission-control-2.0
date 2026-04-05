import type { CreateTaskKind, CreateQaPreference, CreateUrlMode } from '../../types'
import type { DocProject } from '../../types/docs'
import type { CreateTaskState } from '../../hooks/useCreateTask'
import type { BoardState } from '../../hooks/useBoardState'
import { Modal } from '../ui/Modal'
import { fileToDataUrl } from '../../hooks/useCreateTask'

interface CreateTaskModalProps {
  open: boolean
  onClose: () => void
  wizard: CreateTaskState
  board: BoardState
  docProjectsMeta: DocProject[]
}

const KINDS: { value: CreateTaskKind; icon: string; label: string; desc: string }[] = [
  { value: 'feature', icon: '✦', label: '新功能', desc: '添加用户期望的全新能力' },
  { value: 'bugfix', icon: '⚠', label: '修复问题', desc: '消灭已知缺陷，恢复正常行为' },
  { value: 'design', icon: '◈', label: '设计调整', desc: '视觉、交互或体验层面的改进' },
  { value: 'docs', icon: '≡', label: '文档编写', desc: '编写或更新说明、指南、注释' },
]

const QA_OPTIONS: { value: CreateQaPreference; icon: string; label: string; desc: string }[] = [
  { value: 'auto', icon: '◎', label: '自动判断', desc: 'AI 根据任务类型决定验收方式' },
  { value: 'browser', icon: '⊡', label: '浏览器测试', desc: '启动真实浏览器进行 UI 验收' },
  { value: 'skip', icon: '⊘', label: '跳过验收', desc: '直接标记完成，不做自动测试' },
]

const URL_OPTIONS: { value: CreateUrlMode; icon: string; label: string; desc: string }[] = [
  { value: 'infer', icon: '◉', label: '自动推断', desc: 'AI 根据任务内容推断目标页面' },
  { value: 'home', icon: '⌂', label: '首页', desc: '使用你在设置中配置的主页地址' },
  { value: 'specific', icon: '⊞', label: '指定 URL', desc: '手动输入一个精确的页面地址' },
  { value: 'none', icon: '◻', label: '无需 URL', desc: '不涉及前端或浏览器的任务' },
]

export function CreateTaskModal({ open, onClose, wizard, board, docProjectsMeta }: CreateTaskModalProps) {
  const {
    step, goal, projectSlug, kind, qaPreference, urlMode, specificUrl, imageFiles, error, draft,
    setStep, setGoal, setProjectSlug, setKind, setQaPreference, setUrlMode, setSpecificUrl,
    setImageFiles, setError, reset, imageInputRef, buildTask,
  } = wizard

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit() {
    const task = buildTask(board.tasks)
    if (!task) return

    if (imageFiles.length > 0) {
      const attachments = await Promise.all(
        imageFiles.map(async (f) => ({
          name: f.name,
          dataUrl: await fileToDataUrl(f),
          mimeType: f.type,
          size: f.size,
        }))
      )
      task.imageAttachments = attachments
    }

    board.addTask(task)
    handleClose()
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setImageFiles([...imageFiles, ...files])
    e.target.value = ''
  }

  const canNext = step === 1 ? goal.trim().length > 0 : true
  const isLastStep = step === 4

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="wizard-header">
        <div className="wizard-steps">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className="wizard-step-dot"
              data-active={step === s}
              data-done={step > s}
            />
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleClose}>✕</button>
      </div>

      <div className="wizard-body">
        {step === 1 && (
          <div className="wizard-step-content">
            <h2 className="wizard-title">你想让我做什么？</h2>
            <p className="wizard-subtitle">用一句话描述你的目标，越具体越好</p>
            <textarea
              className="wizard-textarea"
              placeholder="描述你想要的——例：修复首页按钮点击没反应的问题"
              value={goal}
              onChange={(e) => { setGoal(e.target.value); setError('') }}
              rows={4}
              autoFocus
            />
            {docProjectsMeta.length > 0 && (
              <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                <label className="label-eyebrow">归属项目（可选）</label>
                <select
                  className="form-select"
                  value={projectSlug}
                  onChange={(e) => setProjectSlug(e.target.value)}
                >
                  <option value="">无归属项目</option>
                  {docProjectsMeta.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            {error && <div className="wizard-error">{error}</div>}
          </div>
        )}

        {step === 2 && (
          <div className="wizard-step-content">
            <h2 className="wizard-title">这更像哪种任务？</h2>
            <p className="wizard-subtitle">帮助 AI 理解你的意图，选一个最接近的类型</p>
            <div className="wizard-options">
              {KINDS.map((k) => (
                <button
                  key={k.value}
                  className="wizard-option"
                  data-selected={kind === k.value}
                  onClick={() => setKind(k.value)}
                >
                  <span className="wizard-option-icon">{k.icon}</span>
                  <span className="wizard-option-label">{k.label}</span>
                  <span className="wizard-option-desc">{k.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-step-content">
            <h2 className="wizard-title">要不要在浏览器里检查结果？</h2>
            <p className="wizard-subtitle">AI 完成后，可以打开真实浏览器验收你的任务</p>
            <div className="wizard-options">
              {QA_OPTIONS.map((q) => (
                <button
                  key={q.value}
                  className="wizard-option"
                  data-selected={qaPreference === q.value}
                  onClick={() => setQaPreference(q.value)}
                >
                  <span className="wizard-option-icon">{q.icon}</span>
                  <span className="wizard-option-label">{q.label}</span>
                  <span className="wizard-option-desc">{q.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="wizard-step-content wizard-step-preview">
            <div className="wizard-preview-left">
              <h2 className="wizard-title">浏览器从哪里开始？</h2>
              <p className="wizard-subtitle">选择 AI 打开浏览器时的起始页面</p>
              <div className="wizard-options wizard-options-compact">
                {URL_OPTIONS.map((u) => (
                  <button
                    key={u.value}
                    className="wizard-option wizard-option-sm"
                    data-selected={urlMode === u.value}
                    onClick={() => setUrlMode(u.value)}
                  >
                    <span className="wizard-option-icon">{u.icon}</span>
                    <span className="wizard-option-label">{u.label}</span>
                    <span className="wizard-option-desc">{u.desc}</span>
                  </button>
                ))}
              </div>
              {urlMode === 'specific' && (
                <input
                  className="form-input"
                  style={{ marginTop: 'var(--space-3)' }}
                  placeholder="https://..."
                  value={specificUrl}
                  onChange={(e) => setSpecificUrl(e.target.value)}
                />
              )}
              <div style={{ marginTop: 'var(--space-4)' }}>
                <div className="label-eyebrow" style={{ marginBottom: 'var(--space-2)' }}>参考截图（可选）</div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={imageInputRef}
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => imageInputRef.current?.click()}
                >
                  + 添加图片
                </button>
                {imageFiles.length > 0 && (
                  <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {imageFiles.map((f, i) => (
                      <div key={i} className="wizard-image-thumb">
                        <span>{f.name}</span>
                        <button onClick={() => setImageFiles(imageFiles.filter((_, idx) => idx !== i))}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="wizard-preview-right">
              <div className="label-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>任务预览</div>
              <div className="task-preview">
                <div className="task-preview-id">MC-?</div>
                <div className="task-preview-title">{draft.title || goal.trim() || '—'}</div>
                {draft.objective && (
                  <div className="task-preview-objective">{draft.objective}</div>
                )}
                {draft.acceptanceCriteria && draft.acceptanceCriteria.length > 0 && (
                  <div className="task-preview-criteria">
                    <div className="label-eyebrow" style={{ marginBottom: 'var(--space-1)' }}>验收标准</div>
                    {draft.acceptanceCriteria.map((c, i) => (
                      <div key={i} className="task-preview-criterion">◻ {c}</div>
                    ))}
                  </div>
                )}
                {draft.tags && draft.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginTop: 'var(--space-2)' }}>
                    {draft.tags.map((tag) => (
                      <span key={tag} className="task-tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="wizard-footer">
        {step > 1 ? (
          <button className="btn btn-ghost btn-sm" onClick={() => setStep(step - 1)}>← 上一步</button>
        ) : (
          <div />
        )}
        {isLastStep ? (
          <button className="btn btn-primary btn-md" onClick={handleSubmit}>
            创建任务
          </button>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => canNext ? setStep(step + 1) : setError('先用一句话告诉我你想完成什么。')}
          >
            下一步 →
          </button>
        )}
      </div>
    </Modal>
  )
}
