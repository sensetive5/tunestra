import { relative, sep } from 'node:path';

/** Generated files always use `/`, so they are the same on every system. */
export function toPosixPath(path: string): string {
  const parts = path.split(sep);

  return parts.join('/');
}

export function relativePosix(from: string, to: string): string {
  const path = relative(from, to);

  return toPosixPath(path);
}
