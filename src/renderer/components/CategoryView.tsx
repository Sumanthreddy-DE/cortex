import { useMemo, useState } from 'react'
import type { Item, ItemNoteEntry } from '../lib/api'
import { parseTag } from '../lib/utils'
import Card from './Card'
import IdeaCard from './IdeaCard'

interface Props {
  items: Item[]
  onTagChange: (item: Item, nextTags: string[]) => Promise<void> | void
  onAppendNote: (item: Item, content: string) => Promise<void> | void
  onCardClick: (item: Item) => void
}

type DragSource = {
  item: Item
  fromTag: string
} | null

interface TagBucket {
  tag: string
  items: Item[]
}

function formatEntryTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getDisplayEntries(item: Item): ItemNoteEntry[] {
  if (item.note_entries.length > 0) {
    return item.note_entries
  }

  if (!item.note) {
    return []
  }

  return [
    {
      id: `legacy-${item.id}`,
      item_id: item.id,
      content: item.note,
      created_at: item.updated_at,
      updated_at: item.updated_at
    }
  ]
}

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
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        showMeta
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

export function CategoryView({ items, onTagChange, onAppendNote, onCardClick }: Props) {
  const [dragSource, setDragSource] = useState<DragSource>(null)
  const [dropTag, setDropTag] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const tree = useMemo(() => {
    const nextTree = new Map<string, Map<string | null, TagBucket>>()
    const seen = new Set<string>()
    const sortedItems = [...items].sort((left, right) => left.title.localeCompare(right.title))

    for (const item of sortedItems) {
      if (item.tags.length === 0) {
        if (!nextTree.has('Untagged')) {
          nextTree.set('Untagged', new Map([[null, { tag: 'Untagged', items: [] }]]))
        }
        nextTree.get('Untagged')?.get(null)?.items.push(item)
        continue
      }

      for (const tag of item.tags) {
        const { parent, child, raw } = parseTag(tag)
        if (!parent) {
          continue
        }

        if (!nextTree.has(parent)) {
          nextTree.set(parent, new Map())
        }

        const childBuckets = nextTree.get(parent)!
        if (!childBuckets.has(child)) {
          childBuckets.set(child, { tag: raw, items: [] })
        }

        const key = `${parent}|${child ?? ''}|${item.id}`
        if (!seen.has(key)) {
          childBuckets.get(child)?.items.push(item)
          seen.add(key)
        }
      }
    }

    return nextTree
  }, [items])

  const parentTags = Array.from(tree.keys()).sort((left, right) => {
    if (left === 'Untagged') {
      return 1
    }
    if (right === 'Untagged') {
      return -1
    }
    return left.localeCompare(right)
  })

  async function handleDrop(targetTag: string) {
    if (!dragSource || targetTag === 'Untagged' || targetTag === dragSource.fromTag) {
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

  async function handleAppend(item: Item) {
    const content = drafts[item.id]?.trim() ?? ''
    if (!content) {
      return
    }

    setSavingId(item.id)
    try {
      await onAppendNote(item, content)
      setDrafts((current) => ({
        ...current,
        [item.id]: ''
      }))
    } finally {
      setSavingId(null)
    }
  }

  function renderItemBlock(item: Item, tag: string) {
    if (item.type !== 'idea') {
      return (
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
      )
    }

    const entries = getDisplayEntries(item)
    const draft = drafts[item.id] ?? ''

    return (
      <div key={`${tag}-${item.id}`} className="idea-thread">
        {renderCard(
          item,
          onCardClick,
          () => setDragSource({ item, fromTag: tag }),
          () => {
            setDragSource(null)
            setDropTag(null)
          }
        )}

        <div className="idea-thread-log">
          {entries.length === 0 ? (
            <div className="card-meta">No note entries yet. Start the thread below.</div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="idea-note-entry">
                <div className="idea-note-entry-meta">{formatEntryTimestamp(entry.created_at)}</div>
                <div className="idea-note-entry-body">{entry.content}</div>
              </div>
            ))
          )}
        </div>

        <div className="idea-thread-composer">
          <textarea
            className="text-area idea-thread-textarea"
            value={draft}
            onChange={(event) =>
              setDrafts((current) => ({
                ...current,
                [item.id]: event.target.value
              }))
            }
            placeholder="Append another note under this idea..."
          />
          <div className="idea-thread-actions">
            <button
              type="button"
              className="button-primary"
              disabled={savingId === item.id || !draft.trim()}
              onClick={() => void handleAppend(item)}
            >
              {savingId === item.id ? 'Adding...' : 'Append Note'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="content-panel">
      <div className="card-meta" style={{ marginBottom: 14 }}>
        Categories are your working shelves. Use slash tags like GitHub/Codex to create nested shelves.
      </div>

      {parentTags.length === 0 ? (
        <div className="empty-state">
          No items yet - press <strong style={{ color: 'var(--text-muted)' }}>Ctrl+Shift+S</strong> or{' '}
          <strong style={{ color: 'var(--text-muted)' }}>n</strong> to capture a link or idea.
        </div>
      ) : (
        <div className="category-grid">
          {parentTags.map((parent) => {
            const childBuckets = tree.get(parent)!
            const children = Array.from(childBuckets.keys()).sort((left, right) => {
              if (left === null) {
                return -1
              }
              if (right === null) {
                return 1
              }
              return left.localeCompare(right)
            })
            const totalCount = Array.from(childBuckets.values()).reduce(
              (sum, bucket) => sum + bucket.items.length,
              0
            )
            const directBucket = childBuckets.get(null)
            const canDropOnParent = parent !== 'Untagged'

            return (
              <section
                key={parent}
                className="category-group"
                data-drop-active={dropTag === parent}
                onDragOver={(event) => {
                  if (!canDropOnParent) {
                    return
                  }
                  event.preventDefault()
                  setDropTag(parent)
                }}
                onDragLeave={() => {
                  if (dropTag === parent) {
                    setDropTag(null)
                  }
                }}
                onDrop={async (event) => {
                  event.preventDefault()
                  await handleDrop(parent)
                }}
              >
                <header className="column-header">
                  <span className="column-title">{parent}</span>
                  {totalCount > 0 ? <span className="column-count">{totalCount}</span> : null}
                </header>

                {children.length === 1 && directBucket
                  ? directBucket.items.map((item) => renderItemBlock(item, directBucket.tag))
                  : children.map((child) => {
                      const bucket = childBuckets.get(child)!
                      const title = child === null ? `Direct in ${parent}` : child

                      return (
                        <section
                          key={child ?? 'direct'}
                          className="subcategory"
                          data-drop-active={dropTag === bucket.tag}
                          onDragOver={(event) => {
                            if (bucket.tag === 'Untagged') {
                              return
                            }
                            event.preventDefault()
                            event.stopPropagation()
                            setDropTag(bucket.tag)
                          }}
                          onDragLeave={() => {
                            if (dropTag === bucket.tag) {
                              setDropTag(null)
                            }
                          }}
                          onDrop={async (event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            await handleDrop(bucket.tag)
                          }}
                        >
                          <header className="subcategory-header">
                            <span>{title}</span>
                            <span className="column-count">{bucket.items.length}</span>
                          </header>
                          {bucket.items.map((item) => renderItemBlock(item, bucket.tag))}
                        </section>
                      )
                    })}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CategoryView
