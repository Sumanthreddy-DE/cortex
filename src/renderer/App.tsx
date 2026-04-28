import { useEffect, useState } from 'react'
import type { Item, ItemPayload } from './lib/api'
import {
  getFixedBucketTag,
  stripFixedBucketTags,
  type BoardPriority,
  type FixedBucketTag,
  type View
} from '../shared/constants'
import { useItems } from './hooks/useItems'
import { useSearch } from './hooks/useSearch'
import TopBar from './components/TopBar'
import PriorityView from './components/PriorityView'
import CategoryView from './components/CategoryView'
import ArchiveView from './components/ArchiveView'
import CompletedView from './components/CompletedView'
import EditModal from './components/EditModal'
import SearchResults from './components/SearchResults'
import SettingsView from './components/SettingsView'
import { hasDesktopBridge } from './lib/desktop'

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

  const {
    items,
    completedItems,
    loading,
    error,
    create,
    update,
    appendNote,
    archive,
    deletePermanently,
    restore,
    complete,
    uncomplete,
    refresh
  } = useItems()
  const { results, loading: searchLoading } = useSearch(searchQuery)

  const inboxCount = items.filter((item) => item.priority === 'inbox' && !getFixedBucketTag(item.tags)).length
  const showSearch = (view === 'priority' || view === 'category') && searchQuery.trim().length > 0
  const isBrowserPreview = !hasDesktopBridge()

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

  function focusInboxColumn() {
    window.requestAnimationFrame(() => {
      document.getElementById('priority-column-inbox')?.scrollIntoView({
        behavior: 'smooth',
        inline: 'start',
        block: 'nearest'
      })
    })
  }

  async function handleArchive(id: string) {
    await archive(id)
    setEditItem(undefined)
  }

  async function handleDelete(id: string) {
    await deletePermanently(id)
    setEditItem(undefined)
  }

  async function handleTagChange(item: Item, nextTags: string[]) {
    await update(item.id, { tags: nextTags })
  }

  async function handlePriorityChange(item: Item, nextPriority: BoardPriority) {
    await update(item.id, {
      priority: nextPriority,
      tags: stripFixedBucketTags(item.tags)
    })
  }

  async function handleBucketChange(item: Item, nextBucket: FixedBucketTag) {
    await update(item.id, {
      tags: [...stripFixedBucketTags(item.tags), nextBucket]
    })
  }

  async function handleQuickDelete(item: Item) {
    if (!window.confirm(`Delete "${item.title}" permanently?`)) {
      return
    }

    await deletePermanently(item.id)
  }

  async function handleArchiveAll(ids: string[]) {
    for (const id of ids) {
      await archive(id)
    }
  }

  async function handleComplete(item: Item) {
    await complete(item.id)
    if (editItem?.id === item.id) {
      setEditItem(undefined)
    }
  }

  async function handleUncomplete(item: Item) {
    await uncomplete(item.id)
    if (editItem?.id === item.id) {
      setEditItem(undefined)
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
        onInboxClick={() => {
          setView('priority')
          focusInboxColumn()
        }}
      />

      {isBrowserPreview ? (
        <div className="info-banner">
          Browser preview mode: board, search, tags, archive, and settings are live here. Desktop-only features such
          as tray, global shortcuts, Windows startup, and calendar automation stay in the Electron build.
        </div>
      ) : null}

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
          onPriorityChange={handlePriorityChange}
          onBucketChange={handleBucketChange}
          onDelete={handleQuickDelete}
          onComplete={handleComplete}
        />
      ) : view === 'category' ? (
        <CategoryView
          items={items}
          onTagChange={handleTagChange}
          onComplete={handleComplete}
          onAppendNote={async (item, content) => {
            await appendNote(item.id, content)
          }}
          onCardClick={(item) => setEditItem(item)}
        />
      ) : view === 'completed' ? (
        <CompletedView
          items={completedItems}
          onRestore={handleUncomplete}
          onCardClick={(item) => setEditItem(item)}
        />
      ) : view === 'settings' ? (
        <SettingsView />
      ) : (
        <ArchiveView
          onDelete={async (id) => {
            await deletePermanently(id)
          }}
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
          onArchive={editItem ? handleArchive : undefined}
          onDelete={editItem ? handleDelete : undefined}
          onComplete={
            editItem
              ? async (id) => {
                  await complete(id)
                  setEditItem(undefined)
                }
              : undefined
          }
          onUncomplete={
            editItem
              ? async (id) => {
                  await uncomplete(id)
                  setEditItem(undefined)
                }
              : undefined
          }
          onClose={() => setEditItem(undefined)}
        />
      ) : null}
    </div>
  )
}
