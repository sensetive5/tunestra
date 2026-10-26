import { loadProject } from '../presets/load-project.ts';
import { createProblemsError } from '../shared/errors/create-problems-error.ts';
import type { Chain } from '../shared/types/chain.ts';
import type { DownloadRepository } from '../shared/types/source.ts';
import { createSourceResolver } from '../sources/create-source-resolver.ts';
import { findDuplicateNames, findLevelProblems } from './check-chain.ts';
import { linearizeChain } from './linearize-chain.ts';
import { loadPresetGraph } from './load-preset-graph.ts';

export type LoadChainOptions = {
  /** Replaces the download of git sources, for tests. */
  download?: DownloadRepository;
};

/** Loads the project with every preset it extends and puts them in order. */
export async function loadChain(
  projectDir: string,
  options: LoadChainOptions = {},
): Promise<Chain> {
  const project = await loadProject(projectDir);
  const resolver = createSourceResolver(project.dir, options.download);
  const graph = await loadPresetGraph(project, resolver);
  const linearization = linearizeChain(graph);

  const levelProblems = findLevelProblems(graph);
  const nameProblems = findDuplicateNames(linearization.levels);
  const problems = [...linearization.problems, ...levelProblems, ...nameProblems];

  if (problems.length > 0) {
    throw createProblemsError(problems);
  }

  return {
    project,
    levels: linearization.levels,
  };
}
