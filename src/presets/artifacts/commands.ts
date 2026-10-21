import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { Command } from '../../shared/types/preset.ts';
import { listFiles } from '../../shared/utils/fs.ts';
import { mapSettled } from '../../shared/utils/settled.ts';
import { parseFrontmatter } from '../frontmatter.ts';
import { commandFrontmatterSchema } from '../schema.ts';
import { validate } from '../validate.ts';

export async function loadCommands(dir: string): Promise<ReadonlyArray<Command>> {
  const sources = await listFiles(dir, 'commands/*.md');

  return mapSettled(sources, (source) => loadCommand(dir, source));
}

async function loadCommand(dir: string, source: string): Promise<Command> {
  const file = join(dir, source);
  const content = await readFile(file, 'utf8');
  const { data } = parseFrontmatter(content, file);
  const frontmatter = validate(data, commandFrontmatterSchema, `frontmatter in ${file}`);

  const key = basename(source, '.md');

  return {
    key,
    source,
    description: frontmatter.description,
    content,
  };
}
