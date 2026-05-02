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

function getHostname(url: string | null): string {
  if (!url) {
    return ''
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function Card({
  item,
  onClick,
  showMeta = false,
  draggable,
  onDragStart,
  onDragEnd,
  onDelete,
  onComplete
}: Props) {
  const hostname = getHostname(item.url)
  const letter = (hostname[0] ?? item.title[0] ?? '?').toUpperCase()

  return (
    <button
      type="button"
      className="card-shell cortex-card"
      onClick={() => onClick(item)}
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
          aria-label={`Delete ${item.title}`}
          onClick={(event) => {
            event.stopPropagation()
            onDelete(item)
          }}
        >
          <X size={12} />
        </span>
      ) : null}

      <div className="card-header">
        <div className="favicon-stack" aria-hidden="true">
          <div className="favicon-fallback">{letter}</div>
          {item.url ? (
            <img
              className="favicon-image"
              src={item.favicon_url ?? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
              alt=""
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          ) : null}
        </div>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="card-title">{item.title}</div>
          {showMeta && hostname ? <div className="card-meta">{hostname}</div> : null}
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

export default Card
