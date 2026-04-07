import { useState } from 'react'
import type { Task, ClarificationQuestion } from '../../types'
import type { BoardState } from '../../hooks/useBoardState'
import { useI18n } from '../../contexts/I18nContext'

interface ClarificationGateProps {
  task: Task
  board: BoardState
  onClose: () => void
}

// 服务器生成的英文字段前端翻译映射
const HEADER_ZH: Record<string, string> = {
  OUTCOME: '预期结果',
  'TARGET URL': '目标页面',
  FOCUS: '验收重点',
  SCOPE: '任务范围',
  PRIORITY: '优先级',
  COMPLEXITY: '复杂度',
  APPROACH: '实现方式',
}

const QUESTION_ZH: Record<string, string> = {
  'What should feel obviously successful when this task is done?': '任务完成后，什么样的结果算是明显成功？',
  'Which page should browser QA open first?': '浏览器验收时应该先打开哪个页面？',
  'Where should verification be strictest?': '哪个方面需要最严格的验收？',
  'What is the scope of this task?': '这个任务的范围有多大？',
}

const OPTION_ZH: Record<string, { label: string; description: string }> = {
  // OUTCOME
  'Visible UI': { label: '界面变化', description: '用户界面或交互应有明显变化' },
  'Behavior fix': { label: '行为修复', description: '现有的缺陷或流程应稳定工作' },
  'Automation': { label: '自动化', description: '系统自动为我执行某些操作' },
  // TARGET URL
  'Local app': { label: '本地应用', description: '使用此工作区的默认本地应用地址' },
  'Specific URL': { label: '指定 URL', description: '我会在任务中提供具体的页面地址' },
  'Infer it': { label: '自动推断', description: '从项目配置中推断最合适的地址' },
  // FOCUS
  'Happy path': { label: '主流程', description: '优先验证核心用户流程和预期行为' },
  'Edge cases': { label: '边缘情况', description: '重点检测错误处理和异常情况' },
  'Visual polish': { label: '视觉细节', description: '特别关注设计和浏览器显示效果' },
  // SCOPE
  'Small (1-2 files)': { label: '小（1-2 个文件）', description: '只涉及少量文件的修改' },
  'Medium (feature)': { label: '中（功能级）', description: '完整功能的实现或修复' },
  'Large (system)': { label: '大（系统级）', description: '跨模块的较大改动' },
  // APPROACH
  'UI and layout': { label: 'UI 和布局', description: '视觉外观和界面结构' },
  'Business logic': { label: '业务逻辑', description: '数据处理和功能行为' },
  'Both equally': { label: '同等重要', description: '界面与逻辑都需要严格验收' },
}

export function ClarificationGate({ task, board, onClose }: ClarificationGateProps) {
  const { language } = useI18n()
  const zh = language === 'zh'

  const questions: ClarificationQuestion[] = task.clarificationQuestions ?? []

  // 用本地 state 存答案，避免 board re-render 导致选中状态丢失
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => Object.fromEntries(questions.map((q) => [q.id, q.answer ?? '']))
  )

  const pendingCount = questions.filter(
    (q) => q.required && !(answers[q.id] ?? '').trim()
  ).length
  const allAnswered = pendingCount === 0 && questions.filter((q) => q.required).length > 0

  function selectAnswer(questionId: string, answer: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  function handleDispatch() {
    const updatedQuestions = questions.map((q) => ({
      ...q,
      answer: answers[q.id] ?? q.answer ?? '',
      status: (answers[q.id] ?? q.answer ?? '').trim() ? 'answered' as const : q.status ?? 'pending' as const,
    }))
    board.updateTask(task.id, {
      clarificationQuestions: updatedQuestions,
      lane: 'triaged',
    })
    onClose()
  }

  function tHeader(h: string) { return zh ? (HEADER_ZH[h] ?? h) : h }
  function tQuestion(q: string) { return zh ? (QUESTION_ZH[q] ?? q) : q }
  function tOption(label: string, desc: string) {
    if (!zh) return { label, description: desc }
    return OPTION_ZH[label] ?? { label, description: desc }
  }

  return (
    <div className="clarification-gate-wrap">
      <div className="clarification-gate-banner">
        <span className="clarification-gate-icon">⚠</span>
        <div>
          <div className="clarification-gate-title">等待你的回答</div>
          <div className="clarification-gate-desc">
            请回答以下问题，帮助 AI 更准确地理解任务意图
            {pendingCount > 0 && `（还剩 ${pendingCount} 题）`}
          </div>
        </div>
      </div>

      <div className="clarification-questions">
        {questions.map((q) => {
          const selected = answers[q.id] ?? ''
          return (
            <div
              key={q.id}
              className="clarification-question-block"
              data-answered={!!selected.trim()}
            >
              <div className="clarification-question-header">{tHeader(q.header)}</div>
              <div className="clarification-question-text">{tQuestion(q.question)}</div>
              <div className="clarification-options">
                {q.options.map((opt: { label: string; description: string }) => {
                  const translated = tOption(opt.label, opt.description)
                  const isSelected = selected === opt.label
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      className="clarification-option-btn"
                      data-selected={isSelected}
                      onClick={() => selectAnswer(q.id, opt.label)}
                    >
                      <div className="clarification-option-check">
                        {isSelected ? '●' : '○'}
                      </div>
                      <div>
                        <div className="clarification-option-label">{translated.label}</div>
                        {translated.description && (
                          <div className="clarification-option-desc">{translated.description}</div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="clarification-gate-footer">
        {allAnswered ? (
          <>
            <div className="clarification-gate-ready">✓ 所有问题已回答，可以派发任务</div>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleDispatch}>
              派发给 AI →
            </button>
          </>
        ) : (
          <>
            <div className="clarification-gate-desc">回答全部必填题后可派发</div>
            <button type="button" className="btn btn-ghost btn-sm" disabled>
              派发给 AI →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
