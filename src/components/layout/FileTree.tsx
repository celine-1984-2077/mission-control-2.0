import { useState } from 'react'
import type { Task } from '../../types/task'
import type { ProjectDoc, DocProject } from '../../types/docs'
import { useI18n } from '../../contexts/I18nContext'

interface FileTreeProps {
  tasks: Task[]
  docs: ProjectDoc[]
  docProjectsMeta: DocProject[]
  selectedProjectSlug: string | null
  searchQuery: string
  onSelectProject: (slug: string | null) => void
  onSelectTask: (task: Task) => void
  onSelectDoc: (docId: string) => void
  onDeleteProject: (slug: string) => void
}

const LANE_DOT_COLOR: Record<string, string> = {
  backlog:     'var(--color-text-muted)',
  triaged:     'var(--color-blue-400)',
  in_progress: 'var(--color-amber-500)',
  testing:     'var(--color-green-400)',
}

function getTaskKindChip(task: Task): { label: string; color: string } {
  const tags = task.tags ?? []
  if (tags.includes('qa-fix') || task.title.startsWith('[QA Fix]'))
    return { label: 'QA',   color: 'var(--color-amber-500)' }
  if (tags.includes('bugfix'))
    return { label: 'Fix',  color: 'var(--color-red-400)' }
  if (tags.includes('design'))
    return { label: 'UI',   color: 'var(--color-violet-400, #a78bfa)' }
  if (tags.includes('docs'))
    return { label: 'Doc',  color: 'var(--color-cyan-400)' }
  if (tags.includes('feature'))
    return { label: 'Feat', color: 'var(--color-blue-400)' }
  return { label: 'Task', color: 'var(--color-text-muted)' }
}

function TaskItem({ task, onSelectTask }: { task: Task; onSelectTask: (t: Task) => void }) {
  const chip = getTaskKindChip(task)
  return (
    <button className="file-tree-item" data-lane={task.lane} onClick={() => onSelectTask(task)}>
      <span className="file-tree-lane-dot"
        style={{ background: LANE_DOT_COLOR[task.lane] ?? 'var(--color-text-muted)' }} />
      <span className="file-tree-item-name">{task.title}</span>
      <span className="file-tree-kind-chip" style={{ color: chip.color, borderColor: chip.color }}>
        {chip.label}
      </span>
    </button>
  )
}

function DocItem({ doc, onSelectDoc }: { doc: ProjectDoc; onSelectDoc: (id: string) => void }) {
  return (
    <button className="file-tree-item" onClick={() => onSelectDoc(doc.id)}>
      <span className="file-tree-doc-icon">≡</span>
      <span className="file-tree-item-name">{doc.title}</span>
      <span className="file-tree-kind-chip"
        style={{ color: 'var(--color-cyan-400)', borderColor: 'var(--color-cyan-400)' }}>
        Doc
      </span>
    </button>
  )
}

export function FileTree({
  tasks, docs, docProjectsMeta,
  selectedProjectSlug, searchQuery,
  onSelectProject, onSelectTask, onSelectDoc, onDeleteProject,
}: FileTreeProps) {
  const { t } = useI18n()
  const [rootExpanded, setRootExpanded] = useState(true)
  const [expandedSlugs, setExpandedSlugs] = useState<Set<string>>(new Set())
  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null)

  // 行点击 = 展开/收起 + 同时选中项目
  function handleFolderClick(slug: string) {
    setExpandedSlugs((prev) => {
      const next = new Set(prev)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return next
    })
    onSelectProject(slug)
  }

  function handleDeleteClick(slug: string, e: React.MouseEvent) {
    e.stopPropagation()
    setConfirmDeleteSlug(slug)
  }

  function handleConfirmDelete(slug: string, e: React.MouseEvent) {
    e.stopPropagation()
    onDeleteProject(slug)
    setConfirmDeleteSlug(null)
    if (selectedProjectSlug === slug) onSelectProject(null)
  }

  function handleCancelDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirmDeleteSlug(null)
  }

  const query = searchQuery.trim().toLowerCase()

  // ── 搜索模式 ────────────────────────────────────────────────
  if (query) {
    const matchedTasks    = tasks.filter((t) => t.title.toLowerCase().includes(query) || t.id.toLowerCase().includes(query))
    const matchedDocs     = docs.filter((d) => d.title.toLowerCase().includes(query) || d.project.toLowerCase().includes(query))
    const matchedProjects = docProjectsMeta.filter((p) => p.name.toLowerCase().includes(query))

    return (
      <div className="file-tree">
        {matchedProjects.length > 0 && (
          <>
            <div className="file-tree-section-label">项目</div>
            {matchedProjects.map((p) => (
              <button key={p.slug} className="file-tree-item"
                data-selected={selectedProjectSlug === p.slug}
                onClick={() => handleFolderClick(p.slug)}>
                <span className="file-tree-item-icon">📁</span>
                <span className="file-tree-item-name">{p.name}</span>
              </button>
            ))}
          </>
        )}
        {matchedTasks.length > 0 && (
          <>
            <div className="file-tree-section-label">任务</div>
            {matchedTasks.map((task) => <TaskItem key={task.id} task={task} onSelectTask={onSelectTask} />)}
          </>
        )}
        {matchedDocs.length > 0 && (
          <>
            <div className="file-tree-section-label">文档</div>
            {matchedDocs.map((doc) => <DocItem key={doc.id} doc={doc} onSelectDoc={onSelectDoc} />)}
          </>
        )}
        {matchedTasks.length === 0 && matchedDocs.length === 0 && matchedProjects.length === 0 && (
          <div className="file-tree-empty">无结果</div>
        )}
      </div>
    )
  }

  // ── 正常树模式 ──────────────────────────────────────────────
  const unassignedTasks = tasks.filter((t) => !t.projectSlug)

  return (
    <div className="file-tree">
      {/* 顶层"项目"行：点击展开/收起所有项目文件夹 */}
      <button
        className="file-tree-folder-row"
        data-selected={selectedProjectSlug === null}
        onClick={() => { setRootExpanded((v) => !v); onSelectProject(null) }}
        title="显示全部任务"
      >
        <span className="file-tree-chevron" data-expanded={rootExpanded}>›</span>
        <span className="file-tree-folder-icon">⬡</span>
        <span className="file-tree-folder-name">{t('nav.project')}</span>
        <span className="file-tree-badge">{tasks.length}</span>
      </button>

      {/* 项目文件夹列表（受 rootExpanded 控制）*/}
      {rootExpanded && docProjectsMeta.map((project) => {
        const projectTasks = tasks.filter((t) => t.projectSlug === project.slug)
        const projectDocs  = docs.filter((d) => d.projectSlug === project.slug)
        const isSelected   = selectedProjectSlug === project.slug
        const isExpanded   = expandedSlugs.has(project.slug)
        const total        = projectTasks.length + projectDocs.length
        const isConfirming = confirmDeleteSlug === project.slug

        return (
          <div key={project.slug} className="file-tree-folder">
            {/* 删除确认条 */}
            {isConfirming && (
              <div className="file-tree-delete-confirm">
                <span className="file-tree-delete-confirm-text">删除「{project.name}」？</span>
                <button className="file-tree-delete-yes" onClick={(e) => handleConfirmDelete(project.slug, e)}>删除</button>
                <button className="file-tree-delete-no"  onClick={handleCancelDelete}>取消</button>
              </div>
            )}

            {/* 文件夹行：点击整行 = 展开/收起 + 选中 */}
            <button
              className="file-tree-folder-row"
              data-selected={isSelected}
              onClick={() => handleFolderClick(project.slug)}
            >
              <span className="file-tree-chevron" data-expanded={isExpanded}>›</span>
              <span className="file-tree-folder-icon">📁</span>
              <span className="file-tree-folder-name">{project.name}</span>
              {total > 0 && <span className="file-tree-badge">{total}</span>}
              {/* hover 删除按钮 */}
              <span
                className="file-tree-delete-btn"
                role="button"
                title={`删除项目 ${project.name}`}
                onClick={(e) => handleDeleteClick(project.slug, e)}
              >
                ×
              </span>
            </button>

            {isExpanded && (
              <div className="file-tree-children">
                {projectTasks.length > 0 && (
                  <>
                    <div className="file-tree-section-label">任务</div>
                    {projectTasks.map((task) => <TaskItem key={task.id} task={task} onSelectTask={onSelectTask} />)}
                  </>
                )}
                {projectDocs.length > 0 && (
                  <>
                    <div className="file-tree-section-label">文档</div>
                    {projectDocs.map((doc) => <DocItem key={doc.id} doc={doc} onSelectDoc={onSelectDoc} />)}
                  </>
                )}
                {total === 0 && <div className="file-tree-empty">此项目下暂无内容</div>}
              </div>
            )}
          </div>
        )
      })}

      {/* 未分类任务 */}
      {unassignedTasks.length > 0 && (
        <div className="file-tree-folder">
          <div className="file-tree-divider" />
          <div className="file-tree-section-label" style={{ paddingTop: 'var(--space-1)' }}>
            未分类任务
          </div>
          {unassignedTasks.map((task) => <TaskItem key={task.id} task={task} onSelectTask={onSelectTask} />)}
        </div>
      )}
    </div>
  )
}
