import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runSetup } from '../../setup/run-setup.ts';
import { createTempDir, createTree } from '../../shared/tests/temp.ts';
import { checkExists } from '../../shared/utils/fs.ts';
import { runInit } from '../run-init.ts';

const NO_PRESETS = {
  presets: [],
};

describe('runInit', () => {
  it('creates tunestra.yaml with the given presets', async () => {
    const projectDir = await createTempDir('init');
    const options = {
      presets: ['github:org/presets/team#v1'],
    };

    await runInit(projectDir, options);

    const configPath = join(projectDir, 'tunestra.yaml');
    const config = await readFile(configPath, 'utf8');
    expect(config).toContain('extends:\n  - "github:org/presets/team#v1"\n');
    expect(config).toContain('agents:\n  - claude\n');
  });

  it('refuses to run twice', async () => {
    const projectDir = await createTree({
      'tunestra.yaml': 'extends: []\n',
    });

    const result = runInit(projectDir, NO_PRESETS);

    await expect(result).rejects.toThrow('tunestra.yaml already exists');
  });

  it('moves a hand-written AGENTS.md to .tunestra/', async () => {
    const projectDir = await createTree({
      'AGENTS.md': '# Our service\n',
    });

    const report = await runInit(projectDir, NO_PRESETS);

    const movedPath = join(projectDir, '.tunestra/AGENTS.md');
    const moved = await readFile(movedPath, 'utf8');
    expect(moved).toBe('# Our service\n');
    expect(report.steps).toContain('Moved AGENTS.md to .tunestra/AGENTS.md');
  });

  it('removes a CLAUDE.md that only imports AGENTS.md', async () => {
    const projectDir = await createTree({
      'AGENTS.md': '# Our service\n',
      'CLAUDE.md': '@AGENTS.md\n',
    });
    const claudePath = join(projectDir, 'CLAUDE.md');

    await runInit(projectDir, NO_PRESETS);

    const hasClaude = await checkExists(claudePath);
    expect(hasClaude).toBe(false);
  });

  it('turns a CLAUDE.md with its own text into a rule and warns about imports', async () => {
    const projectDir = await createTree({
      'CLAUDE.md': '# Claude notes\n\nSee @docs/setup.md\n',
    });

    const report = await runInit(projectDir, NO_PRESETS);

    const rulePath = join(projectDir, '.tunestra/rules/claude-md.md');
    const rule = await readFile(rulePath, 'utf8');
    expect(rule).toBe('# Claude notes\n\nSee @docs/setup.md\n');
    expect(report.warnings).toEqual([
      '.tunestra/rules/claude-md.md may have @imports; their paths are relative to the old place, so check them',
    ]);
  });

  it('does not move anything when the target already exists', async () => {
    const projectDir = await createTree({
      'AGENTS.md': '# New\n',
      '.tunestra/AGENTS.md': '# Old\n',
    });
    const agentsPath = join(projectDir, 'AGENTS.md');

    const result = runInit(projectDir, NO_PRESETS);

    await expect(result).rejects.toThrow('.tunestra/AGENTS.md already exists');
    const hasAgents = await checkExists(agentsPath);
    expect(hasAgents).toBe(true);
  });

  it('prepares a project that setup can build right away', async () => {
    const root = await createTree({
      'project/AGENTS.md': '# Our service\n',
      'base/tunestra.preset.yaml': 'name: base\nlevel: base\n',
      'base/rules/security.md': '# Security\n',
    });
    const projectDir = join(root, 'project');
    const options = {
      presets: ['../base'],
    };
    await runInit(projectDir, options);

    await runSetup(projectDir, { dryRun: false });

    const instructionsPath = join(projectDir, '.agents/rules/10-project-instructions.md');
    const instructions = await readFile(instructionsPath, 'utf8');
    expect(instructions).toContain('# Our service');
  });
});
