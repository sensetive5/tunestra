import { readdir, rm, rmdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { isMissingPathError } from '../shared/utils/fs.ts';
import { mapSettled } from '../shared/utils/settled.ts';

/** Removes stale outputs, then the directories that they leave empty. */
export async function removeOutputs(
  projectDir: string,
  paths: ReadonlyArray<string>,
): Promise<void> {
  await mapSettled(paths, (path) => removeOutput(projectDir, path));

  for (const path of paths) {
    await removeEmptyParents(projectDir, path);
  }
}

async function removeOutput(projectDir: string, path: string): Promise<void> {
  const fullPath = join(projectDir, path);

  await rm(fullPath, { force: true });
}

/** Goes up from the removed path until a directory has other files or the project is reached. */
async function removeEmptyParents(projectDir: string, path: string): Promise<void> {
  let dir = dirname(path);

  while (dir !== '.') {
    const fullDir = join(projectDir, dir);
    const entries = await readEntries(fullDir);
    const isEmpty = entries?.length === 0;

    if (isEmpty === false) {
      return;
    }

    await rmdir(fullDir);

    dir = dirname(dir);
  }
}

/** A directory that is already gone counts as not empty: there is nothing to remove. */
async function readEntries(dir: string): Promise<ReadonlyArray<string> | undefined> {
  try {
    return await readdir(dir);
  } catch (error) {
    if (isMissingPathError(error)) {
      return undefined;
    }

    throw error;
  }
}
