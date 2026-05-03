# Category View Redesign — Implementation Plan

**Goal:** Transform the current card-heavy Category view into a cleaner, list-based layout that's easier to scan and browse, while maintaining the warm "Field Notebook" aesthetic.

**Reference Mockup:** `mockups/category-view-improved.html` in the Cortex Design System project

---

## Overview of Changes

The current Category view uses full cards for every item, which creates visual clutter when browsing many links. The improved design uses:

1. **List-style item rows** instead of cards (lighter visual weight)
2. **Grid layout for subfolders** (auto-fill, 300px minimum width)
3. **Priority dots** on each item (shows which lane it belongs to at a glance)
4. **Cleaner category headers** with italic glyph, better spacing
5. **Improved empty states** for "Add subfolder"

---

## Files to Modify

1. `src/renderer/components/CategoryView.tsx` — Component structure
2. `src/renderer/styles/globals.css` — Styles for category view
3. (Optional) Extract category styles to `src/renderer/styles/category.css` for better organization

---

## Implementation Steps

### Step 1: Update Category View Styles

**File:** `src/renderer/styles/globals.css`

**Current state:** Cards are used for every item, making the view heavy and cluttered.

**Changes needed:**

#### 1.1 — Update `.category-grid` for better spacing

**Current:**
```css
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
```

**New:**
```css
.category-grid {
  display: flex;
  flex-direction: column;
  gap: 42px; /* More breathing room between categories */
}
```

#### 1.2 — Update `.category-group` (parent category sections)

**Current:**
```css
.category-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--rule);
  border-radius: 12px;
  background: var(--paper-raised);
}
```

**New:**
```css
.category-group {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 0; /* Remove padding, use natural spacing */
  border: none; /* Remove card border */
  border-radius: 0;
  background: transparent;
}
```

#### 1.3 — Create new category header styles

**Add these new classes:**

```css
.category-head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--rule);
}

.category-icon {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 24px;
  font-weight: 500;
  color: var(--ink-soft);
  flex-shrink: 0;
}

.category-name {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 500;
  color: var(--ink);
  margin: 0;
}

.category-count {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-dim);
}

.category-spacer {
  flex: 1;
}

.category-add {
  padding: 5px 12px;
  border: 1px solid var(--rule);
  border-radius: 6px;
  background: transparent;
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 120ms, color 120ms;
}

.category-add:hover {
  border-color: var(--ink-stamp);
  color: var(--ink);
}
```

#### 1.4 — Update subfolder grid layout

**Add/replace:**

```css
.category-subfolders {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}
```

#### 1.5 — Create list-style item rows (KEY CHANGE)

**Replace the current card-based item styles with:**

```css
/* List-style items instead of cards */
.cat-item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: background 120ms, border-color 120ms;
  text-align: left;
  width: 100%;
}

.cat-item-row:hover {
  background: var(--paper-raised);
  border-color: var(--rule);
}

.cat-item-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  flex-shrink: 0;
  /* Background color set inline based on priority */
}

.cat-item-favicon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 4px;
  object-fit: cover;
}

.cat-item-link-mark,
.cat-item-idea-mark {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 4px;
  background: var(--paper-deep);
  display: grid;
  place-items: center;
  font-size: 9px;
  font-weight: 700;
  color: var(--ink-soft);
}

.cat-item-title {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-item-domain {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--ink-dim);
  flex-shrink: 0;
}

.cat-item-complete {
  /* Keep existing complete button styles */
  margin-left: auto;
}
```

#### 1.6 — Update subfolder styles

```css
.subcategory {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0; /* Remove padding */
  border: none; /* Remove border */
  border-radius: 0;
  background: transparent;
}

.subcategory-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--rule);
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 600;
}

.subfolder-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-dim);
}

.subfolder-name {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 500;
  color: var(--ink);
  margin: 0;
}

.subfolder-count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--ink-dim);
  margin-left: auto;
}
```

---

### Step 2: Update Component Structure

**File:** `src/renderer/components/CategoryView.tsx`

#### 2.1 — Add priority dot colors

At the top of the file, ensure the `PRIORITY_DOT_COLOR` mapping uses the correct lane colors from your design system:

```typescript
const PRIORITY_DOT_COLOR: Record<Item['priority'], string> = {
  inbox: '#9b8d7d', // ink-dim
  'for-now': '#e8755a', // lane-coral
  today: '#3a8c91', // lane-teal
  tomorrow: '#e8c958', // lane-butter
  'this-week': '#a3b896', // lane-sage
  someday: '#7c7393' // lane-violet
}
```

#### 2.2 — Update category header rendering

Find where categories are rendered and update the header structure:

**Current structure:**
```tsx
<div className="category-group">
  {/* category content */}
</div>
```

**New structure:**
```tsx
<section className="category-group">
  <div className="category-head">
    <span className="category-icon">{category.charAt(0)}</span>
    <h2 className="category-name">{category}</h2>
    <span className="category-count">{totalCount} items</span>
    <div className="category-spacer" />
    <button className="category-add" onClick={/* ... */}>+ Add</button>
  </div>
  
  {/* Subfolders grid */}
  <div className="category-subfolders">
    {/* subfolder content */}
  </div>
</section>
```

#### 2.3 — Update item row rendering

In the `ItemList` component, ensure each item renders with this structure:

```tsx
<div
  className="cat-item-row"
  onClick={() => onCardClick(item)}
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
  {/* Priority dot */}
  <span
    className="cat-item-dot"
    style={{ 
      backgroundColor: PRIORITY_DOT_COLOR[item.priority] ?? PRIORITY_DOT_COLOR.inbox 
    }}
  />
  
  {/* Favicon or icon */}
  {item.type === 'link' && item.favicon_url ? (
    <img src={item.favicon_url} className="cat-item-favicon" alt="" width={18} height={18} />
  ) : item.type === 'link' ? (
    <span className="cat-item-link-mark">□</span>
  ) : (
    <span className="cat-item-idea-mark">•</span>
  )}
  
  {/* Title */}
  <span className="cat-item-title">{item.title}</span>
  
  {/* Domain (for links) */}
  {domain ? <span className="cat-item-domain">{domain}</span> : null}
  
  {/* Complete button */}
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
```

#### 2.4 — Update subfolder header rendering

Make sure subfolder headers use the new structure:

```tsx
<div className="subcategory-header">
  <span className="subfolder-label">Subfolder</span>
  <h3 className="subfolder-name">{childName}</h3>
  <span className="subfolder-count">{items.length}</span>
</div>
```

---

### Step 3: Add Page Intro (Optional but Recommended)

At the top of the category view, add a brief italic intro using Fraunces:

**In CategoryView.tsx:**

```tsx
export function CategoryView({ items, onTagChange, onComplete, onCardClick, onCreate }: Props) {
  // ... existing code ...
  
  return (
    <div className="content-panel">
      <p className="page-intro">Items grouped by tag. Drag between groups to re-tag.</p>
      
      <div className="category-grid">
        {/* existing category rendering */}
      </div>
    </div>
  )
}
```

**Add to globals.css:**

```css
.page-intro {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 15px;
  color: var(--ink-soft);
  margin: 0 0 32px;
  max-width: 640px;
}
```

---

### Step 4: Update "Add Subfolder" Empty State

Replace the current empty subfolder UI with:

```tsx
<div className="add-subfolder" onClick={handleAddSubfolder}>
  + Add subfolder
</div>
```

**CSS:**

```css
.add-subfolder {
  min-height: 120px;
  display: grid;
  place-items: center;
  border: 1px dashed var(--rule);
  border-radius: 8px;
  background: transparent;
  font-family: var(--font-display);
  font-style: italic;
  font-size: 14px;
  color: var(--ink-dim);
  cursor: pointer;
  transition: border-color 120ms, color 120ms;
}

.add-subfolder:hover {
  border-color: var(--ink-stamp);
  color: var(--ink);
}
```

---

## Testing Checklist

After implementing these changes:

- [ ] Categories display with italic glyph + Fraunces heading
- [ ] Items use list-style rows (not cards)
- [ ] Priority dots show correct colors based on item priority
- [ ] Hover states work on item rows (background + border)
- [ ] Subfolders display in grid layout (auto-fill, 300px min)
- [ ] Domain shows for link items in monospace
- [ ] Drag-and-drop still works between categories
- [ ] "Add subfolder" placeholder shows correct empty state
- [ ] Complete button (✓) still works on item rows
- [ ] Category "Add" button works in header
- [ ] Layout is responsive (grid collapses to single column on narrow screens)

---

## Visual Comparison

**Before:** Card-heavy layout with full borders and backgrounds on every item
**After:** Clean list-style rows with hover states, grid-based subfolder layout, priority dots for quick scanning

**Key UX improvements:**
1. **Faster scanning** — List rows are easier to skim than cards
2. **Priority visibility** — Colored dots show which lane each item is in at a glance
3. **Less visual noise** — Transparent backgrounds until hover
4. **Better use of space** — Grid layout adapts to viewport width
5. **Clearer hierarchy** — Category headers stand out with Fraunces serif + italic glyph

---

## Design Rationale

### Why list-style instead of cards?

Cards work great for the Priority board where you're focusing on 5-20 items at a time. But in Category view, you might have 50+ items in a single category. Full cards create:
- Too much visual weight
- Hard to scan quickly
- Wasted vertical space

List-style rows are:
- Lighter (transparent until hover)
- Easier to scan (consistent rhythm)
- More compact (see more at once)
- Still interactive (hover states, click, drag)

### Why priority dots?

In Category view, you lose the spatial context of "which column is this in?" that Priority view provides. The colored dots bring that information back — at a glance you can see "oh, most of my Research items are in Someday, but this one is Today."

### Why Fraunces for category names?

Category names are chapter-level navigation. Using the display serif (Fraunces) creates the "chapter break" feel that the design system calls for — it's the same voice as modal titles and empty states.

---

## Alternative: Gradual Migration

If you want to test this approach before fully committing, you could:

1. **Add a feature flag** in settings: "Use list-style category items"
2. **Implement both layouts** side-by-side
3. **Let users toggle** and give feedback
4. **Deprecate the card layout** once confirmed

This lets you validate the design with real usage before making it permanent.

---

## Questions or Adjustments Needed?

- Should the priority dots be larger (8px instead of 6px)?
- Should we add a subtle separator between items (1px hairline)?
- Should subfolders be collapsible by default?
- Should we add keyboard shortcuts for category navigation?

Let me know if you need any clarifications or want to adjust the approach!
