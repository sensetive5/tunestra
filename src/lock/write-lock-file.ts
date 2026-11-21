import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { LOCK_FILE } from '../shared/constants/files.ts';
import type { LockedSources } from '../shared/types/source.ts';
import { renderLock } from './render-lock.ts';

/** A project without git sources needs no lock file, so an empty lock removes it. */
export async function writeLockFile(projectDir: string, sources: LockedSources): Promise<void> {
  const file = join(projectDir, LOCK_FILE);
  const isEmpty = Object.keys(sources).length === 0;

  if (isEmpty) {
    await rm(file, { force: true });

    return;
  }

  const content = renderLock(sources);

  await writeFile(file, content);
}
