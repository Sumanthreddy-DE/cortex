import type { ReactNode } from 'react'
import type { Item } from '../lib/api'

interface Props {
  query: string
  results: Item[]
  loading: boolean
  onCardClick: (item: Item) => void
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlight(value: string, query: string): ReactNode {
  if (!query.trim()) {
    return value
  }

  const parts = value.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'))
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? <mark key={`${part}-${index}`}>{part}</mark> : part
  )
}

export function SearchResults({ query, results, loading, onCardClick }: Props) {
  if (loading) {
    return (
      <div className="content-panel">
        <div className="card-meta">Searching for "{query}"...</div>
      </div>
    )
  }

  return (
    <div className="content-panel">
      <div className="search-results">
        {results.length === 0 ? (
          <div className="empty-state">No results for "{query}"</div>
        ) : (
          results.map((item) => (
            <button
              key={item.id}
              type="button"
              className="search-row"
              style={{ textAlign: 'left' }}
              onClick={() => onCardClick(item)}
            >
              <div className="card-title">{highlight(item.title, query)}</div>
              {item.url ? <div className="card-meta">{highlight(item.url, query)}</div> : null}
              {item.note ? <div className="card-note">{highlight(item.note, query)}</div> : null}
              <div className="tag-row">
                <span className="tag-pill">{item.priority}</span>
                {item.tags.map((tag) => (
                  <span key={tag} className="tag-pill">
                    {highlight(tag, query)}
                  </span>
                ))}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export default SearchResults
