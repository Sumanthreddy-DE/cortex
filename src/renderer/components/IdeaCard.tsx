import type { CSSProperties, DragEventHandler, MouseEvent } from 'react'
import { PenLine, X } from 'lucide-react'
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

export function IdeaCard({
  item,
  onClick,
  showMeta = false,
  draggable,
  onDragStart,
  onDragEnd,
  onDelete
}: Props) {
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
      data-card-kind="idea"
      style={{
        ...cardStyle,
        textAlign: 'left',
        borderLeft: `2px solid ${PRIORITY_COLORS[item.priority] ?? '#f97316'}`
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
        <div
          className="favicon-stack"
          aria-hidden="true"
          style={{ display: 'grid', placeItems: 'center' }}
        >
          <div
            className="favicon-fallback"
            style={{ background: 'rgba(249, 115, 22, 0.12)', color: '#f97316' }}
          >
            <PenLine size={12} />
          </div>
        </div>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="card-title">{item.title}</div>
          {item.note ? <div className="card-note">{item.note}</div> : null}
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

export default IdeaCard
