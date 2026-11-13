import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { TunestraError } from '../../shared/errors/tunestra-error.ts';
import { subagentFrontmatterSchema } from '../../shared/schemas/frontmatter.ts';
import { skillName } from '../../shared/schemas/preset.ts';
import type { Subagent } from '../../shared/types/preset.ts';
import { listFiles } from '../../shared/utils/fs.ts';
import { mapSettled } from '../../shared/utils/settled.ts';
import { validate } from '../../shared/utils/validate.ts';
import { parseFrontmatter } from '../frontmatter.ts';

/** Subagents live in `agents/`, like in Claude Code and Codex. */
export async function loadSubagents(dir: string): Promise<ReadonlyArray<Subagent>> {
  const sources = await listFiles(dir, 'agents/*.md');

  return mapSettled(sources, (source) => loadSubagent(dir, source));
}

async function loadSubagent(dir: string, source: string): Promise<Subagent> {
  const file = join(dir, source);
  const content = await readFile(file, 'utf8');
  const { data, body } = parseFrontmatter(content, file);
  const frontmatter = validate(data, subagentFrontmatterSchema, `frontmatter in ${file}`);

  // The name becomes a file name and the name of the subagent in every agent.
  const fileName = basename(source, '.md');
  const key = validate(fileName, skillName, `subagent file ${source}`);

  const hasInstructions = body.trim().length > 0;

  if (hasInstructions === false) {
    throw new TunestraError(`${file} has no instructions: write them after the frontmatter`);
  }

  return {
    key,
    source,
    description: frontmatter.description,
    model: frontmatter.model,
    effort: frontmatter.effort,
    readOnly: frontmatter.readOnly,
    body,
  };
}
