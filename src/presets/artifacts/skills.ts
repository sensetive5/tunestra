import { readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { createProblemsError } from '../../errors.ts';
import type { Skill } from '../../shared/types/preset.ts';
import { listAllFiles, listFiles } from '../../shared/utils/fs.ts';
import { mapSettled } from '../../shared/utils/settled.ts';
import { parseFrontmatter } from '../frontmatter.ts';
import { skillFrontmatterSchema, skillName } from '../schema.ts';
import { validate } from '../validate.ts';

export async function loadSkills(dir: string): Promise<ReadonlyArray<Skill>> {
  const manifests = await listFiles(dir, 'skills/*/SKILL.md');
  const skills = await mapSettled(manifests, (manifest) => loadSkill(dir, manifest));
  const problems = findDuplicateSkills(skills, dir);

  if (problems.length > 0) {
    throw createProblemsError(problems);
  }

  return skills;
}

async function loadSkill(dir: string, manifest: string): Promise<Skill> {
  const file = join(dir, manifest);
  const source = dirname(manifest);
  const content = await readFile(file, 'utf8');
  const { data } = parseFrontmatter(content, file);
  const frontmatter = validate(data, skillFrontmatterSchema, `frontmatter in ${file}`);

  const folderName = basename(source);
  const key = frontmatter.name ?? validate(folderName, skillName, `skill folder ${source}`);

  // The skill is copied as a whole, so its dotfiles count too.
  const skillDir = join(dir, source);
  const files = await listAllFiles(skillDir);

  return {
    key,
    source,
    description: frontmatter.description,
    files,
  };
}

function findDuplicateSkills(skills: ReadonlyArray<Skill>, dir: string): ReadonlyArray<string> {
  const sources = new Map<string, string>();
  const problems: Array<string> = [];

  for (const skill of skills) {
    const duplicate = sources.get(skill.key);

    if (typeof duplicate === 'string') {
      problems.push(
        `Skills ${duplicate} and ${skill.source} in ${dir} have the same name "${skill.key}"`,
      );
    }

    sources.set(skill.key, skill.source);
  }

  return problems;
}
