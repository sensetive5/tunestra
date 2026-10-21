import { prettifyError, type z } from 'zod';
import { TunestraError } from '../../errors.ts';

/** Checks data with a schema; `what` names the checked thing in the error. */
export function validate<T extends z.ZodType>(data: unknown, schema: T, what: string): z.output<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  const details = prettifyError(result.error);

  throw new TunestraError(`Invalid ${what}:\n${details}`);
}
