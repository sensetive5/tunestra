import { resolve } from 'node:path';
import { TunestraError } from '../shared/errors/tunestra-error.ts';

const GIT_SOURCE_PREFIXES = ['github:', 'gitlab:'] as const;

/** Turns a reference from `extends` into an absolute directory. */
export function resolveSource(ref: string, fromDir: string): string {
  const isGitSource = GIT_SOURCE_PREFIXES.some((prefix) => ref.startsWith(prefix));

  if (isGitSource) {
    throw new TunestraError(`Git sources are not supported yet: ${ref}. Use a relative path`);
  }

  return resolve(fromDir, ref);
}
