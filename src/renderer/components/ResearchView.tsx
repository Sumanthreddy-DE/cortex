import { ExternalLink } from 'lucide-react'
import type { Item } from '../lib/api'

interface Props {
  items: Item[]
  onCardClick: (item: Item) => void
}

function getHostname(url: string | null): string {
  if (!url) return ''
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function getFavicon(item: Item): string | null {
  if (!item.url) return null
  return item.favicon_url ?? `https://www.google.com/s2/favicons?domain=${getHostname(item.url)}&sz=32`
}

export function ResearchView({ items, onCardClick }: Props) {
  const companies = items.filter((item) => item.type === 'company')

  return (
    <div className="content-panel research-view">
      <header className="research-header">
        <h1>Research</h1>
        <p>Companies and opportunities worth tracking.</p>
      </header>

      {companies.length === 0 ? (
        <div className="empty-state">No companies saved yet. Add one with the + Add button.</div>
      ) : (
        <div className="research-grid">
          {companies.map((item) => {
            const favicon = getFavicon(item)
            const hostname = getHostname(item.url)
            return (
              <div key={item.id} className="research-card" onClick={() => onCardClick(item)}>
                <div className="research-card-top">
                  <span className="research-favicon">
                    {favicon ? (
                      <img
                        src={favicon}
                        alt=""
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : (
                      <span className="research-favicon-letter">
                        {item.title[0]?.toUpperCase() ?? '?'}
                      </span>
                    )}
                  </span>
                  <div className="research-card-meta">
                    <span className="research-card-title">{item.title}</span>
                    {hostname ? (
                      <span className="research-card-host">{hostname}</span>
                    ) : null}
                  </div>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button-icon research-link-btn"
                      title="Open"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={12} />
                    </a>
                  ) : null}
                </div>
                {item.note ? (
                  <p className="research-card-note">{item.note}</p>
                ) : null}
                {item.tags.length > 0 ? (
                  <div className="research-card-tags">
                    {item.tags.map((tag) => (
                      <span key={tag} className="research-card-tag">{tag}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ResearchView
