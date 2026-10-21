import type { Agent, Exclude, McpConfig, Overrides } from '../../presets/schema.ts';

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
