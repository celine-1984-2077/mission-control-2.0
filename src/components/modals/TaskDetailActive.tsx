import { useState } from 'react'
import type { Task } from '../../types'
import type { TaskDetailState } from '../../hooks/useTaskDetail'
import type { BoardState } from '../../hooks/useBoardState'
import { PlanItemRow } from '../observability/PlanItemRow'
import { VerificationChecklist } from '../observability/VerificationChecklist'
import { SessionTranscript } from '../observability/SessionTranscript'
import { StatusPill } from '../ui/StatusPill'
import { Chip } from '../ui/Chip'

type DetailTab = 'overview' | 'coder' | 'qa' | 'artifacts'

interface TaskDetailActiveProps {
  task: Task
  detail: TaskDetailState
  board: BoardState
  onClose: () => void
}

export function TaskDetailActive({ task, detail, board, onClose }: TaskDetailActiveProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const { coderSessionLog, qaSessionLog, taskArtifacts, artifactLoading,
    activeArtifactUrl, setActiveArtifactUrl } = detail

  const isRunning = task.lane === 'in_progress'
  const planItems = task.planItems ?? []
  const verification = task.verification

  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'overview', label: '概览' },
    { key: 'coder', label: 'Agent 日志' },
    ...(task.qaSessionKey ? [{ key: 'qa' as DetailTab, label: 'QA 日志' }] : []),
    ...(taskArtifacts.length > 0 ? [{ key: 'artifacts' as DetailTab, label: `截图 (${taskArtifacts.length})` }] : []),
  ]

  return (
    <div className="detail-layout detail-layout-wide">
      <div className="detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div>
            <div className="task-id" style={{ marginBottom: 'var(--space-1)' }}>{task.id}</div>
            <StatusPill task={task} />
          </div>
          {isRunning && (
            <Chip variant="amber" pulse className="countdown-chip">● 运行中</Chip>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      <div className="detail-title-row">
        <h2 className="detail-task-title">{task.title}</h2>
      </div>

      <div className="detail-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className="detail-tab"
            data-active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="detail-body detail-tab-body">
        {activeTab === 'overview' && (
          <div className="detail-overview">
            {task.objective && (
              <div className="detail-section">
                <div className="label-eyebrow" style={{ marginBottom: 'var(--space-2)' }}>目标描述</div>
                <p className="detail-text">{task.objective}</p>
              </div>
            )}

            {(task.acceptanceCriteria ?? []).length > 0 && (
              <div className="detail-section">
                <div className="label-eyebrow" style={{ marginBottom: 'var(--space-2)' }}>验收标准</div>
                {(task.acceptanceCriteria ?? []).map((c, i) => (
                  <div key={i} className="detail-criterion">◻ {c}</div>
                ))}
              </div>
            )}

            {planItems.length > 0 && (
              <div className="detail-section">
                <div className="label-eyebrow" style={{ marginBottom: 'var(--space-2)' }}>执行计划</div>
                {planItems.map((item) => (
                  <PlanItemRow key={item.id} item={item} />
                ))}
              </div>
            )}

            {verification && (
              <div className="detail-section">
                <div className="label-eyebrow" style={{ marginBottom: 'var(--space-2)' }}>验收检查</div>
                <VerificationChecklist verification={verification} />
              </div>
            )}

            {task.resultSummary && (
              <div className="detail-section">
                <div className="label-eyebrow" style={{ marginBottom: 'var(--space-2)' }}>执行摘要</div>
                <p className="detail-text detail-text-mono">{task.resultSummary}</p>
              </div>
            )}

            {task.dispatchSessionKey && (
              <div className="detail-section">
                <div className="label-eyebrow" style={{ marginBottom: 'var(--space-2)' }}>Session</div>
                <code className="task-id" style={{ fontSize: 'var(--font-size-xs)' }}>
                  {task.dispatchSessionKey}
                </code>
              </div>
            )}
          </div>
        )}

        {activeTab === 'coder' && (
          <div className="detail-transcript">
            {coderSessionLog.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <div className="empty-state-title">暂无 Agent 日志</div>
                <div className="empty-state-desc">任务开始执行后，日志将在此显示</div>
              </div>
            ) : (
              <SessionTranscript
                title="Agent 日志"
                messages={coderSessionLog}
                isLive={isRunning}
              />
            )}
          </div>
        )}

        {activeTab === 'qa' && (
          <div className="detail-transcript">
            {qaSessionLog.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <div className="empty-state-title">暂无 QA 日志</div>
              </div>
            ) : (
              <SessionTranscript
                title="QA 日志"
                messages={qaSessionLog}
                isLive={false}
              />
            )}
          </div>
        )}

        {activeTab === 'artifacts' && (
          <div className="detail-artifacts">
            {artifactLoading ? (
              <div className="empty-state"><div className="empty-state-title">加载中...</div></div>
            ) : taskArtifacts.length === 0 ? (
              <div className="empty-state"><div className="empty-state-title">暂无截图</div></div>
            ) : (
              <div className="artifacts-grid">
                {taskArtifacts.map((img) => (
                  <div
                    key={img.url}
                    className="artifact-thumb"
                    data-active={activeArtifactUrl === img.url}
                    onClick={() => setActiveArtifactUrl(activeArtifactUrl === img.url ? '' : img.url)}
                  >
                    <img src={img.url} alt={img.name} />
                    <span className="artifact-label">{img.name}</span>
                  </div>
                ))}
              </div>
            )}
            {activeArtifactUrl && (
              <div className="artifact-preview">
                <img src={activeArtifactUrl} alt="预览" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="detail-footer">
        <div />
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {task.lane === 'testing' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { board.markTaskDone(task.id); onClose() }}
            >
              标记完成
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}
