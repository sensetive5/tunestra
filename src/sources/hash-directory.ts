import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { listAllFiles } from '../shared/utils/fs.ts';
import { hashContent } from '../shared/utils/hash.ts';

const INTEGRITY_PREFIX = 'sha256-';

/**
 * One hash of every file path and content in a directory. The files are sorted, so the hash
 * does not depend on the file system.
 */
export async function hashDirectory(dir: string): Promise<string> {
  const files = await listAllFiles(dir);
  const fileReads = files.map(async (file) => {
    const path = join(dir, file);
    const content = await readFile(path);
    const contentHash = hashContent(content);

    return `${file}\0${contentHash}\n`;
  });
  const lines = await Promise.all(fileReads);
  const hash = createHash('sha256');

  for (const line of lines) {
    hash.update(line);
  }

  const digest = hash.digest('base64');

  return `${INTEGRITY_PREFIX}${digest}`;
}
