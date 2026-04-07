import { useCallback, useState } from 'react'
import type { BridgeSettings } from '../types'
import { SETTINGS_URL } from '../lib/constants'

export interface SettingsState {
  settings: BridgeSettings
  draft: string
  setDraft: (v: string) => void
  loading: boolean
  saving: boolean
  error: string
  ok: string
  load: () => Promise<void>
  save: () => Promise<void>
}

export function useSettingsState(): SettingsState {
  const [settings, setSettings] = useState<BridgeSettings>({ webhookUrl: '', source: 'unset' })
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(SETTINGS_URL)
      if (!res.ok) throw new Error(`Failed to fetch settings (${res.status})`)
      const data = await res.json() as { settings?: BridgeSettings }
      const next = data.settings ?? { webhookUrl: '', source: 'unset' }
      setSettings(next)
      setDraft(next.webhookUrl ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  async function save() {
    setSaving(true)
    setError('')
    setOk('')
    try {
      const res = await fetch(SETTINGS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: draft.trim() }),
      })
      const data = await res.json() as { ok?: boolean; error?: string; settings?: BridgeSettings }
      if (!res.ok || !data.ok || !data.settings) throw new Error(data.error ?? 'Failed to save settings')
      setSettings(data.settings)
      setDraft(data.settings.webhookUrl)
      setOk(data.settings.webhookUrl ? 'Discord webhook saved.' : 'Discord webhook cleared.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return { settings, draft, setDraft, loading, saving, error, ok, load, save }
}
