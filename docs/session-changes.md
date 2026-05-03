# Cortex — Session Changelog

> All changes made in the May 2026 design + feature session.
> For review by an AI agent or human reviewer.

---

## 1. Design Critique — 10-Point Fix Pass

**Files touched:** `src/renderer/App.tsx`, `src/renderer/styles/globals.css`, `src/renderer/components/PriorityView.tsx`, `src/renderer/components/CategoryView.tsx`, `src/renderer/components/CompletedView.tsx`, `src/renderer/components/SpacesView.tsx`, `src/renderer/components/Card.tsx`

### 1.1 Browser-preview banner → thin mono strip
- Removed the large full-width info banner
- Replaced with a single-line 10px JetBrains Mono text bar: `web preview — …`
- CSS class: `.browser-preview-badge`
- Height went from ~48px to ~20px

### 1.2 All column titles → Fraunces serif
- The "Today" column already used the hero serif style
- Inbox, Tomorrow, This Week, Someday now all use `.lane-title-chapter` (Fraunces 18px)
- Visual consistency across all five board lanes

### 1.3 Subfolder headers → sentence case
- Category view subfolder headers were rendering `text-transform: uppercase`
- Removed the uppercase transform — "CLAUDE" → "Claude", "CODEX" → "Codex"
- Matches the design spec which forbids ALL CAPS

### 1.4 `+ sub` button renamed to `+ folder`
- The button that creates a subfolder under a category tag was labelled `+ sub`
- Renamed to `+ folder` — universally understandable without knowing the slash-tag system

### 1.5 Category page intro copy rewritten
- Old: documentation-style description of tag mechanics
- New: direct, alive copy explaining slash-tags with an inline example

### 1.6 `window.prompt()` removed from Spaces view
- The "New Space" action used `window.prompt()` — a browser native blocking dialog
- Replaced with an inline input field in the header that auto-focuses on click
- Submits on Enter, cancels on Escape
- State: `creatingSpace: boolean`, `newSpaceName: string`, `newSpaceInputRef`

### 1.7 Stat cards removed from Completed view
- Removed the "3 today / 12 this week / 47 all-time" dashboard cards
- The Completed view is a personal log, not an analytics dashboard
- View is now a clean time-grouped list only

### 1.8 Category inline-add placeholder → mono, no italic
- The placeholder text in CategoryView's quick-add input was italic with body font
- Changed to JetBrains Mono 11px, no italic — consistent with terminal aesthetic

### 1.9 Link fallback icon: `□` → Lucide `Link`
- Cards with no favicon showed a broken white square `□` as the fallback
- Replaced with a proper Lucide `Link` icon (12px, strokeWidth 2)

### 1.10 `Courier New` → `var(--font-mono)`
- Settings view stat values were hardcoded to `Courier New`
- Changed to `var(--font-mono)` (JetBrains Mono) — consistent with all other mono surfaces

---

## 2. Web Push Notifications

**Files added:** `src/main/api/push.ts`  
**Files modified:** `src/main/db/migrations.ts`, `server-web.ts`, `src/renderer/components/TopBar.tsx`, `src/renderer/hooks/usePush.ts`

### How it works
1. Browser registers a push subscription via the Web Push API
2. Subscription (endpoint + keys) is stored in a new `push_subscriptions` SQLite table
3. When any item is created with `priority: 'inbox'` (e.g. via Telegram bot), the server sends a Web Push notification to all subscribed clients
4. Service worker receives the push and shows a system notification, even if Cortex is a background tab
5. Clicking the notification focuses the Cortex tab/window

### VAPID keys
- Generated and embedded in `src/main/api/push.ts`
- Public key exposed via `GET /api/push/vapid-key`
- `web-push` npm package used for server-side dispatch

### API endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/push/vapid-key` | Returns public VAPID key |
| POST | `/api/push/subscribe` | Saves a push subscription |
| DELETE | `/api/push/subscribe` | Removes a push subscription |

### UI: Bell icon in TopBar
- `BellOff` icon shown when notifications are off (default)
- Click → browser permission prompt → if granted, subscribes and icon turns teal (`Bell`)
- Click teal bell → unsubscribes
- States: `unsupported`, `default`, `subscribed`, `denied`, `loading`
- Hook: `src/renderer/hooks/usePush.ts`

### Database migration
```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         TEXT PRIMARY KEY,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

---

## 3. PWA Install Support

**Files added:** `src/renderer/public/manifest.json`, `src/renderer/public/sw.js`, `src/renderer/public/icon-192.svg`, `src/renderer/public/icon-512.svg`  
**Files modified:** `src/renderer/index.html`

### What was done
- Added `manifest.json` with app name, colors, icons, and an Inbox shortcut
- Added `apple-mobile-web-app-*` meta tags for Safari/iOS
- Registered service worker in `index.html` on `window.load`
- Service worker caches the app shell for offline resilience
- Service worker handles `push` and `notificationclick` events
- Icons: dark rounded square with lowercase serif "c", SVG at 192×192 and 512×512

### Install behavior
- Chrome shows the install prompt (screen+arrow icon in address bar) after the PWA criteria are met
- Once installed, Cortex opens in a standalone window with no browser chrome
- Works on desktop Chrome, Edge, and mobile Chrome

---

## 4. Batch-Move Ideas from Inbox

**Files modified:** `src/renderer/components/PriorityView.tsx`, `src/renderer/App.tsx`, `src/renderer/styles/globals.css`

### Problem
Users accumulate multiple related ideas in Inbox and want to move a cluster of them to a target lane (Today, Tomorrow, etc.) in one action rather than dragging one by one.

### Solution: multi-select mode on the Inbox column
- A small square icon button appears in the Inbox column header (only when Inbox has items)
- Clicking it enters **select mode**
- In select mode:
  - Each inbox card gets a checkbox overlay in the top-left corner
  - Clicking a card toggles its selection (no longer opens the edit modal)
  - Drag-and-drop is disabled while selecting
- When ≥1 item is selected, a dark **batch action bar** appears at the bottom of the column:
  - Shows count: `3 selected`
  - Target buttons: `Today` `Tomorrow` `This Week` `Someday`
  - `×` cancel button
- Clicking a target calls `onBatchPriorityChange(ids, priority)` which PATCHes each item sequentially, then clears selection and exits select mode

### New prop
```ts
// PriorityView
onBatchPriorityChange: (ids: string[], priority: BoardPriority) => Promise<void>
```

### New CSS classes
- `.lane-select-btn` — toggle button in column header
- `.selectable-wrap` — card wrapper with checkbox support
- `.selectable-check` — checkbox indicator (hidden until select mode)
- `.batch-bar`, `.batch-bar-count`, `.batch-bar-label`, `.batch-bar-targets`, `.batch-bar-btn`, `.batch-bar-cancel`

---

## 5. Chrome Extension

**Files added:** `chrome-extension/manifest.json`, `chrome-extension/background.js`, `chrome-extension/popup.html`, `chrome-extension/popup.js`, `chrome-extension/icons/icon-{16,48,128}.png`

### Purpose
Capture thoughts and links into Cortex Inbox from any Chrome tab, without switching to the Cortex app.

### Install
1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `chrome-extension/` folder

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+S (Cmd+Shift+S on Mac) | Save current tab as a link to Cortex Inbox |
| Ctrl+Shift+N (Cmd+Shift+N on Mac) | Open the quick-add popup |

### Ctrl+Shift+S behavior (`background.js`)
- Gets the active tab URL + title
- POSTs to `http://localhost:8000/api/items` with `type: 'link'`, `priority: 'inbox'`
- Shows a Chrome notification: "Saved to Cortex" (teal icon) on success
- Shows "Cortex not reachable" if the local server is down
- Skips system pages (`chrome://…`)

### Popup (Ctrl+Shift+N)
- **Idea mode** (default): textarea → sends `type: 'idea'` to Inbox
- **Link mode**: optional title + URL field → sends `type: 'link'`
- **+ Tab button**: saves the current tab as a link, with textarea content as the note
- Keyboard: Ctrl+Enter to submit, Escape to close
- Auto-focuses textarea on open
- Shows inline success/error state, auto-closes 1.2s after success

### API target
The extension calls `http://localhost:8000` — the same Express server the web app uses. Both must be running simultaneously.

---

## 6. Ctrl+Click to Open Links

**Files modified:** `src/renderer/components/Card.tsx`, `src/renderer/components/IdeaCard.tsx`

### Problem
Link cards could only be opened via the edit modal. There was no way to navigate directly to the saved URL without opening the modal first.

### Solution
Both `Card` and `IdeaCard` now check the click event for modifier keys:

```tsx
onClick={(event) => {
  if ((event.ctrlKey || event.metaKey) && item.url) {
    window.open(item.url, '_blank', 'noopener,noreferrer')
    return
  }
  onClick(item)
}}
```

- **Ctrl+click** (Windows/Linux) or **Cmd+click** (Mac): opens the URL in a new browser tab using whichever Chrome profile is active
- **Plain click**: opens the edit modal as before
- Works on both `link` type cards and `idea` type cards that happen to have a URL

---

## File Tree — New Files Added This Session

```
src/
  main/
    api/
      push.ts                    # Web Push API routes + sendPushToAll()
  renderer/
    components/
      TopBar.tsx                 # Bell icon + usePush integration
      Card.tsx                   # Ctrl+click to open URL
      IdeaCard.tsx               # Ctrl+click to open URL
      PriorityView.tsx           # Multi-select batch move
    hooks/
      usePush.ts                 # Push subscription lifecycle hook
    public/
      manifest.json              # PWA manifest
      sw.js                      # Service worker (push + offline cache)
      icon-192.svg               # App icon 192×192
      icon-512.svg               # App icon 512×512
    index.html                   # manifest link, SW registration, PWA meta tags

chrome-extension/
  manifest.json                  # MV3 extension manifest
  background.js                  # Ctrl+Shift+S save-to-inbox handler
  popup.html                     # Quick-add popup UI
  popup.js                       # Popup logic
  icons/
    icon-16.png
    icon-48.png
    icon-128.png
    icon-48-color.png            # Teal variant used for success notifications

docs/
  session-changes.md             # This file
```

---

## Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `web-push` | latest | Server-side Web Push / VAPID notification dispatch |
