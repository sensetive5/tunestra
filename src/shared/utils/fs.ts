import { stat } from 'node:fs/promises';
import { glob } from 'tinyglobby';

/** A missing path is `false`; any other failure, like no permission, is thrown. */
export async function checkExists(path: string): Promise<boolean> {
  try {
    await stat(path);

    return true;
  } catch (error) {
    if (isMissingPathError(error)) {
      return false;
    }

    throw error;
  }
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  if (error instanceof Error) {
    return 'code' in error && error.code === 'ENOENT';
  }

  return false;
}

/**
 * Files matching the pattern, without dotfiles. Sorted so that the output does not depend
 * on the file system.
 */
export async function listFiles(dir: string, pattern: string): Promise<ReadonlyArray<string>> {
  const files = await glob(pattern, {
    cwd: dir,
    onlyFiles: true,
  });

  return files.sort();
}

/** Every file in the directory, dotfiles included, sorted. */
export async function listAllFiles(dir: string): Promise<ReadonlyArray<string>> {
  const files = await glob('**/*', {
    cwd: dir,
    dot: true,
    onlyFiles: true,
  });

  return files.sort();
}
