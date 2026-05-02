import { useCallback, useEffect, useState } from 'react'
import { getAgentModels, setAgentModel, type ModelState } from '../lib/api'

export interface UseAgentModels {
  state: ModelState | null
  error: string | null
  setModel: (modelId: string) => Promise<{ via: 'session' | 'restart' }>
  refresh: () => void
}

// Subscribes to the project's chat SSE stream for `models` events so the
// available list stays fresh after agent (re)spawns. Initial GET on mount
// (and on refresh) covers the case where a session is already up.
export function useAgentModels(projectId: string): UseAgentModels {
  const [state, setState] = useState<ModelState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    getAgentModels(projectId)
      .then(s => {
        if (cancelled) return
        setState(s)
        setError(null)
      })
      .catch(err => {
        if (cancelled) return
        setError((err as Error).message)
      })
    return () => { cancelled = true }
  }, [projectId, refreshTick])

  useEffect(() => {
    const source = new EventSource(`/api/projects/${projectId}/chat/events`)
    source.onmessage = ev => {
      try {
        const parsed = JSON.parse(ev.data) as { type: string; state?: ModelState }
        if (parsed.type === 'models' && parsed.state) {
          setState(parsed.state)
        }
      } catch {
        // ignore
      }
    }
    return () => { source.close() }
  }, [projectId])

  const refresh = useCallback(() => {
    setRefreshTick(t => t + 1)
  }, [])

  const setModel = useCallback(async (modelId: string) => {
    let prev: ModelState | null = null
    setState(s => {
      prev = s
      return s ? { ...s, currentModelId: modelId } : s
    })
    try {
      const res = await setAgentModel(projectId, modelId)
      return { via: res.via }
    } catch (err) {
      setState(prev)
      throw err
    }
  }, [projectId])

  return { state, error, setModel, refresh }
}
