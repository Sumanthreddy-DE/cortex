import { Pin, PinOff, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Item, Space } from '../lib/api'
import { formatRelative } from '../lib/utils'

interface Props {
  spaces: Space[]
  items: Item[]
  onCreateSpace: (name: string) => Promise<void> | void
  onAddItem: (spaceId: string, itemId: string, pinned?: boolean) => Promise<void> | void
  onRemoveItem: (spaceId: string, itemId: string) => Promise<void> | void
  onSetPinned: (spaceId: string, itemId: string, pinned: boolean) => Promise<void> | void
  onOpenItem: (item: Item) => void
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

export function SpacesView({
  spaces,
  items,
  onCreateSpace,
  onAddItem,
  onRemoveItem,
  onSetPinned,
  onOpenItem
}: Props) {
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null)

  async function handleCreateSpace() {
    const name = window.prompt('New space name')
    if (!name?.trim()) {
      return
    }

    await onCreateSpace(name.trim())
  }

  return (
    <div className="content-panel spaces-view">
      <header className="spaces-header">
        <div>
          <h1>Spaces</h1>
          <p>Persistent project buckets for pinned and recently used captures.</p>
        </div>
        <button type="button" className="button-primary" onClick={() => void handleCreateSpace()}>
          <Plus size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          New Space
        </button>
      </header>

      <div className="spaces-grid">
        {spaces.map((space) => (
          <SpaceCard
            key={space.id}
            space={space}
            items={items}
            chooserOpen={selectedSpace === space.id}
            onToggleChooser={() => setSelectedSpace((current) => (current === space.id ? null : space.id))}
            onAddItem={onAddItem}
            onRemoveItem={onRemoveItem}
            onSetPinned={onSetPinned}
            onOpenItem={onOpenItem}
          />
        ))}
      </div>
    </div>
  )
}

function SpaceCard({
  space,
  items,
  chooserOpen,
  onToggleChooser,
  onAddItem,
  onRemoveItem,
  onSetPinned,
  onOpenItem
}: {
  space: Space
  items: Item[]
  chooserOpen: boolean
  onToggleChooser: () => void
  onAddItem: (spaceId: string, itemId: string, pinned?: boolean) => Promise<void> | void
  onRemoveItem: (spaceId: string, itemId: string) => Promise<void> | void
  onSetPinned: (spaceId: string, itemId: string, pinned: boolean) => Promise<void> | void
  onOpenItem: (item: Item) => void
}) {
  const spaceItems = items.filter((item) => item.spaces.includes(space.id))
  const pinned = spaceItems.filter((item) => item.space_pinned[space.id])
  const recent = spaceItems
    .filter((item) => !item.space_pinned[space.id] && item.last_opened_at)
    .sort((left, right) => (right.last_opened_at ?? 0) - (left.last_opened_at ?? 0))
    .slice(0, 5)
  const availableItems = useMemo(
    () => items.filter((item) => !item.spaces.includes(space.id)).slice(0, 8),
    [items, space.id]
  )
  const activeCount = spaceItems.filter(
    (item) => item.last_opened_at && item.last_opened_at > Date.now() - 86_400_000
  ).length

  return (
    <section className="space-card">
      <header className="space-card-header">
        <div>
          <h3>{space.name}</h3>
          {activeCount > 0 ? <span className="active-badge">{activeCount} active today</span> : null}
        </div>
        <span className="column-count">{spaceItems.length}</span>
      </header>

      {pinned.length > 0 ? (
        <div className="space-section">
          <h4>Pinned</h4>
          {pinned.map((item) => (
            <SpaceItemRow
              key={item.id}
              item={item}
              space={space}
              pinned
              onOpenItem={onOpenItem}
              onRemoveItem={onRemoveItem}
              onSetPinned={onSetPinned}
            />
          ))}
        </div>
      ) : null}

      {recent.length > 0 ? (
        <div className="space-section">
          <h4>Recent</h4>
          {recent.map((item) => (
            <SpaceItemRow
              key={item.id}
              item={item}
              space={space}
              onOpenItem={onOpenItem}
              onRemoveItem={onRemoveItem}
              onSetPinned={onSetPinned}
            />
          ))}
        </div>
      ) : null}

      {pinned.length === 0 && recent.length === 0 ? (
        <div className="empty-state">No pinned or recently used items yet.</div>
      ) : null}

      <button type="button" className="button-secondary add-to-space" onClick={onToggleChooser}>
        + Add to {space.name}
      </button>

      {chooserOpen ? (
        <div className="space-chooser">
          {availableItems.length === 0 ? (
            <div className="card-meta">No available active items.</div>
          ) : (
            availableItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="space-choice"
                onClick={() => void onAddItem(space.id, item.id, true)}
              >
                {item.title}
              </button>
            ))
          )}
        </div>
      ) : null}
    </section>
  )
}

function SpaceItemRow({
  item,
  space,
  pinned = false,
  onOpenItem,
  onRemoveItem,
  onSetPinned
}: {
  item: Item
  space: Space
  pinned?: boolean
  onOpenItem: (item: Item) => void
  onRemoveItem: (spaceId: string, itemId: string) => Promise<void> | void
  onSetPinned: (spaceId: string, itemId: string, pinned: boolean) => Promise<void> | void
}) {
  const favicon = getFavicon(item)

  return (
    <div className="space-item-row">
      <button type="button" className="space-item-main" onClick={() => onOpenItem(item)}>
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
        <span>
          <span className="space-item-title">{item.title}</span>
          {item.last_opened_at ? (
            <span className="space-item-meta">used {formatRelative(item.last_opened_at)}</span>
          ) : null}
        </span>
      </button>
      <button
        type="button"
        className="button-icon space-row-action"
        title={pinned ? 'Unpin' : 'Pin'}
        onClick={() => void onSetPinned(space.id, item.id, !pinned)}
      >
        {pinned ? <PinOff size={13} /> : <Pin size={13} />}
      </button>
      <button
        type="button"
        className="button-icon space-row-action"
        title="Remove from space"
        onClick={() => void onRemoveItem(space.id, item.id)}
      >
        <X size={13} />
      </button>
    </div>
  )
}

export default SpacesView
