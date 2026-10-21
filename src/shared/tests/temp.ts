import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/** Creates an empty temporary directory; the prefix shows which test made it. */
export async function createTempDir(prefix: string): Promise<string> {
  const tempDir = tmpdir();
  const tempPrefix = join(tempDir, `tunestra-${prefix}-`);

  return mkdtemp(tempPrefix);
}

/** Creates a temporary directory with the given files: relative path → content. */
export async function createTree(files: Record<string, string>): Promise<string> {
  const root = await createTempDir('tree');
  const entries = Object.entries(files);

  for (const [path, content] of entries) {
    const file = join(root, path);
    const dir = dirname(file);

    await mkdir(dir, { recursive: true });
    await writeFile(file, content);
  }

  return root;
}
