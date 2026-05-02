const API = 'http://127.0.0.1:51204'

// Auto-tag rules: [hostname pattern, tag label]
const AUTO_TAG_RULES = [
  [/github\.com/, 'GitHub'],
  [/youtube\.com|youtu\.be/, 'YouTube'],
  [/linkedin\.com\/jobs/, 'Full-time'],
  [/linkedin\.com/, 'LinkedIn'],
  [/twitter\.com|x\.com/, 'Twitter'],
  [/reddit\.com/, 'Reddit'],
  [/medium\.com|substack\.com/, 'Reading'],
  [/arxiv\.org/, 'Research'],
  [/stackoverflow\.com|stackexchange\.com/, 'Dev'],
  [/notion\.so/, 'Notion'],
  [/docs\.google\.com/, 'Docs'],
  [/figma\.com/, 'Design'],
  [/npmjs\.com/, 'NPM'],
  [/pypi\.org/, 'PyPI'],
]

function detectTags(url) {
  if (!url) return []
  const matches = []
  for (const [pattern, tag] of AUTO_TAG_RULES) {
    if (pattern.test(url)) {
      matches.push(tag)
    }
  }
  return matches
}

// --- State ---
let currentTags = []
let existingTags = []

function renderTags() {
  const container = document.getElementById('tag-pills')
  container.innerHTML = ''
  for (const tag of currentTags) {
    const pill = document.createElement('span')
    pill.className = 'tag-pill'
    pill.innerHTML = `${escapeHtml(tag)}<span class="tag-pill-remove" data-tag="${escapeHtml(tag)}" title="Remove">×</span>`
    pill.querySelector('.tag-pill-remove').addEventListener('click', () => {
      currentTags = currentTags.filter(t => t !== tag)
      renderTags()
    })
    container.appendChild(pill)
  }
}

function addTag(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return
  // Case-insensitive dedup
  if (currentTags.some(t => t.toLowerCase() === trimmed.toLowerCase())) return
  // Prefer existing tag casing
  const existing = existingTags.find(t => t.toLowerCase() === trimmed.toLowerCase())
  currentTags.push(existing ?? trimmed)
  renderTags()
  document.getElementById('tag-input').value = ''
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function showStatus(msg, type) {
  const el = document.getElementById('status')
  el.textContent = msg
  el.className = `status ${type}`
}

function clearStatus() {
  const el = document.getElementById('status')
  el.className = 'status'
  el.textContent = ''
}

function setLoading(isLoading) {
  const btn = document.getElementById('btn-save')
  btn.disabled = isLoading
  btn.textContent = isLoading ? 'Saving…' : 'Save'
}

// --- Init ---
async function init() {
  // Load existing tags for autocomplete
  try {
    const res = await fetch(`${API}/api/tags`, { signal: AbortSignal.timeout(2000) })
    if (res.ok) {
      existingTags = await res.json()
      const datalist = document.getElementById('existing-tags')
      datalist.innerHTML = existingTags.map(t => `<option value="${escapeHtml(t)}">`).join('')
    }
  } catch {
    // Offline or Cortex not running — handled at save time
  }

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab) {
    document.getElementById('title').value = tab.title ?? ''
    currentTags = detectTags(tab.url ?? '')
    renderTags()
  }

  document.getElementById('title').focus()
  document.getElementById('title').select()
}

// --- Save ---
async function save() {
  clearStatus()
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const title = document.getElementById('title').value.trim()
  const priority = document.getElementById('priority').value
  const url = tab?.url ?? ''

  if (!title && !url) {
    showStatus('Title is required.', 'error')
    return
  }

  setLoading(true)

  try {
    const res = await fetch(`${API}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'link',
        title: title || url,
        url,
        priority,
        tags: currentTags
      }),
      signal: AbortSignal.timeout(5000)
    })

    if (res.ok) {
      showStatus('Saved to Cortex!', 'success')
      setTimeout(() => window.close(), 800)
    } else {
      const body = await res.json().catch(() => ({}))
      showStatus(body.error ?? `Server error ${res.status}`, 'error')
    }
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'TypeError') {
      showStatus("Cortex isn't running — launch it from the system tray.", 'error')
    } else {
      showStatus('Unexpected error. Try again.', 'error')
    }
  } finally {
    setLoading(false)
  }
}

// --- Event wiring ---
document.addEventListener('DOMContentLoaded', () => {
  void init()

  document.getElementById('btn-save').addEventListener('click', () => void save())
  document.getElementById('btn-cancel').addEventListener('click', () => window.close())

  document.getElementById('tag-add-btn').addEventListener('click', () => {
    addTag(document.getElementById('tag-input').value)
  })

  document.getElementById('tag-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(e.currentTarget.value)
    }
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.close()
    if (e.key === 'Enter' && document.activeElement?.id !== 'tag-input') {
      void save()
    }
  })
})
