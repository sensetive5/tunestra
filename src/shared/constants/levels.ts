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
