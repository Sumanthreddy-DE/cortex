import type { Item } from '../lib/api'

interface Props {
  items: Item[]
  onCardClick: (item: Item) => void
  onDelete: (item: Item) => void
  onComplete: (item: Item) => void
}

function priorityDotClass(item: Item): string {
  const p = item.priority
  if (p === 'today' || p === 'for-now') return 'ideas-dot ideas-dot-high'
  if (p === 'tomorrow' || p === 'this-week') return 'ideas-dot ideas-dot-medium'
  if (p === 'someday') return 'ideas-dot ideas-dot-low'
  return 'ideas-dot ideas-dot-none'
}

function buildThemes(items: Item[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>()
  for (const item of items) {
    for (const tag of item.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}

export function IdeasBucketBody({ items, onCardClick, onDelete, onComplete }: Props) {
  const themes = buildThemes(items)
  const maxCount = themes[0]?.count ?? 1

  return (
    <div className="ideas-body">
      <div className="ideas-list">
        {items.map((item) => (
          <div key={item.id} className="ideas-row" onClick={() => onCardClick(item)}>
            <span className={priorityDotClass(item)} />
            <span className="ideas-row-title">{item.title}</span>
            <span className="ideas-row-tags">
              {item.tags.map((tag) => (
                <span key={tag} className="ideas-row-tag">{tag}</span>
              ))}
            </span>
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
          </div>
        ))}
      </div>

      {themes.length > 0 ? (
        <div className="ideas-themes">
          <div className="ideas-themes-title">Themes</div>
          {themes.map(({ tag, count }) => (
            <div key={tag} className="ideas-theme-row">
              <div className="ideas-theme-header">
                <span className="ideas-theme-tag">{tag}</span>
                <span className="ideas-theme-count">{count}</span>
              </div>
              <div className="ideas-theme-bar-bg">
                <div
                  className="ideas-theme-bar"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default IdeasBucketBody
