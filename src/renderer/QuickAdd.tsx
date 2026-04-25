import { useEffect, useRef, useState } from 'react'
import { PRIORITIES, PRIORITY_LABELS } from '../shared/constants'
import { api } from './lib/api'

function isUrl(value: string) {
  return /^https?:\/\//i.test(value.trim())
}

function deriveTitleFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function QuickAdd() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>('inbox')
  const [tags, setTags] = useState('')
  const [existingTags, setExistingTags] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.add('quick-add-body')
    inputRef.current?.focus()
    void api.getTags().then(setExistingTags).catch(() => setExistingTags([]))

    return () => {
      document.body.classList.remove('quick-add-body')
    }
  }, [])

  async function save() {
    const trimmedValue = value.trim()
    if (!trimmedValue) {
      return
    }

    try {
      if (isUrl(trimmedValue)) {
        await api.createItem({
          type: 'link',
          title: deriveTitleFromUrl(trimmedValue),
          url: trimmedValue,
          priority,
          tags: tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          remind_at: null
        })
      } else {
        await api.createItem({
          type: 'idea',
          title: trimmedValue,
          note: null,
          priority,
          tags: tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          remind_at: null
        })
      }

      window.cortex.closeQuickAdd()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save item')
    }
  }

  return (
    <div className="quick-add-shell" onKeyDown={(event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        void save()
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        window.cortex.closeQuickAdd()
      }
    }}>
      <div className="quick-add-panel">
        <div className="brand-copy">
          <div className="brand-title">Save To Cortex</div>
          <div className="brand-subtitle">Link if it starts with http, idea otherwise.</div>
        </div>

        <input
          ref={inputRef}
          className="text-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Title or URL..."
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <select
            className="select-input"
            value={priority}
            onChange={(event) => setPriority(event.target.value as (typeof PRIORITIES)[number])}
          >
            {PRIORITIES.map((entry) => (
              <option key={entry} value={entry}>
                {PRIORITY_LABELS[entry]}
              </option>
            ))}
          </select>

          <input
            className="text-input"
            list="quick-add-tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="Tags..."
          />
          <datalist id="quick-add-tags">
            {existingTags.map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
        </div>

        {error ? <div className="card-meta" style={{ color: '#fca5a5' }}>{error}</div> : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 'auto' }}>
          <button type="button" className="button-ghost" onClick={() => window.cortex.closeQuickAdd()}>
            Esc
          </button>
          <button type="button" className="button-primary" onClick={() => void save()}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuickAdd
