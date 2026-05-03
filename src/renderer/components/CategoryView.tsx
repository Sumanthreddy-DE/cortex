import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Item, ItemPayload } from '../lib/api'
import { parseTag } from '../lib/utils'

interface Props {
  items: Item[]
  onTagChange: (item: Item, nextTags: string[]) => Promise<void> | void
  onComplete: (item: Item) => Promise<void> | void
  onCardClick: (item: Item) => void
  onCreate: (payload: ItemPayload) => Promise<unknown> | void
}

type DragSource = { item: Item; fromTag: string } | null

interface TagBucket {
  tag: string
  items: Item[]
}

const PRIORITY_DOT_COLOR: Record<Item['priority'], string> = {
  inbox: '#9b8d7d',
  'for-now': '#e8755a',
  today: '#3a8c91',
  tomorrow: '#e8c958',
  'this-week': '#a3b896',
  someday: '#7c7393'
}

function getDomain(url: string | null): string {
  if (!url) {
    return ''
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

function hasParentTag(item: Item, category: string): boolean {
  return item.tags.some((tag) => parseTag(tag).parent.toLowerCase() === category.toLowerCase())
}

function sortItems(items: Item[]): Item[] {
  return [...items].sort((left, right) => left.title.localeCompare(right.title))
}

function ItemList({
  items,
  onCardClick,
  onComplete,
  onDragStart,
  onDragEnd
}: {
  items: Item[]
  onCardClick: (item: Item) => void
  onComplete: (item: Item) => void
  onDragStart: (item: Item) => void
  onDragEnd: () => void
}) {
  return (
    <div className="cat-item-list">
      {items.map((item) => {
        const domain = getDomain(item.url)

        return (
          <div
            key={item.id}
            className="cat-item-row"
            onClick={(event) => {
              if ((event.ctrlKey || event.metaKey) && item.url) {
                window.open(item.url, '_blank', 'noopener,noreferrer')
                return
              }
              onCardClick(item)
            }}
            draggable
            onDragStart={() => onDragStart(item)}
            onDragEnd={onDragEnd}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onCardClick(item)
              }
            }}
          >
            <span
              className="cat-item-dot"
              style={{ backgroundColor: PRIORITY_DOT_COLOR[item.priority] ?? PRIORITY_DOT_COLOR.inbox }}
            />
            {item.type === 'link' && item.favicon_url ? (
              <img src={item.favicon_url} className="cat-item-favicon" alt="" width={14} height={14} />
            ) : item.type === 'link' ? (
              <span className="cat-item-link-mark">□</span>
            ) : (
              <span className="cat-item-idea-mark">•</span>
            )}
            <span className="cat-item-title">{item.title}</span>
            {domain ? <span className="cat-item-domain">{domain}</span> : null}
            <button
              type="button"
              className="cat-item-complete"
              onClick={(event) => {
                event.stopPropagation()
                void onComplete(item)
              }}
              title="Mark complete"
            >
              ✓
            </button>
          </div>
        )
      })}
    </div>
  )
}

function CategoryInlineAdd({
  category,
  allItems,
  onCreate,
  subfolderOverride,
  onClearSubfolder
}: {
  category: string
  allItems: Item[]
  onCreate: (payload: ItemPayload) => Promise<unknown> | void
  subfolderOverride?: string | null
  onClearSubfolder?: () => void
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const effectiveTag = subfolderOverride ? `${category}/${subfolderOverride}` : category
  const placeholder = subfolderOverride
    ? `Add to ${category}/${subfolderOverride}...`
    : `Quick add to ${category}...`

  async function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed) {
      return
    }

    const url = isUrl(trimmed) ? trimmed : null

    if (url) {
      const isDupe = allItems.some((item) => item.url === url && hasParentTag(item, category))
      if (isDupe) {
        setError('Already saved in this category.')
        return
      }
    }

    await onCreate({
      type: url ? 'link' : 'idea',
      title: url ? trimmed.replace(/^https?:\/\//i, '') : trimmed,
      url,
      note: null,
      priority: 'inbox',
      tags: [effectiveTag],
      remind_at: null
    })

    setValue('')
    setError(null)
    inputRef.current?.focus()
  }

  async function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    await handleSubmit()
  }

  return (
    <div className="cat-inline-add">
      {subfolderOverride ? (
        <div className="cat-subfolder-active">
          <span className="cat-subfolder-active-label">
            Filing into <strong>{category}/{subfolderOverride}</strong>
          </span>
          <button type="button" className="cat-subfolder-active-clear" onClick={onClearSubfolder}>
            ×
          </button>
        </div>
      ) : null}
      <input
        ref={inputRef}
        className="cat-inline-input"
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          setError(null)
        }}
        onKeyDown={(event) => void handleKeyDown(event)}
        placeholder={placeholder}
      />
      {error ? <span className="cat-inline-error">{error}</span> : null}
    </div>
  )
}

export function CategoryView({ items, onTagChange, onComplete, onCardClick, onCreate }: Props) {
  const [dragSource, setDragSource] = useState<DragSource>(null)
  const [dropTag, setDropTag] = useState<string | null>(null)
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  // subfolder state: { category → active subfolder name } and pending input
  const [activeSubfolders, setActiveSubfolders] = useState<Record<string, string>>({})
  const [pendingSubfolder, setPendingSubfolder] = useState<{ category: string; value: string } | null>(null)
  const subfolderInputRef = useRef<HTMLInputElement>(null)

  const tree = useMemo(() => {
    const nextTree = new Map<string, Map<string | null, TagBucket>>()
    const seen = new Set<string>()

    for (const item of sortItems(items)) {
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

        const seenKey = `${parent}|${child ?? ''}|${item.id}`
        if (!seen.has(seenKey)) {
          childBuckets.get(child)?.items.push(item)
          seen.add(seenKey)
        }
      }
    }

    return nextTree
  }, [items])

  const parentTags = useMemo(
    () =>
      Array.from(tree.keys()).sort((left, right) => {
        if (left === 'Untagged') {
          return 1
        }
        if (right === 'Untagged') {
          return -1
        }
        return left.localeCompare(right)
      }),
    [tree]
  )

  useEffect(() => {
    if (parentTags.length === 0) {
      setOpenCategory(null)
      return
    }

    if (!openCategory || !parentTags.includes(openCategory)) {
      setOpenCategory(parentTags[0] ?? null)
    }
  }, [openCategory, parentTags])

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

  function toggleCategory(tag: string) {
    setOpenCategory((current) => (current === tag ? null : tag))
  }

  useEffect(() => {
    if (pendingSubfolder) {
      subfolderInputRef.current?.focus()
    }
  }, [pendingSubfolder])

  return (
    <div className="content-panel">
      <p className="page-intro">
        Your working shelves. Add a slash to any tag — like <strong>GitHub/Codex</strong> — to nest it as a folder inside a category.
      </p>

      {parentTags.length === 0 ? (
        <div className="empty-state">
          No items yet - press <strong style={{ color: 'var(--text-muted)' }}>Ctrl+Shift+S</strong> or{' '}
          <strong style={{ color: 'var(--text-muted)' }}>n</strong> to capture a link or idea.
        </div>
      ) : (
        <div className="cat-accordion">
          {parentTags.map((parent) => {
            const childBuckets = tree.get(parent)!
            const isUntagged = parent === 'Untagged'
            const isOpen = openCategory === parent
            const directBucket = childBuckets.get(null)
            const subfolders = Array.from(childBuckets.entries())
              .filter(([child]) => child !== null)
              .sort(([left], [right]) => (left ?? '').localeCompare(right ?? ''))
            const totalCount = Array.from(childBuckets.values()).reduce(
              (sum, bucket) => sum + bucket.items.length,
              0
            )
            const subfolderCount = subfolders.length
            const canDrop = !isUntagged

            return (
              <section
                key={parent}
                className="cat-section"
                data-untagged={isUntagged || undefined}
                data-drop={dropTag === parent || undefined}
                onDragOver={(event) => {
                  if (!canDrop || !dragSource) {
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
                <div
                  className="cat-header"
                  onClick={() => toggleCategory(parent)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      toggleCategory(parent)
                    }
                  }}
                >
                  <svg
                    className="cat-chevron"
                    data-open={isOpen || undefined}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 4 10 8 6 12" />
                  </svg>
                  <span className="cat-header-name">{parent}</span>
                  <span className="cat-header-count">
                    {totalCount} {totalCount === 1 ? 'item' : 'items'}
                  </span>
                  {subfolderCount > 0 ? (
                    <span className="cat-header-sub-count">
                      • {subfolderCount} {subfolderCount === 1 ? 'subfolder' : 'subfolders'}
                    </span>
                  ) : null}
                  <span className="cat-header-spacer" />
                  {isOpen && !isUntagged ? (
                    <button
                      type="button"
                      className="cat-subfolder-btn"
                      onClick={(event) => {
                        event.stopPropagation()
                        setPendingSubfolder({ category: parent, value: '' })
                      }}
                      title="Create a folder"
                    >
                      + folder
                    </button>
                  ) : null}
                </div>

                {/* Subfolder name input — appears below header when creating */}
                {pendingSubfolder?.category === parent ? (
                  <div className="cat-subfolder-new">
                    <span className="cat-subfolder-new-prefix">{parent} /</span>
                    <input
                      ref={subfolderInputRef}
                      className="cat-subfolder-new-input"
                      value={pendingSubfolder.value}
                      onChange={(event) =>
                        setPendingSubfolder({ category: parent, value: event.target.value })
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          const name = pendingSubfolder.value.trim()
                          if (name) {
                            setActiveSubfolders((prev) => ({ ...prev, [parent]: name }))
                          }
                          setPendingSubfolder(null)
                        } else if (event.key === 'Escape') {
                          setPendingSubfolder(null)
                        }
                      }}
                      placeholder="Subfolder name..."
                    />
                    <button
                      type="button"
                      className="cat-subfolder-active-clear"
                      onClick={() => setPendingSubfolder(null)}
                    >
                      ×
                    </button>
                  </div>
                ) : null}

                <div className="cat-content-wrap" data-open={isOpen || undefined}>
                  <div className="cat-content-inner">
                    <div className="cat-content">
                      {isUntagged ? (
                        <p className="cat-untagged-hint">These have not been filed yet.</p>
                      ) : null}

                      {subfolders.length > 0 ? (
                        <div className="cat-subfolder-grid">
                          {subfolders.map(([child, bucket]) => (
                            <div
                              key={child}
                              className="cat-subfolder-col"
                              data-drop={dropTag === bucket.tag || undefined}
                              onDragOver={(event) => {
                                if (!dragSource) {
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
                              <div className="cat-subfolder-header">
                                <span>{child}</span>
                                <span className="cat-subfolder-count">{bucket.items.length}</span>
                              </div>
                              <ItemList
                                items={bucket.items}
                                onCardClick={onCardClick}
                                onComplete={onComplete}
                                onDragStart={(item) => setDragSource({ item, fromTag: bucket.tag })}
                                onDragEnd={() => {
                                  setDragSource(null)
                                  setDropTag(null)
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {directBucket && directBucket.items.length > 0 ? (
                        <>
                          {subfolders.length > 0 ? (
                            <div className="cat-direct-label">Direct in {parent}</div>
                          ) : null}
                          <ItemList
                            items={directBucket.items}
                            onCardClick={onCardClick}
                            onComplete={onComplete}
                            onDragStart={(item) => setDragSource({ item, fromTag: directBucket.tag })}
                            onDragEnd={() => {
                              setDragSource(null)
                              setDropTag(null)
                            }}
                          />
                        </>
                      ) : null}

                      {!isUntagged ? (
                        <CategoryInlineAdd
                          category={parent}
                          allItems={items}
                          onCreate={onCreate}
                          subfolderOverride={activeSubfolders[parent] ?? null}
                          onClearSubfolder={() =>
                            setActiveSubfolders((prev) => {
                              const next = { ...prev }
                              delete next[parent]
                              return next
                            })
                          }
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CategoryView
