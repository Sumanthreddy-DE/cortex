import type { CSSProperties, DragEventHandler, MouseEvent } from 'react'
import { X } from 'lucide-react'
import { PRIORITY_COLORS } from '../../shared/constants'
import type { Item } from '../lib/api'
import { tagColor } from '../lib/utils'

interface Props {
  item: Item
  onClick: (item: Item) => void
  showMeta?: boolean
  draggable?: boolean
  onDragStart?: DragEventHandler<HTMLButtonElement>
  onDragEnd?: DragEventHandler<HTMLButtonElement>
  onDelete?: (item: Item) => void
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
  onDelete
}: Props) {
  const hostname = getHostname(item.url)
  const letter = (hostname[0] ?? item.title[0] ?? '?').toUpperCase()

  const cardStyle = {
    '--mouse-x': '50%',
    '--mouse-y': '50%'
  } as CSSProperties

  function handleMouseMove(event: MouseEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width) * 100
    const y = ((event.clientY - bounds.top) / bounds.height) * 100

    event.currentTarget.style.setProperty('--mouse-x', `${x.toFixed(1)}%`)
    event.currentTarget.style.setProperty('--mouse-y', `${y.toFixed(1)}%`)
  }

  return (
    <button
      type="button"
      className="card-shell cortex-card"
      style={{
        ...cardStyle,
        textAlign: 'left',
        borderLeft: `2px solid ${PRIORITY_COLORS[item.priority] ?? '#6b7280'}`
      }}
      onMouseMove={handleMouseMove}
      onClick={() => onClick(item)}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', item.id)
        onDragStart?.(event)
      }}
      onDragEnd={onDragEnd}
    >
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
          {item.tags.map((tag) => {
            const [background, color] = tagColor(tag)
            return (
              <span key={tag} className="tag-pill" style={{ background, color }}>
                {tag}
              </span>
            )
          })}
        </div>
      ) : null}
    </button>
  )
}

export default Card
