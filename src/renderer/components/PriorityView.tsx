import { PRIORITIES, PRIORITY_COLORS, PRIORITY_LABELS } from '../../shared/constants'
import type { Item } from '../lib/api'
import Card from './Card'
import IdeaCard from './IdeaCard'

interface Props {
  items: Item[]
  onCardClick: (item: Item) => void
  onArchiveAll?: (ids: string[]) => Promise<void> | void
}

const STALE_THRESHOLD = 30 * 24 * 60 * 60 * 1000

function renderCard(item: Item, onCardClick: (item: Item) => void, showMeta = false) {
  if (item.type === 'idea') {
    return <IdeaCard item={item} onClick={onCardClick} showMeta={showMeta} />
  }

  return <Card item={item} onClick={onCardClick} showMeta={showMeta} />
}

export function PriorityView({ items, onCardClick, onArchiveAll }: Props) {
  const sortedItems = [...items].sort((left, right) => left.created_at - right.created_at)
  const forNowItems = sortedItems.filter((item) => item.priority === 'for-now')
  const staleSomeday = sortedItems.filter(
    (item) => item.priority === 'someday' && Date.now() - item.created_at >= STALE_THRESHOLD
  )

  return (
    <div className="board-scroll">
      <div className="priority-board">
        {forNowItems.length > 0 ? (
          <section className="for-now-strip">
            <div className="column-header">
              <span className="column-dot" style={{ background: PRIORITY_COLORS['for-now'] }} />
              <span className="column-title">For Now</span>
              <span className="column-count">{forNowItems.length}</span>
            </div>
            <div className="for-now-strip-row">
              {forNowItems.map((item) => (
                <div key={`strip-${item.id}`} style={{ width: 260 }}>
                  {renderCard(item, onCardClick)}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="board-columns">
          {PRIORITIES.map((priority) => {
            const columnItems = sortedItems.filter((item) => item.priority === priority)
            const isSomeday = priority === 'someday'

            return (
              <section key={priority} className="board-column">
                <header className="column-header">
                  <span className="column-dot" style={{ background: PRIORITY_COLORS[priority] }} />
                  <span className="column-title">{PRIORITY_LABELS[priority]}</span>
                  <span className="column-count">{columnItems.length}</span>
                </header>

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
                    <div className="empty-state">Nothing here</div>
                  ) : (
                    columnItems.map((item) => <div key={item.id}>{renderCard(item, onCardClick)}</div>)
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
