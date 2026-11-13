/**
 * Kinds of artifacts; the values match the fields of a preset and of `exclude`. Environment
 * variables come from the manifest, the other kinds from folders.
 */
export const ArtifactKind = {
  Rules: 'rules',
  Skills: 'skills',
  Commands: 'commands',
  Mcp: 'mcp',
  Subagents: 'subagents',
  Env: 'env',
} as const;

export type ArtifactKind = (typeof ArtifactKind)[keyof typeof ArtifactKind];
