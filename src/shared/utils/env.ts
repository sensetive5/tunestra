import type { EnvVariable } from '../types/preset.ts';
import type { ResolvedArtifact } from '../types/resolution.ts';

type EnvEntry = [name: string, value: string];

/**
 * The variables as a plain map, sorted by name so that the generated file and its diff stay
 * the same on every machine.
 */
export function buildEnvMap(
  env: ReadonlyArray<ResolvedArtifact<EnvVariable>>,
): Record<string, string> {
  const entries = env.map((variable): EnvEntry => [variable.artifact.key, variable.artifact.value]);
  const sortedEntries = entries.toSorted(compareByName);

  return Object.fromEntries(sortedEntries);
}

/** By code points, not by locale; names are unique, so two entries are never equal. */
function compareByName([a]: EnvEntry, [b]: EnvEntry): number {
  return a < b ? -1 : 1;
}
