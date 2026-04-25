import type { CSSProperties, MouseEvent } from 'react'
import { PenLine } from 'lucide-react'
import type { Item } from '../lib/api'

interface Props {
  item: Item
  onClick: (item: Item) => void
  showMeta?: boolean
  draggable?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
}

export function IdeaCard({
  item,
  onClick,
  showMeta = false,
  draggable,
  onDragStart,
  onDragEnd
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
        borderLeft: '2px solid #f97316'
      }}
      onMouseMove={handleMouseMove}
      onClick={() => onClick(item)}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
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
          {item.tags.map((tag) => (
            <span key={tag} className="tag-pill">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  )
}

export default IdeaCard
