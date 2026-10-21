import { Agent } from '../shared/constants/agents.ts';
import type { AgentAdapter } from '../shared/types/agent-adapter.ts';
import { claudeAdapter } from './claude/claude-adapter.ts';

/** Every supported agent; Codex comes in v0.2. */
export const AGENT_ADAPTERS = {
  [Agent.Claude]: claudeAdapter,
} as const satisfies Record<Agent, AgentAdapter>;
