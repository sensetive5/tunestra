import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readdir, readFile, readlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const CLI = resolve('src/cli/index.ts');
const FIXTURES = resolve('test/fixtures');

// Files that stand for dotfiles which cannot be stored in the fixture as is.
const RENAMED: Record<string, string> = { _gitignore: '.gitignore' };

async function listFiles(root: string, dir: string = root): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    const isDirectory = entry.isDirectory();
    const isFile = entry.isFile();
    if (isDirectory) {
      files.push(...(await listFiles(root, path)));
    } else if (isFile) {
      files.push(relative(root, path));
    }
  }
  return files.sort();
}

async function runFixture(name: string): Promise<void> {
  const fixture = join(FIXTURES, name);
  const workdir = await mkdtemp(join(tmpdir(), `tunestra-${name}-`));
  await cp(join(fixture, 'input'), workdir, { recursive: true });
  const project = join(workdir, 'project');
  const inputFiles = await listFiles(project);

  execFileSync(process.execPath, [CLI, 'setup'], { cwd: project });

  const expectedFiles = (await listFiles(join(fixture, 'expected'))).map(
    (file) => RENAMED[file] ?? file,
  );
  const generatedFiles = (await listFiles(project)).filter(
    (file) => inputFiles.includes(file) === false && file.startsWith('.tunestra/state/') === false,
  );
  expect(generatedFiles).toEqual(expectedFiles.sort());

  for (const file of await listFiles(join(fixture, 'expected'))) {
    const expected = await readFile(join(fixture, 'expected', file), 'utf8');
    const actual = await readFile(join(project, RENAMED[file] ?? file), 'utf8');
    expect(actual, file).toBe(expected);
  }

  const symlinks: Record<string, string> = JSON.parse(
    await readFile(join(fixture, 'symlinks.json'), 'utf8'),
  );
  for (const [link, target] of Object.entries(symlinks)) {
    expect(await readlink(join(project, link)), link).toBe(target);
  }
}

describe('fixtures', () => {
  // Enable when `tunestra setup` is implemented.
  it.skip('basic', async () => {
    await runFixture('basic');
  });
});
