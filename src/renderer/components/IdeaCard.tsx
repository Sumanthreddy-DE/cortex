import { useState } from 'react'
import type { DragEventHandler } from 'react'
import { Check, X } from 'lucide-react'
import type { Item } from '../lib/api'
import TagPill from './TagPill'

interface Props {
  item: Item
  onClick: (item: Item) => void
  showMeta?: boolean
  draggable?: boolean
  onDragStart?: DragEventHandler<HTMLButtonElement>
  onDragEnd?: DragEventHandler<HTMLButtonElement>
  onDelete?: (item: Item) => void
  onComplete?: (item: Item) => void
}

export function IdeaCard({
  item,
  onClick,
  showMeta = false,
  draggable,
  onDragStart,
  onDragEnd,
  onDelete,
  onComplete
}: Props) {
  const [deleteArmed, setDeleteArmed] = useState(false)

  return (
    <button
      type="button"
      className="card-shell cortex-card"
      onClick={(event) => {
        if ((event.ctrlKey || event.metaKey) && item.url) {
          window.open(item.url, '_blank', 'noopener,noreferrer')
          return
        }
        onClick(item)
      }}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', item.id)
        onDragStart?.(event)
      }}
      onDragEnd={onDragEnd}
    >
      {!item.completed_at && onComplete ? (
        <span
          className="complete-checkbox"
          role="button"
          aria-label={`Mark ${item.title} complete`}
          title="Mark complete"
          onClick={(event) => {
            event.stopPropagation()
            onComplete(item)
          }}
        >
          <Check size={12} />
        </span>
      ) : null}

      {onDelete ? (
        <span
          className="card-delete-button"
          role="button"
          data-armed={deleteArmed || undefined}
          aria-label={deleteArmed ? `Confirm delete ${item.title}` : `Delete ${item.title}`}
          title={deleteArmed ? 'Click again to confirm' : 'Delete'}
          onClick={(event) => {
            event.stopPropagation()
            if (!deleteArmed) {
              setDeleteArmed(true)
              setTimeout(() => setDeleteArmed(false), 2500)
            } else {
              setDeleteArmed(false)
              onDelete(item)
            }
          }}
        >
          {deleteArmed ? '?' : <X size={12} />}
        </span>
      ) : null}

      <div className="card-kicker idea">IDEA</div>

      <div className="card-body">
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="card-title">{item.title}</div>
          {item.note ? <div className="card-note">{item.note}</div> : null}
        </div>
      </div>

      {showMeta && item.tags.length > 0 ? (
        <div className="tag-row">
          {item.tags.map((tag) => (
            <TagPill key={tag} tag={tag} />
          ))}
        </div>
      ) : null}
    </button>
  )
}

export default IdeaCard
