import { join } from 'node:path';
import { createProblemsError } from '../errors.ts';
import { GENERATED_MARKER } from '../shared/constants/output.ts';
import { readFileIfExists } from '../shared/utils/fs.ts';

/**
 * AGENTS.md and CLAUDE.md are often written by hand before tunestra comes. Setup stops
 * instead of overwriting them; a file that tunestra generated starts with its marker.
 */
export async function checkProtectedFiles(
  projectDir: string,
  paths: ReadonlyArray<string>,
): Promise<void> {
  const problems: Array<string> = [];

  for (const path of paths) {
    const file = join(projectDir, path);
    const content = await readFileIfExists(file);

    if (content === undefined) {
      continue;
    }

    const isGenerated = content.startsWith(GENERATED_MARKER);

    if (isGenerated === false) {
      problems.push(
        `${path} was written by hand, and setup would overwrite it. Move its text to .tunestra/AGENTS.md or to a rule in .tunestra/rules/, then delete ${path} and run tunestra setup again`,
      );
    }
  }

  if (problems.length > 0) {
    throw createProblemsError(problems);
  }
}
