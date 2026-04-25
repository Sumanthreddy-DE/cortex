import { Archive, LayoutGrid, ListFilter, Plus, Search, Settings } from 'lucide-react'
import type { View } from '../../shared/constants'

interface Props {
  view: View
  onViewChange: (view: View) => void
  searchQuery: string
  onSearchChange: (value: string) => void
  onAddClick: () => void
  inboxCount: number
}

export function TopBar({
  view,
  onViewChange,
  searchQuery,
  onSearchChange,
  onAddClick,
  inboxCount
}: Props) {
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="brand-mark" />
        <div className="brand-copy">
          <div className="brand-title">Cortex</div>
          <div className="brand-subtitle">Local-first command center</div>
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
          data-active={view === 'archive'}
          onClick={() => onViewChange('archive')}
        >
          <Archive size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          Archive
        </button>
      </div>

      {inboxCount > 0 ? (
        <button type="button" className="button-ghost" onClick={() => onViewChange('priority')}>
          Inbox ({inboxCount})
        </button>
      ) : null}

      <div className="topbar-spacer" />

      <div className="search-wrap" style={{ position: 'relative' }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            color: 'var(--text-dim)'
          }}
        />
        <input
          id="cortex-search-input"
          className="search-input"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search links, notes, tags... (/ or Ctrl+K)"
          style={{ paddingLeft: 36 }}
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
