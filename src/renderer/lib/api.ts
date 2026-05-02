import { API_BASE, type Priority, PRIORITIES, type View } from '../../shared/constants'
import { hasDesktopBridge } from './desktop'

function getApiBase(): string {
  if (hasDesktopBridge()) {
    return API_BASE
  }
  return ''
}

export type ItemType = 'link' | 'idea'

export interface ItemNoteEntry {
  id: string
  item_id: string
  content: string
  created_at: number
  updated_at: number
}

export interface Item {
  id: string
  type: ItemType
  title: string
  url: string | null
  note: string | null
  priority: Priority
  tags: string[]
  favicon_url: string | null
  archived: number
  remind_at: number | null
  completed_at: number | null
  last_opened_at: number | null
  spaces: string[]
  space_pinned: Record<string, boolean>
  created_at: number
  updated_at: number
  note_entries: ItemNoteEntry[]
}

export interface ItemPayload {
  type: ItemType
  title: string
  url?: string | null
  note?: string | null
  priority: Priority
  tags: string[]
  favicon_url?: string | null
  remind_at?: number | null
}

export type ItemPatch = Partial<ItemPayload>

export interface Settings {
  morning_digest_time: string
  last_midnight_run: string
  last_digest_date: string
}

export interface Space {
  id: string
  name: string
  position: number
  created_at: number
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const api = {
  getItems() {
    if (hasDesktopBridge()) {
      return window.cortex.data.getItems() as Promise<Item[]>
    }
    return request<Item[]>('/api/items')
  },
  getArchived() {
    if (hasDesktopBridge()) {
      return window.cortex.data.getArchived() as Promise<Item[]>
    }
    return request<Item[]>('/api/items/archived')
  },
  getCompleted() {
    if (hasDesktopBridge()) {
      return window.cortex.data.getCompleted() as Promise<Item[]>
    }
    return request<Item[]>('/api/items/completed')
  },
  getItemsByPriority(priority: Priority) {
    return request<Item[]>(`/api/items/priority/${priority}`)
  },
  getItemsByTag(tag: string) {
    return request<Item[]>(`/api/items/tag/${encodeURIComponent(tag)}`)
  },
  createItem(payload: ItemPayload) {
    if (hasDesktopBridge()) {
      return window.cortex.data.createItem(payload) as Promise<Item>
    }
    return request<Item>('/api/items', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  updateItem(id: string, patch: ItemPatch) {
    if (hasDesktopBridge()) {
      return window.cortex.data.updateItem(id, patch) as Promise<Item>
    }
    return request<Item>(`/api/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    })
  },
  appendItemNote(id: string, content: string) {
    if (hasDesktopBridge()) {
      return window.cortex.data.appendItemNote(id, content) as Promise<Item>
    }
    return request<Item>(`/api/items/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content })
    })
  },
  archiveItem(id: string) {
    if (hasDesktopBridge()) {
      return window.cortex.data.archiveItem(id)
    }
    return request<void>(`/api/items/${id}/archive`, {
      method: 'POST'
    })
  },
  deleteItem(id: string) {
    if (hasDesktopBridge()) {
      return window.cortex.data.deleteItem(id)
    }
    return request<void>(`/api/items/${id}`, {
      method: 'DELETE'
    })
  },
  restoreItem(id: string) {
    if (hasDesktopBridge()) {
      return window.cortex.data.restoreItem(id)
    }
    return request<void>(`/api/items/${id}/restore`, {
      method: 'POST'
    })
  },
  completeItem(id: string) {
    if (hasDesktopBridge()) {
      return window.cortex.data.completeItem(id) as Promise<Item>
    }
    return request<Item>(`/api/items/${id}/complete`, {
      method: 'POST'
    })
  },
  uncompleteItem(id: string) {
    if (hasDesktopBridge()) {
      return window.cortex.data.uncompleteItem(id) as Promise<Item>
    }
    return request<Item>(`/api/items/${id}/uncomplete`, {
      method: 'POST'
    })
  },
  search(query: string) {
    if (hasDesktopBridge()) {
      return window.cortex.data.search(query) as Promise<Item[]>
    }
    return request<Item[]>(`/api/search?q=${encodeURIComponent(query)}`)
  },
  getTags() {
    if (hasDesktopBridge()) {
      return window.cortex.data.getTags()
    }
    return request<string[]>('/api/tags')
  },
  getSettings() {
    if (hasDesktopBridge()) {
      return window.cortex.data.getSettings() as Promise<Settings>
    }
    return request<Settings>('/api/settings')
  },
  updateSettings(patch: Partial<Pick<Settings, 'morning_digest_time'>>) {
    if (hasDesktopBridge()) {
      return window.cortex.data.updateSettings(patch) as Promise<Settings>
    }
    return request<Settings>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(patch)
    })
  },
  getSpaces() {
    if (hasDesktopBridge()) {
      return window.cortex.data.getSpaces() as Promise<Space[]>
    }
    return request<Space[]>('/api/spaces')
  },
  createSpace(name: string) {
    if (hasDesktopBridge()) {
      return window.cortex.data.createSpace(name) as Promise<Space>
    }
    return request<Space>('/api/spaces', {
      method: 'POST',
      body: JSON.stringify({ name })
    })
  },
  addItemToSpace(spaceId: string, itemId: string, pinned = false) {
    if (hasDesktopBridge()) {
      return window.cortex.data.addItemToSpace(spaceId, itemId, pinned) as Promise<Item[]>
    }
    return request<{ ok: boolean }>(`/api/spaces/${spaceId}/items`, {
      method: 'POST',
      body: JSON.stringify({ itemId, pinned })
    })
  },
  removeItemFromSpace(spaceId: string, itemId: string) {
    if (hasDesktopBridge()) {
      return window.cortex.data.removeItemFromSpace(spaceId, itemId) as Promise<Item[]>
    }
    return request<{ ok: boolean }>(`/api/spaces/${spaceId}/items/${itemId}`, {
      method: 'DELETE'
    })
  },
  setSpaceItemPinned(spaceId: string, itemId: string, pinned: boolean) {
    if (hasDesktopBridge()) {
      return window.cortex.data.setSpaceItemPinned(spaceId, itemId, pinned) as Promise<Item[]>
    }
    return request<{ ok: boolean }>(`/api/spaces/${spaceId}/items/${itemId}/pin`, {
      method: 'PATCH',
      body: JSON.stringify({ pinned })
    })
  },
  touchItem(id: string) {
    if (hasDesktopBridge()) {
      return window.cortex.data.touchItem(id) as Promise<Item>
    }
    return request<Item>(`/api/items/${id}/touch`, {
      method: 'POST'
    })
  }
}
