export type ColumnKey = 'backlog' | 'triaged' | 'in_progress' | 'testing'

export type NavTab = 'Project' | 'Docs' | 'Settings'

export type AppView = 'board' | 'doc' | 'settings'

export type PlanItemStatus = 'pending' | 'running' | 'done' | 'failed' | 'aborted'

export type CreateTaskKind = 'design' | 'bugfix' | 'feature' | 'docs'
export type CreateQaPreference = 'auto' | 'browser' | 'skip'
export type CreateUrlMode = 'none' | 'home' | 'specific' | 'infer'
