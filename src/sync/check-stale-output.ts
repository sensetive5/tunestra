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
 * A path that the last setup wrote and this one does not. It is removed when it still has
 * what tunestra wrote; an edited file is kept, so that nobody loses their changes.
 */
export async function checkStaleOutput(
  projectDir: string,
  path: string,
  record: OutputRecord,
): Promise<StaleCheck> {
  const fullPath = join(projectDir, path);
  const disk = await inspectPath(fullPath);
  const isMissing = disk.type === PathType.Missing;
  const isUnchanged = matchesRecord(disk, record);

  if (isMissing) {
    return createStaleCheck(path, false, undefined);
  }

  if (isUnchanged) {
    return createStaleCheck(path, true, undefined);
  }

  const warning = `${path} is no longer generated, but it was edited by hand, so tunestra kept it. Delete it when you no longer need it`;

  return createStaleCheck(path, false, warning);
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
