import { useEffect, useRef, useState } from 'react'
import { BOARD_PRIORITIES, PRIORITY_LABELS } from '../shared/constants'
import { api, Space } from './lib/api'

function isUrl(value: string) {
  return /^https?:\/\//i.test(value.trim())
}

function deriveLinkTitle(url: string) {
  return url.replace(/^https?:\/\//i, '')
}

function getInitialValue() {
  const params = new URLSearchParams(window.location.search)
  return params.get('value') ?? ''
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function QuickAdd() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(getInitialValue)
  const [priority, setPriority] = useState<(typeof BOARD_PRIORITIES)[number]>('inbox')
  const [tags, setTags] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [spaces, setSpaces] = useState<Space[]>([])
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const trimmed = value.trim()
  const linkCapture = isUrl(trimmed)

  useEffect(() => {
    document.body.classList.add('quick-add-body')
    inputRef.current?.focus()
    inputRef.current?.select()
    void api.getSpaces().then(setSpaces).catch(() => setSpaces([]))

    return () => {
      document.body.classList.remove('quick-add-body')
    }
  }, [])

  function toggleSpace(spaceId: string) {
    setSelectedSpaces((current) =>
      current.includes(spaceId) ? current.filter((id) => id !== spaceId) : [...current, spaceId]
    )
  }

  async function save() {
    if (!trimmed || saving) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const item = await api.createItem(
        linkCapture
          ? {
              type: 'link',
              title: deriveLinkTitle(trimmed),
              url: trimmed,
              note: null,
              priority,
              tags: parseTags(tags),
              remind_at: null
            }
          : {
              type: 'idea',
              title: trimmed,
              note: null,
              priority,
              tags: parseTags(tags),
              remind_at: null
            }
      )

      for (const spaceId of selectedSpaces) {
        await api.addItemToSpace(spaceId, item.id, true)
      }

      window.cortex.closeQuickAdd()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save item')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="quick-add-shell"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          window.cortex.closeQuickAdd()
          return
        }

        if (event.key === 'Enter') {
          event.preventDefault()
          void save()
        }
      }}
    >
      <div className="quick-add-panel quick-add-panel-compact">
        <header className="quick-add-header">
          <div>
            <div className="brand-title">Quick Capture</div>
            <div className="brand-subtitle">Enter to save. Esc to close.</div>
          </div>
          {trimmed ? <span className="type-badge">{linkCapture ? 'LINK' : 'IDEA'}</span> : null}
        </header>

        <div className="quick-add-input-wrap">
          <input
            ref={inputRef}
            className="quick-add-main-input"
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setError(null)
            }}
            placeholder="Type a note or paste a link..."
          />
        </div>

        <div className="quick-add-controls">
          <select
            className="select-input"
            value={priority}
            onChange={(event) => setPriority(event.target.value as (typeof BOARD_PRIORITIES)[number])}
          >
            {BOARD_PRIORITIES.map((entry) => (
              <option key={entry} value={entry}>
                {PRIORITY_LABELS[entry]}
              </option>
            ))}
          </select>

          <button type="button" className="button-secondary" onClick={() => setExpanded((current) => !current)}>
            {expanded ? 'Hide details' : '+ Tags / Spaces'}
          </button>
        </div>

        {expanded ? (
          <div className="quick-add-expanded">
            <input
              className="text-input"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="Tags (comma-separated, e.g. GitHub/Codex, AI)"
            />

            {spaces.length > 0 ? (
              <div className="quick-space-pills" aria-label="Add to spaces">
                {spaces.map((space) => (
                  <button
                    key={space.id}
                    type="button"
                    className="quick-space-pill"
                    data-selected={selectedSpaces.includes(space.id)}
                    onClick={() => toggleSpace(space.id)}
                  >
                    {space.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <footer className="quick-add-footer">
          <span className="card-meta">{linkCapture ? 'Saving as a link' : 'Saving as an idea'}</span>
          <button type="button" className="button-primary" disabled={!trimmed || saving} onClick={() => void save()}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </footer>

        {error ? <div className="card-meta" style={{ color: '#fca5a5' }}>{error}</div> : null}
      </div>
    </div>
  )
}

export default QuickAdd
