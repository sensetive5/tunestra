import type { Preset, Project } from '../shared/types/preset.ts';

/** Every level reachable from the project through `extends`, before it is put in order. */
export type PresetGraph = {
  project: Project;
  /** Every level by its directory, the project included. */
  levels: ReadonlyMap<string, Preset>;
  /** Directories of the presets that a level extends, in the order of its `extends`. */
  parents: ReadonlyMap<string, ReadonlyArray<string>>;
};
