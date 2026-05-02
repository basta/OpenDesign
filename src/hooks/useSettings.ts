import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getGlobalSettings,
  getProjectSettings,
  patchGlobalSettings,
  patchProjectSettings,
  type DeepPartial,
  type GlobalSettings,
  type ProjectSettings,
} from '../lib/api'
import { useProjectEvent } from '../lib/projectEvents'

const PATCH_DEBOUNCE_MS = 250

const DEFAULT_GLOBAL: GlobalSettings = {
  version: 1,
  agent: {
    provider: 'claude-code',
    model: 'claude-sonnet-4-6',
    debugAcp: true,
    debugAcpFrames: false,
  },
  canvas: { snap: true, snapPx: 6, fitDurationMs: 400 },
}

const DEFAULT_PROJECT: ProjectSettings = { version: 1 }

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function mergeDeep<T>(base: T, patch: unknown): T {
  if (!isObject(patch)) return base
  if (!isObject(base)) return patch as T
  const out: Record<string, unknown> = { ...base }
  for (const key of Object.keys(patch)) {
    const baseVal = (base as Record<string, unknown>)[key]
    const patchVal = patch[key]
    if (isObject(baseVal) && isObject(patchVal)) {
      out[key] = mergeDeep(baseVal, patchVal)
    } else {
      out[key] = patchVal
    }
  }
  return out as T
}

export interface UseSettings {
  global: GlobalSettings
  project: ProjectSettings
  loaded: boolean
  patchGlobal: (patch: DeepPartial<GlobalSettings>) => void
  patchProject: (patch: DeepPartial<ProjectSettings>) => void
}

export function useSettings(projectId: string): UseSettings {
  const [global, setGlobal] = useState<GlobalSettings>(DEFAULT_GLOBAL)
  const [project, setProject] = useState<ProjectSettings>(DEFAULT_PROJECT)
  const [loaded, setLoaded] = useState(false)

  const pendingGlobal = useRef<DeepPartial<GlobalSettings> | null>(null)
  const pendingProject = useRef<DeepPartial<ProjectSettings> | null>(null)
  const globalTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const projectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getGlobalSettings(), getProjectSettings(projectId)])
      .then(([g, p]) => {
        if (cancelled) return
        setGlobal(g)
        setProject(p)
        setLoaded(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [projectId])

  // Re-fetch project settings when the watcher reports a change.
  useProjectEvent('settings-changed', useCallback(() => {
    getProjectSettings(projectId).then(setProject).catch(() => {})
  }, [projectId]))

  const flushGlobal = useCallback(() => {
    const patch = pendingGlobal.current
    pendingGlobal.current = null
    globalTimer.current = null
    if (!patch) return
    patchGlobalSettings(patch).then(setGlobal).catch(() => {})
  }, [])

  const flushProject = useCallback(() => {
    const patch = pendingProject.current
    pendingProject.current = null
    projectTimer.current = null
    if (!patch) return
    patchProjectSettings(projectId, patch).then(setProject).catch(() => {})
  }, [projectId])

  const patchGlobal = useCallback((patch: DeepPartial<GlobalSettings>) => {
    setGlobal(prev => mergeDeep(prev, patch))
    pendingGlobal.current = mergeDeep(pendingGlobal.current ?? {}, patch)
    if (globalTimer.current) clearTimeout(globalTimer.current)
    globalTimer.current = setTimeout(flushGlobal, PATCH_DEBOUNCE_MS)
  }, [flushGlobal])

  const patchProject = useCallback((patch: DeepPartial<ProjectSettings>) => {
    setProject(prev => mergeDeep(prev, patch))
    pendingProject.current = mergeDeep(pendingProject.current ?? {}, patch)
    if (projectTimer.current) clearTimeout(projectTimer.current)
    projectTimer.current = setTimeout(flushProject, PATCH_DEBOUNCE_MS)
  }, [flushProject])

  useEffect(() => () => {
    if (globalTimer.current) {
      clearTimeout(globalTimer.current)
      flushGlobal()
    }
    if (projectTimer.current) {
      clearTimeout(projectTimer.current)
      flushProject()
    }
  }, [flushGlobal, flushProject])

  return { global, project, loaded, patchGlobal, patchProject }
}
