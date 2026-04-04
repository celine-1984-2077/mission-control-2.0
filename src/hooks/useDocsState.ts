import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProjectDoc, DocProject } from '../types'
import { DOCS_URL, DOC_PROJECTS_URL, DOC_SAVE_URL } from '../lib/constants'

export interface DocsState {
  docs: ProjectDoc[]
  docProjectsMeta: DocProject[]
  loading: boolean
  error: string

  // 过滤
  docProject: string
  setDocProject: (v: string) => void
  docTag: string
  setDocTag: (v: string) => void
  docSearch: string
  setDocSearch: (v: string) => void

  // 选中文档
  selectedDocId: string
  setSelectedDocId: (id: string) => void
  selectedDoc: ProjectDoc | null
  isDocEditable: boolean

  // 编辑草稿
  creatingDoc: boolean
  docDraftTitle: string
  setDocDraftTitle: (v: string) => void
  docDraftTags: string
  setDocDraftTags: (v: string) => void
  docDraftContent: string
  setDocDraftContent: (v: string) => void
  docDraftProjectSlug: string
  setDocDraftProjectSlug: (v: string) => void

  // 项目创建
  showProjectModal: boolean
  setShowProjectModal: (v: boolean) => void
  newProjectName: string
  setNewProjectName: (v: string) => void
  newProjectSlug: string
  setNewProjectSlug: (v: string) => void
  newProjectDesc: string
  setNewProjectDesc: (v: string) => void
  creatingProject: boolean

  // 操作反馈
  actionError: string
  actionOk: string

  // 派生
  docProjects: string[]
  authoredProjects: DocProject[]
  docTags: string[]
  visibleDocList: ProjectDoc[]

  // 操作
  loadDocs: () => Promise<void>
  createProject: () => Promise<void>
  startCreateDoc: () => void
  saveDocDraft: () => Promise<void>
}

export function useDocsState(): DocsState {
  const [docs, setDocs] = useState<ProjectDoc[]>([])
  const [docProjectsMeta, setDocProjectsMeta] = useState<DocProject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [docProject, setDocProject] = useState('all')
  const [docTag, setDocTag] = useState('all')
  const [docSearch, setDocSearch] = useState('')
  const [selectedDocId, setSelectedDocId] = useState('')
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectSlug, setNewProjectSlug] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)
  const [creatingDoc, setCreatingDoc] = useState(false)
  const [docDraftTitle, setDocDraftTitle] = useState('')
  const [docDraftTags, setDocDraftTags] = useState('')
  const [docDraftContent, setDocDraftContent] = useState('')
  const [docDraftProjectSlug, setDocDraftProjectSlug] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionOk, setActionOk] = useState('')

  const docProjects = useMemo(() => Array.from(new Set(docs.map((d) => d.project))).sort(), [docs])
  const authoredProjects = useMemo(() => docProjectsMeta, [docProjectsMeta])
  const docTags = useMemo(() => Array.from(new Set(docs.flatMap((d) => d.tags))).sort(), [docs])

  const filteredDocs = useMemo(() => docs.filter((doc) => {
    if (docProject !== 'all' && doc.project !== docProject) return false
    if (docTag !== 'all' && !doc.tags.includes(docTag)) return false
    const search = docSearch.trim().toLowerCase()
    if (!search) return true
    return doc.title.toLowerCase().includes(search)
      || doc.path.toLowerCase().includes(search)
      || doc.content.toLowerCase().includes(search)
  }), [docs, docProject, docTag, docSearch])

  const visibleDocList = useMemo(() => [
    ...filteredDocs.filter((d) => d.source === 'authored'),
    ...filteredDocs.filter((d) => d.source !== 'authored'),
  ], [filteredDocs])

  const selectedDoc = visibleDocList.find((d) => d.id === selectedDocId) ?? visibleDocList[0] ?? null
  const isDocEditable = !!selectedDoc && !selectedDoc.readOnly

  // 同步文档草稿
  useEffect(() => {
    if (!selectedDoc || creatingDoc) return
    setDocDraftTitle(selectedDoc.title)
    setDocDraftTags((selectedDoc.tags ?? []).join(', '))
    setDocDraftContent(selectedDoc.content ?? '')
    setDocDraftProjectSlug(selectedDoc.projectSlug ?? authoredProjects[0]?.slug ?? '')
  }, [selectedDoc, creatingDoc, authoredProjects])

  // 同步选中ID
  useEffect(() => {
    if (!visibleDocList.length) return
    if (!visibleDocList.some((d) => d.id === selectedDocId)) {
      setSelectedDocId(visibleDocList[0].id)
    }
  }, [visibleDocList, selectedDocId])

  const loadDocs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(DOCS_URL)
      if (!res.ok) throw new Error(`Failed to fetch docs (${res.status})`)
      const data = await res.json() as { docs?: ProjectDoc[]; projects?: DocProject[] }
      setDocs(Array.isArray(data.docs) ? data.docs : [])
      setDocProjectsMeta(Array.isArray(data.projects) ? data.projects : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load docs')
    } finally {
      setLoading(false)
    }
  }, [])

  async function createProject() {
    if (!newProjectName.trim()) {
      setActionError('Project name is required.')
      return
    }
    setCreatingProject(true)
    setActionError('')
    setActionOk('')
    try {
      const res = await fetch(DOC_PROJECTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, slug: newProjectSlug, description: newProjectDesc }),
      })
      const data = await res.json() as { ok?: boolean; error?: string; project?: DocProject }
      if (!res.ok || !data.ok || !data.project) throw new Error(data.error ?? 'Failed to create project')
      setActionOk(`Project created: ${data.project.name}`)
      setShowProjectModal(false)
      setNewProjectName('')
      setNewProjectSlug('')
      setNewProjectDesc('')
      setDocProject(data.project.name)
      await loadDocs()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setCreatingProject(false)
    }
  }

  function startCreateDoc() {
    const projectSlug = authoredProjects[0]?.slug ?? ''
    setCreatingDoc(true)
    setSelectedDocId('')
    setDocDraftTitle('')
    setDocDraftTags('')
    setDocDraftContent('')
    setDocDraftProjectSlug(projectSlug)
    setActionError('')
    setActionOk('')
  }

  async function saveDocDraft() {
    if (!docDraftTitle.trim()) {
      setActionError('Document title is required.')
      return
    }
    if (!docDraftProjectSlug.trim()) {
      setActionError('Choose a project for this doc.')
      return
    }
    setActionError('')
    setActionOk('')
    try {
      const res = await fetch(DOC_SAVE_URL, {
        method: isDocEditable ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: selectedDoc?.id,
          projectSlug: docDraftProjectSlug,
          title: docDraftTitle,
          tags: docDraftTags.split(',').map((t) => t.trim()).filter(Boolean),
          content: docDraftContent,
        }),
      })
      const data = await res.json() as { ok?: boolean; error?: string; doc?: ProjectDoc }
      if (!res.ok || !data.ok || !data.doc) throw new Error(data.error ?? 'Failed to save document')
      setActionOk('Document saved.')
      setCreatingDoc(false)
      await loadDocs()
      setSelectedDocId(data.doc.id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save document')
    }
  }

  return {
    docs, docProjectsMeta, loading, error,
    docProject, setDocProject, docTag, setDocTag, docSearch, setDocSearch,
    selectedDocId, setSelectedDocId, selectedDoc, isDocEditable,
    creatingDoc, docDraftTitle, setDocDraftTitle, docDraftTags, setDocDraftTags,
    docDraftContent, setDocDraftContent, docDraftProjectSlug, setDocDraftProjectSlug,
    showProjectModal, setShowProjectModal,
    newProjectName, setNewProjectName, newProjectSlug, setNewProjectSlug,
    newProjectDesc, setNewProjectDesc, creatingProject,
    actionError, actionOk,
    docProjects, authoredProjects, docTags, visibleDocList,
    loadDocs, createProject, startCreateDoc, saveDocDraft,
  }
}
