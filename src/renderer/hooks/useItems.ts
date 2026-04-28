import { startTransition, useEffect, useState } from 'react'
import { api, Item, ItemPatch, ItemPayload } from '../lib/api'

export function useItems() {
  const [items, setItems] = useState<Item[]>([])
  const [completedItems, setCompletedItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true)
    }

    try {
      const [nextItems, nextCompletedItems] = await Promise.all([api.getItems(), api.getCompleted()])
      startTransition(() => {
        setItems(nextItems)
        setCompletedItems(nextCompletedItems)
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

  async function appendNote(id: string, content: string) {
    const item = await api.appendItemNote(id, content)
    startTransition(() => {
      setItems((current) => current.map((existing) => (existing.id === id ? item : existing)))
    })
    return item
  }

  async function archive(id: string) {
    await api.archiveItem(id)
    startTransition(() => {
      setItems((current) => current.filter((item) => item.id !== id))
    })
  }

  async function deletePermanently(id: string) {
    await api.deleteItem(id)
    startTransition(() => {
      setItems((current) => current.filter((item) => item.id !== id))
    })
  }

  async function restore(id: string) {
    await api.restoreItem(id)
    await refresh({ silent: true })
  }

  async function complete(id: string) {
    const item = await api.completeItem(id)
    startTransition(() => {
      setItems((current) => current.filter((existing) => existing.id !== id))
      setCompletedItems((current) => [item, ...current.filter((existing) => existing.id !== id)])
    })
    return item
  }

  async function uncomplete(id: string) {
    const item = await api.uncompleteItem(id)
    startTransition(() => {
      setCompletedItems((current) => current.filter((existing) => existing.id !== id))
      setItems((current) => [item, ...current.filter((existing) => existing.id !== id)])
    })
    return item
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
    completedItems,
    loading,
    error,
    refresh,
    create,
    update,
    appendNote,
    archive,
    deletePermanently,
    restore,
    complete,
    uncomplete
  }
}
