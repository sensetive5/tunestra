import { z } from 'zod';
import { STATE_VERSION } from '../constants/output.ts';

const fileRecordSchema = z.strictObject({
  hash: z.string(),
});

const symlinkRecordSchema = z.strictObject({
  target: z.string(),
});

const ruleList = z.array(z.string()).readonly();

const settingsEntriesSchema = z.strictObject({
  env: z.record(z.string(), z.string()),
  permissions: z.strictObject({
    allow: ruleList,
    ask: ruleList,
    deny: ruleList,
  }),
});

export const stateSchema = z.strictObject({
  version: z.literal(STATE_VERSION),
  outputs: z.record(z.string(), z.union([fileRecordSchema, symlinkRecordSchema])),
  /** Older states have no merges. */
  merges: z.record(z.string(), settingsEntriesSchema).default({}),
});
