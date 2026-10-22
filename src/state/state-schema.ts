import { z } from 'zod';
import { STATE_VERSION } from '../shared/constants/output.ts';

const fileRecordSchema = z.strictObject({
  hash: z.string(),
});

const symlinkRecordSchema = z.strictObject({
  target: z.string(),
});

export const stateSchema = z.strictObject({
  version: z.literal(STATE_VERSION),
  outputs: z.record(z.string(), z.union([fileRecordSchema, symlinkRecordSchema])),
});
