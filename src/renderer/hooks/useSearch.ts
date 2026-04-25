import { useDeferredValue, useEffect, useState } from 'react'
import { api, Item } from '../lib/api'

export function useSearch(query: string) {
  const deferredQuery = useDeferredValue(query)
  const [results, setResults] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const trimmed = deferredQuery.trim()
    if (!trimmed) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const timeoutId = window.setTimeout(() => {
      void api
        .search(trimmed)
        .then((items) => setResults(items))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 150)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [deferredQuery])

  return {
    results,
    loading
  }
}
