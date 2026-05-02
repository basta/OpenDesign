import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createProject } from './projects.ts'
import {
  DEFAULT_GLOBAL,
  DEFAULT_PROJECT,
  SETTINGS_VERSION,
  readGlobalSettings,
  readProjectSettings,
  writeGlobalSettings,
  writeProjectSettings,
} from './settings.ts'

let tmpProjects: string
let tmpHome: string
let prevRoot: string | undefined
let prevHome: string | undefined

beforeEach(() => {
  tmpProjects = fs.mkdtempSync(path.join(os.tmpdir(), 'opendesign-settings-projects-'))
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opendesign-settings-home-'))
  prevRoot = process.env.PROJECTS_ROOT
  prevHome = process.env.HOME
  process.env.PROJECTS_ROOT = tmpProjects
  process.env.HOME = tmpHome
  createProject('demo')
})

afterEach(() => {
  fs.rmSync(tmpProjects, { recursive: true, force: true })
  fs.rmSync(tmpHome, { recursive: true, force: true })
  if (prevRoot === undefined) delete process.env.PROJECTS_ROOT
  else process.env.PROJECTS_ROOT = prevRoot
  if (prevHome === undefined) delete process.env.HOME
  else process.env.HOME = prevHome
})

describe('readGlobalSettings', () => {
  test('returns defaults when file missing', () => {
    expect(readGlobalSettings()).toEqual(DEFAULT_GLOBAL)
  })

  test('returns defaults when JSON is corrupt', () => {
    fs.mkdirSync(path.join(tmpHome, '.opendesign'), { recursive: true })
    fs.writeFileSync(path.join(tmpHome, '.opendesign', 'settings.json'), 'not json {')
    expect(readGlobalSettings()).toEqual(DEFAULT_GLOBAL)
  })

  test('merges partial file with defaults (missing keys filled)', () => {
    fs.mkdirSync(path.join(tmpHome, '.opendesign'), { recursive: true })
    fs.writeFileSync(
      path.join(tmpHome, '.opendesign', 'settings.json'),
      JSON.stringify({ canvas: { snapPx: 12 } }),
    )
    const s = readGlobalSettings()
    expect(s.canvas.snapPx).toBe(12)
    expect(s.canvas.snap).toBe(DEFAULT_GLOBAL.canvas.snap)
    expect(s.canvas.fitDurationMs).toBe(DEFAULT_GLOBAL.canvas.fitDurationMs)
    expect(s.agent).toEqual(DEFAULT_GLOBAL.agent)
  })
})

describe('writeGlobalSettings', () => {
  test('creates ~/.opendesign directory and file', () => {
    expect(fs.existsSync(path.join(tmpHome, '.opendesign'))).toBe(false)
    writeGlobalSettings({ canvas: { snapPx: 9 } })
    expect(fs.existsSync(path.join(tmpHome, '.opendesign', 'settings.json'))).toBe(true)
  })

  test('deep-merges patch with existing values, leaving siblings intact', () => {
    writeGlobalSettings({ agent: { provider: 'gemini', model: 'gemini-2.5-pro' } })
    writeGlobalSettings({ canvas: { snapPx: 11 } })
    const s = readGlobalSettings()
    expect(s.agent.provider).toBe('gemini')
    expect(s.agent.model).toBe('gemini-2.5-pro')
    expect(s.agent.debugAcp).toBe(DEFAULT_GLOBAL.agent.debugAcp)
    expect(s.canvas.snapPx).toBe(11)
    expect(s.canvas.snap).toBe(DEFAULT_GLOBAL.canvas.snap)
  })

  test('forces version on every write', () => {
    writeGlobalSettings({ version: 999 })
    expect(readGlobalSettings().version).toBe(SETTINGS_VERSION)
  })

  test('returns the merged result', () => {
    const result = writeGlobalSettings({ canvas: { fitDurationMs: 250 } })
    expect(result.canvas.fitDurationMs).toBe(250)
    expect(result.canvas.snap).toBe(DEFAULT_GLOBAL.canvas.snap)
  })

  test('no .tmp leftover after atomic write', () => {
    writeGlobalSettings({ canvas: { snapPx: 7 } })
    const files = fs.readdirSync(path.join(tmpHome, '.opendesign'))
    expect(files).toContain('settings.json')
    expect(files).not.toContain('settings.json.tmp')
  })

  test('ignores non-object patches', () => {
    writeGlobalSettings({ canvas: { snapPx: 7 } })
    writeGlobalSettings(null)
    writeGlobalSettings('string')
    writeGlobalSettings([1, 2, 3])
    expect(readGlobalSettings().canvas.snapPx).toBe(7)
  })
})

describe('readProjectSettings', () => {
  test('returns defaults when file missing', () => {
    expect(readProjectSettings('demo')).toEqual(DEFAULT_PROJECT)
  })

  test('returns defaults when JSON is corrupt', () => {
    fs.writeFileSync(
      path.join(tmpProjects, 'demo', '.opendesign', 'settings.json'),
      'broken',
    )
    expect(readProjectSettings('demo')).toEqual(DEFAULT_PROJECT)
  })
})

describe('writeProjectSettings', () => {
  test('creates project .opendesign/settings.json', () => {
    writeProjectSettings('demo', {})
    expect(fs.existsSync(path.join(tmpProjects, 'demo', '.opendesign', 'settings.json'))).toBe(true)
  })

  test('forces version on write', () => {
    writeProjectSettings('demo', { version: 999 })
    expect(readProjectSettings('demo').version).toBe(SETTINGS_VERSION)
  })

  test('preserves arbitrary keys for forward-compat', () => {
    writeProjectSettings('demo', { future: { feature: true } })
    const raw = JSON.parse(
      fs.readFileSync(path.join(tmpProjects, 'demo', '.opendesign', 'settings.json'), 'utf-8'),
    )
    expect(raw.future).toEqual({ feature: true })
  })
})

describe('isolation between scopes', () => {
  test('writing project settings does not touch global file', () => {
    writeProjectSettings('demo', { version: 1 })
    expect(fs.existsSync(path.join(tmpHome, '.opendesign', 'settings.json'))).toBe(false)
  })

  test('writing global settings does not touch project file', () => {
    writeGlobalSettings({ canvas: { snapPx: 9 } })
    expect(fs.existsSync(path.join(tmpProjects, 'demo', '.opendesign', 'settings.json'))).toBe(false)
  })
})
