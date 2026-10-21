import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { INSTRUCTIONS_FILE } from '../../shared/constants/files.ts';
import type { Rule } from '../../shared/types/preset.ts';
import { checkExists, listFiles } from '../../shared/utils/fs.ts';
import { buildResultsError, isEveryFulfilled, mapSettled } from '../../shared/utils/settled.ts';
import { parseFrontmatter } from '../frontmatter.ts';
import { ruleFrontmatterSchema } from '../schema.ts';
import { validate } from '../validate.ts';

export function buildInstructionsKey(presetName: string): string {
  return `instructions@${presetName}`;
}

/** The level instructions from AGENTS.md come first, then rules/*.md by name. */
export async function loadRules(dir: string, presetName: string): Promise<ReadonlyArray<Rule>> {
  const instructionsLoading = loadInstructions(dir, presetName);
  const sources = await listFiles(dir, 'rules/*.md');
  const rulesLoading = mapSettled(sources, (source) => loadRule(dir, source));

  const results = await Promise.allSettled([instructionsLoading, rulesLoading]);

  if (isEveryFulfilled(results) === false) {
    throw buildResultsError(results);
  }

  const [instructionsResult, rulesResult] = results;
  const instructions = instructionsResult.value;
  const rules = rulesResult.value;

  if (instructions === undefined) {
    return rules;
  }

  return [instructions, ...rules];
}

async function loadInstructions(dir: string, presetName: string): Promise<Rule | undefined> {
  const file = join(dir, INSTRUCTIONS_FILE);
  const hasInstructions = await checkExists(file);

  if (hasInstructions === false) {
    return undefined;
  }

  const key = buildInstructionsKey(presetName);
  const body = await readFile(file, 'utf8');

  return {
    key,
    source: INSTRUCTIONS_FILE,
    description: undefined,
    body,
  };
}

async function loadRule(dir: string, source: string): Promise<Rule> {
  const file = join(dir, source);
  const content = await readFile(file, 'utf8');
  const { data, body } = parseFrontmatter(content, file);
  const frontmatter = validate(data, ruleFrontmatterSchema, `frontmatter in ${file}`);

  const key = basename(source, '.md');

  return {
    key,
    source,
    description: frontmatter.description,
    body,
  };
}
