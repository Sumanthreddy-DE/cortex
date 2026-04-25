import { useEffect, useState } from 'react'
import type { Item, ItemPayload } from './lib/api'
import type { View } from '../shared/constants'
import { useItems } from './hooks/useItems'
import { useSearch } from './hooks/useSearch'
import TopBar from './components/TopBar'
import PriorityView from './components/PriorityView'
import CategoryView from './components/CategoryView'
import ArchiveView from './components/ArchiveView'
import EditModal from './components/EditModal'
import SearchResults from './components/SearchResults'
import SettingsView from './components/SettingsView'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tag = target.tagName
  return (
    target.isContentEditable ||
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.closest('[contenteditable="true"]') !== null
  )
}

function LoadingPriorityView() {
  return (
    <div className="board-scroll">
      <div className="priority-board">
        <div className="board-columns">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton-column">
              <div className="skeleton-chip" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState<View>('priority')
  const [searchQuery, setSearchQuery] = useState('')
  const [editItem, setEditItem] = useState<Item | null | undefined>(undefined)

  const { items, loading, error, create, update, remove, restore, refresh } = useItems()
  const { results, loading: searchLoading } = useSearch(searchQuery)

  const inboxCount = items.filter((item) => item.priority === 'inbox').length
  const showSearch = (view === 'priority' || view === 'category') && searchQuery.trim().length > 0

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const lowerKey = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && lowerKey === 'k') {
        event.preventDefault()
        document.getElementById('cortex-search-input')?.focus()
        return
      }

      if (event.key === '/' && !isEditableTarget(event.target)) {
        event.preventDefault()
        document.getElementById('cortex-search-input')?.focus()
        return
      }

      if (event.key === 'Escape') {
        if (editItem !== undefined) {
          setEditItem(undefined)
          return
        }

        if (searchQuery) {
          setSearchQuery('')
        }
        return
      }

      if (lowerKey === 'n' && !event.ctrlKey && !event.metaKey && !isEditableTarget(event.target)) {
        event.preventDefault()
        setEditItem(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editItem, searchQuery])

  async function handleSave(payload: ItemPayload, itemId?: string) {
    if (itemId) {
      await update(itemId, payload)
    } else {
      await create(payload)
    }

    setEditItem(undefined)
  }

  async function handleDelete(id: string) {
    await remove(id)
    setEditItem(undefined)
  }

  async function handleTagChange(item: Item, nextTags: string[]) {
    await update(item.id, { tags: nextTags })
  }

  async function handleArchiveAll(ids: string[]) {
    for (const id of ids) {
      await remove(id)
    }
  }

  return (
    <div className="app-shell">
      <TopBar
        view={view}
        onViewChange={setView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={() => setEditItem(null)}
        inboxCount={inboxCount}
      />

      {error ? <div className="status-banner">{error}</div> : null}

      {showSearch ? (
        <SearchResults
          query={searchQuery}
          results={results}
          loading={searchLoading}
          onCardClick={(item) => setEditItem(item)}
        />
      ) : loading ? (
        <LoadingPriorityView />
      ) : view === 'priority' ? (
        <PriorityView
          items={items}
          onCardClick={(item) => setEditItem(item)}
          onArchiveAll={handleArchiveAll}
        />
      ) : view === 'category' ? (
        <CategoryView
          items={items}
          onTagChange={handleTagChange}
          onCardClick={(item) => setEditItem(item)}
        />
      ) : view === 'settings' ? (
        <SettingsView />
      ) : (
        <ArchiveView
          onRestore={async (id) => {
            await restore(id)
            await refresh({ silent: true })
          }}
        />
      )}

      {editItem !== undefined ? (
        <EditModal
          item={editItem}
          onSave={handleSave}
          onDelete={editItem ? handleDelete : undefined}
          onClose={() => setEditItem(undefined)}
        />
      ) : null}
    </div>
  )
}
