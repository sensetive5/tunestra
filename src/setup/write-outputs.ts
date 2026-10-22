import { copyFile, mkdir, symlink, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { TunestraError } from '../errors.ts';
import { OutputKind } from '../shared/constants/output.ts';
import type { Output, OutputSymlink } from '../shared/types/output.ts';
import { getPathType, PathType } from '../shared/utils/fs.ts';
import { mapSettled } from '../shared/utils/settled.ts';

/** Writes every output in parallel and reports the problems of all of them together. */
export async function writeOutputs(
  projectDir: string,
  outputs: ReadonlyArray<Output>,
): Promise<void> {
  await mapSettled(outputs, (output) => writeOutput(projectDir, output));
}

async function writeOutput(projectDir: string, output: Output): Promise<void> {
  const path = join(projectDir, output.path);
  const dir = dirname(path);

  await mkdir(dir, { recursive: true });

  switch (output.kind) {
    case OutputKind.File:
      await removeSymlink(path);
      await writeFile(path, output.content);

      return;
    case OutputKind.Copy:
      await removeSymlink(path);
      await copyFile(output.from, path);

      return;
    case OutputKind.Symlink:
      await replaceSymlink(path, output);

      return;
  }
}

/** Replaces only a symlink: a real file or directory at this path belongs to someone else. */
async function replaceSymlink(path: string, output: OutputSymlink): Promise<void> {
  const pathType = await getPathType(path);

  const isTaken = pathType === PathType.Directory || pathType === PathType.File;

  if (isTaken) {
    throw new TunestraError(
      `${output.path} already exists and was not created by tunestra. Move it away and run tunestra setup again`,
    );
  }

  if (pathType === PathType.Symlink) {
    await unlink(path);
  }

  await symlink(output.target, path);
}

/** Writing a file through a symlink would change the file it points to. */
async function removeSymlink(path: string): Promise<void> {
  const pathType = await getPathType(path);

  if (pathType === PathType.Symlink) {
    await unlink(path);
  }
}
