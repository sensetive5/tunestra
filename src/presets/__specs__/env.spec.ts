import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runSetup } from '../../setup/run-setup.ts';
import { createTree } from '../../shared/tests/temp.ts';
import { loadProject } from '../load-project.ts';

async function loadEnv(env: string): Promise<ReturnType<typeof loadProject>> {
  const root = await createTree({
    'tunestra.yaml': `env:\n${env}`,
  });

  return loadProject(root);
}

describe('env in a manifest', () => {
  it('reads every value as text, with the manifest as its source', async () => {
    const project = await loadEnv('  MCP_TIMEOUT: 120000\n  DEBUG: true\n');

    expect(project.env).toEqual([
      {
        key: 'MCP_TIMEOUT',
        source: '../tunestra.yaml',
        value: '120000',
      },
      {
        key: 'DEBUG',
        source: '../tunestra.yaml',
        value: 'true',
      },
    ]);
  });

  it('rejects a reference to another variable, because agents do not expand it', async () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: the YAML holds the unsupported reference.
    const result = loadEnv('  TOKEN: ${MY_TOKEN}\n');

    // biome-ignore lint/suspicious/noTemplateCurlyInString: the message shows the unsupported syntax.
    await expect(result).rejects.toThrow('Agents do not expand ${…} in their settings');
  });

  it('rejects a name that cannot be a variable', async () => {
    const result = loadEnv('  MY-VAR: 1\n');

    await expect(result).rejects.toThrow('"MY-VAR" is not a variable name');
  });
});

describe('env inheritance', () => {
  it('reports an excluded variable that no level sets', async () => {
    const root = await createTree({
      'tunestra.yaml': 'exclude:\n  env: [MCP_TIMEOUT]\n',
    });

    const result = runSetup(root, { dryRun: true });

    await expect(result).rejects.toThrow(
      'exclude.env lists "MCP_TIMEOUT", but no more general level has it',
    );
  });

  it('lets a specific level override and exclude inherited variables', async () => {
    const root = await createTree({
      'project/tunestra.yaml': 'extends: [../base]\nexclude:\n  env: [B]\nenv:\n  A: project\n',
      'base/tunestra.preset.yaml': 'name: base\nlevel: base\nenv:\n  A: base\n  B: base\n',
    });
    const projectDir = join(root, 'project');

    const { resolution } = await runSetup(projectDir, { dryRun: true });

    const variables = resolution.env.map((variable) => [
      variable.artifact.key,
      variable.artifact.value,
    ]);
    expect(variables).toEqual([['A', 'project']]);
  });
});
