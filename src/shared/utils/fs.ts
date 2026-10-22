import { lstat, readFile, stat } from 'node:fs/promises';
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

/** What is at a path, without following a symbolic link. */
export const PathType = {
  Missing: 'missing',
  Symlink: 'symlink',
  Other: 'other',
} as const;

export type PathType = (typeof PathType)[keyof typeof PathType];

export async function getPathType(path: string): Promise<PathType> {
  try {
    const stats = await lstat(path);
    const isSymlink = stats.isSymbolicLink();

    if (isSymlink) {
      return PathType.Symlink;
    }

    return PathType.Other;
  } catch (error) {
    if (isMissingPathError(error)) {
      return PathType.Missing;
    }

    throw error;
  }
}

/** The text of a file, or `undefined` when there is no such file. */
export async function readFileIfExists(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (isMissingPathError(error)) {
      return undefined;
    }

    throw error;
  }
}
