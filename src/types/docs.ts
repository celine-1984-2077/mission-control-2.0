export type ProjectDoc = {
  id: string
  project: string
  projectSlug?: string
  title: string
  path: string
  tags: string[]
  modifiedAt: string
  content: string
  readOnly?: boolean
  source?: 'imported' | 'authored'
}

export type DocProject = {
  slug: string
  name: string
  description?: string
}
