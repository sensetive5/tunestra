import { join } from 'node:path';
import type { Origin } from '../shared/types/resolution.ts';
import { relativePosix } from '../shared/utils/paths.ts';

/** Files built from the whole chain, like AGENTS.md: there is no single file to edit. */
export const SETUP_SOURCE = 'tunestra.yaml and its presets';

/** Path of an artifact's source file from the project, for messages to people. */
export function describeArtifactSource(projectDir: string, origin: Origin, source: string): string {
  const sourcePath = join(origin.artifactsDir, source);

  return relativePosix(projectDir, sourcePath);
}
