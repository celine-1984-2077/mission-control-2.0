import { useEffect } from 'react'
import type { DocsState } from '../../hooks/useDocsState'
import { TopHeader } from '../layout/TopHeader'
import { DocsSidebar } from './DocsSidebar'
import { DocsContent } from './DocsContent'
import { CreateProjectModal } from '../modals/CreateProjectModal'
import { useI18n } from '../../contexts/I18nContext'

interface DocsViewProps {
  docs: DocsState
}

export function DocsView({ docs }: DocsViewProps) {
  const { t } = useI18n()

  useEffect(() => {
    void docs.loadDocs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="docs-page">
      <TopHeader
        title={t('docs.title')}
        subtitle={t('docs.subtitle')}
      />

      {docs.error && (
        <div className="wizard-error" style={{ margin: '0 0 var(--space-4)' }}>
          {docs.error}
        </div>
      )}

      <div className="docs-layout">
        <DocsSidebar docs={docs} />
        <DocsContent docs={docs} />
      </div>

      <CreateProjectModal docs={docs} />
    </div>
  )
}
