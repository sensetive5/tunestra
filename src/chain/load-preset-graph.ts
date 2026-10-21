import { loadPreset } from '../presets/load-preset.ts';
import type { Preset, Project } from '../shared/types/preset.ts';
import { mapSettled } from '../shared/utils/settled.ts';
import type { PresetGraph } from './preset-graph.ts';
import { resolveSource } from './resolve-source.ts';

/**
 * Loads the presets of the project, then the presets they extend, and so on. Each step loads
 * its presets in parallel; a preset that several levels extend is loaded once.
 */
export async function loadPresetGraph(project: Project): Promise<PresetGraph> {
  const levels = new Map<string, Preset>();
  const parents = new Map<string, ReadonlyArray<string>>();
  let pending: ReadonlyArray<Preset> = [project];

  levels.set(project.dir, project);

  while (pending.length > 0) {
    const dirsToLoad = new Set<string>();

    for (const preset of pending) {
      const parentDirs = resolveParents(preset);

      parents.set(preset.dir, parentDirs);

      for (const parentDir of parentDirs) {
        const isLoaded = levels.has(parentDir);

        if (isLoaded === false) {
          dirsToLoad.add(parentDir);
        }
      }
    }

    const dirs = [...dirsToLoad];

    pending = await mapSettled(dirs, loadPreset);

    for (const preset of pending) {
      levels.set(preset.dir, preset);
    }
  }

  return {
    project,
    levels,
    parents,
  };
}

function resolveParents(preset: Preset): ReadonlyArray<string> {
  return preset.extends.map((ref) => resolveSource(ref, preset.dir));
}
