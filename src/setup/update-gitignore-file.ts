import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { renderGitignoreBlock, updateGitignore } from '../generate/gitignore.ts';
import { GITIGNORE_FILE } from '../shared/constants/output.ts';
import { readFileIfExists } from '../shared/utils/fs.ts';

export async function updateGitignoreFile(
  projectDir: string,
  paths: ReadonlyArray<string>,
): Promise<void> {
  const file = join(projectDir, GITIGNORE_FILE);
  const existing = await readFileIfExists(file);
  const block = renderGitignoreBlock(paths);
  const content = updateGitignore(existing, block);

  await writeFile(file, content);
}
