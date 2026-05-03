const CORTEX_API = 'http://localhost:8000/api'

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'save-to-inbox') return

  let tab
  try {
    ;[tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  } catch {
    return
  }

  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    chrome.notifications.create('cortex-error', {
      type: 'basic',
      iconUrl: 'icons/icon-48.png',
      title: 'Cortex',
      message: 'Cannot save this page (system page)'
    })
    return
  }

  try {
    const res = await fetch(`${CORTEX_API}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'link',
        title: tab.title || tab.url,
        url: tab.url,
        priority: 'inbox',
        tags: []
      })
    })

    if (res.ok) {
      chrome.notifications.create('cortex-saved', {
        type: 'basic',
        iconUrl: 'icons/icon-48-color.png',
        title: 'Saved to Cortex',
        message: tab.title || tab.url
      })
    } else {
      throw new Error(`HTTP ${res.status}`)
    }
  } catch {
    chrome.notifications.create('cortex-down', {
      type: 'basic',
      iconUrl: 'icons/icon-48.png',
      title: 'Cortex not reachable',
      message: 'Make sure the Cortex app is running, then try again.'
    })
  }
})
