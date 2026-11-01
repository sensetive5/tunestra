import { Agent } from '../shared/constants/agents.ts';
import type { AgentAdapter } from '../shared/types/agent-adapter.ts';
import { claudeAdapter } from './claude/claude-adapter.ts';
import { codexAdapter } from './codex/codex-adapter.ts';

/** Every supported agent. */
export const AGENT_ADAPTERS = {
  [Agent.Claude]: claudeAdapter,
  [Agent.Codex]: codexAdapter,
} as const satisfies Record<Agent, AgentAdapter>;
