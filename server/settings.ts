import fs from 'fs'
import os from 'os'
import path from 'path'
import { projectDir } from './projects.ts'

export const SETTINGS_VERSION = 1

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

export const DEFAULT_GLOBAL: GlobalSettings = {
  version: SETTINGS_VERSION,
  agent: {
    provider: 'claude-code',
    model: 'claude-sonnet-4-6',
    debugAcp: true,
    debugAcpFrames: false,
  },
  canvas: {
    snap: true,
    snapPx: 6,
    fitDurationMs: 400,
  },
}

export const DEFAULT_PROJECT: ProjectSettings = {
  version: SETTINGS_VERSION,
}

function globalDir(): string {
  return path.join(os.homedir(), '.opendesign')
}

function globalPath(): string {
  return path.join(globalDir(), 'settings.json')
}

function projectPath(projectId: string): string {
  return path.join(projectDir(projectId), '.opendesign', 'settings.json')
}

function writeAtomic(filePath: string, data: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const tmp = filePath + '.tmp'
  fs.writeFileSync(tmp, data)
  fs.renameSync(tmp, filePath)
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return (parsed && typeof parsed === 'object') ? parsed as T : fallback
  } catch {
    return fallback
  }
}

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

export function readGlobalSettings(): GlobalSettings {
  return mergeDeep(DEFAULT_GLOBAL, readJson(globalPath(), {}))
}

export function writeGlobalSettings(patch: unknown): GlobalSettings {
  const merged = mergeDeep(readGlobalSettings(), patch)
  merged.version = SETTINGS_VERSION
  writeAtomic(globalPath(), JSON.stringify(merged, null, 2))
  return merged
}

export function readProjectSettings(projectId: string): ProjectSettings {
  return mergeDeep(DEFAULT_PROJECT, readJson(projectPath(projectId), {}))
}

export function writeProjectSettings(projectId: string, patch: unknown): ProjectSettings {
  const merged = mergeDeep(readProjectSettings(projectId), patch)
  merged.version = SETTINGS_VERSION
  writeAtomic(projectPath(projectId), JSON.stringify(merged, null, 2))
  return merged
}
