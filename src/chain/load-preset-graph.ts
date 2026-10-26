import { loadPreset } from '../presets/load-preset.ts';
import type { Preset, Project } from '../shared/types/preset.ts';
import { mapSettled } from '../shared/utils/settled.ts';
import type { SourceResolver } from '../sources/create-source-resolver.ts';
import type { PresetGraph } from './preset-graph.ts';

/**
 * Loads the presets of the project, then the presets they extend, and so on. Each step loads
 * its presets in parallel; a preset that several levels extend is loaded once.
 */
export async function loadPresetGraph(
  project: Project,
  resolver: SourceResolver,
): Promise<PresetGraph> {
  const levels = new Map<string, Preset>();
  const parents = new Map<string, ReadonlyArray<string>>();
  let pending: ReadonlyArray<Preset> = [project];

  levels.set(project.dir, project);

  while (pending.length > 0) {
    const dirsToLoad = new Set<string>();

    for (const preset of pending) {
      const parentDirs = await mapSettled(preset.extends, (ref) =>
        resolver.resolve(ref, preset.dir),
      );

      parents.set(preset.dir, parentDirs);

      for (const parentDir of parentDirs) {
        const isLoaded = levels.has(parentDir);

        if (isLoaded === false) {
          dirsToLoad.add(parentDir);
        }
      }
    }

    const dirs = [...dirsToLoad];

    pending = await mapSettled(dirs, (dir) => loadRemotePreset(dir, resolver));

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

async function loadRemotePreset(dir: string, resolver: SourceResolver): Promise<Preset> {
  const preset = await loadPreset(dir);
  const remote = resolver.describeRemote(dir);

  return {
    ...preset,
    remote,
  };
}
