import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runSetup } from '../../setup/run-setup.ts';
import { createTempDir, createTree } from '../../shared/tests/temp.ts';
import { checkExists } from '../../shared/utils/fs.ts';
import { runInitLocal } from '../run-init-local.ts';

const NO_PRESETS = {
  presets: [],
};

describe('runInitLocal', () => {
  it('creates a personal level that setup can read', async () => {
    const projectDir = await createTree({
      'tunestra.yaml': 'name: project\n',
    });
    const rulesDir = join(projectDir, '.tunestra.local/rules');

    await runInitLocal(projectDir, NO_PRESETS);
    const { plan } = await runSetup(projectDir, { dryRun: false });

    const hasRulesDir = await checkExists(rulesDir);
    const paths = plan.outputs.map((output) => output.path);
    expect(hasRulesDir).toBe(true);
    expect(paths).toContain('CLAUDE.local.md');
    expect(plan.ignoredPaths).toContain('tunestra.local.yaml');
  });

  it('writes the given personal presets', async () => {
    const projectDir = await createTree({
      'tunestra.yaml': 'name: project\n',
    });
    const localPath = join(projectDir, 'tunestra.local.yaml');
    const options = {
      presets: ['~/presets/me'],
    };

    await runInitLocal(projectDir, options);

    const config = await readFile(localPath, 'utf8');
    expect(config).toContain('extends:\n  - "~/presets/me"\n');
  });

  it('needs tunestra.yaml', async () => {
    const projectDir = await createTempDir('init-local');

    const result = runInitLocal(projectDir, NO_PRESETS);

    await expect(result).rejects.toThrow('tunestra.yaml not found. Run `tunestra init` first');
  });

  it('refuses to run twice', async () => {
    const projectDir = await createTree({
      'tunestra.yaml': 'name: project\n',
      'tunestra.local.yaml': 'extends: []\n',
    });

    const result = runInitLocal(projectDir, NO_PRESETS);

    await expect(result).rejects.toThrow('tunestra.local.yaml already exists');
  });
});
