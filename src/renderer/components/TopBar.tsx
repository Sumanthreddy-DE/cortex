import { Archive, Boxes, CheckCircle2, LayoutGrid, ListFilter, Plus, Search, Settings } from 'lucide-react'
import { useState } from 'react'
import type { View } from '../../shared/constants'

interface Props {
  view: View
  onViewChange: (view: View) => void
  searchQuery: string
  onSearchChange: (value: string) => void
  onAddClick: () => void
  inboxCount: number
  onInboxClick: () => void
}

export function TopBar({
  view,
  onViewChange,
  searchQuery,
  onSearchChange,
  onAddClick,
  inboxCount,
  onInboxClick
}: Props) {
  const [searchExpanded, setSearchExpanded] = useState(Boolean(searchQuery))
  const searchOpen = searchExpanded || Boolean(searchQuery)

  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="brand-mark" />
        <div className="brand-copy">
          <div className="brand-title">Cortex</div>
        </div>
      </div>

      <div className="segmented" role="tablist" aria-label="View switcher">
        <button
          type="button"
          data-active={view === 'priority'}
          onClick={() => onViewChange('priority')}
        >
          <ListFilter size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          Priority
        </button>
        <button
          type="button"
          data-active={view === 'category'}
          onClick={() => onViewChange('category')}
        >
          <LayoutGrid size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          Category
        </button>
        <button
          type="button"
          data-active={view === 'completed'}
          onClick={() => onViewChange('completed')}
        >
          <CheckCircle2 size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          Completed
        </button>
        <button
          type="button"
          data-active={view === 'spaces'}
          onClick={() => onViewChange('spaces')}
        >
          <Boxes size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          Spaces
        </button>
        <button
          type="button"
          data-active={view === 'archive'}
          onClick={() => onViewChange('archive')}
        >
          <Archive size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          Archive
        </button>
      </div>

      {inboxCount > 0 ? (
        <button
          type="button"
          className="button-ghost button-attention"
          onClick={onInboxClick}
          title={`${inboxCount} item${inboxCount === 1 ? '' : 's'} waiting in Inbox`}
        >
          <span className="inbox-dot" aria-hidden="true" /> {inboxCount} in inbox
        </button>
      ) : null}

      <div className="topbar-spacer" />

      <div className={`search-wrap ${searchOpen ? 'search-wrap-expanded' : ''}`}>
        <button
          type="button"
          className="search-toggle"
          aria-label="Search"
          onClick={() => {
            setSearchExpanded(true)
            window.requestAnimationFrame(() => document.getElementById('cortex-search-input')?.focus())
          }}
        >
          <Search size={16} />
        </button>
        <input
          id="cortex-search-input"
          className="search-input"
          value={searchQuery}
          tabIndex={searchOpen ? 0 : -1}
          onFocus={() => setSearchExpanded(true)}
          onBlur={() => {
            if (!searchQuery) {
              setSearchExpanded(false)
            }
          }}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search... (/ or Ctrl+K)"
        />
      </div>

      <button
        type="button"
        className={`button-icon ${view === 'settings' ? 'button-icon-active' : ''}`}
        onClick={() => onViewChange('settings')}
        title="Settings"
        aria-label="Settings"
      >
        <Settings size={16} />
      </button>

      <button type="button" className="button-primary" onClick={onAddClick}>
        <Plus size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
        Add
      </button>
    </header>
  )
}

export default TopBar
