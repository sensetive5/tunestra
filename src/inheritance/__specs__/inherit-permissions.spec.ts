import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runSetup } from '../../setup/run-setup.ts';
import { createTree } from '../../shared/tests/temp.ts';

const BASE = {
  'base/tunestra.preset.yaml': [
    'name: base',
    'level: base',
    'permissions:',
    '  allow: [Bash(npm test *)]',
    '  ask: [Bash(git push *)]',
    '  deny: [Read(./.env)]',
    '',
  ].join('\n'),
};

async function resolvePermissions(projectConfig: string): Promise<ReadonlyArray<string>> {
  const root = await createTree({
    ...BASE,
    'project/tunestra.yaml': `extends: [../base]\n${projectConfig}`,
  });
  const projectDir = join(root, 'project');

  const { resolution } = await runSetup(projectDir, { dryRun: true });

  return resolution.permissions.map(
    (resolved) => `${resolved.artifact.decision} ${resolved.artifact.key}`,
  );
}

describe('inheritPermissions', () => {
  it('joins the lists of every level', async () => {
    const permissions = await resolvePermissions('permissions:\n  deny: [Bash(rm -rf *)]\n');

    expect(permissions).toEqual([
      'allow Bash(npm test *)',
      'ask Bash(git push *)',
      'deny Read(./.env)',
      'deny Bash(rm -rf *)',
    ]);
  });

  it('removes inherited allow and ask rules that a level excludes', async () => {
    const permissions = await resolvePermissions(
      'exclude:\n  permissions: [Bash(npm test *), Bash(git push *)]\n',
    );

    expect(permissions).toEqual(['deny Read(./.env)']);
  });

  it('does not let a level remove a deny rule', async () => {
    const result = resolvePermissions('exclude:\n  permissions: [Read(./.env)]\n');

    await expect(result).rejects.toThrow(
      'project: exclude.permissions lists "Read(./.env)", but it is a deny rule of base, and a deny rule cannot be removed',
    );
  });

  it('reports an excluded rule that no level has', async () => {
    const result = resolvePermissions('exclude:\n  permissions: [Bash(ls)]\n');

    await expect(result).rejects.toThrow(
      'project: exclude.permissions lists "Bash(ls)", but no more general level has it',
    );
  });

  it('keeps one rule when a level repeats an inherited one', async () => {
    const permissions = await resolvePermissions('permissions:\n  deny: [Read(./.env)]\n');

    expect(permissions).toEqual([
      'allow Bash(npm test *)',
      'ask Bash(git push *)',
      'deny Read(./.env)',
    ]);
  });

  it('rejects a rule that is not in the syntax of Claude Code', async () => {
    const result = resolvePermissions('permissions:\n  deny: ["(rm -rf)"]\n');

    await expect(result).rejects.toThrow('Write a rule as Tool or Tool(specifier)');
  });
});
