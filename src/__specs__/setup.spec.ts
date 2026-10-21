import { execFileSync } from 'node:child_process';
import { cp, readdir, readFile, readlink } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FIXTURES_DIR } from '../shared/tests/fixtures.ts';
import { createTempDir } from '../shared/tests/temp.ts';

const CLI = resolve('src/cli/index.ts');
const STATE_DIR = '.tunestra/state/';

/** symlinks.json: link path in the project → expected target. */
const symlinksSchema = z.record(z.string(), z.string());

// Files that stand for dotfiles which cannot be stored in the fixture as is.
const RENAMED: Record<string, string> = {
  _gitignore: '.gitignore',
};

async function listFiles(root: string, dir: string = root): Promise<ReadonlyArray<string>> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: Array<string> = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    const isDirectory = entry.isDirectory();
    const isFile = entry.isFile();

    if (isDirectory) {
      const nested = await listFiles(root, path);
      files.push(...nested);
    } else if (isFile) {
      const file = relative(root, path);
      files.push(file);
    }
  }

  return files.sort();
}

/** The path where tunestra writes a file that the fixture stores under another name. */
function resolveOutputName(file: string): string {
  return RENAMED[file] ?? file;
}

function isGenerated(file: string, inputFiles: ReadonlyArray<string>): boolean {
  const isInput = inputFiles.includes(file);
  const isState = file.startsWith(STATE_DIR);

  return isInput === false && isState === false;
}

async function runFixture(name: string): Promise<void> {
  const fixture = join(FIXTURES_DIR, name);
  const inputDir = join(fixture, 'input');
  const expectedDir = join(fixture, 'expected');
  const symlinksPath = join(fixture, 'symlinks.json');

  const workdir = await createTempDir(name);
  await cp(inputDir, workdir, { recursive: true });

  const project = join(workdir, 'project');
  const inputFiles = await listFiles(project);

  execFileSync(process.execPath, [CLI, 'setup'], { cwd: project });

  const expectedFiles = await listFiles(expectedDir);
  const expectedOutput = expectedFiles.map(resolveOutputName).sort();
  const projectFiles = await listFiles(project);
  const generatedFiles = projectFiles.filter((file) => isGenerated(file, inputFiles));

  expect(generatedFiles).toEqual(expectedOutput);

  for (const file of expectedFiles) {
    const outputFile = resolveOutputName(file);
    const expectedPath = join(expectedDir, file);
    const actualPath = join(project, outputFile);
    const expected = await readFile(expectedPath, 'utf8');
    const actual = await readFile(actualPath, 'utf8');

    expect(actual, file).toBe(expected);
  }

  const symlinksJson = await readFile(symlinksPath, 'utf8');
  const symlinksData: unknown = JSON.parse(symlinksJson);
  const symlinks = symlinksSchema.parse(symlinksData);
  const symlinkEntries = Object.entries(symlinks);

  for (const [link, target] of symlinkEntries) {
    const linkPath = join(project, link);
    const actualTarget = await readlink(linkPath);

    expect(actualTarget, link).toBe(target);
  }
}

describe('fixtures', () => {
  // Enable when `tunestra setup` is implemented.
  it.skip('basic', async () => {
    await runFixture('basic');
  });
});
