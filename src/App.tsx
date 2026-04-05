import { useState } from 'react'
import type { AppView } from './types'
import { Shell } from './components/layout/Shell'
import { Sidebar } from './components/layout/Sidebar'
import { BoardView } from './components/board/BoardView'
import { DocsView } from './components/docs/DocsView'
import { SettingsView } from './components/settings/SettingsView'
import { CreateTaskModal } from './components/modals/CreateTaskModal'
import { TaskDetailModal } from './components/modals/TaskDetailModal'
import { CreateProjectModal } from './components/modals/CreateProjectModal'
import { useBoardState } from './hooks/useBoardState'
import { useCreateTask } from './hooks/useCreateTask'
import { useTaskDetail } from './hooks/useTaskDetail'
import { useDocsState } from './hooks/useDocsState'
import { useSettingsState } from './hooks/useSettingsState'
import type { Task } from './types/task'

export default function App() {
  const [appView, setAppView] = useState<AppView>('board')
  const [selectedProjectSlug, setSelectedProjectSlug] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const board = useBoardState()
  const wizard = useCreateTask()
  const detail = useTaskDetail()
  const docs = useDocsState()
  const settings = useSettingsState()

  function handleTaskClick(task: Task) {
    detail.setSelectedTask(task)
  }

  function handleAddTask() {
    wizard.reset()
    if (selectedProjectSlug) wizard.setProjectSlug(selectedProjectSlug)
    setShowCreate(true)
  }

  function handleSelectProject(slug: string | null) {
    setSelectedProjectSlug(slug)
    setAppView('board')
  }

  function handleSelectTask(task: Task) {
    detail.setSelectedTask(task)
    setAppView('board')
  }

  function handleSelectDoc(docId: string) {
    docs.setSelectedDocId(docId)
    setAppView('doc')
  }

  function handleCreateProject() {
    docs.setShowProjectModal(true)
  }

  return (
    <Shell
      sidebar={
        <Sidebar
          tasks={board.tasks}
          docs={docs.docs}
          docProjectsMeta={docs.docProjectsMeta}
          selectedProjectSlug={selectedProjectSlug}
          onSelectProject={handleSelectProject}
          onSelectTask={handleSelectTask}
          onSelectDoc={handleSelectDoc}
          onOpenSettings={() => setAppView('settings')}
          onCreateProject={handleCreateProject}
          onDeleteProject={docs.deleteProject}
        />
      }
    >
      {appView !== 'settings' && appView !== 'doc' && (
        <BoardView
          board={board}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
          selectedProjectSlug={selectedProjectSlug}
        />
      )}

      {appView === 'doc' && (
        <DocsView docs={docs} />
      )}

      {appView === 'settings' && (
        <SettingsView settings={settings} />
      )}

      <CreateTaskModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        wizard={wizard}
        board={board}
        docProjectsMeta={docs.docProjectsMeta}
      />

      <TaskDetailModal
        detail={detail}
        board={board}
      />

      <CreateProjectModal docs={docs} />
    </Shell>
  )
}
