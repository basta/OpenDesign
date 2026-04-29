import { createContext, useContext, useEffect, useRef } from 'react'

// Single shared EventSource per projectId so all subscribers (frame sync,
// tokens, design doc, suggestions) reuse one HTTP/1.1 connection. Browsers
// cap concurrent connections at 6/origin, and SSE holds them indefinitely —
// opening one per hook starves fetch() and stalls POSTs.

type Entry = {
  source: EventSource
  refCount: number
  listeners: Set<() => void>
}

const sources = new Map<string, Entry>()

export function subscribeEventSource(projectId: string, listener: () => void): () => void {
  let entry = sources.get(projectId)
  if (!entry) {
    const source = new EventSource(`/api/projects/${projectId}/events`)
    entry = { source, refCount: 0, listeners: new Set() }
    sources.set(projectId, entry)
  }
  entry.refCount++
  entry.listeners.add(listener)
  listener()

  return () => {
    const e = sources.get(projectId)
    if (!e) return
    e.refCount--
    e.listeners.delete(listener)
    if (e.refCount === 0) {
      e.source.close()
      sources.delete(projectId)
    }
  }
}

export function getEventSource(projectId: string): EventSource | null {
  return sources.get(projectId)?.source ?? null
}

export const ProjectEventsContext = createContext<EventSource | null>(null)

export function useProjectEvent(
  eventName: string,
  handler: (e: MessageEvent) => void,
): void {
  const source = useContext(ProjectEventsContext)
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!source) return
    const fn = (e: Event) => handlerRef.current(e as MessageEvent)
    source.addEventListener(eventName, fn)
    return () => source.removeEventListener(eventName, fn)
  }, [source, eventName])
}
