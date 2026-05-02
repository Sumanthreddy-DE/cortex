# Cortex — Future Improvements & Known Gaps
**Written:** 2026-04-25
**Source:** Post-implementation review comparing spec vs code

This file tracks everything found during review that is:
- In the spec but not yet coded
- A known deviation that was intentional
- A technical debt item worth tracking

When ready to work on any of these, open a Claude Code session and say:
**"Let's fix/build [item name] from FUTURE-IMPROVEMENTS."**

---

## Intentional Deviations (Design Decisions)

These differ from the spec by choice — do not "fix" them unless decided.

| Item | Spec | Code | Decision |
|---|---|---|---|
| "For Now" column | Separate 6th column, pinned strip | Merged into `today` via `normalizePriority` | Intentional — simplifies UX for now |
| Fixed Bucket Tags | Not in spec | Added (`Daily`, `Groceries`, `Tools`) | Intentional — personal workflow enhancement |
| `item_notes` table | Single `note` text field on ideas | Append-only note log per idea | Intentional — richer idea tracking |

---

## Not Yet Built (Planned Phases)

### Phase 1b — Chrome Extension
**Status:** ✅ Complete. Lives in `cortex-extension/`.
**What's needed:**
- `cortex-extension/` folder with Manifest V3
- `popup.html` + `popup.js` — auto-fills current tab URL + title
- Auto-tag detection: `github.com/*` → GitHub, `youtube.com/*` → YouTube, `linkedin.com/jobs/*` → Full-time
- POST to `localhost:51204/api/items`
- Error state: "Cortex isn't running — launch it from the system tray."
- Default priority for extension captures: `inbox`
- Shortcut: `Ctrl+Shift+S` (already registered in Electron as quick-add fallback)

**Impact:** Without it, URL capture requires copy-pasting. Highest daily-use surface.

---

### Phase 2 — Telegram Bot (Railway webhook)
**Status:** Partially built. Electron poller is complete. Railway webhook server is in `cortex-webhook/server.js`.
**What's missing:**
- Railway deployment (one-click, already has free tier)
- Supabase `bot_queue` table needs to be created (schema in spec)
- `.env` file in Electron app: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Bot created via @BotFather and webhook URL pointed at Railway

**Note:** The bot webhook already supports `/today`, `/tomorrow`, `/now`, `/remind` commands.
**Backlog item:** Eventually replace Railway with direct Telegram polling in Electron (Phase 6).

---

### Phase 3 — Advanced Cron & Notifications
**Status:** Mostly complete — midnight cron, reminders, morning digest all implemented.
**What's missing:**
- Morning digest does NOT count `for-now` items (since `for-now` is merged into `today`, this is implicit). Verify the count is correct.
- Tray tooltip shows `today` count only — verify it counts correctly after the `for-now` merge.

---

### Phase 4 — Calendar Integration
**Status:** Implemented. `calendar.ts` shells out to `gws calendar insert`.
**What's missing:**
- "Add to Calendar" button in EditModal needs verification — does `gws` auth work on this machine?
- Pull direction (Calendar → Cortex) is deferred to future.

---

### Phase 5 — Settings & Polish
**Status:** Settings view exists. Auto-start toggle and morning digest time are in the UI.
**What's missing (per spec):**
- Port display in settings (show user that Cortex runs on :51204)
- Telegram bot config UI (enter Supabase URL/key via settings instead of .env)
- Light mode (deferred to Phase 5 per spec — currently dark-only)

---

## Technical Debt

### 1. `better-sqlite3` native module mismatch
**Problem:** `.node` file compiled for Node v22, Electron 37 requires a different ABI.
**Fix:** Run once in terminal: `npx electron-rebuild -f -w better-sqlite3`
**Impact:** E2E tests and `npm run dev` crash until fixed.

### 2. Morning digest cron merged with reminder cron ✅ Fixed
**Was:** Two separate `cron.schedule(REMINDER_CHECK_CRON, ...)` registrations.
**Now:** Merged into one per-minute cron — reminders + digest gate in same callback.

### 3. Alt+C shortcut removed ✅ Fixed
**Was:** `Alt+C` AND `Ctrl+Shift+N` both opened quick-add.
**Now:** `Ctrl+Shift+S` AND `Ctrl+Shift+N` both open quick-add.

### 4. Web preview scripts removed ✅ Fixed
**Was:** `web:api`, `web:ui`, `web:dev`, `web:stop`, `web:build` scripts in package.json.
**Now:** Removed. `src/main/web-server.ts` kept (not harmful) but unexposed.

### 5. FTS rebuild runs every startup
**Location:** `migrations.ts` line 82
**Problem:** `INSERT INTO items_fts(items_fts) VALUES ('rebuild')` runs on every app start, even when nothing changed. On large DBs this is slow.
**Fix:** Gate it behind a version flag in the `meta` table: `INSERT OR IGNORE INTO meta VALUES ('fts_version', '1')` — only rebuild if version changes.

### 6. Duplicate `deserialize` function in `search.ts`
**Problem:** `search.ts` has its own `deserialize()` that duplicates the one in `items.ts`. DRY violation.
**Fix:** Export `deserialize` from `items.ts` (rename to `deserializeItem`) and import in `search.ts`.

### 7. `item_notes` migration runs every startup
**Location:** `migrations.ts` lines 64-79
**Problem:** The `INSERT INTO item_notes SELECT FROM items` query runs every startup to migrate legacy notes. Safe (guarded by NOT EXISTS) but adds startup overhead for users with many idea items.
**Fix:** After confirmed migration, remove the block or gate it behind a meta version flag.

### 8. Tag rename has no endpoint
**Problem:** No way to rename a tag globally (e.g., rename all "github" occurrences to "GitHub").
**Fix:** `PATCH /api/tags/rename` endpoint that updates all items via JSON manipulation in SQLite.

### 9. `normalizeTags` queries DB on every item create/update
**Location:** `items.ts` `normalizeTags()`
**Problem:** Every `createItem()` / `updateItem()` call hits the DB to get all distinct tags for case normalization. Fine for personal use (< 1000 items) but worth noting.
**Future fix:** Cache distinct tags with a short TTL in memory if performance becomes an issue.

### 10. CategoryView DnD uses correct `fromTag` semantics
**Status:** Implemented correctly — verified from code. The drag state tracks `{ item, fromTag }` not just item.

---

## Spec Features Never Implemented (Minor)

| Feature | Spec section | Status |
|---|---|---|
| Right-edge gradient fade mask on priority board | Section 5 | Check CSS — may already be there |
| "Inbox badge" count in TopBar when inbox non-empty | Section 5 | ✅ Implemented via `inboxCount` prop |
| DnD drag preview (better than browser default ghost) | Review §4.6 | Not done — HTML5 ghost is visible |
| Arrow key navigation between cards | Review §2.6 | Not done — deferred |
| Favicon overlay for blank 16×16 Google API returns | Review §3.8 | Partially — layered letter + img handles real 404s |
| Keyboard nav in modals (Tab, Enter to submit) | Not in spec | Not done |

---

## Questions to Decide Before Next Session

1. **Chrome extension priority?** It's Phase 1b — highest daily-use capture path. Should we build it next?

2. **Telegram bot deployment?** The webhook code is done. Do you want to deploy it to Railway now, or keep using the Electron-only workflow?

3. **`better-sqlite3` rebuild** — run `! npx electron-rebuild -f -w better-sqlite3` in your terminal so the app can actually launch. This is blocking E2E tests.

4. **Settings: Telegram config UI** — right now Supabase credentials go in a `.env` file. Do you want a settings screen for that instead of `.env`?

5. **`web-server.ts` file** — it's harmless now that the scripts are removed. Delete it, or keep it in case you want to run a headless API mode later?
