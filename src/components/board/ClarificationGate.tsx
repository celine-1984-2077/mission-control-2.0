import type { Task, ClarificationQuestion } from '../../types'
import type { BoardState } from '../../hooks/useBoardState'

interface ClarificationGateProps {
  task: Task
  board: BoardState
  onClose: () => void
}

export function ClarificationGate({ task, board, onClose }: ClarificationGateProps) {
  const questions: ClarificationQuestion[] = task.clarificationQuestions ?? []
  const pendingCount = questions.filter((q) => q.required && q.status !== 'answered').length

  function selectAnswer(questionId: string, answer: string) {
    board.updateTask(task.id, {
      clarificationQuestions: (task.clarificationQuestions ?? []).map((q) =>
        q.id === questionId
          ? { ...q, answer, status: 'answered' as const }
          : q
      ),
    })
  }

  function handleDispatch() {
    board.updateTask(task.id, { lane: 'triaged' })
    onClose()
  }

  const allAnswered = questions.filter((q) => q.required).every((q) => q.status === 'answered')

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
        {questions.map((q) => (
          <div key={q.id} className="clarification-question-block" data-answered={q.status === 'answered'}>
            <div className="clarification-question-header">{q.header}</div>
            <div className="clarification-question-text">{q.question}</div>
            <div className="clarification-options">
              {q.options.map((opt: { label: string; description: string }) => (
                <button
                  key={opt.label}
                  className="clarification-option-btn"
                  data-selected={q.answer === opt.label}
                  onClick={() => selectAnswer(q.id, opt.label)}
                >
                  <div className="clarification-option-check">
                    {q.answer === opt.label ? '●' : '○'}
                  </div>
                  <div>
                    <div className="clarification-option-label">{opt.label}</div>
                    {opt.description && (
                      <div className="clarification-option-desc">{opt.description}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {allAnswered && (
        <div className="clarification-gate-footer">
          <div className="clarification-gate-ready">✓ 所有问题已回答，可以派发任务</div>
          <button className="btn btn-primary btn-sm" onClick={handleDispatch}>
            派发给 AI →
          </button>
        </div>
      )}
    </div>
  )
}
