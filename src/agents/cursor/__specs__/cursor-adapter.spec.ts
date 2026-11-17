import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runSetup } from '../../../setup/run-setup.ts';
import { createTree } from '../../../shared/tests/temp.ts';

const PROJECT = {
  'project/tunestra.yaml': 'extends: [../base]\nagents: [cursor]\n',
  'base/tunestra.preset.yaml': 'name: base\nlevel: base\n',
  'base/rules/security.md': '---\ndescription: Never expose secrets\n---\n# Security\n',
};

async function createProject(files: Record<string, string> = {}): Promise<string> {
  const root = await createTree({
    ...PROJECT,
    ...files,
  });

  return join(root, 'project');
}

async function readOutput(projectDir: string, path: string): Promise<string> {
  return readFile(join(projectDir, path), 'utf8');
}

describe('cursorAdapter', () => {
  it('copies the rules as .mdc files that apply in every chat', async () => {
    const projectDir = await createProject();

    const { plan } = await runSetup(projectDir, { dryRun: false });

    const rule = await readOutput(projectDir, '.cursor/rules/tunestra/40-base-security.mdc');
    expect(rule).toMatch(
      /^---\ndescription: Never expose secrets\nalwaysApply: true\n---\n<!-- Generated/,
    );
    expect(plan.ignoredPaths).toContain('.cursor/rules/tunestra/*');
    expect(plan.notes).toEqual([]);
  });

  it('turns a command into a skill that runs only when it is called', async () => {
    const projectDir = await createProject({
      'base/commands/release-notes.md': '---\ndescription: Draft notes\n---\nDraft.\n',
      'base/commands/Bad_Name.md': 'Draft.\n',
    });

    const { plan } = await runSetup(projectDir, { dryRun: false });

    const skill = await readOutput(projectDir, '.agents/skills/release-notes/SKILL.md');
    const paths = plan.outputs.map((output) => output.path);
    expect(skill).toContain('disable-model-invocation: true');
    expect(paths).not.toContain('.agents/skills/release-notes/agents/openai.yaml');
    expect(plan.notes).toContain(
      'Cursor skips the command "Bad_Name": a skill name needs lowercase letters, digits and single hyphens.',
    );
  });

  it('writes one skill for a command when Codex and Cursor are both on', async () => {
    const projectDir = await createProject({
      'project/tunestra.yaml': 'extends: [../base]\nagents: [codex, cursor]\n',
      'base/commands/release-notes.md': '---\ndescription: Draft notes\n---\nDraft.\n',
    });

    const { plan } = await runSetup(projectDir, { dryRun: true });

    const paths = plan.outputs.map((output) => output.path);
    const skillPaths = paths.filter((path) => path === '.agents/skills/release-notes/SKILL.md');
    expect(skillPaths).toHaveLength(1);
    expect(paths).toContain('.agents/skills/release-notes/agents/openai.yaml');
  });

  it('writes a read-only subagent with its model for Cursor', async () => {
    const projectDir = await createProject({
      'base/agents/reviewer.md':
        '---\ndescription: Reviews diffs\nmodel:\n  cursor: composer-2\neffort: high\nreadOnly: true\n---\nReview.\n',
    });

    const { plan } = await runSetup(projectDir, { dryRun: false });

    const subagent = await readOutput(projectDir, '.cursor/agents/reviewer.md');
    expect(subagent).toBe(
      '---\nname: reviewer\ndescription: Reviews diffs\nmodel: composer-2\nreadonly: true\n---\nReview.\n',
    );
    expect(plan.notes).toContain(
      'Cursor has no reasoning effort for subagents: it skips effort for reviewer.',
    );
  });

  it('writes MCP servers and says that it skips env', async () => {
    const projectDir = await createProject({
      'base/mcp/memory.yaml': 'command: npx\nargs: [-y, memory]\n',
      'base/tunestra.preset.yaml': 'name: base\nlevel: base\nenv:\n  MCP_TIMEOUT: 1000\n',
    });

    const { plan } = await runSetup(projectDir, { dryRun: false });

    const mcp = await readOutput(projectDir, '.cursor/mcp.json');
    expect(JSON.parse(mcp)).toEqual({
      mcpServers: {
        memory: {
          command: 'npx',
          args: ['-y', 'memory'],
        },
      },
    });
    expect(plan.notes).toContain(
      'Cursor skips env: it has no environment variables in project settings. Set them in your shell.',
    );
  });

  it('writes allow and deny rules for the CLI and skips ask rules', async () => {
    const projectDir = await createProject({
      'base/tunestra.preset.yaml':
        'name: base\nlevel: base\npermissions:\n  allow: [Bash(npm test *)]\n  ask: [Bash(git push *)]\n  deny: [Read(./.env), Bash(a && b)]\n',
    });

    const { plan } = await runSetup(projectDir, { dryRun: false });

    const cli = await readOutput(projectDir, '.cursor/cli.json');
    expect(JSON.parse(cli)).toEqual({
      permissions: {
        allow: ['Shell(npm:test *)'],
        deny: ['Read(.env)'],
      },
    });
    expect(plan.notes).toEqual([
      'Cursor skips ask rules: Bash(git push *). The Cursor CLI has only allow and deny lists.',
      'Cursor skips permission rules that it cannot express: Bash(a && b).',
      'Cursor reads permissions from .cursor/cli.json only in the CLI. In the editor, set the allowlist in the settings of the agent.',
    ]);
  });

  it('writes no CLI config when no rule fits', async () => {
    const projectDir = await createProject({
      'base/tunestra.preset.yaml':
        'name: base\nlevel: base\npermissions:\n  ask: [Bash(git push *)]\n',
    });

    const { plan } = await runSetup(projectDir, { dryRun: true });

    const paths = plan.outputs.map((output) => output.path);
    expect(paths).not.toContain('.cursor/cli.json');
  });

  it('adds the personal setup as one more rule', async () => {
    const projectDir = await createProject({
      'project/tunestra.local.yaml': 'name: me\n',
      'project/.tunestra.local/rules/answers.md': '# Answers\n',
    });

    await runSetup(projectDir, { dryRun: false });

    const setup = await readOutput(projectDir, '.cursor/rules/tunestra/00-personal-setup.mdc');
    const rule = await readOutput(projectDir, '.cursor/rules/tunestra/00-local-answers.mdc');
    expect(setup).toContain('alwaysApply: true');
    expect(setup).toContain('| Rule | answers | local |');
    expect(rule).toContain('# Answers');
  });
});
