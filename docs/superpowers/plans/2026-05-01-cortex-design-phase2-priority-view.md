---
title: "Cortex — Phase 2: Priority view redesign (Field Notebook)"
date: 2026-05-01
status: ready
depends_on:
  - 2026-05-01-cortex-design-phase1-token-migration.md (DONE — paper/ink tokens in :root, fonts loaded)
mockup_reference: mockups/v3-buckets-bar.png
out_of_scope:
  - CategoryView redesign (next session)
  - Completed/Spaces/Archive views (only inherit Topbar restyle)
  - SettingsView, SearchResults
---

# Goal

Redesign Priority view per the Field Notebook design language defined in `DESIGN.md`. Replace the dark slate dashboard with a warm paper interface organized as a notebook spread:

1. **Topbar tabs** — sentence-case labels with an ink-stamp underline on the active tab. No icon, no blue pill, no glassmorphism.
2. **Buckets bar** — Daily / Groceries / Tools collapse from full sections into a compact row of three drop-target pills above the priority lanes. Click a pill to expand its contents inline.
3. **5 priority lanes** — Inbox · Today · Tomorrow · This week · Someday. (For now lane already excluded from `BOARD_PRIORITIES`; this plan does not re-add or alter it.)
4. **Today as hero** — Today gets a serif Fraunces heading and ~50% more column width than its siblings.
5. **Index-card style cards** — paper-raised background, hairline ink-rule border, no left side-stripe, no mouse-tracking radial glow. Idea cards keep an orange `IDEA` mono kicker. Link cards have no kicker (the column header carries the lane).

The reference mockup is `mockups/v3-buckets-bar.png` (HTML at `mockups/v3-buckets-bar.html`).

# Files affected

| Path | Change |
|---|---|
| `src/renderer/components/TopBar.tsx` | Drop lucide icons from segmented buttons. Simplify brand lockup (drop `brand-copy` wrapper). |
| `src/renderer/components/PriorityView.tsx` | Replace `landing-buckets` block with new `buckets-bar` (compact pills). Add `data-hero` attribute to the Today column. Remove inline `PRIORITY_COLORS` use on `column-bar`. Drop the `column-bar` element. Add `lane-meta` element. |
| `src/renderer/components/Card.tsx` | Delete `--mouse-x`/`--mouse-y` style + `handleMouseMove`. Delete `borderLeft` inline style. Remove `PRIORITY_COLORS` import. |
| `src/renderer/components/IdeaCard.tsx` | Same deletions as Card. Add `<div class="card-kicker idea">IDEA</div>` at the top of the card body (replaces the PenLine icon role). Remove `favicon-stack` block and PenLine import. |
| `src/renderer/styles/globals.css` | Restyle `.topbar`, `.brand-*`, `.segmented`, `.priority-board`, `.board-columns`, `.board-column`, `.column-header`, `.column-bar` (remove), `.column-count`, `.card-shell`, `.column-banner`, `.empty-state`. Add new classes `.buckets-bar`, `.bucket-pill`, `.lane-meta`, `.lane-rule`, `.lane-title-hero`, `.lane-title-small`, `.card-kicker`. Remove `.landing-buckets`, `.landing-bucket`, `.landing-bucket-body`. |
| `src/renderer/styles/hover.css` | Replace `.cortex-card` radial gradient hover with a flat warm-shadow lift. |
| `src/shared/constants.ts` | No type changes. Optionally remap `PRIORITY_COLORS` hex values to lane tokens (`var(--lane-coral)` etc.) — but since the only remaining caller (column-bar) is being deleted, the constant becomes unused outside legacy DB normalization. Mark for removal in a follow-up; leave intact this phase. |

No DB migration needed. No type union changes. No constants file rename.

# Tasks

Work through the tasks in order. After each task, run `npm run typecheck`. After Task 5, run `npm run dev` and visually verify against `mockups/v3-buckets-bar.png`.

## Task 1 — Topbar restyle

**File:** `src/renderer/components/TopBar.tsx`

Goal: notebook tabs. Drop icons from each tab button. Drop the redundant `brand-copy` wrapper.

1. Remove these icon imports from the lucide-react import: `Archive, Boxes, CheckCircle2, LayoutGrid, ListFilter`. Keep `Plus`, `Search`, `Settings`.
2. Inside each `<button>` in the `.segmented` div, delete the `<Icon size={14} ... />` element. Leave only the label text.
3. Replace the brand lockup block with a flatter structure:
   ```tsx
   <div className="brand-lockup">
     <span className="brand-mark" />
     <span className="brand-name">Cortex</span>
   </div>
   ```
   Delete `brand-copy` and `brand-title` wrappers.

**File:** `src/renderer/styles/globals.css`

4. Replace the `.topbar` rule:
   ```css
   .topbar {
     display: flex;
     align-items: center;
     gap: 24px;
     padding: 14px 28px 0;
     border-bottom: 1px solid var(--rule);
     background: var(--paper-raised);
   }
   ```
   No backdrop-filter. No dark fallback.
5. Replace `.brand-mark`:
   ```css
   .brand-mark {
     width: 14px;
     height: 14px;
     background: var(--ink-stamp);
     border-radius: 2px;
   }
   ```
6. Replace `.brand-lockup` and add `.brand-name`:
   ```css
   .brand-lockup {
     display: flex;
     align-items: center;
     gap: 10px;
     padding-bottom: 12px;
   }
   .brand-name {
     font-family: var(--font-display);
     font-size: 16px;
     font-weight: 500;
     letter-spacing: 0.005em;
     color: var(--ink);
   }
   ```
   Remove the existing `.brand-copy`, `.brand-title`, `.brand-subtitle` rules.
7. Replace `.segmented` and the active state:
   ```css
   .segmented {
     display: inline-flex;
     align-items: stretch;
     gap: 4px;
     padding: 0;
     border: 0;
     background: transparent;
   }
   .segmented button {
     padding: 12px 14px 10px;
     border: 0;
     background: transparent;
     color: var(--ink-soft);
     font-family: var(--font-body);
     font-size: 13px;
     font-weight: 500;
     position: relative;
     cursor: pointer;
     transition: color var(--duration-quick) var(--ease-out-quart);
   }
   .segmented button:hover {
     color: var(--ink);
   }
   .segmented button[data-active='true'] {
     color: var(--ink);
   }
   .segmented button[data-active='true']::after {
     content: '';
     position: absolute;
     left: 14px;
     right: 14px;
     bottom: -1px;
     height: 2px;
     background: var(--ink-stamp);
   }
   ```

Acceptance:
- Tabs show as text only (no icons). Active tab has a 2px ink-stamp underline that visually sits on the topbar's bottom rule.
- Brand reads "Cortex" in Fraunces, single line, 16px.

## Task 2 — Buckets bar replaces landing-buckets

**File:** `src/renderer/components/PriorityView.tsx`

Goal: compact pill row. Each pill is a drop target. Clicking a pill expands its bucket contents inline; clicking again collapses.

1. Above the existing `useState<DragSource>` call, add a new state:
   ```tsx
   const [expandedBucket, setExpandedBucket] = useState<FixedBucketTag | null>(null)
   ```
2. Replace the entire `<section className="landing-buckets">…</section>` block (currently rendering three full bucket sections) with this:
   ```tsx
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
                       onDelete: (target) => { void onDelete(target) },
                       onComplete: (target) => { void onComplete(target) }
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
   ```
   The pill is the drop target whether expanded or collapsed. The expanded body is rendered inside the pill so the drag/drop handlers stay on the same element.

**File:** `src/renderer/styles/globals.css`

3. Delete the existing `.landing-buckets`, `.landing-bucket`, `.landing-bucket-body` rules.
4. Update the combined drop-active rule (was `.landing-bucket[data-drop-active='true'], .board-column[data-drop-active='true']`): split it. Replace with:
   ```css
   .board-column[data-drop-active='true'] .lane-rule {
     background: var(--ink-stamp);
     height: 2px;
   }
   ```
5. Add new buckets-bar rules:
   ```css
   .buckets-bar {
     display: flex;
     align-items: stretch;
     gap: 10px;
     padding: 0 0 4px;
   }
   .buckets-bar-label {
     align-self: center;
     padding-right: 4px;
     font-family: var(--font-mono);
     font-size: 10px;
     letter-spacing: 0.1em;
     text-transform: uppercase;
     color: var(--ink-dim);
   }
   .bucket-pill {
     flex: 1;
     display: flex;
     align-items: center;
     gap: 10px;
     padding: 10px 14px;
     background: var(--paper-raised);
     border: 1px solid var(--rule);
     border-radius: 8px;
     cursor: pointer;
     transition:
       border-color var(--duration-quick) var(--ease-out-quart),
       background var(--duration-quick) var(--ease-out-quart);
   }
   .bucket-pill:hover { border-color: var(--ink-stamp); }
   .bucket-pill[data-drop-active='true'] {
     border: 1.5px dashed var(--ink-stamp);
     background: var(--paper-deep);
   }
   .bucket-pill[data-expanded='true'] {
     flex-basis: 100%;
     flex-direction: column;
     align-items: stretch;
     gap: 12px;
   }
   .bucket-glyph {
     width: 22px;
     height: 22px;
     display: grid;
     place-items: center;
     font-family: var(--font-display);
     font-style: italic;
     font-size: 14px;
     color: var(--ink-soft);
   }
   .bucket-name {
     font-family: var(--font-display);
     font-size: 15px;
     font-weight: 500;
     color: var(--ink);
   }
   .bucket-count {
     margin-left: auto;
     font-family: var(--font-mono);
     font-size: 11px;
     color: var(--ink-dim);
     background: var(--paper-deep);
     padding: 2px 8px;
     border-radius: 999px;
   }
   .bucket-body {
     display: flex;
     flex-direction: column;
     gap: 10px;
     width: 100%;
     padding-top: 4px;
   }
   ```

Acceptance:
- Three pills (Daily / Groceries / Tools) render in one row above the lanes, each with a glyph, name, count.
- Dragging a card from any lane onto a pill highlights the pill (dashed ink-stamp border, paper-deep bg) and drops successfully.
- Clicking a pill expands it to full width, showing its contents inline; clicking again collapses.

## Task 3 — Lanes grid with Today as hero

**File:** `src/renderer/components/PriorityView.tsx`

1. Inside the `<div className="board-columns">` map, on the `<section className="board-column">`, add `data-hero={priority === 'today'}` as an attribute.
2. Replace the existing `<header className="column-header">` block with:
   ```tsx
   <header className="lane-head">
     <h3 className={`lane-title ${priority === 'today' ? 'lane-title-hero' : 'lane-title-small'}`}>
       {PRIORITY_LABELS[priority]}
     </h3>
     <span className={`lane-meta lane-meta-${priority}`}>
       {String(columnItems.length).padStart(2, '0')} {columnItems.length === 1 ? 'ITEM' : 'ITEMS'}
     </span>
   </header>
   <div className="lane-rule" />
   ```
3. Delete the `<span className="column-bar" style={{ background: PRIORITY_COLORS[priority] }} />` line and remove `PRIORITY_COLORS` from the imports of this file.

**File:** `src/renderer/styles/globals.css`

4. Replace `.priority-board`:
   ```css
   .priority-board {
     min-height: 100%;
     display: flex;
     flex-direction: column;
     gap: 26px;
     padding: 22px 28px 32px;
   }
   ```
5. Replace `.board-columns`:
   ```css
   .board-columns {
     display: grid;
     grid-template-columns: 240px 360px 240px 240px 240px;
     gap: 24px;
     align-items: start;
     min-width: max-content;
   }
   ```
   The 5 widths map 1:1 to `BOARD_PRIORITIES` (`['inbox','today','tomorrow','this-week','someday']`). Today (index 1) gets 360px; others 240px.
6. Replace `.board-column,.category-column`:
   ```css
   .board-column {
     display: flex;
     flex-direction: column;
     gap: 12px;
     border-radius: 0;
     transition: none;
   }
   .category-column {
     /* untouched here — owned by category view */
   }
   ```
7. Delete `.column-bar` rule entirely.
8. Replace `.column-header` with `.lane-head`:
   ```css
   .lane-head { margin-bottom: 0; }
   .lane-title {
     margin: 0 0 4px;
     color: var(--ink);
   }
   .lane-title-small {
     font-family: var(--font-body);
     font-size: 13px;
     font-weight: 600;
   }
   .lane-title-hero {
     font-family: var(--font-display);
     font-size: 28px;
     font-weight: 500;
     letter-spacing: -0.01em;
     line-height: 1;
   }
   .lane-meta {
     font-family: var(--font-mono);
     font-size: 10px;
     font-weight: 500;
     letter-spacing: 0.08em;
     text-transform: uppercase;
   }
   .lane-meta-inbox { color: #8a7d6a; }
   .lane-meta-today { color: var(--lane-teal); }
   .lane-meta-tomorrow { color: var(--lane-butter); }
   .lane-meta-this-week { color: var(--lane-sage); }
   .lane-meta-someday { color: var(--lane-violet); }
   .lane-rule {
     height: 1px;
     background: var(--rule);
     margin: 8px 0 14px;
   }
   ```
   Keep the legacy `.column-header`, `.column-title`, `.column-count` rules intact for now — other views (CategoryView, CompletedView) still use them. They will be migrated in a later phase.
9. Replace `.column-body`:
   ```css
   .column-body {
     min-height: 180px;
     display: flex;
     flex-direction: column;
     gap: 12px;
   }
   ```

Acceptance:
- Five lane columns visible. Today is wider (360px) and its heading is large Fraunces.
- Other lanes have a small Inter heading and a mono caps "02 ITEMS" line in the lane color.
- A 1px hairline rule separates lane heading from cards.

## Task 4 — Cards (drop stripe, drop mouse-glow)

**File:** `src/renderer/components/Card.tsx`

1. Remove the `import { PRIORITY_COLORS }` line.
2. Delete the `cardStyle` const and the `handleMouseMove` function (lines 43–55 region).
3. In the JSX `<button>`, remove `style`, `onMouseMove`. Keep `className="card-shell cortex-card"`. The `cortex-card` class can stay; we'll repoint its hover style in Task 5.

**File:** `src/renderer/components/IdeaCard.tsx`

4. Same removals as Card.tsx (`PRIORITY_COLORS` import, `cardStyle`, `handleMouseMove`, `style`, `onMouseMove`).
5. Remove `PenLine` from the `lucide-react` import. The `favicon-stack` div with the PenLine icon and orange tint is no longer needed.
6. Replace the entire `<div className="card-header">…</div>` block with:
   ```tsx
   <div className="card-kicker idea">IDEA</div>
   <div className="card-body">
     <div className="card-title">{item.title}</div>
     {item.note ? <div className="card-note">{item.note}</div> : null}
   </div>
   ```
7. Keep the `complete-checkbox` and `card-delete-button` overlays as-is.

**File:** `src/renderer/components/Card.tsx` (visual structure)

8. Card.tsx does not get a kicker. The lane header carries the lane name. Leave `card-header` intact (favicon-stack + title + meta).

**File:** `src/renderer/styles/globals.css`

9. Replace `.card-shell`:
   ```css
   .card-shell {
     position: relative;
     border: 1px solid var(--rule);
     border-radius: 6px;
     background: var(--paper-raised);
     padding: 12px 14px;
     display: flex;
     flex-direction: column;
     gap: 6px;
     text-align: left;
     color: var(--ink);
     transition:
       transform var(--duration-quick) var(--ease-out-quart),
       box-shadow var(--duration-quick) var(--ease-out-quart);
   }
   ```
10. Add a card-kicker rule:
    ```css
    .card-kicker {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--ink-dim);
    }
    .card-kicker.idea { color: var(--idea-warm); }
    ```
11. Update `.card-title` to use Inter weight 600 with ink color (likely already correct — verify).
12. Replace `.column-banner`:
    ```css
    .column-banner {
      border: 1px solid rgba(232, 144, 102, 0.35);
      background: rgba(232, 144, 102, 0.10);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    ```
13. Replace `.empty-state`:
    ```css
    .empty-state {
      min-height: 96px;
      display: grid;
      place-items: center;
      border: 1px dashed var(--rule);
      border-radius: 6px;
      color: var(--ink-dim);
      font-family: var(--font-display);
      font-style: italic;
      font-size: 13px;
      text-align: center;
      padding: 16px 12px;
      background: transparent;
    }
    ```

**File:** `src/renderer/styles/hover.css`

14. Replace the `.cortex-card` rule entirely:
    ```css
    .cortex-card {
      transition:
        transform var(--duration-quick) var(--ease-out-quart),
        box-shadow var(--duration-quick) var(--ease-out-quart);
    }
    .cortex-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-card);
    }
    ```
    Drop all `--mouse-x`, `--mouse-y`, `radial-gradient`, and `--card-highlight` references. The `data-card-kind="idea"` selector can be removed too (no longer used for hover).

Acceptance:
- Cards show paper-raised background with a hairline ink-rule border. No left side stripe in any priority.
- Idea cards show a small orange `IDEA` kicker above the title.
- Hover lifts the card 2px with a soft warm shadow. No cursor-following gradient.

## Task 5 — Visual verification

1. Run `npm run dev`. App opens.
2. Click the Priority tab. Verify:
   - Topbar reads "Cortex" in Fraunces, segmented tabs underneath as plain text, ink-stamp underline on Priority.
   - Buckets bar shows "DROP INTO" mono label + 3 pills.
   - Lanes show 5 columns with Today wider and serif.
   - Cards have no left stripe, hover lifts cleanly.
3. Drag a card from Inbox onto the Daily pill. Verify the pill highlights (dashed border) and the card drops into Daily.
4. Click the Daily pill. Verify it expands inline with the card visible.
5. Drag a card between lanes (e.g. Today → Tomorrow). Verify drop-target visual on the destination lane (the lane-rule turns ink-stamp 2px).
6. Compare against `mockups/v3-buckets-bar.png`. Discrepancies > minor pixel-level should be flagged.
7. Check the other tabs (Category, Completed, Spaces, Archive) for visual regressions in shared components (Card, TopBar). They will not be redesigned this phase but must remain readable on the new paper background.

# Verification

After all tasks:
- `npm run typecheck` — passes.
- `npm run test:unit` — passes. (The legacy `for-now` normalization test in `tests/unit/items-db.test.ts` still passes because `normalizePriority` is unchanged.)
- `npm run dev` — opens, Priority view matches the mockup.
- No `console.log` introduced.
- No new dependencies added.

# Rollback

```bash
git checkout HEAD -- \
  src/renderer/components/TopBar.tsx \
  src/renderer/components/PriorityView.tsx \
  src/renderer/components/Card.tsx \
  src/renderer/components/IdeaCard.tsx \
  src/renderer/styles/globals.css \
  src/renderer/styles/hover.css
```

# Notes for follow-up phases

- `PRIORITY_COLORS` and the `.column-bar` / `.landing-bucket*` CSS rules are now dead. Remove in a cleanup phase after CategoryView and CompletedView are migrated to the same lane tokens.
- `for-now` priority remains in `PRIORITIES`, `PRIORITY_LABELS`, `PRIORITY_COLORS`, and the DB CHECK constraint. Keep as a legacy alias; UI never displays it. The migration in `src/main/db/migrations.ts:119` already converts existing `for-now` rows to `today`.
- The `cortex-card` class name is retained for hover styling continuity. Consider renaming to `.card-shell:hover` directly in a later cleanup.
- CategoryView (next session) shares Card / IdeaCard, so the card redesign here propagates automatically.
