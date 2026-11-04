import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTree } from '../../../shared/tests/temp.ts';
import { describeSetup } from '../setup.ts';

const PROJECT = {
  'project/tunestra.yaml': 'extends: [../base]\nagents: [codex]\n',
  'base/tunestra.preset.yaml': 'name: base\nlevel: base\n',
  'base/rules/security.md': '# Security\n',
};

describe('describeSetup', () => {
  it('shows the notes of agents and the files to commit', async () => {
    const root = await createTree(PROJECT);
    const projectDir = join(root, 'project');

    const summary = await describeSetup(projectDir, {
      dryRun: false,
      verbose: false,
    });

    expect(summary).toContain('Generated 3 files, removed 0 stale files.');
    expect(summary).toContain('only in a trusted project');
    expect(summary).toContain('Commit AGENTS.md; the rest is in .gitignore.');
  });

  it('lists the writes and the notes in a dry run', async () => {
    const root = await createTree(PROJECT);
    const projectDir = join(root, 'project');

    const summary = await describeSetup(projectDir, {
      dryRun: true,
      verbose: false,
    });

    expect(summary).toContain('  write   .codex/config.toml');
    expect(summary).toContain('only in a trusted project');
    expect(summary).toContain('Nothing was written (--dry-run).');
  });

  it('also shows where every artifact comes from in verbose mode', async () => {
    const root = await createTree(PROJECT);
    const projectDir = join(root, 'project');

    const summary = await describeSetup(projectDir, {
      dryRun: true,
      verbose: true,
    });

    expect(summary).toContain('../base/rules/security.md');
  });
});
