import { useEffect, useState } from 'react'
import { useProjectEvent } from '../lib/projectEvents'

export interface DesignDoc {
  tokens: Record<string, unknown>
  body: string
  sections: { title: string; body: string }[]
}

export interface ProjectDesign {
  design: DesignDoc
  feel: { body: string; sections: { title: string; body: string }[] } | null
  parseError?: string
}

export function useDesignDoc(projectId: string): { design: ProjectDesign | null; reload: () => void } {
  const [design, setDesign] = useState<ProjectDesign | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/projects/${projectId}/design`, { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        if (cancelled || !json) return
        setDesign(json as ProjectDesign)
      })
      .catch(() => { /* ignore */ })
    return () => { cancelled = true }
  }, [projectId, reloadTick])

  const reload = () => setReloadTick(t => t + 1)
  useProjectEvent('design-changed', reload)

  return { design, reload }
}
