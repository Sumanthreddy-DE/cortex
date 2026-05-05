import { Check } from 'lucide-react'
import type { Item } from '../lib/api'
import { PRIORITIES, type Priority } from '../../shared/constants'

interface Props {
  items: Item[]
  onCardClick: (item: Item) => void
  onComplete: (item: Item) => void
}

const ISSUE_PRIORITY_LABELS: Record<Priority, string> = {
  inbox: 'Inbox',
  'for-now': 'Today',
  today: 'Today',
  tomorrow: 'Tomorrow',
  'this-week': 'This Week',
  someday: 'Someday'
}

const DISPLAY_PRIORITIES: Priority[] = ['inbox', 'today', 'tomorrow', 'this-week', 'someday']

export function IssuesView({ items, onCardClick, onComplete }: Props) {
  const issueItems = items.filter((item) => item.type === 'issue')

  return (
    <div className="content-panel issues-view">
      <header className="issues-header">
        <h1>Issues</h1>
        <p>Friction, bugs, and blockers — captured fast, resolved over time.</p>
      </header>

      {issueItems.length === 0 ? (
        <div className="empty-state">No issues captured yet. Add one with the + Add button.</div>
      ) : (
        <div className="issues-groups">
          {DISPLAY_PRIORITIES.map((priority) => {
            const group = issueItems.filter(
              (item) => (item.priority === priority || (priority === 'today' && item.priority === 'for-now'))
            )
            if (group.length === 0) return null
            return (
              <section key={priority} className="issues-group">
                <h3 className="issues-group-label">{ISSUE_PRIORITY_LABELS[priority]}</h3>
                {group.map((item) => (
                  <div key={item.id} className="issue-row" onClick={() => onCardClick(item)}>
                    <span className="issue-row-title">{item.title}</span>
                    {item.tags.length > 0 ? (
                      <span className="issue-row-tags">
                        {item.tags.map((tag) => (
                          <span key={tag} className="issue-row-tag">{tag}</span>
                        ))}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="button-icon issue-complete-btn"
                      title="Mark resolved"
                      onClick={(e) => { e.stopPropagation(); onComplete(item) }}
                    >
                      <Check size={13} />
                    </button>
                  </div>
                ))}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default IssuesView
