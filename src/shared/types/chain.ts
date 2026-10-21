import type { Preset, Project } from './preset.ts';

/** The project and every preset it extends, directly or not. */
export type Chain = {
  project: Project;
  /** From general to specific: each preset comes after the presets it extends. */
  levels: ReadonlyArray<Preset>;
};
