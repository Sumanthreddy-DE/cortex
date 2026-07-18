import { Check } from 'lucide-react'
import type { Item } from '../lib/api'

interface Props {
  items: Item[]
  onCardClick: (item: Item) => void
  onDelete: (item: Item) => void
  onComplete: (item: Item) => void
  inSelectMode: boolean
  bucketSelectIds: Set<string>
  onToggleSelect: (id: string) => void
}

function priorityDotClass(item: Item): string {
  const p = item.priority
  if (p === 'today' || p === 'for-now') return 'ideas-dot ideas-dot-high'
  if (p === 'tomorrow' || p === 'this-week') return 'ideas-dot ideas-dot-medium'
  if (p === 'someday') return 'ideas-dot ideas-dot-low'
  return 'ideas-dot ideas-dot-none'
}

export function IdeasBucketBody({
  items,
  onCardClick,
  onDelete,
  onComplete,
  inSelectMode,
  bucketSelectIds,
  onToggleSelect,
}: Props) {
  return (
    <div className="ideas-list">
      {items.map((item) => {
        const isSelected = bucketSelectIds.has(item.id)
        const secondaryTags = item.tags.filter((t) => t.toLowerCase() !== 'ideas')
        return (
          <div
            key={item.id}
            className={[
              'ideas-row',
              inSelectMode ? 'ideas-row-selectable' : '',
              isSelected ? 'ideas-row-selected' : '',
            ].filter(Boolean).join(' ')}
            onClick={inSelectMode ? () => onToggleSelect(item.id) : () => onCardClick(item)}
          >
            {inSelectMode ? (
              <span className="ideas-row-check">
                {isSelected && <Check size={10} strokeWidth={3} />}
              </span>
            ) : (
              <span className={priorityDotClass(item)} />
            )}
            <span className="ideas-row-title">{item.title}</span>
            {secondaryTags.length > 0 ? (
              <span className="ideas-row-tags">
                {secondaryTags.map((tag) => (
                  <span key={tag} className="ideas-row-tag">{tag}</span>
                ))}
              </span>
            ) : null}
            {!inSelectMode ? (
              <span className="ideas-row-actions">
                <button
                  type="button"
                  className="ideas-row-btn"
                  title="Complete"
                  onClick={(e) => { e.stopPropagation(); onComplete(item) }}
                >
                  ✓
                </button>
                <button
                  type="button"
                  className="ideas-row-btn"
                  title="Delete"
                  onClick={(e) => { e.stopPropagation(); onDelete(item) }}
                >
                  ×
                </button>
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default IdeasBucketBody
