import { useEffect, useState } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import { PRIORITY_LABELS } from '../../shared/constants'
import { api, Item } from '../lib/api'

interface Props {
  onRestore: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString()
}

export function ArchiveView({ onRestore, onDelete }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  useEffect(() => {
    void api
      .getArchived()
      .then((archived) => setItems(archived))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="content-panel">
      <div className="archive-list">
        <div className="card-meta">Archived items stay local and can be restored at any time.</div>

        {loading ? (
          <div className="empty-state">Loading archive...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">Nothing archived yet.</div>
        ) : (
          items.map((item) => (
            <article key={item.id} className="archive-row">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="card-title">{item.title}</div>
                <div className="card-meta">
                  Archived {formatTimestamp(item.updated_at)} - {PRIORITY_LABELS[item.priority]}
                </div>
                {item.note ? <div className="card-note">{item.note}</div> : null}
                {item.tags.length > 0 ? (
                  <div className="tag-row">
                    {item.tags.map((tag) => (
                      <span key={tag} className="tag-pill">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="archive-actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={async () => {
                    await onRestore(item.id)
                    setItems((current) => current.filter((entry) => entry.id !== item.id))
                  }}
                >
                  <RotateCcw size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                  Restore
                </button>
                {confirmingId === item.id ? (
                  <div className="archive-confirm-row">
                    <span className="delete-confirm-label">Delete permanently?</span>
                    <button
                      type="button"
                      className="button-danger"
                      onClick={async () => {
                        await onDelete(item.id)
                        setItems((current) => current.filter((entry) => entry.id !== item.id))
                        setConfirmingId(null)
                      }}
                    >
                      Yes, delete
                    </button>
                    <button
                      type="button"
                      className="button-ghost"
                      onClick={() => setConfirmingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="button-danger"
                    onClick={() => setConfirmingId(item.id)}
                  >
                    <Trash2 size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                    Delete Forever
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}

export default ArchiveView
