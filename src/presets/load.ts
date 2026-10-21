import { readFile, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { glob } from 'tinyglobby';
import { parse } from 'yaml';
import type { z } from 'zod';
import { prettifyError } from 'zod';
import { createProblemsError, TunestraError } from '../errors.ts';
import {
  INSTRUCTIONS_FILE,
  PRESET_MANIFEST,
  PROJECT_CONFIG,
  PROJECT_DIR,
} from '../shared/constants/files.ts';
import { Level, type PresetLevel } from '../shared/constants/levels.ts';
import type { Command, McpServer, Preset, Project, Rule, Skill } from '../shared/types/preset.ts';
import { parseFrontmatter } from './frontmatter.ts';
import {
  commandFrontmatterSchema,
  mcpServerSchema,
  presetManifestSchema,
  projectConfigSchema,
  ruleFrontmatterSchema,
  skillFrontmatterSchema,
  skillName,
} from './schema.ts';

export function buildInstructionsKey(presetName: string): string {
  return `instructions@${presetName}`;
}

export async function loadPreset(dir: string): Promise<Preset<PresetLevel>> {
  const root = resolve(dir);
  const manifestPath = join(root, PRESET_MANIFEST);
  const hasManifest = await checkExists(manifestPath);

  if (hasManifest === false) {
    throw new TunestraError(`${root} is not a preset: ${PRESET_MANIFEST} is missing`);
  }

  const manifest = await readYaml(manifestPath, presetManifestSchema, 'preset manifest');
  const artifacts = await loadArtifacts(root, manifest.name);

  return {
    ...manifest,
    description: manifest.description,
    dir: root,
    artifactsDir: root,
    ...artifacts,
  };
}

export async function loadProject(dir: string): Promise<Project> {
  const root = resolve(dir);
  const configPath = join(root, PROJECT_CONFIG);
  const hasConfig = await checkExists(configPath);

  if (hasConfig === false) {
    throw new TunestraError(`${PROJECT_CONFIG} not found in ${root}. Run \`tunestra init\` first`);
  }

  const config = await readYaml(configPath, projectConfigSchema, 'project config');
  const name = config.name ?? basename(root);
  const artifactsDir = join(root, PROJECT_DIR);
  const artifacts = await loadArtifacts(artifactsDir, name);

  return {
    ...config,
    name,
    level: Level.Project,
    description: undefined,
    dir: root,
    artifactsDir,
    ...artifacts,
  };
}

async function loadArtifacts(
  dir: string,
  presetName: string,
): Promise<Pick<Preset, 'rules' | 'skills' | 'commands' | 'mcp'>> {
  const rulesLoading = loadRules(dir, presetName);
  const skillsLoading = loadSkills(dir);
  const commandsLoading = loadCommands(dir);
  const mcpLoading = loadMcpServers(dir);

  const results = await Promise.allSettled([
    rulesLoading,
    skillsLoading,
    commandsLoading,
    mcpLoading,
  ]);
  const [rules, skills, commands, mcp] = collectResults(results);

  return {
    rules,
    skills,
    commands,
    mcp,
  };
}

async function loadRules(dir: string, presetName: string): Promise<ReadonlyArray<Rule>> {
  const instructionsLoading = loadInstructions(dir, presetName);
  const sources = await list(dir, 'rules/*.md');
  const ruleLoadings = sources.map((source) => loadRule(dir, source));

  const loadings = [instructionsLoading, ...ruleLoadings];

  const results = await Promise.allSettled(loadings);
  const rules = collectResults(results);

  return rules.filter(isRule);
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

async function loadSkills(dir: string): Promise<ReadonlyArray<Skill>> {
  const manifests = await list(dir, 'skills/*/SKILL.md');
  const skillLoadings = manifests.map((manifest) => loadSkill(dir, manifest));

  const results = await Promise.allSettled(skillLoadings);
  const skills = collectResults(results);
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

  const skillDir = join(dir, source);
  const files = await listSkillFiles(skillDir);

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

async function loadCommands(dir: string): Promise<ReadonlyArray<Command>> {
  const sources = await list(dir, 'commands/*.md');
  const commandLoadings = sources.map((source) => loadCommand(dir, source));

  const results = await Promise.allSettled(commandLoadings);

  return collectResults(results);
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

async function loadMcpServers(dir: string): Promise<ReadonlyArray<McpServer>> {
  const sources = await list(dir, 'mcp/*.yaml');
  const serverLoadings = sources.map((source) => loadMcpServer(dir, source));

  const results = await Promise.allSettled(serverLoadings);

  return collectResults(results);
}

async function loadMcpServer(dir: string, source: string): Promise<McpServer> {
  const file = join(dir, source);
  const { description, ...config } = await readYaml(file, mcpServerSchema, 'MCP server');

  const key = basename(source, '.yaml');

  return {
    key,
    source,
    description,
    config,
  };
}

/**
 * Returns the values in the order of the results, or throws one error with every problem.
 * Problems keep the same order, so the message does not depend on which file loads first.
 * Errors that are not caused by the user's input are thrown as is.
 */
function collectResults<T extends ReadonlyArray<unknown>>(
  results: { [K in keyof T]: PromiseSettledResult<T[K]> },
): T {
  const values: Array<unknown> = [];
  const problems: Array<string> = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      values.push(result.value);
      continue;
    }

    const reason: unknown = result.reason;

    if (reason instanceof TunestraError) {
      problems.push(...reason.problems);
      continue;
    }

    throw reason;
  }

  if (problems.length > 0) {
    throw createProblemsError(problems);
  }

  return values as unknown as T;
}

function isRule(value: Rule | undefined): value is Rule {
  return typeof value === 'object';
}

async function readYaml<T extends z.ZodType>(
  file: string,
  schema: T,
  what: string,
): Promise<z.output<T>> {
  const content = await readFile(file, 'utf8');
  const data = parseYaml(content, file);

  return validate(data, schema, `${what} ${file}`);
}

function parseYaml(content: string, file: string): unknown {
  try {
    return parse(content) ?? {};
  } catch (error) {
    throw new TunestraError(`Invalid YAML in ${file}: ${(error as Error).message}`);
  }
}

function validate<T extends z.ZodType>(data: unknown, schema: T, what: string): z.output<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  const details = prettifyError(result.error);

  throw new TunestraError(`Invalid ${what}:\n${details}`);
}

/** Files matching the pattern, sorted so that the output does not depend on the file system. */
async function list(dir: string, pattern: string): Promise<ReadonlyArray<string>> {
  const files = await glob(pattern, {
    cwd: dir,
    onlyFiles: true,
  });

  return files.sort();
}

/** Every file of a skill, dotfiles included: the skill is copied as a whole. */
async function listSkillFiles(dir: string): Promise<ReadonlyArray<string>> {
  const files = await glob('**/*', {
    cwd: dir,
    dot: true,
    onlyFiles: true,
  });

  return files.sort();
}

async function checkExists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  );
}
