import { useEffect, useState } from 'react'
import { fetchSuggestions, type Suggestion } from '../lib/api'
import { useProjectEvent } from '../lib/projectEvents'

export function useSuggestions(projectId: string): { suggestions: Suggestion[] } {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchSuggestions(projectId)
      .then(({ suggestions: list }) => {
        if (cancelled) return
        setSuggestions(list)
      })
      .catch(() => { /* ignore */ })
    return () => { cancelled = true }
  }, [projectId, reloadTick])

  useProjectEvent('suggestions-changed', () => setReloadTick(t => t + 1))

  return { suggestions }
}
