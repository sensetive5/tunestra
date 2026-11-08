import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runSetup } from '../../../setup/run-setup.ts';
import { createTree } from '../../../shared/tests/temp.ts';

const PROJECT = {
  'project/tunestra.yaml': 'extends: [../base]\nenv:\n  MCP_TIMEOUT: 300000\n',
  'base/tunestra.preset.yaml': 'name: base\nlevel: base\nenv:\n  HTTPS_PROXY: http://proxy:3128\n',
};

const SETTINGS = '.claude/settings.json';

async function setupProject(files: Record<string, string>): Promise<string> {
  const root = await createTree(files);
  const projectDir = join(root, 'project');

  await runSetup(projectDir, { dryRun: false });

  return projectDir;
}

describe('Claude Code settings', () => {
  it('writes env to .claude/settings.json and asks to commit it', async () => {
    const root = await createTree(PROJECT);
    const projectDir = join(root, 'project');
    const settingsPath = join(projectDir, SETTINGS);

    const { plan } = await runSetup(projectDir, { dryRun: false });

    const settings = await readFile(settingsPath, 'utf8');
    const data: unknown = JSON.parse(settings);
    expect(data).toEqual({
      $schema: 'https://json.schemastore.org/claude-code-settings.json',
      env: {
        HTTPS_PROXY: 'http://proxy:3128',
        MCP_TIMEOUT: '300000',
      },
    });
    expect(plan.protectedPaths).toEqual(['AGENTS.md', 'CLAUDE.md', SETTINGS]);
    expect(plan.ignoredPaths).not.toContain(SETTINGS);
  });

  it('writes permissions with sorted lists, without empty ones', async () => {
    const root = await createTree({
      'project/tunestra.yaml': 'permissions:\n  deny: [Read(./.env), Bash(rm -rf *)]\n',
    });
    const projectDir = join(root, 'project');
    const settingsPath = join(projectDir, SETTINGS);

    await runSetup(projectDir, { dryRun: false });

    const settings = await readFile(settingsPath, 'utf8');
    const data: unknown = JSON.parse(settings);
    expect(data).toEqual({
      $schema: 'https://json.schemastore.org/claude-code-settings.json',
      permissions: {
        deny: ['Bash(rm -rf *)', 'Read(./.env)'],
      },
    });
  });

  it('writes no settings without env and permissions', async () => {
    const root = await createTree({
      'project/tunestra.yaml': 'agents: [claude]\n',
    });
    const projectDir = join(root, 'project');

    const { plan } = await runSetup(projectDir, { dryRun: true });

    const paths = plan.outputs.map((output) => output.path);
    expect(paths).not.toContain(SETTINGS);
  });

  it('stops on a variable that Claude Code ignores in a project', async () => {
    const root = await createTree({
      'project/tunestra.yaml': 'env:\n  CLAUDE_CODE_ENABLE_TELEMETRY: 1\n',
    });
    const projectDir = join(root, 'project');

    const result = runSetup(projectDir, { dryRun: true });

    await expect(result).rejects.toThrow(
      'project: env sets CLAUDE_CODE_ENABLE_TELEMETRY, but Claude Code ignores it in project settings',
    );
  });

  it('takes over its settings in a fresh clone, where the state is missing', async () => {
    const projectDir = await setupProject(PROJECT);
    const settingsPath = join(projectDir, SETTINGS);
    const stateDir = join(projectDir, '.tunestra/state');
    await rm(stateDir, { recursive: true });
    await writeFile(settingsPath, '{ "env": { "MCP_TIMEOUT": "1" } }\n');

    const { sync } = await runSetup(projectDir, { dryRun: false });

    const settings = await readFile(settingsPath, 'utf8');
    expect(settings).toContain('"MCP_TIMEOUT": "300000"');
    expect(sync.warnings).toEqual([
      `${SETTINGS} had only the settings that tunestra writes; tunestra replaced it. Edit env and permissions in tunestra.yaml and its presets instead`,
    ]);
  });

  it('stops on settings that people wrote, with keys that tunestra does not write', async () => {
    const root = await createTree({
      ...PROJECT,
      'project/.claude/settings.json': '{ "env": {}, "model": "opus", "hooks": {} }\n',
    });
    const projectDir = join(root, 'project');

    const result = runSetup(projectDir, { dryRun: true });

    await expect(result).rejects.toThrow(
      `${SETTINGS} has settings that tunestra does not write: model, hooks. Move them to .claude/settings.local.json or ~/.claude/settings.json`,
    );
  });

  it('stops on settings that are not a JSON object', async () => {
    const root = await createTree({
      ...PROJECT,
      'project/.claude/settings.json': '{ broken\n',
    });
    const projectDir = join(root, 'project');

    const result = runSetup(projectDir, { dryRun: true });

    await expect(result).rejects.toThrow(`${SETTINGS} is not a JSON object`);
  });
});
