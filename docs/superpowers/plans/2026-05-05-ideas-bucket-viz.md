# Ideas Bucket — Option C Visualization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the full-width IdeaCard scroll in the expanded Ideas bucket with a compact list (priority dot + title + tags) and a themes sidebar (tag name + count + bar), so all 25+ ideas are visible at once and tag-based connections are surfaced.

**Architecture:** Add a new `IdeasBucketBody` component that renders only when the "Ideas" bucket is expanded. The component derives theme counts from the bucket items (no backend calls). The rest of PriorityView is unchanged. New styles added to `globals.css`.

**Tech Stack:** React, TypeScript, CSS

---

### Task 1: Add `IdeasBucketBody` component

**Files:**
- Create: `src/renderer/components/IdeasBucketBody.tsx`

- [ ] **Step 1: Create the component file**

```tsx
import type { Item } from '../lib/api'

interface Props {
  items: Item[]
  onCardClick: (item: Item) => void
  onDelete: (item: Item) => void
  onComplete: (item: Item) => void
}

function priorityDotClass(item: Item): string {
  const p = item.priority
  if (p === 'today' || p === 'for-now') return 'ideas-dot ideas-dot-high'
  if (p === 'tomorrow' || p === 'this-week') return 'ideas-dot ideas-dot-medium'
  if (p === 'someday') return 'ideas-dot ideas-dot-low'
  return 'ideas-dot ideas-dot-none'
}

function buildThemes(items: Item[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>()
  for (const item of items) {
    for (const tag of item.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}

export function IdeasBucketBody({ items, onCardClick, onDelete, onComplete }: Props) {
  const themes = buildThemes(items)
  const maxCount = themes[0]?.count ?? 1

  return (
    <div className="ideas-body">
      <div className="ideas-list">
        {items.map((item) => (
          <div key={item.id} className="ideas-row" onClick={() => onCardClick(item)}>
            <span className={priorityDotClass(item)} />
            <span className="ideas-row-title">{item.title}</span>
            <span className="ideas-row-tags">
              {item.tags.map((tag) => (
                <span key={tag} className="ideas-row-tag">{tag}</span>
              ))}
            </span>
            <span className="ideas-row-actions">
              <button
                type="button"
                className="ideas-row-btn"
                title="Complete"
                onClick={(e) => { e.stopPropagation(); onComplete(item) }}
              >
                ✓
              </button>
              <button
                type="button"
                className="ideas-row-btn"
                title="Delete"
                onClick={(e) => { e.stopPropagation(); onDelete(item) }}
              >
                ×
              </button>
            </span>
          </div>
        ))}
      </div>

      {themes.length > 0 ? (
        <div className="ideas-themes">
          <div className="ideas-themes-title">Themes</div>
          {themes.map(({ tag, count }) => (
            <div key={tag} className="ideas-theme-row">
              <div className="ideas-theme-header">
                <span className="ideas-theme-tag">{tag}</span>
                <span className="ideas-theme-count">{count}</span>
              </div>
              <div className="ideas-theme-bar-bg">
                <div
                  className="ideas-theme-bar"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default IdeasBucketBody
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/IdeasBucketBody.tsx
git commit -m "feat: add IdeasBucketBody component (compact list + themes sidebar)"
```

---

### Task 2: Add CSS for the ideas bucket layout

**Files:**
- Modify: `src/renderer/styles/globals.css`

- [ ] **Step 1: Append styles to globals.css**

Add at the end of `src/renderer/styles/globals.css`:

```css
/* ── Ideas bucket — Option C layout ── */
.ideas-body {
  display: flex;
  gap: 0;
  min-height: 200px;
}

.ideas-list {
  flex: 1;
  overflow-y: auto;
  max-height: 420px;
  padding: 4px 0;
}

.ideas-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.1s;
}
.ideas-row:hover {
  background: var(--paper-deep);
}

.ideas-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ideas-dot-high   { background: #d44; }
.ideas-dot-medium { background: var(--butter); }
.ideas-dot-low    { background: var(--ink-dim); }
.ideas-dot-none   { background: var(--rule); }

.ideas-row-title {
  flex: 1;
  font-size: 12.5px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ideas-row-tags {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.ideas-row-tag {
  font-size: 10px;
  font-family: var(--font-mono);
  padding: 1px 5px;
  background: var(--paper-deep);
  border-radius: 8px;
  color: var(--ink-dim);
  white-space: nowrap;
}

.ideas-row-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  flex-shrink: 0;
}
.ideas-row:hover .ideas-row-actions {
  opacity: 1;
}
.ideas-row-btn {
  background: none;
  border: none;
  padding: 2px 5px;
  font-size: 12px;
  color: var(--ink-dim);
  cursor: pointer;
  border-radius: 3px;
  line-height: 1;
}
.ideas-row-btn:hover {
  background: var(--paper-raised);
  color: var(--ink);
}

/* Themes sidebar */
.ideas-themes {
  width: 160px;
  flex-shrink: 0;
  border-left: 1px solid var(--rule);
  padding: 8px 12px;
  background: var(--paper-raised);
}

.ideas-themes-title {
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-dim);
  margin-bottom: 10px;
}

.ideas-theme-row {
  margin-bottom: 9px;
}
.ideas-theme-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}
.ideas-theme-tag {
  font-size: 11px;
  color: var(--ink-soft);
  font-family: var(--font-mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 110px;
}
.ideas-theme-count {
  font-size: 10px;
  color: var(--ink-dim);
  flex-shrink: 0;
}
.ideas-theme-bar-bg {
  height: 2px;
  background: var(--paper-deep);
  border-radius: 1px;
}
.ideas-theme-bar {
  height: 2px;
  background: var(--ink-stamp);
  border-radius: 1px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/styles/globals.css
git commit -m "feat: add CSS for ideas bucket compact list and themes sidebar"
```

---

### Task 3: Wire IdeasBucketBody into PriorityView

**Files:**
- Modify: `src/renderer/components/PriorityView.tsx`

The Ideas bucket is one of the `FIXED_BUCKET_TAGS` (`'Daily' | 'Groceries' | 'Tools' | 'Ideas'`). When it is expanded, replace the current card-per-item render with `IdeasBucketBody`.

- [ ] **Step 1: Import `IdeasBucketBody` at the top of PriorityView.tsx**

After the existing imports, add:

```tsx
import IdeasBucketBody from './IdeasBucketBody'
```

- [ ] **Step 2: Find the bucket expanded body in PriorityView**

At line ~297 in `PriorityView.tsx`, inside the `FIXED_BUCKET_TAGS.map` loop, the expanded bucket body renders:

```tsx
{bucketItems.length === 0 ? (
  <div className="empty-state">Nothing here</div>
) : (
  <>
    {/* merge bar + cards */}
  </>
)}
```

- [ ] **Step 3: Add an early-return for the Ideas bucket using `IdeasBucketBody`**

Wrap the existing bucket body render with a conditional. Place this BEFORE the existing `bucketItems.length === 0` check:

```tsx
{/* Ideas bucket gets compact visualization */}
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
    {/* existing merge bar + card render unchanged */}
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
          data-selected={(inSelectMode && isSelected) || undefined}
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
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Start the app and verify visually**

```bash
npm run dev
```

Open the app. Click "Priority" tab. Expand the "Ideas" bucket. Confirm:
- Compact list of rows (not full-width cards)
- Priority dot on each row (red/amber/grey)
- Tags visible on right side
- Themes sidebar visible if any ideas have tags
- Hover on a row shows ✓ and × buttons
- Clicking a row opens the edit modal

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/PriorityView.tsx
git commit -m "feat: Ideas bucket now shows compact list + themes sidebar (option C)"
```
