import { readFile, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { glob } from 'tinyglobby';
import { parse } from 'yaml';
import type { z } from 'zod';
import { prettifyError } from 'zod';
import { TunestraError } from '../errors.ts';
import {
  INSTRUCTIONS_FILE,
  PRESET_MANIFEST,
  PROJECT_CONFIG,
  PROJECT_DIR,
} from '../shared/constants/files.ts';
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
  const hasConfig = await exists(configPath);
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
    level: 'project',
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
  const rules = await loadRules(dir, presetName);
  const skills = await loadSkills(dir);
  const commands = await loadCommands(dir);
  const mcp = await loadMcpServers(dir);

  return {
    rules,
    skills,
    commands,
    mcp,
  };
}

async function loadRules(dir: string, presetName: string): Promise<Rule[]> {
  const rules: Rule[] = [];

  const instructionsPath = join(dir, INSTRUCTIONS_FILE);
  const hasInstructions = await exists(instructionsPath);
  if (hasInstructions) {
    const key = instructionsKey(presetName);
    const body = await readFile(instructionsPath, 'utf8');
    rules.push({
      key,
      source: INSTRUCTIONS_FILE,
      description: undefined,
      body,
    });
  }

  const sources = await list(dir, 'rules/*.md');
  for (const source of sources) {
    const file = join(dir, source);
    const content = await readFile(file, 'utf8');
    const { data, body } = parseFrontmatter(content, file);
    const frontmatter = validate(data, ruleFrontmatterSchema, `frontmatter in ${file}`);
    const key = basename(source, '.md');
    rules.push({
      key,
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

  const manifests = await list(dir, 'skills/*/SKILL.md');
  for (const manifest of manifests) {
    const file = join(dir, manifest);
    const source = dirname(manifest);
    const content = await readFile(file, 'utf8');
    const { data } = parseFrontmatter(content, file);
    const frontmatter = validate(data, skillFrontmatterSchema, `frontmatter in ${file}`);
    const folderName = basename(source);
    const key = frontmatter.name ?? validate(folderName, skillName, `skill folder ${source}`);

    const duplicate = keys.get(key);
    if (typeof duplicate === 'string') {
      throw new TunestraError(
        `Skills ${duplicate} and ${source} in ${dir} have the same name "${key}"`,
      );
    }
    keys.set(key, source);

    const skillDir = join(dir, source);
    const files = await listSkillFiles(skillDir);
    skills.push({
      key,
      source,
      description: frontmatter.description,
      files,
    });
  }

  return skills;
}

async function loadCommands(dir: string): Promise<Command[]> {
  const commands: Command[] = [];

  const sources = await list(dir, 'commands/*.md');
  for (const source of sources) {
    const file = join(dir, source);
    const content = await readFile(file, 'utf8');
    const { data } = parseFrontmatter(content, file);
    const frontmatter = validate(data, commandFrontmatterSchema, `frontmatter in ${file}`);
    const key = basename(source, '.md');
    commands.push({
      key,
      source,
      description: frontmatter.description,
      content,
    });
  }

  return commands;
}

async function loadMcpServers(dir: string): Promise<McpServer[]> {
  const servers: McpServer[] = [];

  const sources = await list(dir, 'mcp/*.yaml');
  for (const source of sources) {
    const file = join(dir, source);
    const { description, ...config } = await readYaml(file, mcpServerSchema, 'MCP server');
    const key = basename(source, '.yaml');
    servers.push({
      key,
      source,
      description,
      config,
    });
  }

  return servers;
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
async function list(dir: string, pattern: string): Promise<string[]> {
  const files = await glob(pattern, {
    cwd: dir,
    onlyFiles: true,
  });
  return files.sort();
}

/** Every file of a skill, dotfiles included: the skill is copied as a whole. */
async function listSkillFiles(dir: string): Promise<string[]> {
  const files = await glob('**/*', {
    cwd: dir,
    dot: true,
    onlyFiles: true,
  });
  return files.sort();
}

async function exists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  );
}
