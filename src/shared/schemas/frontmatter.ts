import { z } from 'zod';
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
