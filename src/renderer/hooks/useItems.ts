import { startTransition, useEffect, useState } from 'react'
import { api, Item, ItemPatch, ItemPayload } from '../lib/api'

export function useItems() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true)
    }

    try {
      const nextItems = await api.getItems()
      startTransition(() => {
        setItems(nextItems)
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }

  async function create(payload: ItemPayload) {
    const item = await api.createItem(payload)
    startTransition(() => {
      setItems((current) => [item, ...current])
    })
    return item
  }

  async function update(id: string, patch: ItemPatch) {
    const item = await api.updateItem(id, patch)
    startTransition(() => {
      setItems((current) => current.map((existing) => (existing.id === id ? item : existing)))
    })
    return item
  }

  async function remove(id: string) {
    await api.deleteItem(id)
    startTransition(() => {
      setItems((current) => current.filter((item) => item.id !== id))
    })
  }

  async function restore(id: string) {
    await api.restoreItem(id)
    await refresh({ silent: true })
  }

  useEffect(() => {
    void refresh()

    const refreshOnFocus = () => {
      void refresh({ silent: true })
    }
    const intervalId = window.setInterval(() => {
      void refresh({ silent: true })
    }, 15_000)

    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnFocus)
    }
  }, [])

  return {
    items,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
    restore
  }
}
