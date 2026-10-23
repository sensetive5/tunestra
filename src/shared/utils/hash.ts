import { createHash } from 'node:crypto';

export function hashContent(content: string | Uint8Array): string {
  const hash = createHash('sha256');

  hash.update(content);

  return hash.digest('hex');
}
