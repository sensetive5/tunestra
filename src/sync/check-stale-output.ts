import { join } from 'node:path';
import type { OutputRecord } from '../shared/types/state.ts';
import { PathType } from '../shared/utils/fs.ts';
import { inspectPath, matchesRecord } from './inspect-path.ts';

export type StaleCheck = {
  path: string;
  isRemovable: boolean;
  warning: string | undefined;
};

/**
 * A path that the last setup wrote and this one does not. Generated files are never kept:
 * an edited one is removed too, with a warning, so that the lost edit does not go unnoticed.
 * Only a directory is left alone, because tunestra never writes directories in its place.
 */
export async function checkStaleOutput(
  projectDir: string,
  path: string,
  record: OutputRecord,
): Promise<StaleCheck> {
  const fullPath = join(projectDir, path);
  const disk = await inspectPath(fullPath);
  const isMissing = disk.type === PathType.Missing;
  const isDirectory = disk.type === PathType.Directory;
  const isUnchanged = matchesRecord(disk, record);

  if (isMissing) {
    return createStaleCheck(path, false, undefined);
  }

  if (isDirectory) {
    const warning = `${path} is no longer generated, but it is a directory now, so tunestra left it`;

    return createStaleCheck(path, false, warning);
  }

  if (isUnchanged) {
    return createStaleCheck(path, true, undefined);
  }

  const warning = `${path} is no longer generated and was edited by hand; tunestra removed it`;

  return createStaleCheck(path, true, warning);
}

function createStaleCheck(
  path: string,
  isRemovable: boolean,
  warning: string | undefined,
): StaleCheck {
  return {
    path,
    isRemovable,
    warning,
  };
}
