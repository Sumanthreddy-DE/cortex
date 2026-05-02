import { useState } from 'react'
import {
  BOARD_PRIORITIES,
  FIXED_BUCKET_TAGS,
  getFixedBucketTag,
  PRIORITY_LABELS,
  normalizePriority,
  type BoardPriority,
  type FixedBucketTag
} from '../../shared/constants'
import type { Item } from '../lib/api'
import Card from './Card'
import IdeaCard from './IdeaCard'

interface Props {
  items: Item[]
  onCardClick: (item: Item) => void
  onArchiveAll?: (ids: string[]) => Promise<void> | void
  onPriorityChange: (item: Item, nextPriority: BoardPriority) => Promise<void> | void
  onBucketChange: (item: Item, nextBucket: FixedBucketTag) => Promise<void> | void
  onDelete: (item: Item) => Promise<void> | void
  onComplete: (item: Item) => Promise<void> | void
}

const STALE_THRESHOLD = 30 * 24 * 60 * 60 * 1000

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
  onComplete
}: Props) {
  const [expandedBucket, setExpandedBucket] = useState<FixedBucketTag | null>(null)
  const [dragSource, setDragSource] = useState<Item | null>(null)
  const [dropPriority, setDropPriority] = useState<BoardPriority | null>(null)
  const [dropBucket, setDropBucket] = useState<FixedBucketTag | null>(null)
  const sortedItems = [...items].sort((left, right) => left.created_at - right.created_at)
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
                    {bucketItems.length === 0 ? (
                      <div className="empty-state">Nothing here</div>
                    ) : (
                      bucketItems.map((item) => (
                        <div key={`${tag}-${item.id}`}>
                          {renderCard(item, onCardClick, {
                            draggable: true,
                            onDragStart: () => setDragSource(item),
                            onDragEnd: clearDragState,
                            onDelete: (target) => {
                              void onDelete(target)
                            },
                            onComplete: (target) => {
                              void onComplete(target)
                            }
                          })}
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </section>

        <div className="board-columns">
          {BOARD_PRIORITIES.map((priority) => {
            const columnItems = sortedItems.filter(
              (item) => !getFixedBucketTag(item.tags) && normalizePriority(item.priority) === priority
            )
            const isSomeday = priority === 'someday'

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
                  <h3 className={`lane-title ${priority === 'today' ? 'lane-title-hero' : 'lane-title-small'}`}>
                    {PRIORITY_LABELS[priority]}
                  </h3>
                  <span className={`lane-meta lane-meta-${priority}`}>
                    {String(columnItems.length).padStart(2, '0')} {columnItems.length === 1 ? 'ITEM' : 'ITEMS'}
                  </span>
                </header>
                <div className="lane-rule" />

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

                  {columnItems.length === 0 ? (
                    <div className="empty-state">Drop here or add something new.</div>
                  ) : (
                    columnItems.map((item) => (
                      <div key={item.id}>
                        {renderCard(item, onCardClick, {
                          draggable: true,
                          onDragStart: () => setDragSource(item),
                          onDragEnd: clearDragState,
                          onDelete: (target) => {
                            void onDelete(target)
                          },
                          onComplete: (target) => {
                            void onComplete(target)
                          }
                        })}
                      </div>
                    ))
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default PriorityView
