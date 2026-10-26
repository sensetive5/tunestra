import type { z } from 'zod';
import type { Agent } from '../constants/agents.ts';
import type { Level } from '../constants/levels.ts';
import type {
  excludeSchema,
  mcpPatchSchema,
  mcpServerSchema,
  overridesSchema,
} from '../schemas/preset.ts';

export type Exclude = z.infer<typeof excludeSchema>;
export type Overrides = z.infer<typeof overridesSchema>;
export type McpPatch = z.infer<typeof mcpPatchSchema>;
export type McpConfig = Omit<z.infer<typeof mcpServerSchema>, 'description'>;

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
  files: ReadonlyArray<string>;
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

/**
 * A level of the chain. `TLevel` narrows the level; `TExtension` adds the fields that only
 * this kind of level has.
 */
export type Preset<TLevel extends Level = Level, TExtension extends object = object> = {
  name: string;
  level: TLevel;
  description: string | undefined;
  /** Directory of the manifest; `extends` is resolved against it. */
  dir: string;
  /** Directory with rules/, skills/, commands/ and mcp/. */
  artifactsDir: string;
  /** The git reference, when the preset was downloaded: `github:org/presets/team#v1`. */
  remote: string | undefined;
  extends: ReadonlyArray<string>;
  exclude: Exclude;
  overrides: Overrides;
  rules: ReadonlyArray<Rule>;
  skills: ReadonlyArray<Skill>;
  commands: ReadonlyArray<Command>;
  mcp: ReadonlyArray<McpServer>;
} & TExtension;

export type Project = Preset<
  typeof Level.Project,
  {
    agents: ReadonlyArray<Agent>;
  }
>;

/** The artifacts of one level, collected from its folders. */
export type Artifacts = Pick<Preset, 'rules' | 'skills' | 'commands' | 'mcp'>;
