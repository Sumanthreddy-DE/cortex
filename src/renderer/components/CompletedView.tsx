import { RotateCcw } from 'lucide-react'
import { useMemo } from 'react'
import type { Item } from '../lib/api'
import { formatExact, formatRelative } from '../lib/utils'
import TagPill from './TagPill'

interface Props {
  items: Item[]
  onRestore: (item: Item) => Promise<void> | void
  onCardClick: (item: Item) => void
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

function getFavicon(item: Item): string | null {
  if (!item.url) {
    return null
  }

  return item.favicon_url ?? `https://www.google.com/s2/favicons?domain=${getHostname(item.url)}&sz=32`
}

export function CompletedView({ items, onRestore, onCardClick }: Props) {
  const completed = useMemo(
    () =>
      [...items]
        .filter((item) => item.completed_at)
        .sort((left, right) => (right.completed_at ?? 0) - (left.completed_at ?? 0)),
    [items]
  )

  const groups = useMemo(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const today = todayStart.getTime()
    const yesterday = today - 86_400_000
    const week = today - 7 * 86_400_000
    const lastWeek = today - 14 * 86_400_000
    const month = today - 30 * 86_400_000
    const buckets = [
      { key: 'Today', items: [] as Item[] },
      { key: 'Yesterday', items: [] as Item[] },
      { key: 'Earlier this week', items: [] as Item[] },
      { key: 'Last week', items: [] as Item[] },
      { key: 'This month', items: [] as Item[] },
      { key: 'Older', items: [] as Item[] }
    ]

    for (const item of completed) {
      const timestamp = item.completed_at ?? 0
      if (timestamp >= today) {
        buckets[0].items.push(item)
      } else if (timestamp >= yesterday) {
        buckets[1].items.push(item)
      } else if (timestamp >= week) {
        buckets[2].items.push(item)
      } else if (timestamp >= lastWeek) {
        buckets[3].items.push(item)
      } else if (timestamp >= month) {
        buckets[4].items.push(item)
      } else {
        buckets[5].items.push(item)
      }
    }

    return buckets.filter((bucket) => bucket.items.length > 0)
  }, [completed])

  const todayCount = groups.find((group) => group.key === 'Today')?.items.length ?? 0
  const weekCount = completed.filter(
    (item) => (item.completed_at ?? 0) >= Date.now() - 7 * 86_400_000
  ).length

  return (
    <div className="content-panel completed-view">
      <header className="completed-header">
        <div>
          <h1>Completed</h1>
          <p className="card-meta">
            {todayCount > 0 ? `${todayCount} completed today` : 'Nothing completed today'},{' '}
            {weekCount} this week, {completed.length} all time.
          </p>
        </div>
      </header>

      {groups.length === 0 ? (
        <div className="empty-state">Nothing completed yet.</div>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="completed-group">
            <h2>{group.key}</h2>
            <div className="completed-list">
              {group.items.map((item) => {
                const favicon = getFavicon(item)
                const hostname = getHostname(item.url)

                return (
                  <button
                    key={item.id}
                    type="button"
                    className="completed-row"
                    onClick={() => onCardClick(item)}
                  >
                    <span className="completed-check" aria-hidden="true">✓</span>
                    <span className="completed-favicon" aria-hidden="true">
                      {favicon ? (
                        <img
                          src={favicon}
                          alt=""
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        item.title[0]?.toUpperCase() ?? '?'
                      )}
                    </span>
                    <span className="completed-main">
                      <span className="completed-title">{item.title}</span>
                      <span className="completed-meta">
                        {hostname ? <span>{hostname}</span> : null}
                        {item.tags.slice(0, 2).map((tag) => (
                          <TagPill key={tag} tag={tag} dim />
                        ))}
                      </span>
                    </span>
                    <span className="completed-time">
                      <span>{formatRelative(item.completed_at!)}</span>
                      <span>{formatExact(item.completed_at!)}</span>
                    </span>
                    <span
                      className="restore-btn"
                      role="button"
                      tabIndex={0}
                      title="Mark not completed"
                      onClick={(event) => {
                        event.stopPropagation()
                        void onRestore(item)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          void onRestore(item)
                        }
                      }}
                    >
                      <RotateCcw size={14} />
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

export default CompletedView
