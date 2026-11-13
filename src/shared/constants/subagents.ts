/** Reasoning effort of a subagent: the levels that both Claude Code and Codex accept. */
export const SubagentEffort = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  ExtraHigh: 'xhigh',
} as const;

export type SubagentEffort = (typeof SubagentEffort)[keyof typeof SubagentEffort];
