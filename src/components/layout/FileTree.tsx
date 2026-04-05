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
}

const LANE_DOT_COLOR: Record<string, string> = {
  backlog:     'var(--color-text-muted)',
  triaged:     'var(--color-blue-400)',
  in_progress: 'var(--color-amber-500)',
  testing:     'var(--color-green-400)',
}

export function FileTree({
  tasks,
  docs,
  docProjectsMeta,
  selectedProjectSlug,
  searchQuery,
  onSelectProject,
  onSelectTask,
  onSelectDoc,
}: FileTreeProps) {
  const { t } = useI18n()
  const [expandedSlugs, setExpandedSlugs] = useState<Set<string>>(new Set())

  function toggleExpand(slug: string, e: React.MouseEvent) {
    e.stopPropagation()
    setExpandedSlugs((prev) => {
      const next = new Set(prev)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return next
    })
  }

  function handleSelectProject(slug: string | null) {
    if (slug) {
      // Auto-expand when selecting a project
      setExpandedSlugs((prev) => new Set([...prev, slug]))
    }
    onSelectProject(slug)
  }

  const query = searchQuery.trim().toLowerCase()

  // ── Search mode ────────────────────────────────────────────
  if (query) {
    const matchedTasks = tasks.filter(
      (t) => t.title.toLowerCase().includes(query) || t.id.toLowerCase().includes(query)
    )
    const matchedDocs = docs.filter(
      (d) => d.title.toLowerCase().includes(query) || d.project.toLowerCase().includes(query)
    )
    const matchedProjects = docProjectsMeta.filter(
      (p) => p.name.toLowerCase().includes(query)
    )

    return (
      <div className="file-tree">
        {matchedProjects.length > 0 && (
          <>
            <div className="file-tree-section-label">项目</div>
            {matchedProjects.map((p) => (
              <button
                key={p.slug}
                className="file-tree-item"
                data-selected={selectedProjectSlug === p.slug}
                onClick={() => handleSelectProject(p.slug)}
              >
                <span className="file-tree-item-icon">📁</span>
                <span className="file-tree-item-name">{p.name}</span>
              </button>
            ))}
          </>
        )}
        {matchedTasks.length > 0 && (
          <>
            <div className="file-tree-section-label">任务</div>
            {matchedTasks.map((task) => (
              <button
                key={task.id}
                className="file-tree-item"
                data-lane={task.lane}
                onClick={() => onSelectTask(task)}
              >
                <span
                  className="file-tree-lane-dot"
                  style={{ background: LANE_DOT_COLOR[task.lane] ?? 'var(--color-text-muted)' }}
                />
                <span className="file-tree-item-name">{task.title}</span>
                <span className="file-tree-item-id">{task.id}</span>
              </button>
            ))}
          </>
        )}
        {matchedDocs.length > 0 && (
          <>
            <div className="file-tree-section-label">文档</div>
            {matchedDocs.map((doc) => (
              <button
                key={doc.id}
                className="file-tree-item"
                onClick={() => onSelectDoc(doc.id)}
              >
                <span className="file-tree-item-icon">≡</span>
                <span className="file-tree-item-name">{doc.title}</span>
              </button>
            ))}
          </>
        )}
        {matchedTasks.length === 0 && matchedDocs.length === 0 && matchedProjects.length === 0 && (
          <div className="file-tree-empty">无结果</div>
        )}
      </div>
    )
  }

  // ── Normal tree mode ───────────────────────────────────────
  const unassignedTasks = tasks.filter((t) => !t.projectSlug)

  return (
    <div className="file-tree">
      {/* "全部任务" — 显示所有项目 */}
      <button
        className="file-tree-folder-row"
        data-selected={selectedProjectSlug === null}
        onClick={() => handleSelectProject(null)}
        title="显示全部任务"
      >
        <span className="file-tree-folder-icon">⬡</span>
        <span className="file-tree-folder-name">{t('nav.project')}</span>
        <span className="file-tree-badge">{tasks.length}</span>
      </button>

      {/* 有名字的项目 */}
      {docProjectsMeta.map((project) => {
        const projectTasks = tasks.filter((t) => t.projectSlug === project.slug)
        const projectDocs = docs.filter((d) => d.projectSlug === project.slug)
        const isSelected = selectedProjectSlug === project.slug
        const isExpanded = expandedSlugs.has(project.slug)
        const total = projectTasks.length + projectDocs.length

        return (
          <div key={project.slug} className="file-tree-folder">
            <button
              className="file-tree-folder-row"
              data-selected={isSelected}
              onClick={() => handleSelectProject(project.slug)}
            >
              <span
                className="file-tree-chevron"
                data-expanded={isExpanded}
                onClick={(e) => toggleExpand(project.slug, e)}
              >
                ›
              </span>
              <span className="file-tree-folder-icon">📁</span>
              <span className="file-tree-folder-name">{project.name}</span>
              {total > 0 && <span className="file-tree-badge">{total}</span>}
            </button>

            {isExpanded && (
              <div className="file-tree-children">
                {projectTasks.length > 0 && (
                  <>
                    <div className="file-tree-section-label">任务</div>
                    {projectTasks.map((task) => (
                      <button
                        key={task.id}
                        className="file-tree-item"
                        data-lane={task.lane}
                        onClick={() => onSelectTask(task)}
                      >
                        <span
                          className="file-tree-lane-dot"
                          style={{ background: LANE_DOT_COLOR[task.lane] ?? 'var(--color-text-muted)' }}
                        />
                        <span className="file-tree-item-name">{task.title}</span>
                      </button>
                    ))}
                  </>
                )}
                {projectDocs.length > 0 && (
                  <>
                    <div className="file-tree-section-label">文档</div>
                    {projectDocs.map((doc) => (
                      <button
                        key={doc.id}
                        className="file-tree-item"
                        onClick={() => onSelectDoc(doc.id)}
                      >
                        <span className="file-tree-item-icon" style={{ fontSize: '11px' }}>≡</span>
                        <span className="file-tree-item-name">{doc.title}</span>
                      </button>
                    ))}
                  </>
                )}
                {total === 0 && (
                  <div className="file-tree-empty">此项目下暂无内容</div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* 未分配任务 */}
      {unassignedTasks.length > 0 && (
        <div className="file-tree-folder">
          <div className="file-tree-divider" />
          <div className="file-tree-section-label" style={{ paddingTop: 'var(--space-2)' }}>未分类任务</div>
          {unassignedTasks.map((task) => (
            <button
              key={task.id}
              className="file-tree-item"
              data-lane={task.lane}
              onClick={() => onSelectTask(task)}
            >
              <span
                className="file-tree-lane-dot"
                style={{ background: LANE_DOT_COLOR[task.lane] ?? 'var(--color-text-muted)' }}
              />
              <span className="file-tree-item-name">{task.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
