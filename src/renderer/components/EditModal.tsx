import { useEffect, useState } from 'react'
import { CalendarPlus, Check, Link2, PenLine, Trash2, X } from 'lucide-react'
import { PRIORITIES, PRIORITY_LABELS, type Priority } from '../../shared/constants'
import { api, Item, ItemPayload } from '../lib/api'

interface Props {
  item: Item | null
  onSave: (payload: ItemPayload, itemId?: string) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onClose: () => void
}

function toLocalInputValue(timestamp: number | null): string {
  if (!timestamp) {
    return ''
  }

  const date = new Date(timestamp)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function fromLocalInputValue(value: string): number | null {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.getTime()
}

function defaultReminderFor(priority: Priority): string {
  if (priority !== 'today' && priority !== 'tomorrow') {
    return ''
  }

  const date = new Date()
  if (priority === 'tomorrow') {
    date.setDate(date.getDate() + 1)
  }
  date.setHours(9, 0, 0, 0)
  return toLocalInputValue(date.getTime())
}

export function EditModal({ item, onSave, onDelete, onClose }: Props) {
  const [type, setType] = useState<'link' | 'idea'>('idea')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [priority, setPriority] = useState<Priority>('inbox')
  const [tagsInput, setTagsInput] = useState('')
  const [remindAt, setRemindAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [existingTags, setExistingTags] = useState<string[]>([])
  const [calendarState, setCalendarState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [calendarError, setCalendarError] = useState('')

  useEffect(() => {
    setType(item?.type ?? 'idea')
    setTitle(item?.title ?? '')
    setUrl(item?.url ?? '')
    setNote(item?.note ?? '')
    setPriority(item?.priority ?? 'inbox')
    setTagsInput(item?.tags.join(', ') ?? '')
    setRemindAt(toLocalInputValue(item?.remind_at ?? null))
  }, [item])

  useEffect(() => {
    void api.getTags().then(setExistingTags).catch(() => setExistingTags([]))
  }, [])

  async function handleSubmit() {
    const normalizedTitle =
      title.trim() || (type === 'link' && url.trim() ? url.trim().replace(/^https?:\/\//, '') : '')

    if (!normalizedTitle) {
      return
    }

    setSaving(true)
    try {
      await onSave(
        {
          type,
          title: normalizedTitle,
          url: type === 'link' ? url.trim() || null : null,
          note: type === 'idea' ? note.trim() || null : note.trim() || null,
          priority,
          tags: tagsInput
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          remind_at: fromLocalInputValue(remindAt)
        },
        item?.id
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleAddToCalendar() {
    const calendarTitle = title.trim() || url.trim()
    setCalendarState('loading')
    setCalendarError('')

    try {
      const result = await window.cortex.addToCalendar(calendarTitle, priority)
      if (result.ok) {
        setCalendarState('success')
        window.setTimeout(() => setCalendarState('idle'), 3_000)
        return
      }

      setCalendarError(result.error ?? 'Failed to add to calendar')
      setCalendarState('error')
      window.setTimeout(() => setCalendarState('idle'), 5_000)
    } catch {
      setCalendarError('Unexpected error - is gws installed?')
      setCalendarState('error')
      window.setTimeout(() => setCalendarState('idle'), 5_000)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {type === 'link' ? <Link2 size={16} /> : <PenLine size={16} color="#f97316" />}
            <div>
              <div className="brand-title" style={{ fontSize: 12 }}>
                {item ? `Edit ${type}` : `New ${type}`}
              </div>
              <div className="brand-subtitle">Shape the card before it drifts into the backlog.</div>
            </div>
          </div>
          <button type="button" className="button-ghost" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div className="modal-body">
          <div className="segmented" style={{ width: 'fit-content' }}>
            <button type="button" data-active={type === 'idea'} onClick={() => setType('idea')}>
              Idea
            </button>
            <button type="button" data-active={type === 'link'} onClick={() => setType('link')}>
              Link
            </button>
          </div>

          <label className="field-group">
            <span className="field-label">Title</span>
            <input
              className="text-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What should Future You see first?"
            />
          </label>

          {type === 'link' ? (
            <label className="field-group">
              <span className="field-label">URL</span>
              <input
                className="text-input"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com"
              />
            </label>
          ) : (
            <label className="field-group">
              <span className="field-label">Notes</span>
              <textarea
                className="text-area"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Context, angle, next step..."
              />
            </label>
          )}

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <label className="field-group">
              <span className="field-label">Priority</span>
              <select
                className="select-input"
                value={priority}
                onChange={(event) => {
                  const nextPriority = event.target.value as Priority
                  setPriority(nextPriority)
                  if (!remindAt) {
                    setRemindAt(defaultReminderFor(nextPriority))
                  }
                }}
              >
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group">
              <span className="field-label">Remind me at</span>
              <input
                className="text-input"
                type="datetime-local"
                value={remindAt}
                onChange={(event) => setRemindAt(event.target.value)}
              />
            </label>
          </div>

          <label className="field-group">
            <span className="field-label">Tags</span>
            <input
              className="text-input"
              list="cortex-tag-options"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="GitHub, YouTube, Research"
            />
            <datalist id="cortex-tag-options">
              {existingTags.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="modal-footer">
          <div>
            {item && onDelete ? (
              <button
                type="button"
                className="button-danger"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                Delete
              </button>
            ) : null}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className={`button-secondary ${calendarState === 'success' ? 'button-success' : ''}`}
                disabled={
                  calendarState === 'loading' ||
                  calendarState === 'success' ||
                  !(title.trim() || url.trim())
                }
                onClick={() => void handleAddToCalendar()}
                title="Add to Google Calendar via gws CLI"
              >
                {calendarState === 'success' ? (
                  <>
                    <Check size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                    Added
                  </>
                ) : calendarState === 'loading' ? (
                  'Adding...'
                ) : (
                  <>
                    <CalendarPlus size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                    Add to Calendar
                  </>
                )}
              </button>
              <button type="button" className="button-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="button-primary" disabled={saving} onClick={handleSubmit}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            {calendarState === 'error' && calendarError ? (
              <div style={{ fontSize: 11, color: '#fca5a5', maxWidth: 280, textAlign: 'right' }}>
                {calendarError}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditModal
