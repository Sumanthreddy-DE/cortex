import { API_BASE, type Priority, PRIORITIES, type View } from '../../shared/constants'

export type ItemType = 'link' | 'idea'

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
  created_at: number
  updated_at: number
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
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
    return request<Item[]>('/api/items')
  },
  getArchived() {
    return request<Item[]>('/api/items/archived')
  },
  getItemsByPriority(priority: Priority) {
    return request<Item[]>(`/api/items/priority/${priority}`)
  },
  getItemsByTag(tag: string) {
    return request<Item[]>(`/api/items/tag/${encodeURIComponent(tag)}`)
  },
  createItem(payload: ItemPayload) {
    return request<Item>('/api/items', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  updateItem(id: string, patch: ItemPatch) {
    return request<Item>(`/api/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    })
  },
  deleteItem(id: string) {
    return request<void>(`/api/items/${id}`, {
      method: 'DELETE'
    })
  },
  restoreItem(id: string) {
    return request<void>(`/api/items/${id}/restore`, {
      method: 'POST'
    })
  },
  search(query: string) {
    return request<Item[]>(`/api/search?q=${encodeURIComponent(query)}`)
  },
  getTags() {
    return request<string[]>('/api/tags')
  },
  getSettings() {
    return request<Settings>('/api/settings')
  },
  updateSettings(patch: Partial<Pick<Settings, 'morning_digest_time'>>) {
    return request<Settings>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(patch)
    })
  }
}
