/** Levels of a shared preset, from specific to general. */
export const PresetLevel = {
  Team: 'team',
  Domain: 'domain',
  Base: 'base',
} as const;

export type PresetLevel = (typeof PresetLevel)[keyof typeof PresetLevel];

/** Every level of the chain; the project is the most specific one. */
export const Level = {
  Project: 'project',
  ...PresetLevel,
} as const;

export type Level = (typeof Level)[keyof typeof Level];

/**
 * Order of levels from specific to general. The number also prefixes generated rule files,
 * so that agents read specific rules first: `10-project-architecture.md`.
 */
export const LEVEL_RANK = {
  [Level.Project]: 10,
  [Level.Team]: 20,
  [Level.Domain]: 30,
  [Level.Base]: 40,
} as const satisfies Record<Level, number>;
