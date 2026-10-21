import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import type { z } from 'zod';
import { TunestraError } from '../../errors.ts';
import { getErrorMessage } from './errors.ts';
import { validate } from './validate.ts';

/** Parses YAML; an empty document becomes an empty object. `what` names it in the error. */
export function parseYaml(content: string, what: string): unknown {
  try {
    return parse(content) ?? {};
  } catch (error) {
    const reason = getErrorMessage(error);

    throw new TunestraError(`Invalid ${what}: ${reason}`);
  }
}

export async function readYaml<T extends z.ZodType>(
  file: string,
  schema: T,
  what: string,
): Promise<z.output<T>> {
  const content = await readFile(file, 'utf8');
  const data = parseYaml(content, `YAML in ${file}`);

  return validate(data, schema, `${what} ${file}`);
}
