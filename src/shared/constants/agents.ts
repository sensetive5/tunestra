/** Agents that tunestra generates configuration for. */
export const Agent = {
  Claude: 'claude',
  Codex: 'codex',
  Cursor: 'cursor',
} as const;

export type Agent = (typeof Agent)[keyof typeof Agent];
