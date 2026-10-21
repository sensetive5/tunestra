import { createProblemsError } from '../errors.ts';
import { loadProject } from '../presets/load-project.ts';
import type { Chain } from '../shared/types/chain.ts';
import { findDuplicateNames, findLevelProblems } from './check-chain.ts';
import { linearizeChain } from './linearize-chain.ts';
import { loadPresetGraph } from './load-preset-graph.ts';

/** Loads the project with every preset it extends and puts them in order. */
export async function loadChain(projectDir: string): Promise<Chain> {
  const project = await loadProject(projectDir);
  const graph = await loadPresetGraph(project);
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
