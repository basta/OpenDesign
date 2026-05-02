import type { AgentProvider } from './settings.ts'

export interface AgentAdapter {
  cmd: string
  baseArgs: string[]
  label: string
  installHint?: string
  // Build the args used to spawn the adapter for a given model. Some adapters
  // accept a CLI flag (gemini), others want the model via environment
  // (claude-agent-acp via ANTHROPIC_MODEL), and some don't expose either at
  // spawn time (opencode acp, codex-acp) — those return the bare baseArgs.
  buildArgs(model: string): string[]
  // Environment overrides layered on top of process.env at spawn time.
  buildEnv(model: string): Record<string, string>
  // Hardcoded fallback list shown when newSession doesn't return availableModels.
  fallbackModels: { modelId: string; name: string }[]
}

export const AGENT_ADAPTERS: Record<AgentProvider, AgentAdapter> = {
  'claude-code': {
    cmd: 'npx',
    baseArgs: ['claude-agent-acp'],
    label: 'Claude Code',
    buildArgs() {
      return ['claude-agent-acp']
    },
    buildEnv(model) {
      const env: Record<string, string> = {}
      if (model) env.ANTHROPIC_MODEL = model
      return env
    },
    fallbackModels: [
      { modelId: 'claude-sonnet-4-6', name: 'Sonnet 4.6' },
      { modelId: 'claude-opus-4-7', name: 'Opus 4.7' },
      { modelId: 'claude-haiku-4-5', name: 'Haiku 4.5' },
    ],
  },
  gemini: {
    cmd: 'gemini',
    baseArgs: ['--experimental-acp'],
    label: 'Gemini CLI',
    installHint: 'npm i -g @google/gemini-cli',
    buildArgs(model) {
      const args = ['--experimental-acp']
      if (model) args.push('--model', model)
      return args
    },
    buildEnv() {
      return {}
    },
    fallbackModels: [
      { modelId: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { modelId: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    ],
  },
  opencode: {
    cmd: 'opencode',
    baseArgs: ['acp'],
    label: 'OpenCode',
    installHint: 'https://opencode.ai/docs/install',
    buildArgs() {
      return ['acp']
    },
    buildEnv() {
      return {}
    },
    fallbackModels: [
      { modelId: 'default', name: 'Default (opencode config)' },
    ],
  },
  codex: {
    cmd: 'codex-acp',
    baseArgs: [],
    label: 'Codex (codex-acp bridge)',
    installHint: "cargo install codex-acp — OpenAI's codex CLI does not yet speak ACP natively",
    buildArgs() {
      return []
    },
    // Best-effort: codex respects OPENAI_MODEL in many setups; the codex-acp
    // bridge is unverified.
    buildEnv(model) {
      const env: Record<string, string> = {}
      if (model) env.OPENAI_MODEL = model
      return env
    },
    fallbackModels: [
      { modelId: 'gpt-5', name: 'GPT-5' },
      { modelId: 'o3', name: 'o3' },
    ],
  },
}

export function getAdapter(provider: AgentProvider): AgentAdapter {
  return AGENT_ADAPTERS[provider]
}
