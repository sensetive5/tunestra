import { stat } from 'node:fs/promises';
import { glob } from 'tinyglobby';

export async function checkExists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  );
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
