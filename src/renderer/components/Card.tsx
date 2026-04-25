import type { CSSProperties, MouseEvent } from 'react'
import type { Item } from '../lib/api'

interface Props {
  item: Item
  onClick: (item: Item) => void
  showMeta?: boolean
  draggable?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
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

export function Card({ item, onClick, showMeta = false, draggable, onDragStart, onDragEnd }: Props) {
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
      style={{ ...cardStyle, textAlign: 'left' }}
      onMouseMove={handleMouseMove}
      onClick={() => onClick(item)}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
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
            <span key={tag} className="tag-pill">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  )
}

export default Card
