import { loadLocal } from '../presets/load-local.ts';
import { Level } from '../shared/constants/levels.ts';
import { createProblemsError } from '../shared/errors/create-problems-error.ts';
import type { Chain } from '../shared/types/chain.ts';
import type { Preset } from '../shared/types/preset.ts';
import { createSourceResolver } from '../sources/create-source-resolver.ts';
import { findDuplicateNames } from './check-chain.ts';
import { linearizeChain } from './linearize-chain.ts';
import type { LoadChainOptions } from './load-chain.ts';
import { loadPresetGraph } from './load-preset-graph.ts';

/**
 * The shared chain with the personal level of the developer and its presets on top, or
 * `undefined` when the project has no `tunestra.local.yaml`.
 */
export async function loadLocalChain(
  shared: Chain,
  options: LoadChainOptions = {},
): Promise<Chain | undefined> {
  const local = await loadLocal(shared.project.dir);

  if (local === undefined) {
    return undefined;
  }

  const resolver = createSourceResolver(shared.project.dir, options.download);
  const graph = await loadPresetGraph(local, resolver);
  const linearization = linearizeChain(graph);
  const levels = [...shared.levels, ...linearization.levels];

  const levelProblems = linearization.levels.flatMap(findLocalProblems);
  const nameProblems = findDuplicateNames(levels);
  const problems = [...linearization.problems, ...levelProblems, ...nameProblems];

  if (problems.length > 0) {
    throw createProblemsError(problems);
  }

  return {
    project: shared.project,
    levels,
  };
}

/**
 * A personal level changes only the files that are not committed. Claude Code joins
 * `.claude/settings.local.json` with the committed `.claude/settings.json`, so a personal
 * level can add env and permissions, but cannot remove them.
 */
function findLocalProblems(level: Preset): ReadonlyArray<string> {
  const problems: Array<string> = [];

  if (level.level !== Level.Local) {
    problems.push(
      `${level.name} (${level.level}) is extended by the personal level. A personal level can only extend presets with level: local`,
    );
  }

  const excludesEnv = (level.exclude.env?.length ?? 0) > 0;
  const excludesPermissions = (level.exclude.permissions?.length ?? 0) > 0;

  if (excludesEnv || excludesPermissions) {
    problems.push(
      `${level.name}: a personal level cannot exclude env or permissions, because Claude Code joins .claude/settings.local.json with the committed .claude/settings.json`,
    );
  }

  return problems;
}
