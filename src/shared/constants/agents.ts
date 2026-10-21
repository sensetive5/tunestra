/** Agents that tunestra generates configuration for. */
export const Agent = {
  Claude: 'claude',
} as const;

export type Agent = (typeof Agent)[keyof typeof Agent];
