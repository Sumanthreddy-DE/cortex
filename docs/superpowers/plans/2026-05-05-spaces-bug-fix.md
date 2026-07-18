# Spaces Bug Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix space cards so items added to a space but never opened are visible (not silently hidden).

**Status:** DONE — already implemented in commit `20bdc18` (found during 2026-07-18 execution attempt). Runtime-verified 2026-07-18: never-opened item renders under "Items" heading in space card.

**Architecture:** Single-file change in `SpacesView.tsx`. The bug is in the `recent` filter which requires `last_opened_at` to be non-null — ideas and companies never get touched so they vanish. Remove that guard, rename section to "Items", show all non-pinned members sorted by recency (nulls last).

**Tech Stack:** React, TypeScript

---

### Task 1: Fix the invisible-items bug in SpaceCard

**Files:**
- Modify: `src/renderer/components/SpacesView.tsx:140-151`

- [x] **Step 1: Locate the filter and understand the bug**

Open `src/renderer/components/SpacesView.tsx`. At line 142-145:

```tsx
const recent = spaceItems
  .filter((item) => !item.space_pinned[space.id] && item.last_opened_at)  // ← bug: null = invisible
  .sort((left, right) => (right.last_opened_at ?? 0) - (left.last_opened_at ?? 0))
  .slice(0, 5)
```

Items in a space with `last_opened_at === null` (ideas, newly added items, companies) are filtered out. They appear in neither `pinned` nor `recent`, so the card shows "No pinned or recently used items yet" even though items exist.

- [x] **Step 2: Replace `recent` with `unpinned` — show all non-pinned members**

Replace lines 142-145 with:

```tsx
const unpinned = spaceItems
  .filter((item) => !item.space_pinned[space.id])
  .sort((left, right) => (right.last_opened_at ?? 0) - (left.last_opened_at ?? 0))
```

- [x] **Step 3: Update the JSX that renders the `recent` section**

Find the JSX block at line ~181 that renders `{recent.length > 0 ? ...}`. Replace all three occurrences of `recent` with `unpinned` and change the section heading from `"Recent"` to `"Items"`:

```tsx
{unpinned.length > 0 ? (
  <div className="space-section">
    <h4>Items</h4>
    {unpinned.map((item) => (
      <SpaceItemRow
        key={item.id}
        item={item}
        space={space}
        onOpenItem={onOpenItem}
        onRemoveItem={onRemoveItem}
        onSetPinned={onSetPinned}
      />
    ))}
  </div>
) : null}
```

- [x] **Step 4: Update the empty-state guard**

Line ~197 currently checks `pinned.length === 0 && recent.length === 0`. Update to:

```tsx
{pinned.length === 0 && unpinned.length === 0 ? (
  <div className="empty-state">No items yet. Use "Add to {space.name}" below.</div>
) : null}
```

- [x] **Step 5: Verify no TypeScript errors**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [x] **Step 6: Commit**

```bash
git add src/renderer/components/SpacesView.tsx
git commit -m "fix: show all space items, not just recently-opened ones"
```
