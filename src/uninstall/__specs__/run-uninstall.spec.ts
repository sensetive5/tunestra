import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runSetup } from '../../setup/run-setup.ts';
import { createTree } from '../../shared/tests/temp.ts';
import { checkExists } from '../../shared/utils/fs.ts';
import { runUninstall } from '../run-uninstall.ts';

const SOURCES = {
  'project/tunestra.yaml': 'extends: [../base]\n',
  'project/.tunestra/rules/architecture.md': '# Architecture\n',
  'base/tunestra.preset.yaml': 'name: base\nlevel: base\n',
  'base/rules/security.md': '# Security\n',
  'base/skills/review/SKILL.md': '---\nname: review\ndescription: Review code\n---\n',
};

async function setUpProject(files: Record<string, string> = {}): Promise<string> {
  const root = await createTree({
    ...SOURCES,
    ...files,
  });
  const projectDir = join(root, 'project');

  await runSetup(projectDir, { dryRun: false });

  return projectDir;
}

describe('runUninstall', () => {
  it('leaves only the sources', async () => {
    const projectDir = await setUpProject();

    await runUninstall(projectDir, { dryRun: false });

    const entries = await readdir(projectDir);
    const tunestraEntries = await readdir(join(projectDir, '.tunestra'));
    expect(entries.sort()).toEqual(['.tunestra', 'tunestra.yaml']);
    expect(tunestraEntries).toEqual(['rules']);
  });

  it('keeps the other lines of .gitignore', async () => {
    const projectDir = await setUpProject({
      'project/.gitignore': 'node_modules/\n',
    });
    const gitignorePath = join(projectDir, '.gitignore');

    await runUninstall(projectDir, { dryRun: false });

    const gitignore = await readFile(gitignorePath, 'utf8');
    expect(gitignore).toBe('node_modules/\n');
  });

  it('removes an edited file and warns about it', async () => {
    const projectDir = await setUpProject();
    const rulePath = join(projectDir, '.agents/rules/40-base-security.md');
    await writeFile(rulePath, 'Edited by hand');

    const report = await runUninstall(projectDir, { dryRun: false });

    const hasRule = await checkExists(rulePath);
    expect(hasRule).toBe(false);
    expect(report.warnings).toHaveLength(1);
  });

  it('removes nothing in a dry run', async () => {
    const projectDir = await setUpProject();
    const indexPath = join(projectDir, 'AGENTS.md');

    const report = await runUninstall(projectDir, { dryRun: true });

    const hasIndex = await checkExists(indexPath);
    expect(report.removals).toContain('AGENTS.md');
    expect(hasIndex).toBe(true);
  });
});
