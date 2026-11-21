import { z } from 'zod';
import { LOCK_VERSION } from '../constants/sources.ts';

/**
 * A full commit hash of git.
 *
 * Matches:        "c9f077f0be2838d45cf7592f1f57615810b3973c"
 * Does not match: "c9f077f" (short), "v1" (a tag)
 */
export const COMMIT_PATTERN = /^[0-9a-f]{40}$/;

const lockedSourceSchema = z.strictObject({
  commit: z.string().regex(COMMIT_PATTERN),
  integrity: z.string().startsWith('sha256-'),
});

export const lockSchema = z.strictObject({
  version: z.literal(LOCK_VERSION),
  sources: z.record(z.string(), lockedSourceSchema),
});
