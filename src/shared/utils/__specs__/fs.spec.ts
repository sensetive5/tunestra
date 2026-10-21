import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTempDir } from '../../../__specs__/helpers/temp.ts';
import { checkExists } from '../fs.ts';

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
