# Cortex — Feature Backlog

> Status sweep 2026-07-18: items 1-5 all shipped (commits 9727fec, 028c18d, 6d50ce8, abe6894, 7716b88). Backlog is empty — next ideas go here.

Unplanned ideas. Not ordered by priority. Each entry has enough context to write a plan from.

---

## 1. Ideas Dual Display — approved mockup in `mockups/ideas-dual-display.png`

**What:** Items in the Ideas bucket should appear in priority columns (Today, Tomorrow, This Week, Someday) at the same time. They stay permanently in the Ideas bucket AND show in the column matching their priority. Items with priority=inbox stay only in the bucket.

**Visual:** Card in the column shows a small `• from Ideas` badge so you can tell it came from the bucket.

**In the Ideas bucket list:** Rows with a non-inbox priority show a colored badge (`today`, `tomorrow`, etc.) so you can see at a glance which are scheduled.

**Footer:** "14 ideas · 2 scheduled" count + "Select to merge" button (merge already built, just need to restore it in the compact list view).

**Code change needed:** `PriorityView.tsx` — `columnItems` derivation currently excludes all fixed-bucket-tagged items. Needs to include Ideas-tagged items when `priority !== 'inbox'`.

---

## 2. Inbox Column — hide when empty

**What:** The Inbox column in PriorityView should only render when at least one item has priority=inbox (and is not in a fixed bucket). If inbox is empty, the column disappears and the board has 4 columns (Today / Tomorrow / This Week / Someday).

**Fallback option (if hard):** Keep all 5 columns visible always.

**Code change:** `PriorityView.tsx` — conditional render of the inbox column div.

---

## 3. Enter key saves and closes any modal

**What:** Pressing Enter anywhere in EditModal (or any other popup) should trigger Save and close the modal. Should not fire when focus is inside a textarea (Enter = newline there) or a `<select>`.

**Code change:** `EditModal.tsx` — add `onKeyDown` handler on the modal panel that calls `handleSubmit()` when `e.key === 'Enter'` and `e.target` is not a textarea or select.

---

## 4. Categories page — independent expand/collapse

**What:** Currently the categories page behaves like an accordion (opening one forces another closed). User wants each category to be independently expandable/collapsible. Default state: all collapsed. Click header to toggle.

**Code change:** `CategoryView.tsx` (or equivalent) — replace single `activeCategory` state with a `Set<string>` of expanded category IDs. Default = empty set (all collapsed).

---

## 5. Daily 5am email — Today's tasks digest

**What:** Every morning at 5:00am, send an email to the user's Gmail with all items currently in the **Today** lane (priority = today or for-now, not completed, not archived).

**Sub-question first:** Do Tomorrow items auto-promote to Today overnight (priority changes from `tomorrow` → `today` at midnight)? If yes, the 5am email already captures them. If no, the Tomorrow lane items stay as-is and need to be manually moved or auto-promoted.

**Email content:** Subject `Cortex — Today's tasks [date]`. Body: list of item titles with tags. Keep it plain, scannable.

**Implementation path:** Use the existing cron/midnight infrastructure in `src/main/cron/`. Add a new `morning-digest.ts` job (already exists — check if it needs to be extended) that runs at 05:00 and sends via `gws` CLI (`gws mail send`) or the Gmail MCP tools.

**User email:** sumanthreddy.settipalli@fau.de
