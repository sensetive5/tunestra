import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTempDir } from '../../tests/temp.ts';
import { checkExists, removeDirIfEmpty } from '../fs.ts';

describe('checkExists', () => {
  it('is true for an existing file', async () => {
    const dir = await createTempDir('fs');
    const file = join(dir, 'a.txt');
    await writeFile(file, 'A');

    const exists = await checkExists(file);

    expect(exists).toBe(true);
  });

  it('is false for a missing path', async () => {
    const dir = await createTempDir('fs');
    const file = join(dir, 'missing.txt');

    const exists = await checkExists(file);

    expect(exists).toBe(false);
  });

  it('throws other errors', async () => {
    const dir = await createTempDir('fs');
    const file = join(dir, 'a.txt');
    const pathInsideFile = join(file, 'b.txt');
    await writeFile(file, 'A');

    const result = checkExists(pathInsideFile);

    await expect(result).rejects.toThrow('ENOTDIR');
  });
});

describe('removeDirIfEmpty', () => {
  it('removes an empty directory', async () => {
    const root = await createTempDir('fs');
    const dir = join(root, 'empty');
    await mkdir(dir);

    await removeDirIfEmpty(dir);

    const exists = await checkExists(dir);
    expect(exists).toBe(false);
  });

  it('keeps a directory with files', async () => {
    const root = await createTempDir('fs');
    const file = join(root, 'a.txt');
    await writeFile(file, 'A');

    await removeDirIfEmpty(root);

    const exists = await checkExists(file);
    expect(exists).toBe(true);
  });

  it('accepts a missing directory', async () => {
    const root = await createTempDir('fs');
    const dir = join(root, 'missing');

    const result = removeDirIfEmpty(dir);

    await expect(result).resolves.toBeUndefined();
  });
});
