import type { Manifest, Layout, LayoutEntry, FrameEntry } from './manifest'

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  return res.json() as Promise<T>
}

export function listProjects(): Promise<{ projects: string[] }> {
  return req('/api/projects')
}

export function createProject(name: string): Promise<{ id: string }> {
  return req('/api/projects', { method: 'POST', body: JSON.stringify({ name }) })
}

export function getManifest(projectId: string): Promise<Manifest> {
  return req(`/api/projects/${projectId}/manifest`)
}

export function getLayout(projectId: string): Promise<Layout> {
  return req(`/api/projects/${projectId}/layout`)
}

export function patchFrame(projectId: string, frameId: string, patch: Partial<Omit<FrameEntry, 'id'>>): Promise<FrameEntry> {
  return req(`/api/projects/${projectId}/frames/${frameId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function deleteFrame(projectId: string, frameId: string, deleteFile = false): Promise<{ ok: true }> {
  const qs = deleteFile ? '?deleteFile=true' : ''
  return req(`/api/projects/${projectId}/frames/${frameId}${qs}`, { method: 'DELETE' })
}

export function patchLayout(projectId: string, frameId: string, patch: Partial<LayoutEntry>): Promise<LayoutEntry> {
  return req(`/api/projects/${projectId}/layout/${frameId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function patchDesignTokens(projectId: string, tokens: Record<string, unknown>): Promise<{ ok: true }> {
  return req(`/api/projects/${projectId}/design/tokens`, {
    method: 'PATCH',
    body: JSON.stringify({ tokens }),
  })
}

export interface SuggestionVariant {
  name: string
  description?: string
  tokens: Record<string, unknown>
}

export interface Suggestion {
  id: string
  tweak: string
  createdAt?: string
  prompt?: string
  source?: string
  variants: SuggestionVariant[]
}

export function fetchSuggestions(projectId: string): Promise<{ suggestions: Suggestion[] }> {
  return req(`/api/projects/${projectId}/suggestions`)
}

export function dismissSuggestion(projectId: string, suggestionId: string): Promise<{ ok: true }> {
  return req(`/api/projects/${projectId}/suggestions/${suggestionId}`, { method: 'DELETE' })
}

export type AgentProvider = 'claude-code' | 'codex' | 'gemini' | 'opencode'

export interface GlobalSettings {
  version: number
  agent: {
    provider: AgentProvider
    model: string
    debugAcp: boolean
    debugAcpFrames: boolean
  }
  canvas: {
    snap: boolean
    snapPx: number
    fitDurationMs: number
  }
}

export interface ProjectSettings {
  version: number
}

export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T

export function getGlobalSettings(): Promise<GlobalSettings> {
  return req('/api/settings/global')
}

export function patchGlobalSettings(patch: DeepPartial<GlobalSettings>): Promise<GlobalSettings> {
  return req('/api/settings/global', { method: 'PATCH', body: JSON.stringify(patch) })
}

export type AgentTestResult =
  | { ok: true; provider: AgentProvider; label: string; durationMs: number; protocolVersion: number }
  | { ok: false; provider: AgentProvider; label: string; error: string; command: string; stderr: string }

export function testAgent(): Promise<AgentTestResult> {
  return req('/api/settings/agent/test', { method: 'POST' })
}

export function getProjectSettings(projectId: string): Promise<ProjectSettings> {
  return req(`/api/projects/${projectId}/settings`)
}

export function patchProjectSettings(projectId: string, patch: DeepPartial<ProjectSettings>): Promise<ProjectSettings> {
  return req(`/api/projects/${projectId}/settings`, { method: 'PATCH', body: JSON.stringify(patch) })
}
