import { useEffect, useState } from 'react'
import { CalendarPlus, Check, CheckCircle2, Link2, PenLine, RotateCcw, Trash2, X } from 'lucide-react'
import { BOARD_PRIORITIES, PRIORITY_LABELS, type Priority } from '../../shared/constants'
import { api, Item, ItemPayload } from '../lib/api'
import { hasCalendarSupport } from '../lib/desktop'
import { formatExact, formatRelative } from '../lib/utils'

interface Props {
  item: Item | null
  onSave: (payload: ItemPayload, itemId?: string) => Promise<void>
  onArchive?: (id: string) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onComplete?: (id: string) => Promise<void>
  onUncomplete?: (id: string) => Promise<void>
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

function deriveIdeaDraft(title: string, note: string): { title: string; note: string | null } {
  const cleanTitle = title.trim()
  const cleanNote = note.trim()

  if (cleanTitle) {
    return {
      title: cleanTitle,
      note: cleanNote || null
    }
  }

  if (!cleanNote) {
    return {
      title: '',
      note: null
    }
  }

  const lines = cleanNote
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return {
    title: (lines[0] ?? cleanNote).slice(0, 120),
    note: lines.slice(1).join('\n').trim() || null
  }
}

export function EditModal({ item, onSave, onArchive, onDelete, onComplete, onUncomplete, onClose }: Props) {
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
  const calendarSupported = hasCalendarSupport()
  const ideaDraft = deriveIdeaDraft(title, note)
  const resolvedType = url.trim() ? 'link' : 'idea'
  const canSave = Boolean(url.trim()) || Boolean(ideaDraft.title)

  useEffect(() => {
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
    if (!canSave) {
      return
    }

    setSaving(true)
    try {
      const normalizedUrl = url.trim()
      const nextType = normalizedUrl ? 'link' : 'idea'
      const normalizedTitle =
        nextType === 'link' ? title.trim() || normalizedUrl.replace(/^https?:\/\//i, '') : ideaDraft.title

      await onSave(
        {
          type: nextType,
          title: normalizedTitle,
          url: nextType === 'link' ? normalizedUrl : null,
          note: nextType === 'idea' ? ideaDraft.note : note.trim() || null,
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
    if (!calendarSupported) {
      return
    }

    const calendarTitle = title.trim() || url.trim() || ideaDraft.title
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
            {resolvedType === 'link' ? <Link2 size={16} /> : <PenLine size={16} color="#f97316" />}
            <div>
              <div className="brand-title" style={{ fontSize: 12 }}>
                {item ? 'Edit capture' : 'New capture'}
              </div>
              <div className="brand-subtitle">Idea, link, or both. Add a URL if you want it saved as a link.</div>
            </div>
          </div>
          <button type="button" className="button-ghost" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div className="modal-body">
          {item?.completed_at ? (
            <div className="completed-banner">
              <CheckCircle2 size={18} />
              <div>
                <div>Completed {formatRelative(item.completed_at)}</div>
                <div>{formatExact(item.completed_at)}</div>
              </div>
            </div>
          ) : null}

          <label className="field-group">
            <span className="field-label">Title (optional)</span>
            <input
              className="text-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional short label"
            />
          </label>

          <label className="field-group">
            <span className="field-label">Link (optional)</span>
            <input
              className="text-input"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
            />
          </label>

          <label className="field-group">
            <span className="field-label">Notes</span>
            <textarea
              className="text-area"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Context, angle, next step..."
            />
          </label>

          <div className="card-meta">
            {resolvedType === 'link'
              ? 'This will save as a link card because a URL is present.'
              : 'No URL yet, so this will save as an idea card.'}
          </div>

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
                {BOARD_PRIORITIES.map((value) => (
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
              placeholder="GitHub/Codex, AI, Research"
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
            {item ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {onArchive ? (
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => onArchive(item.id)}
                  >
                    Archive
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    type="button"
                    className="button-danger"
                    onClick={() => {
                      if (window.confirm(`Delete "${item.title}" permanently?`)) {
                        void onDelete(item.id)
                      }
                    }}
                  >
                    <Trash2 size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                    Delete Forever
                  </button>
                ) : null}
                {item.completed_at && onUncomplete ? (
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => void onUncomplete(item.id)}
                  >
                    <RotateCcw size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                    Mark Not Completed
                  </button>
                ) : !item.completed_at && onComplete ? (
                  <button
                    type="button"
                    className="button-secondary button-success"
                    onClick={() => void onComplete(item.id)}
                  >
                    <CheckCircle2 size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                    Mark Complete
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {calendarSupported ? (
                <button
                  type="button"
                  className={`button-secondary ${calendarState === 'success' ? 'button-success' : ''}`}
                  disabled={
                    calendarState === 'loading' ||
                    calendarState === 'success' ||
                    !(title.trim() || url.trim() || ideaDraft.title)
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
              ) : null}
              <button type="button" className="button-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="button-primary" disabled={saving || !canSave} onClick={handleSubmit}>
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
