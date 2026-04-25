import { useState } from 'react'
import type { Item } from '../lib/api'
import Card from './Card'
import IdeaCard from './IdeaCard'

interface Props {
  items: Item[]
  onTagChange: (item: Item, nextTags: string[]) => Promise<void> | void
  onCardClick: (item: Item) => void
}

type DragSource = {
  item: Item
  fromTag: string
} | null

function renderCard(
  item: Item,
  onCardClick: (item: Item) => void,
  onDragStart: () => void,
  onDragEnd: () => void
) {
  if (item.type === 'idea') {
    return (
      <IdeaCard
        item={item}
        onClick={onCardClick}
        showMeta
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    )
  }

  return (
    <Card
      item={item}
      onClick={onCardClick}
      showMeta
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    />
  )
}

export function CategoryView({ items, onTagChange, onCardClick }: Props) {
  const [dragSource, setDragSource] = useState<DragSource>(null)
  const [dropTag, setDropTag] = useState<string | null>(null)

  const groups = new Map<string, Item[]>()
  const sortedItems = [...items].sort((left, right) => left.title.localeCompare(right.title))

  for (const item of sortedItems) {
    if (item.tags.length === 0) {
      groups.set('Untagged', [...(groups.get('Untagged') ?? []), item])
      continue
    }

    for (const tag of item.tags) {
      groups.set(tag, [...(groups.get(tag) ?? []), item])
    }
  }

  const groupNames = Array.from(groups.keys()).sort((left, right) => {
    if (left === 'Untagged') {
      return 1
    }
    if (right === 'Untagged') {
      return -1
    }
    return left.localeCompare(right)
  })

  async function handleDrop(targetTag: string) {
    if (!dragSource || targetTag === 'Untagged') {
      setDragSource(null)
      setDropTag(null)
      return
    }

    const nextTags =
      dragSource.fromTag === 'Untagged'
        ? [...dragSource.item.tags, targetTag]
        : dragSource.item.tags
            .filter((tag) => tag.toLowerCase() !== dragSource.fromTag.toLowerCase())
            .concat(
              dragSource.item.tags.some((tag) => tag.toLowerCase() === targetTag.toLowerCase())
                ? []
                : [targetTag]
            )

    await onTagChange(dragSource.item, nextTags)
    setDragSource(null)
    setDropTag(null)
  }

  return (
    <div className="content-panel">
      <div className="card-meta" style={{ marginBottom: 14 }}>
        Drag items between categories to replace the source tag while preserving everything else.
      </div>

      {groupNames.length === 0 ? (
        <div className="empty-state">
          No items yet - press <strong style={{ color: 'var(--text-muted)' }}>Ctrl+Shift+N</strong> to save
          {' '}your first idea.
        </div>
      ) : (
        <div className="category-grid">
          {groupNames.map((tag) => (
            <section
              key={tag}
              className="category-group"
              data-drop-active={dropTag === tag}
              onDragOver={(event) => {
                if (tag === 'Untagged') {
                  return
                }
                event.preventDefault()
                setDropTag(tag)
              }}
              onDragLeave={() => {
                if (dropTag === tag) {
                  setDropTag(null)
                }
              }}
              onDrop={async (event) => {
                event.preventDefault()
                await handleDrop(tag)
              }}
            >
              <header className="column-header">
                <span className="column-title" style={{ textTransform: 'none', letterSpacing: 0 }}>
                  {tag}
                </span>
                <span className="column-count">{groups.get(tag)?.length ?? 0}</span>
              </header>

              {(groups.get(tag) ?? []).map((item) => (
                <div key={`${tag}-${item.id}`}>
                  {renderCard(
                    item,
                    onCardClick,
                    () => setDragSource({ item, fromTag: tag }),
                    () => {
                      setDragSource(null)
                      setDropTag(null)
                    }
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

export default CategoryView
