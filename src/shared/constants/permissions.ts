/** What an agent does with a tool call that matches a permission rule. */
export const PermissionDecision = {
  /** Run without asking. */
  Allow: 'allow',
  /** Ask every time. */
  Ask: 'ask',
  /** Never run. Agents check deny first, so a deny rule always wins. */
  Deny: 'deny',
} as const;

export type PermissionDecision = (typeof PermissionDecision)[keyof typeof PermissionDecision];
