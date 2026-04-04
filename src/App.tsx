import { useState } from 'react'
import type { NavTab } from './types'
import { Shell } from './components/layout/Shell'
import { Sidebar } from './components/layout/Sidebar'
import { BoardView } from './components/board/BoardView'
import { DocsView } from './components/docs/DocsView'
import { SettingsView } from './components/settings/SettingsView'
import { CreateTaskModal } from './components/modals/CreateTaskModal'
import { TaskDetailModal } from './components/modals/TaskDetailModal'
import { useBoardState } from './hooks/useBoardState'
import { useCreateTask } from './hooks/useCreateTask'
import { useTaskDetail } from './hooks/useTaskDetail'
import { useDocsState } from './hooks/useDocsState'
import { useSettingsState } from './hooks/useSettingsState'

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('Project')
  const [showCreate, setShowCreate] = useState(false)

  const board = useBoardState()
  const wizard = useCreateTask()
  const detail = useTaskDetail()
  const docs = useDocsState()
  const settings = useSettingsState()

  function handleTaskClick(task: Parameters<typeof detail.setSelectedTask>[0]) {
    detail.setSelectedTask(task)
  }

  function handleAddTask() {
    wizard.reset()
    setShowCreate(true)
  }

  return (
    <Shell
      sidebar={
        <Sidebar activeNav={activeTab} onNavChange={setActiveTab} />
      }
    >
      {activeTab === 'Project' && (
        <BoardView
          board={board}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
        />
      )}

      {activeTab === 'Docs' && (
        <DocsView docs={docs} />
      )}

      {activeTab === 'Settings' && (
        <SettingsView settings={settings} />
      )}

      <CreateTaskModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        wizard={wizard}
        board={board}
      />

      <TaskDetailModal
        detail={detail}
        board={board}
      />
    </Shell>
  )
}
