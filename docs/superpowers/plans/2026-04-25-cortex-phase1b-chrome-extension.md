# Cortex Phase 1b — Chrome Extension

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Manifest V3 Chrome extension that captures the current tab's URL + title into Cortex Inbox with one shortcut press (`Ctrl+Shift+S`), auto-suggests tags from domain patterns, and falls back gracefully when the Cortex app is not running.

**Architecture:** Manifest V3 popup extension. Content script is not needed — the popup reads `chrome.tabs.query` for the active tab's URL + title. A background service worker handles `commands` for the keyboard shortcut. The popup POSTs directly to `localhost:51204/api/items`. All logic is vanilla JS — no build step required.

**Tech Stack:** Chrome Manifest V3, HTML/CSS/JS (no bundler), `chrome.tabs`, `chrome.commands`, `chrome.storage.local` for last-used priority preference

---

## File Map

```
cortex-extension/
├── manifest.json                 # MV3 manifest — permissions, commands, popup
├── popup.html                    # Extension popup UI
├── popup.js                      # Popup logic — fetch tab, POST to Cortex
├── popup.css                     # Dark-navy styling matching Cortex design
├── background.js                 # Service worker — handles keyboard command
├── auto-tag.js                   # Domain → tag mapping rules
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

The extension lives as a **sibling directory** to the main `cortex/` project:
```
Projects/
├── cortex/           ← Electron app (Phase 1)
└── cortex-extension/ ← this phase
```

---

## Task 1: Manifest + Icon Scaffolding

**Files:**
- Create: `cortex-extension/manifest.json`
- Create: `cortex-extension/icons/icon16.png` (placeholder)
- Create: `cortex-extension/icons/icon48.png` (placeholder)
- Create: `cortex-extension/icons/icon128.png` (placeholder)

- [ ] **Step 1: Write manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Cortex",
  "version": "1.0.0",
  "description": "Save the current tab to Cortex with one shortcut.",
  "permissions": ["tabs", "activeTab", "storage"],
  "host_permissions": ["http://localhost:51204/*"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "MacCtrl+Shift+S"
      },
      "description": "Open Cortex save popup"
    }
  }
}
```

- [ ] **Step 2: Create placeholder icons**

Create three 16×16, 48×48, and 128×128 PNG files. Use any dark navy square with a white "C" letter as a placeholder. The simplest approach: use an online favicon generator or a paint tool to create basic icons. Save to `cortex-extension/icons/`.

For a quick programmatic approach, create a tiny HTML file `icons/make-icons.html`:
```html
<!DOCTYPE html>
<html>
<body>
<canvas id="c" width="128" height="128"></canvas>
<script>
const c = document.getElementById('c')
const ctx = c.getContext('2d')
ctx.fillStyle = '#020617'
ctx.fillRect(0, 0, 128, 128)
ctx.fillStyle = '#2563eb'
ctx.font = 'bold 80px Inter, sans-serif'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText('C', 64, 64)
const link = document.createElement('a')
link.download = 'icon128.png'
link.href = c.toDataURL()
link.click()
</script>
</body>
</html>
```
Open in browser, right-click canvas → Save image as each size variant.

- [ ] **Step 3: Verify manifest is valid**

Open Chrome → `chrome://extensions` → Enable Developer mode → Load unpacked → Select `cortex-extension/`. Extension should appear without errors. Popup click shows "Cannot read properties" or blank (expected — popup.html doesn't exist yet).

---

## Task 2: Auto-Tag Detection Rules

**Files:**
- Create: `cortex-extension/auto-tag.js`

- [ ] **Step 1: Write failing test (manual — open in browser console)**

Expected behavior:
- `detectTags('https://github.com/owner/repo')` → `['GitHub']`
- `detectTags('https://youtube.com/watch?v=abc')` → `['YouTube']`
- `detectTags('https://linkedin.com/jobs/view/123')` → `['Full-time']`
- `detectTags('https://arxiv.org/abs/2401.00001')` → `['Research']`
- `detectTags('https://news.ycombinator.com/item?id=123')` → `['HN']`
- `detectTags('https://example.com/something')` → `[]`

- [ ] **Step 2: Write auto-tag.js**

```javascript
const TAG_RULES = [
  { pattern: /github\.com/, tag: 'GitHub' },
  { pattern: /youtube\.com|youtu\.be/, tag: 'YouTube' },
  { pattern: /linkedin\.com\/jobs/, tag: 'Full-time' },
  { pattern: /linkedin\.com/, tag: 'LinkedIn' },
  { pattern: /arxiv\.org/, tag: 'Research' },
  { pattern: /news\.ycombinator\.com/, tag: 'HN' },
  { pattern: /reddit\.com/, tag: 'Reddit' },
  { pattern: /twitter\.com|x\.com/, tag: 'X' },
  { pattern: /medium\.com|substack\.com/, tag: 'Reading' },
  { pattern: /docs\.google\.com/, tag: 'Docs' },
  { pattern: /stackoverflow\.com/, tag: 'Dev' },
  { pattern: /npmjs\.com|pypi\.org|crates\.io/, tag: 'Dev' },
]

/**
 * @param {string} url
 * @returns {string[]}
 */
function detectTags(url) {
  const matched = new Set()
  for (const rule of TAG_RULES) {
    if (rule.pattern.test(url)) matched.add(rule.tag)
  }
  return [...matched]
}
```

- [ ] **Step 3: Verify in browser console**

Open any page in Chrome → F12 → paste the function + test cases. Verify outputs match expected.

---

## Task 3: Background Service Worker

**Files:**
- Create: `cortex-extension/background.js`

The background service worker handles the keyboard shortcut. In MV3, `_execute_action` is a built-in command — Chrome opens the popup automatically. No custom command handling needed unless we want background-only save (without popup).

- [ ] **Step 1: Write background.js**

```javascript
// MV3 service worker
// _execute_action command is handled natively by Chrome — opens popup.html
// This file exists to satisfy the manifest and for future background tasks.

chrome.runtime.onInstalled.addListener(() => {
  console.log('Cortex extension installed')
})
```

- [ ] **Step 2: Reload extension and verify**

Go to `chrome://extensions` → Reload the Cortex extension. Press `Ctrl+Shift+S` on any tab — popup should open (or show blank since popup.html doesn't exist yet). No service worker errors in background page console.

---

## Task 4: Popup HTML + CSS

**Files:**
- Create: `cortex-extension/popup.html`
- Create: `cortex-extension/popup.css`

- [ ] **Step 1: Write popup.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Save to Cortex</title>
  <link rel="stylesheet" href="popup.css" />
</head>
<body>
  <div class="shell">
    <header class="header">
      <span class="logo">⬡</span>
      <span class="logo-text">Save to Cortex</span>
    </header>

    <div id="offline-banner" class="offline-banner" hidden>
      Cortex isn't running — launch it from the system tray.
    </div>

    <div id="form-area">
      <div class="field">
        <label class="label" for="title-input">Title</label>
        <input id="title-input" class="input" type="text" placeholder="Page title" autocomplete="off" />
      </div>

      <div class="field">
        <label class="label" for="url-input">URL</label>
        <input id="url-input" class="input" type="text" placeholder="https://" autocomplete="off" />
      </div>

      <div class="row">
        <div class="field" style="flex:1">
          <label class="label" for="priority-select">Priority</label>
          <select id="priority-select" class="select">
            <option value="inbox">Inbox</option>
            <option value="for-now">For Now</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="this-week">This Week</option>
            <option value="someday">Someday</option>
          </select>
        </div>

        <div class="field" style="flex:1">
          <label class="label" for="tags-input">Tags</label>
          <input id="tags-input" class="input" type="text" placeholder="tag1, tag2" autocomplete="off" />
        </div>
      </div>

      <div class="actions">
        <button id="save-btn" class="btn-primary" type="button">Save</button>
        <button id="cancel-btn" class="btn-secondary" type="button">Cancel</button>
      </div>
    </div>

    <div id="success-banner" class="success-banner" hidden>
      Saved to Cortex ✓
    </div>
  </div>

  <script src="auto-tag.js"></script>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write popup.css**

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 340px;
  font-family: Inter, system-ui, -apple-system, sans-serif;
  font-size: 13px;
  background: #020617;
  color: #f8fafc;
}

.shell {
  padding: 14px 16px 16px;
}

.header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 600;
  color: #f8fafc;
}

.logo {
  color: #2563eb;
  font-size: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.label {
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.input,
.select {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #f8fafc;
  font-size: 13px;
  font-family: inherit;
  padding: 6px 10px;
  outline: none;
  width: 100%;
}

.input:focus,
.select:focus {
  border-color: #2563eb;
}

.select option {
  background: #0f172a;
}

.row {
  display: flex;
  gap: 10px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.btn-primary {
  flex: 1;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 0;
  font-size: 13px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #1e293b;
  color: #94a3b8;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #334155;
}

.offline-banner {
  background: #7f1d1d;
  border: 1px solid #991b1b;
  border-radius: 6px;
  padding: 10px 12px;
  color: #fca5a5;
  font-size: 12px;
  margin-bottom: 10px;
}

.success-banner {
  background: #14532d;
  border: 1px solid #166534;
  border-radius: 6px;
  padding: 10px 12px;
  color: #86efac;
  font-size: 13px;
  text-align: center;
}
```

- [ ] **Step 3: Reload extension and verify UI**

Reload in `chrome://extensions`. Press `Ctrl+Shift+S`. Popup should open showing the form with dark navy styling. Fields should be visible and focused on the title input.

---

## Task 5: Popup Logic

**Files:**
- Create: `cortex-extension/popup.js`

- [ ] **Step 1: Write popup.js**

```javascript
const API_BASE = 'http://localhost:51204'

const titleInput = document.getElementById('title-input')
const urlInput = document.getElementById('url-input')
const prioritySelect = document.getElementById('priority-select')
const tagsInput = document.getElementById('tags-input')
const saveBtn = document.getElementById('save-btn')
const cancelBtn = document.getElementById('cancel-btn')
const offlineBanner = document.getElementById('offline-banner')
const successBanner = document.getElementById('success-banner')
const formArea = document.getElementById('form-area')

async function init() {
  // Run storage, tab query, and health check in parallel — cuts open latency in half
  const [stored, [tab], healthOk] = await Promise.all([
    chrome.storage.local.get('lastPriority'),
    chrome.tabs.query({ active: true, currentWindow: true }),
    fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(1500) })
      .then((r) => r.ok)
      .catch(() => false),
  ])

  if (stored.lastPriority) prioritySelect.value = stored.lastPriority

  if (tab) {
    titleInput.value = tab.title ?? ''
    urlInput.value = tab.url ?? ''
    const autoTags = detectTags(tab.url ?? '')
    if (autoTags.length > 0) tagsInput.value = autoTags.join(', ')
  }

  if (!healthOk) {
    offlineBanner.hidden = false
    saveBtn.disabled = true
  }

  titleInput.focus()
  titleInput.select()
}

async function save() {
  const title = titleInput.value.trim()
  if (!title) {
    titleInput.focus()
    return
  }

  const url = urlInput.value.trim() || null
  const priority = prioritySelect.value
  const tagsRaw = tagsInput.value.trim()
  const tags = tagsRaw
    ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
    : []
  const type = url && url.startsWith('http') ? 'link' : 'idea'

  saveBtn.disabled = true
  saveBtn.textContent = 'Saving…'

  try {
    const resp = await fetch(`${API_BASE}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, url, type, priority, tags }),
    })

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

    // Remember priority for next time
    await chrome.storage.local.set({ lastPriority: priority })

    // Show success then close
    formArea.hidden = true
    successBanner.hidden = false
    setTimeout(() => window.close(), 800)
  } catch (err) {
    saveBtn.disabled = false
    saveBtn.textContent = 'Save'
    offlineBanner.textContent = `Save failed: ${err.message}`
    offlineBanner.hidden = false
  }
}

saveBtn.addEventListener('click', save)

cancelBtn.addEventListener('click', () => window.close())

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    save()
  }
  if (e.key === 'Escape') {
    window.close()
  }
})

init()
```

- [ ] **Step 2: Test with Cortex running**

Start Cortex: `cd cortex && npm run dev`

Open Chrome → navigate to `https://github.com/anthropics/anthropic-sdk-python` → Press `Ctrl+Shift+S`.

Expected:
- Title: "anthropics/anthropic-sdk-python: The official Python library for the Anthropic API"
- URL: `https://github.com/anthropics/anthropic-sdk-python`
- Tags: `GitHub` (auto-detected)
- Priority: `inbox` (default)

Click Save → "Saved to Cortex ✓" → popup closes.

Open Cortex → Inbox column should show the new card.

- [ ] **Step 3: Test offline behavior**

Stop Cortex. Open Chrome → Press `Ctrl+Shift+S`.

Expected: Red banner: "Cortex isn't running — launch it from the system tray." Save button disabled.

- [ ] **Step 4: Commit**

```bash
cd cortex-extension
git init
git add .
git commit -m "feat: chrome extension phase 1b — capture tab to cortex inbox"
```

---

## Task 6: E2E Verification

**Files:**
- No new files — manual verification checklist

- [ ] **Step 1: Full flow test**

With Cortex running:

1. Navigate to `https://youtube.com/watch?v=dQw4w9WgXcQ`
2. Press `Ctrl+Shift+S`
3. Tags should auto-populate: `YouTube`
4. Change priority to `Today`
5. Press Enter
6. Open Cortex → Today column shows the card

- [ ] **Step 2: Priority persistence test**

1. Press `Ctrl+Shift+S` again
2. Priority select should default to `Today` (last used, persisted in `chrome.storage.local`)

- [ ] **Step 3: Tag editing test**

1. Press `Ctrl+Shift+S` on `https://github.com/microsoft/vscode`
2. Tags pre-populated: `GitHub`
3. Add `, Tools` → `GitHub, Tools`
4. Save → Cortex shows card in Inbox with both tags
5. Open card in Cortex → Category view shows it in both GitHub and Tools groups

- [ ] **Step 4: Empty title guard**

1. Open popup on a tab with no title
2. Clear title field
3. Click Save
4. Should NOT save — title input gets focus, no API call made
