# Cortex — Feature Backlog

> Status sweep 2026-07-18: items 1-5 all shipped (commits 9727fec, 028c18d, 6d50ce8, abe6894, 7716b88).

Unplanned ideas. Not ordered by priority. Each entry has enough context to write a plan from.

---

## Phase-5 candidates (2026-07-18 product review — discussed, not yet approved)

Context for all entries below: real-DB usage audit on 2026-07-18 showed 62 items total, 60 sitting in Inbox, 0 ever completed, 0 ever archived, 0 reminders used, last item opened 2026-05-05. Capture works; the triage→action→done loop (the product's core premise per PRODUCT.md) has never run. Mobile capture died in May when the Supabase Telegram chain broke — likely the moment app usage died. Phase 5 should rebuild the retention loop, not add organizing surfaces.

## 6. Triage session mode ("inbox zero in 2 minutes")

**What:** Keyboard-only rapid triage: press one key to start, app shows ONE inbox item at a time, single-key actions — `t` today, `m` tomorrow, `w` this week, `s` someday, `a` archive, `x` complete, `Enter` skip. Progress counter ("12 left"). Email-triage flow, not board dragging.

**Why:** 60 items rotted in Inbox because triage-by-dragging 60 cards is a chore. Board is fine for 5 items/day, not for a backlog. This is the highest-leverage missing piece.

## 7. Morning digest via Discord DM (replace dead gws email)

**What:** `fireMorningDigest` posts today's task list as a Discord message (bot token already configured — POST /channels/:id/messages, ~15 lines) instead of / in addition to the never-working `gws gmail +send` path. Optionally a dedicated `#cortex-digest` channel.

**Why:** gws auth was never completed; email has silently failed since the feature shipped. Discord bot is already authenticated and lives on the phone — same surface the user now captures from. Zero new auth surface.

## 8. Two-way Discord bot (capture receipts + queries)

**What:** (a) Bot adds a ✅ reaction to each captured message — trust receipt, phone-visible. (b) Message `?today` or `?list` → bot replies with current Today/Inbox list. Poller already sees all messages; reply is one REST call.

**Why:** Right now capture is fire-and-forget with no confirmation; a silent failure (like the 404 during setup) is invisible from the phone.

## 9. Stale-item sweep (auto-suggest archive)

**What:** Items in Inbox older than N days (e.g. 45) get flagged; periodic prompt or triage-mode filter offers one-key bulk archive to a "cold storage" state. Not auto-delete — auto-suggest.

**Why:** 0 archived ever. Without decay pressure, Inbox becomes a graveyard that punishes opening the app.

## 10. Video/Reels-to-text capture enrichment

**What:** From the user's own May inbox: "I have videos or Instagram Reels or YouTube Shorts... save these and get text out of them." Discord-captured video links get transcript/summary attached (yt-dlp + whisper or a transcript API) as item note.

**Why:** User-stated need sitting in the inbox since May. Big scope — needs its own plan; park until loop features (6-8) ship.

## 11. Contrarian note — stop adding surfaces (process, don't organize)

**What:** Not a feature — a constraint for phase 5+. App already has 8 views (Priority, Category, Completed, Spaces, Archive, Issues, Research, Settings) for one user whose entire active dataset is ~60 items, none of which have ever been completed or archived. Bottleneck is processing, not organizing.

**Why:** Every new view adds triage surface without adding throughput. Rule of thumb going forward: no new view until completed_at count > 0 for 4 straight weeks.

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
