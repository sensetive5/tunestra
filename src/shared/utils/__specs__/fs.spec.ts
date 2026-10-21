import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkExists } from '../fs.ts';

async function createTempDir(): Promise<string> {
  const tempDir = tmpdir();
  const tempPrefix = join(tempDir, 'tunestra-fs-');

  return mkdtemp(tempPrefix);
}

describe('checkExists', () => {
  it('is true for an existing file', async () => {
    const dir = await createTempDir();
    const file = join(dir, 'a.txt');
    await writeFile(file, 'A');

    const exists = await checkExists(file);

    expect(exists).toBe(true);
  });

  it('is false for a missing path', async () => {
    const dir = await createTempDir();
    const file = join(dir, 'missing.txt');

    const exists = await checkExists(file);

    expect(exists).toBe(false);
  });

  it('throws other errors', async () => {
    const dir = await createTempDir();
    const file = join(dir, 'a.txt');
    const pathInsideFile = join(file, 'b.txt');
    await writeFile(file, 'A');

    const result = checkExists(pathInsideFile);

    await expect(result).rejects.toThrow('ENOTDIR');
  });
});
