import { z } from 'zod';
import { Agent } from '../shared/constants/agents.ts';
import { PresetLevel } from '../shared/constants/levels.ts';

const keys = z.array(z.string().min(1));
const stringMap = z.record(z.string(), z.string());

/**
 * Agent Skills naming rule; the name also becomes a directory name.
 *
 * Valid:   "code-review", "storybook", "v2"
 * Invalid: "Code-Review" (uppercase), "code--review" or "-review" (wrong hyphens), "../../etc"
 */
const SKILL_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const skillName = z
  .string()
  .regex(SKILL_NAME_PATTERN, 'Use lowercase letters, digits and single hyphens')
  .max(64);

export const excludeSchema = z.strictObject({
  rules: keys.optional(),
  skills: keys.optional(),
  commands: keys.optional(),
  mcp: keys.optional(),
});

export const mcpPatchSchema = z.strictObject({
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  env: stringMap.optional(),
  headers: stringMap.optional(),
});

export const overridesSchema = z.strictObject({
  mcp: z.record(z.string(), mcpPatchSchema).optional(),
});

export const presetManifestSchema = z.strictObject({
  name: z.string().min(1),
  level: z.enum(PresetLevel),
  description: z.string().optional(),
  extends: z.array(z.string().min(1)).default([]),
  exclude: excludeSchema.default({}),
  overrides: overridesSchema.default({}),
});

export const projectConfigSchema = z.strictObject({
  name: z.string().min(1).optional(),
  extends: z.array(z.string().min(1)).default([]),
  agents: z.array(z.enum(Agent)).min(1).default([Agent.Claude]),
  exclude: excludeSchema.default({}),
  overrides: overridesSchema.default({}),
});

export const mcpServerSchema = z
  .strictObject({
    description: z.string().optional(),
    type: z.enum(['stdio', 'http', 'sse']).optional(),
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    env: stringMap.optional(),
    url: z.string().optional(),
    headers: stringMap.optional(),
  })
  .refine((server) => [server.command, server.url].filter(isString).length === 1, {
    message: 'Set either "command" (local server) or "url" (remote server)',
  });

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export const ruleFrontmatterSchema = z.looseObject({
  description: z.string().optional(),
});

export const skillFrontmatterSchema = z.looseObject({
  name: skillName.optional(),
  description: z.string().min(1),
});

export const commandFrontmatterSchema = z.looseObject({
  description: z.string().optional(),
});

export type Exclude = z.infer<typeof excludeSchema>;
export type Overrides = z.infer<typeof overridesSchema>;
export type McpPatch = z.infer<typeof mcpPatchSchema>;
export type McpConfig = Omit<z.infer<typeof mcpServerSchema>, 'description'>;
