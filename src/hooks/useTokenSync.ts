import { useEffect, useState } from 'react'
import { useProjectEvent } from '../lib/projectEvents'

export function useTokenSync(projectId: string): { tokensCss: string } {
  const [tokensCss, setTokensCss] = useState('')
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/projects/${projectId}/tokens.css`, { cache: 'no-store' })
      .then(res => (res.ok ? res.text() : null))
      .then(text => {
        if (cancelled || text === null) return
        setTokensCss(text)
      })
      .catch(() => { /* ignore */ })
    return () => { cancelled = true }
  }, [projectId, reloadTick])

  useProjectEvent('design-changed', () => setReloadTick(t => t + 1))

  return { tokensCss }
}
