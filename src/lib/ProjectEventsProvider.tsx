import { useCallback, useSyncExternalStore, type ReactNode } from 'react'
import { ProjectEventsContext, getEventSource, subscribeEventSource } from './projectEvents'

export function ProjectEventsProvider({
  projectId,
  children,
}: {
  projectId: string
  children: ReactNode
}) {
  const subscribe = useCallback((cb: () => void) => subscribeEventSource(projectId, cb), [projectId])
  const getSnapshot = useCallback(() => getEventSource(projectId), [projectId])
  const source = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return <ProjectEventsContext.Provider value={source}>{children}</ProjectEventsContext.Provider>
}
