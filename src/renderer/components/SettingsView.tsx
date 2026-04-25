import { useEffect, useState } from 'react'
import { API_PORT } from '../../shared/constants'
import { api, type Settings } from '../lib/api'

function formatMidnightRun(value: string): string {
  if (!value || value === '0') {
    return 'Never'
  }

  const timestamp = Number.parseInt(value, 10)
  if (Number.isNaN(timestamp)) {
    return value
  }

  return new Date(timestamp).toLocaleString()
}

export function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [autoStart, setAutoStart] = useState(false)
  const [digestTime, setDigestTime] = useState('08:00')
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void api
      .getSettings()
      .then((nextSettings) => {
        setSettings(nextSettings)
        setDigestTime(nextSettings.morning_digest_time)
      })
      .catch(() => setError('Failed to load settings'))

    void window.cortex.autostart
      .get()
      .then((enabled) => setAutoStart(enabled))
      .catch(() => setAutoStart(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSavedMessage('')
    setError('')

    try {
      const nextSettings = await api.updateSettings({ morning_digest_time: digestTime })
      setSettings(nextSettings)
      setSavedMessage('Saved')
      window.setTimeout(() => setSavedMessage(''), 2_000)
    } catch {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleAutoStartChange(enabled: boolean) {
    setAutoStart(enabled)
    try {
      await window.cortex.autostart.set(enabled)
    } catch {
      setAutoStart((current) => !current)
      setError('Failed to update startup setting')
    }
  }

  const isWindows = navigator.platform.toLowerCase().includes('win')

  return (
    <div className="content-panel">
      <div style={{ maxWidth: 760 }}>
        <h2 style={{ marginTop: 0, marginBottom: 24, fontSize: 20, fontWeight: 700 }}>Settings</h2>

        {error ? <div className="status-banner" style={{ margin: '0 0 16px' }}>{error}</div> : null}

        <section className="settings-section">
          <h3 className="settings-heading">Startup</h3>
          {isWindows ? (
            <label className="settings-row">
              <span className="settings-label">
                Launch at Windows login
                <span className="settings-sublabel">Keep Cortex in the tray without opening it manually.</span>
              </span>
              <input
                className="settings-checkbox"
                type="checkbox"
                checked={autoStart}
                onChange={(event) => void handleAutoStartChange(event.target.checked)}
              />
            </label>
          ) : (
            <p className="card-meta">Auto-start is only supported on Windows.</p>
          )}
        </section>

        <section className="settings-section">
          <h3 className="settings-heading">Notifications</h3>
          <div className="settings-row">
            <label className="settings-label" htmlFor="digest-time">
              Morning digest time
              <span className="settings-sublabel">Daily summary of your For Now and Today items.</span>
            </label>
            <input
              id="digest-time"
              className="text-input"
              type="time"
              value={digestTime}
              onChange={(event) => setDigestTime(event.target.value)}
              style={{ width: 120 }}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <button type="button" className="button-primary" disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Saving...' : savedMessage || 'Save'}
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h3 className="settings-heading">Status</h3>
          <div className="settings-stat-row">
            <span className="card-meta">API port</span>
            <span className="settings-stat-value">{API_PORT}</span>
          </div>
          <div className="settings-stat-row">
            <span className="card-meta">Telegram queue config</span>
            <span className="settings-stat-value">
              Optional - active when SUPABASE env vars are present
            </span>
          </div>
          <div className="settings-stat-row">
            <span className="card-meta">Last midnight promotion</span>
            <span className="settings-stat-value">
              {settings ? formatMidnightRun(settings.last_midnight_run) : 'Loading...'}
            </span>
          </div>
          <div className="settings-stat-row">
            <span className="card-meta">Last morning digest</span>
            <span className="settings-stat-value">
              {settings?.last_digest_date || 'Never'}
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}

export default SettingsView
