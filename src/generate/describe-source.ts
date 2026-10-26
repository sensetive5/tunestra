import { join } from 'node:path';
import type { Origin } from '../shared/types/resolution.ts';
import { relativePosix } from '../shared/utils/paths.ts';

/** Files built from the whole chain, like AGENTS.md: there is no single file to edit. */
export const SETUP_SOURCE = 'tunestra.yaml and its presets';

/**
 * Where to edit an artifact, for messages to people: a path from the project, or the file
 * in its git source, because the downloaded copy is replaced on every setup.
 */
export function describeArtifactSource(projectDir: string, origin: Origin, source: string): string {
  if (typeof origin.remote === 'string') {
    return `${source} in ${origin.remote}`;
  }

  const sourcePath = join(origin.artifactsDir, source);

  return relativePosix(projectDir, sourcePath);
}
