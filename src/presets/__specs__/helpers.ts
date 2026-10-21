import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

/** Input of the basic fixture: presets/base, presets/team and project. */
export const BASIC_INPUT = resolve('src/__specs__/fixtures/basic/input');

export const MINIMAL_MANIFEST = 'name: x\nlevel: team\n';

/** Creates a temporary directory with the given files. */
export async function createTree(files: Record<string, string>): Promise<string> {
  const tempDir = tmpdir();
  const tempPrefix = join(tempDir, 'tunestra-presets-');
  const root = await mkdtemp(tempPrefix);
  const entries = Object.entries(files);

  for (const [path, content] of entries) {
    const file = join(root, path);
    const dir = dirname(file);

    await mkdir(dir, { recursive: true });
    await writeFile(file, content);
  }

  return root;
}
