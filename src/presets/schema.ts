import { z } from 'zod';

const keys = z.array(z.string().min(1));
const stringMap = z.record(z.string(), z.string());

/** Agent Skills naming rule; the name also becomes a directory name. */
export const skillName = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, digits and single hyphens')
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
  level: z.enum(['base', 'domain', 'team']),
  description: z.string().optional(),
  extends: z.array(z.string().min(1)).default([]),
  exclude: excludeSchema.default({}),
  overrides: overridesSchema.default({}),
});

export const projectConfigSchema = z.strictObject({
  name: z.string().min(1).optional(),
  extends: z.array(z.string().min(1)).default([]),
  agents: z
    .array(z.enum(['claude']))
    .min(1)
    .default(['claude']),
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
  .refine((server) => (server.command === undefined) !== (server.url === undefined), {
    message: 'Set either "command" (local server) or "url" (remote server)',
  });

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
export type Agent = z.infer<typeof projectConfigSchema>['agents'][number];
