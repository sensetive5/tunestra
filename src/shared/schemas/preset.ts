import { z } from 'zod';
import { Agent } from '../constants/agents.ts';
import { PresetLevel } from '../constants/levels.ts';
import { isString } from '../utils/guards.ts';

const keys = z.array(z.string().min(1)).readonly();
const stringMap = z.record(z.string(), z.string());

/**
 * Agent Skills naming rule; the name also becomes a directory name.
 *
 * Valid:   "code-review", "storybook", "v2"
 * Invalid: "Code-Review" (uppercase), "code--review" or "-review" (wrong hyphens), "../../etc"
 */
const SKILL_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * A name of an environment variable.
 *
 * Valid:   "MCP_TIMEOUT", "http_proxy", "_PRIVATE"
 * Invalid: "1PASSWORD" (starts with a digit), "MY-VAR" (hyphen), "" (empty)
 */
const ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * A reference to another variable, which agents do not expand in their settings.
 *
 * Matches:        "${TOKEN}", "Bearer ${TOKEN}"
 * Does not match: "$TOKEN", "price: 5$", "{TOKEN}"
 */
const ENV_REFERENCE_PATTERN = /\$\{[^}]*\}/;

const ENV_REFERENCE_MESSAGE = `Agents do not expand \${…} in their settings: write the value itself, and keep secrets out of presets`;

/** YAML reads `MCP_TIMEOUT: 120000` as a number; agents need every value as text. */
const envValue = z
  .union([z.string(), z.number(), z.boolean()])
  .transform(String)
  .refine((value) => ENV_REFERENCE_PATTERN.test(value) === false, {
    message: ENV_REFERENCE_MESSAGE,
  });

const envSchema = z.record(z.string(), envValue).superRefine((env, context) => {
  const names = Object.keys(env);

  for (const name of names) {
    const isValidName = ENV_NAME_PATTERN.test(name);

    if (isValidName === false) {
      context.addIssue({
        code: 'custom',
        message: `"${name}" is not a variable name: use letters, digits and "_", and do not start with a digit`,
        path: [name],
      });
    }
  }
});

/**
 * A permission rule in the syntax of Claude Code: a tool name, optionally with a specifier.
 *
 * Valid:   "Bash", "Bash(npm test *)", "Read(./.env)", "mcp__tracker__create_issue", "mcp__docs__*"
 * Invalid: "" (empty), "(npm test)" (no tool), "Bash(npm test" (no closing parenthesis)
 */
const PERMISSION_RULE_PATTERN = /^[A-Za-z][\w*-]*(\(.+\))?$/;

const permissionRules = z
  .array(
    z
      .string()
      .regex(
        PERMISSION_RULE_PATTERN,
        'Write a rule as Tool or Tool(specifier), like Bash(npm test *)',
      ),
  )
  .readonly();

export const permissionsSchema = z.strictObject({
  allow: permissionRules.optional(),
  ask: permissionRules.optional(),
  deny: permissionRules.optional(),
});

export const skillName = z
  .string()
  .regex(SKILL_NAME_PATTERN, 'Use lowercase letters, digits and single hyphens')
  .max(64);

export const excludeSchema = z.strictObject({
  rules: keys.optional(),
  skills: keys.optional(),
  commands: keys.optional(),
  mcp: keys.optional(),
  subagents: keys.optional(),
  env: keys.optional(),
  /** Inherited `allow` and `ask` rules; a `deny` rule cannot be removed. */
  permissions: keys.optional(),
});

export const mcpPatchSchema = z.strictObject({
  command: z.string().optional(),
  args: z.array(z.string()).readonly().optional(),
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
  extends: z.array(z.string().min(1)).readonly().default([]),
  exclude: excludeSchema.default({}),
  overrides: overridesSchema.default({}),
  env: envSchema.default({}),
  permissions: permissionsSchema.default({}),
});

export const projectConfigSchema = z.strictObject({
  name: z.string().min(1).optional(),
  extends: z.array(z.string().min(1)).readonly().default([]),
  agents: z.array(z.enum(Agent)).min(1).readonly().default([Agent.Claude]),
  exclude: excludeSchema.default({}),
  overrides: overridesSchema.default({}),
  env: envSchema.default({}),
  permissions: permissionsSchema.default({}),
});

/** `tunestra.local.yaml`: a level like the project, without the list of agents. */
export const localConfigSchema = z.strictObject({
  name: z.string().min(1).default('local'),
  extends: z.array(z.string().min(1)).readonly().default([]),
  exclude: excludeSchema.default({}),
  overrides: overridesSchema.default({}),
  env: envSchema.default({}),
  permissions: permissionsSchema.default({}),
});

export const mcpServerSchema = z
  .strictObject({
    description: z.string().optional(),
    type: z.enum(['stdio', 'http', 'sse']).optional(),
    command: z.string().optional(),
    args: z.array(z.string()).readonly().optional(),
    env: stringMap.optional(),
    url: z.string().optional(),
    headers: stringMap.optional(),
  })
  .refine((server) => [server.command, server.url].filter(isString).length === 1, {
    message: 'Set either "command" (local server) or "url" (remote server)',
  });
