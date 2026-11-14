import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTree } from '../../shared/tests/temp.ts';
import { checkExists } from '../../shared/utils/fs.ts';
import { runUninstall } from '../../uninstall/run-uninstall.ts';
import { runSetup } from '../run-setup.ts';

const PROJECT = {
  'project/tunestra.yaml': 'extends: [../base]\nagents: [claude, codex]\n',
  'project/tunestra.local.yaml': 'env:\n  HTTPS_PROXY: http://localhost:3128\n',
  'base/tunestra.preset.yaml': 'name: base\nlevel: base\n',
  'base/skills/review/SKILL.md': '---\nname: review\ndescription: Review code\n---\n',
  'base/commands/release-notes.md': '---\ndescription: Draft notes\n---\nDraft.\n',
};

const LOCAL_SETTINGS = '.claude/settings.local.json';

async function createProject(files: Record<string, string> = {}): Promise<string> {
  const root = await createTree({
    ...PROJECT,
    ...files,
  });

  return join(root, 'project');
}

async function readJson(path: string): Promise<unknown> {
  const content = await readFile(path, 'utf8');

  return JSON.parse(content);
}

describe('the personal level', () => {
  it('adds its env to settings.local.json and keeps the settings of the developer', async () => {
    const projectDir = await createProject({
      [`project/${LOCAL_SETTINGS}`]: '{"permissions":{"allow":["Bash(ls *)"]}}\n',
    });
    const settingsPath = join(projectDir, LOCAL_SETTINGS);

    const { plan } = await runSetup(projectDir, { dryRun: false });

    const settings = await readJson(settingsPath);
    expect(settings).toEqual({
      permissions: {
        allow: ['Bash(ls *)'],
      },
      env: {
        HTTPS_PROXY: 'http://localhost:3128',
      },
    });
    expect(plan.protectedPaths).toEqual(['AGENTS.md', 'CLAUDE.md']);
    expect(plan.ignoredPaths).toContain(LOCAL_SETTINGS);
  });

  it('writes the personal files for Claude Code and Codex', async () => {
    const projectDir = await createProject({
      'project/tunestra.local.yaml': 'exclude:\n  skills: [review]\n',
    });
    const claudeLocalPath = join(projectDir, 'CLAUDE.local.md');
    const overridePath = join(projectDir, 'AGENTS.override.md');
    const indexPath = join(projectDir, 'AGENTS.md');

    const { plan } = await runSetup(projectDir, { dryRun: false });

    const claudeLocal = await readFile(claudeLocalPath, 'utf8');
    const override = await readFile(overridePath, 'utf8');
    const index = await readFile(indexPath, 'utf8');
    expect(claudeLocal).toContain('| Skill | review |');
    expect(override).toContain('| 1 | local | local | tunestra.local.yaml |');
    expect(override).not.toContain('| review |');
    expect(index).toContain('| review |');
    expect(plan.merges).toEqual([]);
  });

  it('lists personal commands and permissions in CLAUDE.local.md', async () => {
    const projectDir = await createProject({
      'project/tunestra.local.yaml': 'permissions:\n  deny: [Bash(git push *)]\n',
      'project/.tunestra.local/commands/release-notes.md': 'Draft my way.\n',
    });
    const claudeLocalPath = join(projectDir, 'CLAUDE.local.md');

    await runSetup(projectDir, { dryRun: false });

    const claudeLocal = await readFile(claudeLocalPath, 'utf8');
    expect(claudeLocal).toContain('| Command | /release-notes | local, overrides base |  |');
    expect(claudeLocal).toContain('| Permission | deny Bash(git push *) | local |  |');
  });

  it('says when the personal level changes nothing', async () => {
    const projectDir = await createProject({
      'project/tunestra.local.yaml': 'name: me\n',
    });
    const claudeLocalPath = join(projectDir, 'CLAUDE.local.md');

    await runSetup(projectDir, { dryRun: false });

    const claudeLocal = await readFile(claudeLocalPath, 'utf8');
    expect(claudeLocal).toContain('The personal level changes nothing yet.');
  });

  it('removes settings.local.json that had only its entries, when the personal level is gone', async () => {
    const projectDir = await createProject();
    const settingsPath = join(projectDir, LOCAL_SETTINGS);
    await runSetup(projectDir, { dryRun: false });
    await rm(join(projectDir, 'tunestra.local.yaml'));

    const { sync } = await runSetup(projectDir, { dryRun: false });

    const exists = await checkExists(settingsPath);
    expect(exists).toBe(false);
    expect(sync.removals).toContain(LOCAL_SETTINGS);
  });

  it('does not mind a settings.local.json that someone already deleted', async () => {
    const projectDir = await createProject();
    await runSetup(projectDir, { dryRun: false });
    await rm(join(projectDir, LOCAL_SETTINGS));
    await rm(join(projectDir, 'tunestra.local.yaml'));

    const { sync } = await runSetup(projectDir, { dryRun: false });

    expect(sync.removals).not.toContain(LOCAL_SETTINGS);
  });

  it('does not write settings.local.json again when nothing changes', async () => {
    const projectDir = await createProject();
    await runSetup(projectDir, { dryRun: false });

    const { sync } = await runSetup(projectDir, { dryRun: true });

    const paths = sync.outputs.map((output) => output.path);
    expect(paths).not.toContain(LOCAL_SETTINGS);
  });

  it('stops on settings.local.json that is not valid JSON', async () => {
    const projectDir = await createProject({
      [`project/${LOCAL_SETTINGS}`]: '{ "env": ',
    });

    const result = runSetup(projectDir, { dryRun: true });

    await expect(result).rejects.toThrow(`${LOCAL_SETTINGS} is not valid JSON`);
  });

  it('stops on settings.local.json that is not an object', async () => {
    const projectDir = await createProject({
      [`project/${LOCAL_SETTINGS}`]: '[]\n',
    });

    const result = runSetup(projectDir, { dryRun: true });

    await expect(result).rejects.toThrow(`${LOCAL_SETTINGS} is not a JSON object`);
  });

  it('extends only personal presets', async () => {
    const projectDir = await createProject({
      'project/tunestra.local.yaml': 'extends: [../team]\n',
      'team/tunestra.preset.yaml': 'name: team\nlevel: team\n',
    });

    const result = runSetup(projectDir, { dryRun: true });

    await expect(result).rejects.toThrow(
      'team (team) is extended by the personal level. A personal level can only extend presets with level: local',
    );
  });

  it('cannot exclude env or permissions', async () => {
    const projectDir = await createProject({
      'project/tunestra.local.yaml': 'exclude:\n  permissions: [Bash(npm test *)]\n',
    });

    const result = runSetup(projectDir, { dryRun: true });

    await expect(result).rejects.toThrow('a personal level cannot exclude env or permissions');
  });

  it('takes its entries out of settings.local.json on uninstall', async () => {
    const projectDir = await createProject({
      [`project/${LOCAL_SETTINGS}`]: '{"model":"opus"}\n',
    });
    const settingsPath = join(projectDir, LOCAL_SETTINGS);
    await runSetup(projectDir, { dryRun: false });

    const report = await runUninstall(projectDir, { dryRun: false });

    const settings = await readJson(settingsPath);
    expect(settings).toEqual({
      model: 'opus',
    });
    expect(report.updates).toEqual([LOCAL_SETTINGS]);
  });

  it('reads the state of an older setup without merges', async () => {
    const projectDir = await createProject();
    const statePath = join(projectDir, '.tunestra/state/outputs.json');
    await runSetup(projectDir, { dryRun: false });
    await writeFile(statePath, '{"version":1,"outputs":{}}\n');

    const result = runSetup(projectDir, { dryRun: true });

    await expect(result).resolves.toBeDefined();
  });
});
