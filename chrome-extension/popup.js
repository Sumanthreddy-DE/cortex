const CORTEX_API = 'http://localhost:8000/api'

let currentType = 'idea'
let currentTab = null

const textInput = document.getElementById('text-input')
const urlRow = document.getElementById('url-row')
const urlInput = document.getElementById('url-input')
const btnSave = document.getElementById('btn-save')
const btnSaveTab = document.getElementById('btn-save-tab')
const btnIdea = document.getElementById('btn-idea')
const btnLink = document.getElementById('btn-link')
const tabHint = document.getElementById('tab-hint')
const statusEl = document.getElementById('status')

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  currentTab = tab
  if (tab && !tab.url.startsWith('chrome://')) {
    tabHint.textContent = new URL(tab.url).hostname
    btnSaveTab.style.display = 'block'
  }
})

function setType(type) {
  currentType = type
  btnIdea.dataset.active = String(type === 'idea')
  btnLink.dataset.active = String(type === 'link')
  urlRow.style.display = type === 'link' ? 'flex' : 'none'
  textInput.placeholder = type === 'idea' ? 'What\'s on your mind?' : 'Title (optional)'
}

btnIdea.addEventListener('click', () => setType('idea'))
btnLink.addEventListener('click', () => setType('link'))

function showStatus(msg, type) {
  statusEl.textContent = msg
  statusEl.dataset.type = type
  if (type === 'ok') {
    setTimeout(() => window.close(), 1200)
  }
}

async function save(overridePayload) {
  btnSave.disabled = true
  statusEl.dataset.type = ''

  const text = textInput.value.trim()
  const url = currentType === 'link' ? (urlInput.value.trim() || null) : null

  const payload = overridePayload ?? {
    type: currentType,
    title: text,
    url,
    note: null,
    priority: 'inbox',
    tags: []
  }

  if (!payload.title && !payload.url) {
    showStatus('Add some text first', 'err')
    btnSave.disabled = false
    return
  }

  try {
    const res = await fetch(`${CORTEX_API}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (res.ok) {
      showStatus('Saved to Inbox', 'ok')
    } else {
      throw new Error(`HTTP ${res.status}`)
    }
  } catch {
    showStatus('Cortex not reachable — is the app running?', 'err')
    btnSave.disabled = false
  }
}

btnSave.addEventListener('click', () => save())

btnSaveTab.addEventListener('click', () => {
  if (!currentTab) return
  save({
    type: 'link',
    title: currentTab.title || currentTab.url,
    url: currentTab.url,
    note: textInput.value.trim() || null,
    priority: 'inbox',
    tags: []
  })
})

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    save()
  }
  if (e.key === 'Escape') window.close()
})

textInput.focus()
