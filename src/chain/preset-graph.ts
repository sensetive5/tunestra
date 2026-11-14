import type { Preset } from '../shared/types/preset.ts';

/** Every level reachable from the root through `extends`, before it is put in order. */
export type PresetGraph = {
  /** The project, or the personal level of the developer. */
  root: Preset;
  /** Every level by its directory, the root included. */
  levels: ReadonlyMap<string, Preset>;
  /** Directories of the presets that a level extends, in the order of its `extends`. */
  parents: ReadonlyMap<string, ReadonlyArray<string>>;
};
