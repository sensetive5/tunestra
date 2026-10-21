import type { Preset } from '../shared/types/preset.ts';
import type { PresetGraph } from './preset-graph.ts';

export type Linearization = {
  /** From general to specific: each level comes after the levels it extends. */
  levels: ReadonlyArray<Preset>;
  problems: ReadonlyArray<string>;
};

/**
 * Puts the levels in order with a depth-first walk from the project: parents first, in the
 * order of `extends`, then the level itself. A level that is reached twice is added once.
 */
export function linearizeChain(graph: PresetGraph): Linearization {
  const levels: Array<Preset> = [];
  const visited = new Set<string>();
  const problems = new Set<string>();

  const visit = (dir: string, path: ReadonlyArray<string>): void => {
    const isInPath = path.includes(dir);

    if (isInPath) {
      const cycle = describeCycle(graph, path, dir);

      problems.add(`Cycle in extends: ${cycle}`);

      return;
    }

    const isVisited = visited.has(dir);

    if (isVisited) {
      return;
    }

    const parentDirs = graph.parents.get(dir) ?? [];
    const nextPath = [...path, dir];

    for (const parentDir of parentDirs) {
      visit(parentDir, nextPath);
    }

    visited.add(dir);

    const level = graph.levels.get(dir);

    if (level === undefined) {
      return;
    }

    levels.push(level);
  };

  visit(graph.project.dir, []);

  return {
    levels,
    problems: [...problems],
  };
}

/** Names of the levels in the cycle, for example `team → base → team`. */
function describeCycle(graph: PresetGraph, path: ReadonlyArray<string>, dir: string): string {
  const start = path.indexOf(dir);
  const cycleDirs = path.slice(start);
  const names = cycleDirs.map((cycleDir) => describeLevel(graph, cycleDir));
  const repeatedName = describeLevel(graph, dir);

  return [...names, repeatedName].join(' → ');
}

function describeLevel(graph: PresetGraph, dir: string): string {
  const level = graph.levels.get(dir);

  return level?.name ?? dir;
}
