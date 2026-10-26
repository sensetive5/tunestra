import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTree } from '../../shared/tests/temp.ts';
import { runSetup } from '../run-setup.ts';

const PRESET = {
  'project/tunestra.yaml': 'extends: [../base]\n',
  'base/tunestra.preset.yaml': 'name: base\nlevel: base\n',
  'base/rules/security.md': '# Security\n',
  'base/skills/review/SKILL.md': '---\nname: review\ndescription: Review code\n---\n',
};

describe('runSetup', () => {
  it('writes nothing in a dry run', async () => {
    const root = await createTree(PRESET);
    const projectDir = join(root, 'project');
    const indexPath = join(projectDir, 'AGENTS.md');

    const { sync } = await runSetup(projectDir, { dryRun: true });

    const paths = sync.outputs.map((output) => output.path);
    const result = readFile(indexPath, 'utf8');
    expect(paths).toContain('AGENTS.md');
    await expect(result).rejects.toThrow('ENOENT');
  });

  it('does not overwrite an AGENTS.md written by hand', async () => {
    const root = await createTree({
      ...PRESET,
      'project/AGENTS.md': '# Our notes\n',
    });
    const projectDir = join(root, 'project');

    const result = runSetup(projectDir, { dryRun: false });

    await expect(result).rejects.toThrow('AGENTS.md was written by hand');
  });

  it('runs again over its own output', async () => {
    const root = await createTree(PRESET);
    const projectDir = join(root, 'project');
    await runSetup(projectDir, { dryRun: false });

    const result = runSetup(projectDir, { dryRun: false });

    await expect(result).resolves.toBeDefined();
  });

  it('does not replace a real directory with a skill symlink', async () => {
    const root = await createTree(PRESET);
    const projectDir = join(root, 'project');
    const ownSkillDir = join(projectDir, '.claude/skills/review');
    const ownSkillFile = join(ownSkillDir, 'SKILL.md');
    await mkdir(ownSkillDir, { recursive: true });
    await writeFile(ownSkillFile, 'Our own skill');

    const result = runSetup(projectDir, { dryRun: false });

    await expect(result).rejects.toThrow('.claude/skills/review already exists');
  });
});
