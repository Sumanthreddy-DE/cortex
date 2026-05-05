import { Bell, BellOff, Plus, Search, Settings } from 'lucide-react'
import { useState } from 'react'
import type { View } from '../../shared/constants'
import { usePush } from '../hooks/usePush'

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
  const { state: pushState, subscribe, unsubscribe } = usePush()

  function getBellTitle() {
    if (pushState === 'unsupported') return 'Push notifications not supported in this browser'
    if (pushState === 'denied') return 'Notifications blocked — check browser settings'
    if (pushState === 'subscribed') return 'Notifications on — click to disable'
    if (pushState === 'loading') return 'Loading…'
    return 'Enable push notifications for Inbox'
  }

  function handleBellClick() {
    if (pushState === 'subscribed') unsubscribe()
    else if (pushState === 'default') subscribe()
  }

  return (
    <header className="topbar">
      <div className="brand-lockup">
        <span className="brand-mark" />
        <span className="brand-name">Cortex</span>
      </div>

      <div className="segmented" role="tablist" aria-label="View switcher">
        <button type="button" data-active={view === 'priority'} onClick={() => onViewChange('priority')}>
          Priority
        </button>
        <button type="button" data-active={view === 'category'} onClick={() => onViewChange('category')}>
          Category
        </button>
        <button type="button" data-active={view === 'completed'} onClick={() => onViewChange('completed')}>
          Completed
        </button>
        <button type="button" data-active={view === 'spaces'} onClick={() => onViewChange('spaces')}>
          Spaces
        </button>
        <button type="button" data-active={view === 'archive'} onClick={() => onViewChange('archive')}>
          Archive
        </button>
        <button type="button" data-active={view === 'issues'} onClick={() => onViewChange('issues')}>
          Issues
        </button>
        <button type="button" data-active={view === 'research'} onClick={() => onViewChange('research')}>
          Research
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

      {pushState !== 'unsupported' && (
        <button
          type="button"
          className={`button-icon bell-btn`}
          data-state={pushState}
          onClick={handleBellClick}
          title={getBellTitle()}
          aria-label={getBellTitle()}
          disabled={pushState === 'denied' || pushState === 'loading'}
        >
          {pushState === 'subscribed' ? <Bell size={15} /> : <BellOff size={15} />}
        </button>
      )}

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
