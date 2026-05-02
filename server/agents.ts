import type { AgentProvider } from './settings.ts'

export interface AgentAdapter {
  cmd: string
  args: string[]
  label: string
  installHint?: string
}

export const AGENT_ADAPTERS: Record<AgentProvider, AgentAdapter> = {
  'claude-code': {
    cmd: 'npx',
    args: ['claude-agent-acp'],
    label: 'Claude Code',
  },
  gemini: {
    cmd: 'gemini',
    args: ['--experimental-acp'],
    label: 'Gemini CLI',
    installHint: 'npm i -g @google/gemini-cli',
  },
  opencode: {
    cmd: 'opencode',
    args: ['acp'],
    label: 'OpenCode',
    installHint: 'https://opencode.ai/docs/install',
  },
  codex: {
    cmd: 'codex-acp',
    args: [],
    label: 'Codex (codex-acp bridge)',
    installHint: "cargo install codex-acp — OpenAI's codex CLI does not yet speak ACP natively",
  },
}

export function getAdapter(provider: AgentProvider): AgentAdapter {
  return AGENT_ADAPTERS[provider]
}
