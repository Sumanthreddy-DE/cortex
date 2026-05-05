import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Check, CheckSquare, Square } from 'lucide-react'
import {
  BOARD_PRIORITIES,
  FIXED_BUCKET_TAGS,
  getFixedBucketTag,
  PRIORITY_LABELS,
  normalizePriority,
  type BoardPriority,
  type FixedBucketTag
} from '../../shared/constants'
import type { Item, ItemPayload } from '../lib/api'
import Card from './Card'
import IdeaCard from './IdeaCard'
import IdeasBucketBody from './IdeasBucketBody'

interface Props {
  items: Item[]
  onCardClick: (item: Item) => void
  onArchiveAll?: (ids: string[]) => Promise<void> | void
  onPriorityChange: (item: Item, nextPriority: BoardPriority) => Promise<void> | void
  onBucketChange: (item: Item, nextBucket: FixedBucketTag) => Promise<void> | void
  onDelete: (item: Item) => Promise<void> | void
  onComplete: (item: Item) => Promise<void> | void
  onBatchPriorityChange: (ids: string[], priority: BoardPriority) => Promise<void>
  onCreate?: (payload: ItemPayload) => Promise<unknown> | void
  onMergeIdeas?: (ids: string[]) => Promise<void>
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

function BucketInlineAdd({
  tag,
  onCreate
}: {
  tag: string
  onCreate: (payload: ItemPayload) => Promise<unknown> | void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed) return
    const url = isUrl(trimmed) ? trimmed : null
    await onCreate({
      type: url ? 'link' : 'idea',
      title: url ? trimmed.replace(/^https?:\/\//i, '') : trimmed,
      url,
      note: null,
      priority: 'inbox',
      tags: [tag],
      remind_at: null
    })
    setValue('')
    inputRef.current?.focus()
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <div className="bucket-inline-add" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        className="lane-inline-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a link or idea..."
      />
    </div>
  )
}

function LaneInlineAdd({
  priority,
  onCreate
}: {
  priority: BoardPriority
  onCreate: (payload: ItemPayload) => Promise<unknown> | void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed) return
    const url = isUrl(trimmed) ? trimmed : null
    await onCreate({
      type: url ? 'link' : 'idea',
      title: url ? trimmed.replace(/^https?:\/\//i, '') : trimmed,
      url,
      note: null,
      priority,
      tags: [],
      remind_at: null
    })
    setValue('')
    inputRef.current?.focus()
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <div className="lane-inline-add">
      <input
        ref={inputRef}
        className="lane-inline-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a link or idea..."
      />
    </div>
  )
}

const STALE_THRESHOLD = 30 * 24 * 60 * 60 * 1000

const BATCH_TARGETS: BoardPriority[] = ['today', 'tomorrow', 'this-week', 'someday']
const BATCH_LABELS: Record<string, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  'this-week': 'This Week',
  someday: 'Someday'
}

function renderCard(
  item: Item,
  onCardClick: (item: Item) => void,
  options?: {
    showMeta?: boolean
    draggable?: boolean
    onDragStart?: () => void
    onDragEnd?: () => void
    onDelete?: (item: Item) => void
    onComplete?: (item: Item) => void
  }
) {
  if (item.type === 'idea') {
    return (
      <IdeaCard
        item={item}
        onClick={onCardClick}
        showMeta={options?.showMeta}
        draggable={options?.draggable}
        onDragStart={() => options?.onDragStart?.()}
        onDragEnd={() => options?.onDragEnd?.()}
        onDelete={options?.onDelete}
        onComplete={options?.onComplete}
      />
    )
  }

  return (
    <Card
      item={item}
      onClick={onCardClick}
      showMeta={options?.showMeta}
      draggable={options?.draggable}
      onDragStart={() => options?.onDragStart?.()}
      onDragEnd={() => options?.onDragEnd?.()}
      onDelete={options?.onDelete}
      onComplete={options?.onComplete}
    />
  )
}

export function PriorityView({
  items,
  onCardClick,
  onArchiveAll,
  onPriorityChange,
  onBucketChange,
  onDelete,
  onComplete,
  onBatchPriorityChange,
  onCreate,
  onMergeIdeas
}: Props) {
  const [expandedBucket, setExpandedBucket] = useState<FixedBucketTag | null>(null)
  const [dragSource, setDragSource] = useState<Item | null>(null)
  const [dropPriority, setDropPriority] = useState<BoardPriority | null>(null)
  const [dropBucket, setDropBucket] = useState<FixedBucketTag | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bucketSelectIds, setBucketSelectIds] = useState<Set<string>>(new Set())
  const [mergingBucket, setMergingBucket] = useState<string | null>(null)

  const sortedItems = [...items]
    .filter((item) => item.type !== 'issue' && item.type !== 'company')
    .sort((left, right) => left.created_at - right.created_at)
  const columnItems = sortedItems.filter((item) => {
    const bucketTag = getFixedBucketTag(item.tags)
    if (!bucketTag) return true
    return bucketTag === 'Ideas' && normalizePriority(item.priority) !== 'inbox'
  })
  const inboxColumnItems = columnItems.filter((item) => {
    const priority = normalizePriority(item.priority)
    return priority === 'inbox' || priority === 'for-now'
  })
  const visibleColumnPriorities = BOARD_PRIORITIES.filter(
    (priority) => priority !== 'inbox' || inboxColumnItems.length > 0
  )
  const staleSomeday = sortedItems.filter(
    (item) =>
      !getFixedBucketTag(item.tags) &&
      normalizePriority(item.priority) === 'someday' &&
      Date.now() - item.created_at >= STALE_THRESHOLD
  )

  function clearDragState() {
    setDragSource(null)
    setDropPriority(null)
    setDropBucket(null)
  }

  function toggleSelectMode() {
    setSelectMode((prev) => !prev)
    setSelectedIds(new Set())
  }

  function toggleSelectItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function handleBatchMove(priority: BoardPriority) {
    if (selectedIds.size === 0) return
    await onBatchPriorityChange([...selectedIds], priority)
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  async function handlePriorityDrop(priority: BoardPriority) {
    if (!dragSource) {
      clearDragState()
      return
    }

    if (normalizePriority(dragSource.priority) !== priority || getFixedBucketTag(dragSource.tags)) {
      await onPriorityChange(dragSource, priority)
    }

    clearDragState()
  }

  async function handleBucketDrop(tag: FixedBucketTag) {
    if (!dragSource || getFixedBucketTag(dragSource.tags) === tag) {
      clearDragState()
      return
    }

    await onBucketChange(dragSource, tag)
    clearDragState()
  }

  return (
    <div className="board-scroll">
      <div className="priority-board">
        <section className="buckets-bar" aria-label="Recurring buckets">
          <span className="buckets-bar-label">Drop into</span>
          {FIXED_BUCKET_TAGS.map((tag) => {
            const bucketItems = sortedItems.filter((item) => getFixedBucketTag(item.tags) === tag)
            const isExpanded = expandedBucket === tag

            return (
              <div
                key={tag}
                className="bucket-pill"
                data-drop-active={dropBucket === tag}
                data-expanded={isExpanded}
                onClick={() => setExpandedBucket(isExpanded ? null : tag)}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDropPriority(null)
                  setDropBucket(tag)
                }}
                onDragLeave={() => {
                  if (dropBucket === tag) {
                    setDropBucket(null)
                  }
                }}
                onDrop={async (event) => {
                  event.preventDefault()
                  await handleBucketDrop(tag)
                }}
              >
                <span className="bucket-glyph">{tag.charAt(0)}</span>
                <span className="bucket-name">{tag}</span>
                <span className="bucket-count">{bucketItems.length}</span>
                {isExpanded ? (
                  <div className="bucket-body" onClick={(event) => event.stopPropagation()}>
                    {tag === 'Ideas' && bucketItems.length > 0 ? (
                      <IdeasBucketBody
                        items={bucketItems}
                        onCardClick={onCardClick}
                        onDelete={(item) => { void onDelete(item) }}
                        onComplete={(item) => { void onComplete(item) }}
                      />
                    ) : bucketItems.length === 0 ? (
                      <div className="empty-state">Nothing here</div>
                    ) : (
                      <>
                        {onMergeIdeas && mergingBucket === tag && bucketSelectIds.size >= 2 ? (
                          <div className="bucket-merge-bar">
                            <span className="bucket-merge-count">{bucketSelectIds.size} ideas selected</span>
                            <button
                              type="button"
                              className="bucket-merge-btn"
                              onClick={async () => {
                                await onMergeIdeas([...bucketSelectIds])
                                setBucketSelectIds(new Set())
                                setMergingBucket(null)
                              }}
                            >
                              Merge into one
                            </button>
                            <button
                              type="button"
                              className="bucket-merge-cancel"
                              onClick={() => {
                                setBucketSelectIds(new Set())
                                setMergingBucket(null)
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ) : null}
                        {bucketItems.map((item) => {
                          const isSelected = bucketSelectIds.has(item.id)
                          const inSelectMode = mergingBucket === tag
                          return (
                            <div
                              key={`${tag}-${item.id}`}
                              className={inSelectMode ? 'selectable-wrap' : undefined}
                              data-select-mode={inSelectMode || undefined}
                              data-selected={inSelectMode && isSelected || undefined}
                              onClick={inSelectMode ? () => {
                                setBucketSelectIds((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(item.id)) next.delete(item.id)
                                  else next.add(item.id)
                                  return next
                                })
                              } : undefined}
                            >
                              {inSelectMode ? (
                                <div className="selectable-check">
                                  {isSelected && <Check size={11} strokeWidth={3} />}
                                </div>
                              ) : null}
                              {renderCard(item, inSelectMode ? () => {} : onCardClick, {
                                draggable: !inSelectMode,
                                onDragStart: () => setDragSource(item),
                                onDragEnd: clearDragState,
                                onDelete: (target) => { void onDelete(target) },
                                onComplete: (target) => { void onComplete(target) }
                              })}
                            </div>
                          )
                        })}
                        {onMergeIdeas && bucketItems.some((i) => i.type === 'idea') ? (
                          <button
                            type="button"
                            className="bucket-select-toggle"
                            onClick={() => {
                              if (mergingBucket === tag) {
                                setBucketSelectIds(new Set())
                                setMergingBucket(null)
                              } else {
                                setBucketSelectIds(new Set())
                                setMergingBucket(tag)
                              }
                            }}
                          >
                            {mergingBucket === tag ? 'Cancel' : 'Select to merge'}
                          </button>
                        ) : null}
                      </>
                    )}
                    {onCreate ? <BucketInlineAdd tag={tag} onCreate={onCreate} /> : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </section>

        <div className="board-columns">
          {visibleColumnPriorities.map((priority) => {
            const laneItems = columnItems.filter(
              (item) => normalizePriority(item.priority) === priority
            )
            const isSomeday = priority === 'someday'
            const isInbox = priority === 'inbox'

            return (
              <section
                key={priority}
                id={`priority-column-${priority}`}
                className="board-column"
                data-hero={priority === 'today'}
                data-drop-active={dropPriority === priority}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDropBucket(null)
                  setDropPriority(priority)
                }}
                onDragLeave={() => {
                  if (dropPriority === priority) {
                    setDropPriority(null)
                  }
                }}
                onDrop={async (event) => {
                  event.preventDefault()
                  await handlePriorityDrop(priority)
                }}
              >
                <header className="lane-head">
                  <h3 className={`lane-title ${priority === 'today' ? 'lane-title-hero' : 'lane-title-chapter'}`}>
                    {PRIORITY_LABELS[priority]}
                  </h3>
                  <span className={`lane-meta lane-meta-${priority}`}>
                    {String(laneItems.length).padStart(2, '0')} {laneItems.length === 1 ? 'ITEM' : 'ITEMS'}
                  </span>
                  {isInbox && laneItems.length > 0 && (
                    <button
                      type="button"
                      className="lane-select-btn"
                      data-active={selectMode}
                      title={selectMode ? 'Cancel selection' : 'Select items to move'}
                      onClick={toggleSelectMode}
                    >
                      {selectMode ? <CheckSquare size={14} /> : <Square size={14} />}
                    </button>
                  )}
                </header>
                <div className="lane-rule" />

                {isInbox && selectMode && selectedIds.size > 0 && (
                  <div className="batch-bar">
                    <span className="batch-bar-count">{selectedIds.size} selected</span>
                    <span className="batch-bar-label">→ move to</span>
                    <div className="batch-bar-targets">
                      {BATCH_TARGETS.map((target) => (
                        <button
                          key={target}
                          type="button"
                          className="batch-bar-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleBatchMove(target)
                          }}
                        >
                          {BATCH_LABELS[target]}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="batch-bar-cancel"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedIds(new Set())
                        setSelectMode(false)
                      }}
                      title="Cancel"
                    >
                      ×
                    </button>
                  </div>
                )}

                <div className="column-body">
                  {isSomeday && staleSomeday.length > 0 ? (
                    <div className="column-banner">
                      <div className="card-meta">
                        {staleSomeday.length} item{staleSomeday.length === 1 ? '' : 's'} untouched for
                        {' '}30+ days
                      </div>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => onArchiveAll?.(staleSomeday.map((item) => item.id))}
                      >
                        Archive all
                      </button>
                    </div>
                  ) : null}

                  {laneItems.length === 0 ? (
                    <div className="empty-state">Drop here or add something new.</div>
                  ) : (
                    laneItems.map((item) => {
                      const isSelected = selectedIds.has(item.id)
                      const card = renderCard(item, onCardClick, {
                        draggable: true,
                        onDragStart: () => setDragSource(item),
                        onDragEnd: clearDragState,
                        onDelete: (target) => {
                          void onDelete(target)
                        },
                        onComplete: (target) => {
                          void onComplete(target)
                        }
                      })

                      if (isInbox && selectMode) {
                        return (
                          <div
                            key={item.id}
                            className="selectable-wrap"
                            data-select-mode="true"
                            data-selected={isSelected}
                            onClick={() => toggleSelectItem(item.id)}
                          >
                            <div className="selectable-check">
                              {isSelected && <Check size={11} strokeWidth={3} />}
                            </div>
                            {item.tags.includes('Ideas') ? (
                              <div className="from-ideas-wrap">
                                {renderCard(item, () => toggleSelectItem(item.id), {
                                  draggable: false
                                })}
                                <div className="from-ideas-badge">from Ideas</div>
                              </div>
                            ) : renderCard(item, () => toggleSelectItem(item.id), {
                              draggable: false
                            })}
                          </div>
                        )
                      }

                      return (
                        <div key={item.id}>
                          {item.tags.includes('Ideas') ? (
                            <div className="from-ideas-wrap">
                              {card}
                              <div className="from-ideas-badge">from Ideas</div>
                            </div>
                          ) : card}
                        </div>
                      )
                    })
                  )}

                </div>

                {onCreate ? (
                  <LaneInlineAdd priority={priority} onCreate={onCreate} />
                ) : null}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default PriorityView
