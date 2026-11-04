import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runSetup } from '../../../setup/run-setup.ts';
import { createTree } from '../../../shared/tests/temp.ts';

const PROJECT = {
  'project/tunestra.yaml': 'extends: [../base]\nagents: [codex]\n',
  'base/tunestra.preset.yaml': 'name: base\nlevel: base\n',
  'base/rules/security.md': '# Security\n',
};

describe('codexAdapter', () => {
  it('gives Codex the rules and asks to trust the project', async () => {
    const root = await createTree(PROJECT);
    const projectDir = join(root, 'project');
    const configPath = join(projectDir, '.codex/config.toml');

    const { plan } = await runSetup(projectDir, { dryRun: false });

    const config = await readFile(configPath, 'utf8');
    expect(config).toContain('# Security');
    expect(plan.notes).toEqual([expect.stringContaining('trusted project')]);
    expect(plan.protectedPaths).toEqual(['AGENTS.md']);
  });

  it('turns a command into a skill that runs only when it is called', async () => {
    const root = await createTree({
      ...PROJECT,
      'base/commands/release-notes.md':
        '---\ndescription: Draft notes\nmodel: haiku\n---\nDraft.\n',
    });
    const projectDir = join(root, 'project');
    const skillPath = join(projectDir, '.agents/skills/release-notes/SKILL.md');
    const policyPath = join(projectDir, '.agents/skills/release-notes/agents/openai.yaml');

    await runSetup(projectDir, { dryRun: false });

    const skill = await readFile(skillPath, 'utf8');
    const policy = await readFile(policyPath, 'utf8');
    expect(skill).toBe('---\nname: release-notes\ndescription: Draft notes\n---\nDraft.\n');
    expect(policy).toContain('allow_implicit_invocation: false');
  });

  it('skips a command whose name cannot be a skill name', async () => {
    const root = await createTree({
      ...PROJECT,
      'base/commands/Release_Notes.md': 'Draft.\n',
    });
    const projectDir = join(root, 'project');

    const { plan } = await runSetup(projectDir, { dryRun: true });

    const paths = plan.outputs.map((output) => output.path);
    expect(paths).not.toContain('.agents/skills/Release_Notes/SKILL.md');
    expect(plan.notes).toContain(
      'Codex skips the command "Release_Notes": a skill name needs lowercase letters, digits and single hyphens.',
    );
  });

  it('gives Codex a local MCP server', async () => {
    const root = await createTree({
      ...PROJECT,
      'base/mcp/memory.yaml': 'command: npx\nargs: [-y, memory]\n',
    });
    const projectDir = join(root, 'project');
    const configPath = join(projectDir, '.codex/config.toml');

    await runSetup(projectDir, { dryRun: false });

    const config = await readFile(configPath, 'utf8');
    expect(config).toContain('[mcp_servers.memory]\ncommand = "npx"');
  });

  it('describes a command without a description by its name', async () => {
    const root = await createTree({
      ...PROJECT,
      'base/commands/hello.md': 'Say hello.\n',
    });
    const projectDir = join(root, 'project');
    const skillPath = join(projectDir, '.agents/skills/hello/SKILL.md');

    await runSetup(projectDir, { dryRun: false });

    const skill = await readFile(skillPath, 'utf8');
    expect(skill).toBe('---\nname: hello\ndescription: The /hello command\n---\nSay hello.\n');
  });

  it('stops when a command and a skill have the same name', async () => {
    const root = await createTree({
      ...PROJECT,
      'base/commands/review.md': 'Review.\n',
      'base/skills/review/SKILL.md': '---\nname: review\ndescription: Review code\n---\n',
    });
    const projectDir = join(root, 'project');

    const result = runSetup(projectDir, { dryRun: true });

    await expect(result).rejects.toThrow(
      'Two generated files have the same path: .agents/skills/review/SKILL.md',
    );
  });

  it('skips an SSE server, because Codex does not support it', async () => {
    const root = await createTree({
      ...PROJECT,
      'base/mcp/events.yaml': 'type: sse\nurl: https://events.example.com/sse\n',
    });
    const projectDir = join(root, 'project');
    const configPath = join(projectDir, '.codex/config.toml');

    const { plan } = await runSetup(projectDir, { dryRun: false });

    const config = await readFile(configPath, 'utf8');
    expect(config).not.toContain('events');
    expect(plan.notes).toContain(
      'Codex skips the MCP server "events": Codex does not support SSE.',
    );
  });

  it('writes no config when there are no rules and no MCP servers', async () => {
    const root = await createTree({
      'project/tunestra.yaml': 'agents: [codex]\n',
    });
    const projectDir = join(root, 'project');

    const { plan } = await runSetup(projectDir, { dryRun: true });

    const paths = plan.outputs.map((output) => output.path);
    expect(paths).toEqual(['AGENTS.md']);
    expect(plan.notes).toEqual([]);
  });

  it('takes back its own config when the state is lost', async () => {
    const root = await createTree(PROJECT);
    const projectDir = join(root, 'project');
    const stateDir = join(projectDir, '.tunestra/state');
    await runSetup(projectDir, { dryRun: false });
    await rm(stateDir, { recursive: true });

    const result = runSetup(projectDir, { dryRun: false });

    await expect(result).resolves.toBeDefined();
  });
});
