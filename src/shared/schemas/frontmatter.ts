import { z } from 'zod';
import { Agent } from '../constants/agents.ts';
import { SubagentEffort } from '../constants/subagents.ts';
import { skillName } from './preset.ts';

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

/** The model names differ between agents, so a subagent sets one for each agent. */
const subagentModelSchema = z.partialRecord(z.enum(Agent), z.string().min(1));

/** tunestra writes the files of the agents itself, so it knows every field here. */
export const subagentFrontmatterSchema = z.strictObject({
  description: z.string().min(1),
  model: subagentModelSchema.default({}),
  effort: z.enum(SubagentEffort).optional(),
  readOnly: z.boolean().default(false),
});
