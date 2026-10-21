import { readFile, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { glob } from 'tinyglobby';
import { parse } from 'yaml';
import type { z } from 'zod';
import { prettifyError } from 'zod';
import { TunestraError } from '../errors.ts';
import { parseFrontmatter } from './frontmatter.ts';
import {
  type Agent,
  commandFrontmatterSchema,
  type Exclude,
  type McpConfig,
  mcpServerSchema,
  type Overrides,
  presetManifestSchema,
  projectConfigSchema,
  ruleFrontmatterSchema,
  skillFrontmatterSchema,
  skillName,
} from './schema.ts';

export const PRESET_MANIFEST = 'tunestra.preset.yaml';
export const PROJECT_CONFIG = 'tunestra.yaml';
export const PROJECT_DIR = '.tunestra';

export type Level = 'project' | 'domain' | 'team' | 'base';

/** Paths in artifacts are relative to the preset's artifact directory. */
export type Rule = {
  key: string;
  source: string;
  description: string | undefined;
  /** Rule text without frontmatter. */
  body: string;
};

export type Skill = {
  key: string;
  /** The skill directory. */
  source: string;
  description: string;
  /** Every file of the skill, relative to its directory. */
  files: string[];
};

export type Command = {
  key: string;
  source: string;
  description: string | undefined;
  /** The whole file, frontmatter included: agents read it. */
  content: string;
};

export type McpServer = {
  key: string;
  source: string;
  description: string | undefined;
  config: McpConfig;
};

export type Preset = {
  name: string;
  level: Level;
  description: string | undefined;
  /** Directory of the manifest; `extends` is resolved against it. */
  dir: string;
  /** Directory with rules/, skills/, commands/ and mcp/. */
  artifactsDir: string;
  extends: string[];
  exclude: Exclude;
  overrides: Overrides;
  rules: Rule[];
  skills: Skill[];
  commands: Command[];
  mcp: McpServer[];
};

export type Project = Preset & {
  level: 'project';
  agents: Agent[];
};

export function instructionsKey(presetName: string): string {
  return `instructions@${presetName}`;
}

export async function loadPreset(dir: string): Promise<Preset> {
  const root = resolve(dir);
  const manifestPath = join(root, PRESET_MANIFEST);
  const hasManifest = await exists(manifestPath);
  if (hasManifest === false) {
    throw new TunestraError(`${root} is not a preset: ${PRESET_MANIFEST} is missing`);
  }
  const manifest = await readYaml(manifestPath, presetManifestSchema, 'preset manifest');

  return {
    ...manifest,
    description: manifest.description,
    dir: root,
    artifactsDir: root,
    ...(await loadArtifacts(root, manifest.name)),
  };
}

export async function loadProject(dir: string): Promise<Project> {
  const root = resolve(dir);
  const configPath = join(root, PROJECT_CONFIG);
  const hasConfig = await exists(configPath);
  if (hasConfig === false) {
    throw new TunestraError(`${PROJECT_CONFIG} not found in ${root}. Run \`tunestra init\` first`);
  }
  const config = await readYaml(configPath, projectConfigSchema, 'project config');
  const name = config.name ?? basename(root);
  const artifactsDir = join(root, PROJECT_DIR);

  return {
    ...config,
    name,
    level: 'project',
    description: undefined,
    dir: root,
    artifactsDir,
    ...(await loadArtifacts(artifactsDir, name)),
  };
}

async function loadArtifacts(
  dir: string,
  presetName: string,
): Promise<Pick<Preset, 'rules' | 'skills' | 'commands' | 'mcp'>> {
  return {
    rules: await loadRules(dir, presetName),
    skills: await loadSkills(dir),
    commands: await loadCommands(dir),
    mcp: await loadMcpServers(dir),
  };
}

async function loadRules(dir: string, presetName: string): Promise<Rule[]> {
  const rules: Rule[] = [];

  const instructionsPath = join(dir, 'AGENTS.md');
  const hasInstructions = await exists(instructionsPath);
  if (hasInstructions) {
    rules.push({
      key: instructionsKey(presetName),
      source: 'AGENTS.md',
      description: undefined,
      body: await readFile(instructionsPath, 'utf8'),
    });
  }

  for (const source of await list(dir, 'rules/*.md')) {
    const file = join(dir, source);
    const { data, body } = parseFrontmatter(await readFile(file, 'utf8'), file);
    const frontmatter = validate(data, ruleFrontmatterSchema, `frontmatter in ${file}`);
    rules.push({
      key: basename(source, '.md'),
      source,
      description: frontmatter.description,
      body,
    });
  }

  return rules;
}

async function loadSkills(dir: string): Promise<Skill[]> {
  const skills: Skill[] = [];
  const keys = new Map<string, string>();

  for (const manifest of await list(dir, 'skills/*/SKILL.md')) {
    const file = join(dir, manifest);
    const source = dirname(manifest);
    const { data } = parseFrontmatter(await readFile(file, 'utf8'), file);
    const frontmatter = validate(data, skillFrontmatterSchema, `frontmatter in ${file}`);
    const key = frontmatter.name ?? validate(basename(source), skillName, `skill folder ${source}`);

    const duplicate = keys.get(key);
    if (typeof duplicate === 'string') {
      throw new TunestraError(
        `Skills ${duplicate} and ${source} in ${dir} have the same name "${key}"`,
      );
    }
    keys.set(key, source);

    skills.push({
      key,
      source,
      description: frontmatter.description,
      files: await glob('**/*', { cwd: join(dir, source), dot: true, onlyFiles: true }).then(
        (files) => files.sort(),
      ),
    });
  }

  return skills;
}

async function loadCommands(dir: string): Promise<Command[]> {
  const commands: Command[] = [];

  for (const source of await list(dir, 'commands/*.md')) {
    const file = join(dir, source);
    const content = await readFile(file, 'utf8');
    const { data } = parseFrontmatter(content, file);
    const frontmatter = validate(data, commandFrontmatterSchema, `frontmatter in ${file}`);
    commands.push({
      key: basename(source, '.md'),
      source,
      description: frontmatter.description,
      content,
    });
  }

  return commands;
}

async function loadMcpServers(dir: string): Promise<McpServer[]> {
  const servers: McpServer[] = [];

  for (const source of await list(dir, 'mcp/*.yaml')) {
    const { description, ...config } = await readYaml(
      join(dir, source),
      mcpServerSchema,
      'MCP server',
    );
    servers.push({ key: basename(source, '.yaml'), source, description, config });
  }

  return servers;
}

async function readYaml<T extends z.ZodType>(
  file: string,
  schema: T,
  what: string,
): Promise<z.output<T>> {
  let data: unknown;
  try {
    data = parse(await readFile(file, 'utf8')) ?? {};
  } catch (error) {
    throw new TunestraError(`Invalid YAML in ${file}: ${(error as Error).message}`);
  }
  return validate(data, schema, `${what} ${file}`);
}

function validate<T extends z.ZodType>(data: unknown, schema: T, what: string): z.output<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  throw new TunestraError(`Invalid ${what}:\n${prettifyError(result.error)}`);
}

/** Files matching the pattern, sorted so that the output does not depend on the file system. */
async function list(dir: string, pattern: string): Promise<string[]> {
  return (await glob(pattern, { cwd: dir, onlyFiles: true })).sort();
}

async function exists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  );
}
