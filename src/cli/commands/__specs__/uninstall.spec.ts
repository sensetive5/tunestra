import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runSetup } from '../../../setup/run-setup.ts';
import { createTree } from '../../../shared/tests/temp.ts';
import { describeUninstall } from '../uninstall.ts';

const PROJECT = {
  'project/tunestra.yaml': 'name: project\n',
  'project/tunestra.local.yaml': 'env:\n  HTTPS_PROXY: http://localhost:3128\n',
  'project/.claude/settings.local.json': '{"model":"opus"}\n',
};

async function setUpProject(): Promise<string> {
  const root = await createTree(PROJECT);
  const projectDir = join(root, 'project');

  await runSetup(projectDir, { dryRun: false });

  return projectDir;
}

describe('describeUninstall', () => {
  it('lists the files that it would remove and update', async () => {
    const projectDir = await setUpProject();

    const text = await describeUninstall(projectDir, { dryRun: true });

    expect(text).toContain('  remove  AGENTS.md');
    expect(text).toContain('  update  .claude/settings.local.json');
    expect(text).toContain('Nothing was removed (--dry-run).');
  });

  it('says that the settings of the developer stay', async () => {
    const projectDir = await setUpProject();

    const text = await describeUninstall(projectDir, { dryRun: false });

    expect(text).toContain(
      'Took the settings of tunestra out of .claude/settings.local.json; your settings stay.',
    );
  });
});
