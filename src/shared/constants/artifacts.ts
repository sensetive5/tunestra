/** Kinds of artifacts; the values match the folder-based fields of a preset and of `exclude`. */
export const ArtifactKind = {
  Rules: 'rules',
  Skills: 'skills',
  Commands: 'commands',
  Mcp: 'mcp',
} as const;

export type ArtifactKind = (typeof ArtifactKind)[keyof typeof ArtifactKind];
