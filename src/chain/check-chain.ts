import { LEVEL_RANK } from '../shared/constants/levels.ts';
import type { Preset } from '../shared/types/preset.ts';
import type { PresetGraph } from './preset-graph.ts';

/** A level can extend the same or a more general level, never a more specific one. */
export function findLevelProblems(graph: PresetGraph): ReadonlyArray<string> {
  const problems: Array<string> = [];
  const links = [...graph.parents];

  for (const [dir, parentDirs] of links) {
    const child = graph.levels.get(dir);

    if (child === undefined) {
      continue;
    }

    for (const parentDir of parentDirs) {
      const parent = graph.levels.get(parentDir);

      if (parent === undefined) {
        continue;
      }

      const isMoreSpecific = LEVEL_RANK[parent.level] < LEVEL_RANK[child.level];

      if (isMoreSpecific) {
        problems.push(
          `${child.name} (${child.level}) extends ${parent.name} (${parent.level}), a more specific level. A level can only extend the same or a more general level`,
        );
      }
    }
  }

  return problems;
}

/** Names identify levels in keys like `instructions@team`, so they must be unique. */
export function findDuplicateNames(levels: ReadonlyArray<Preset>): ReadonlyArray<string> {
  const dirs = new Map<string, string>();
  const problems: Array<string> = [];

  for (const level of levels) {
    const otherDir = dirs.get(level.name);

    if (typeof otherDir === 'string') {
      problems.push(`Two levels have the same name "${level.name}": ${otherDir} and ${level.dir}`);
    }

    dirs.set(level.name, level.dir);
  }

  return problems;
}
