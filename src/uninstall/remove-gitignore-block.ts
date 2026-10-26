import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { removeGitignoreBlock } from '../generate/gitignore.ts';
import { GITIGNORE_FILE } from '../shared/constants/output.ts';
import { readFileIfExists } from '../shared/utils/fs.ts';

/** A .gitignore that had only the tunestra block is removed, because tunestra created it. */
export async function removeGitignoreBlockFile(projectDir: string): Promise<void> {
  const file = join(projectDir, GITIGNORE_FILE);
  const existing = await readFileIfExists(file);

  if (existing === undefined) {
    return;
  }

  const content = removeGitignoreBlock(existing);

  if (content === '') {
    await rm(file);

    return;
  }

  await writeFile(file, content);
}
