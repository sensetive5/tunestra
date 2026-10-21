import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadChain } from '../../chain/load-chain.ts';
import { BASIC_INPUT } from '../../shared/tests/fixtures.ts';
import { createTree } from '../../shared/tests/temp.ts';
import { applyInheritance } from '../apply-inheritance.ts';

const BASE_MANIFEST = 'name: base\nlevel: base\n';

describe('applyInheritance', () => {
  it('orders rules from specific to general and shows what they override', async () => {
    const projectDir = join(BASIC_INPUT, 'project');
    const chain = await loadChain(projectDir);

    const resolution = applyInheritance(chain);

    const rules = resolution.rules.map((rule) => ({
      key: rule.artifact.key,
      level: rule.origin.level,
      overrides: rule.overrides.map((origin) => origin.name),
    }));
    expect(rules).toEqual([
      {
        key: 'instructions@project',
        level: 'project',
        overrides: [],
      },
      {
        key: 'architecture',
        level: 'project',
        overrides: [],
      },
      {
        key: 'code-style',
        level: 'team',
        overrides: ['base'],
      },
      {
        key: 'react',
        level: 'team',
        overrides: [],
      },
      {
        key: 'instructions@base',
        level: 'base',
        overrides: [],
      },
      {
        key: 'security',
        level: 'base',
        overrides: [],
      },
    ]);
  });

  it('drops excluded skills and keeps the rest', async () => {
    const projectDir = join(BASIC_INPUT, 'project');
    const chain = await loadChain(projectDir);

    const resolution = applyInheritance(chain);

    const skillKeys = resolution.skills.map((skill) => skill.artifact.key);
    expect(skillKeys).toEqual(['domain-model', 'storybook']);
  });

  it('patches an inherited MCP server and remembers who patched it', async () => {
    const projectDir = join(BASIC_INPUT, 'project');
    const chain = await loadChain(projectDir);

    const resolution = applyInheritance(chain);

    const [tracker] = resolution.mcp;
    const patchedBy = tracker?.patchedBy.map((origin) => origin.name);
    expect(tracker?.origin.name).toBe('base');
    expect(patchedBy).toEqual(['team']);
    expect(tracker?.artifact.config.env).toEqual({
      TRACKER_URL: 'https://tracker.example.com',
      QUEUE: 'TEAM',
    });
  });

  it('reports exclude and overrides that refer to unknown keys', async () => {
    const root = await createTree({
      'project/tunestra.yaml': [
        'extends: [../base]',
        'exclude:',
        '  rules: [typo]',
        'overrides:',
        '  mcp:',
        '    missing:',
        '      env:',
        '        A: B',
      ].join('\n'),
      'base/tunestra.preset.yaml': BASE_MANIFEST,
    });
    const projectDir = join(root, 'project');
    const chain = await loadChain(projectDir);

    const act = () => applyInheritance(chain);

    expect(act).toThrow('Found 2 problems');
    expect(act).toThrow('exclude.rules lists "typo"');
    expect(act).toThrow('overrides.mcp lists "missing"');
  });

  it('rejects a patch that leaves an MCP server with both command and url', async () => {
    const root = await createTree({
      'project/tunestra.yaml': [
        'extends: [../base]',
        'overrides:',
        '  mcp:',
        '    tracker:',
        '      url: https://tracker.example.com/mcp',
      ].join('\n'),
      'base/tunestra.preset.yaml': BASE_MANIFEST,
      'base/mcp/tracker.yaml': 'command: npx\n',
    });
    const projectDir = join(root, 'project');
    const chain = await loadChain(projectDir);

    const act = () => applyInheritance(chain);

    expect(act).toThrow('must have either "command" or "url"');
  });

  it('lets a more specific level replace a patched server', async () => {
    const root = await createTree({
      'project/tunestra.yaml': 'extends: [../team]\n',
      'project/.tunestra/mcp/tracker.yaml': 'command: project-tracker\n',
      'team/tunestra.preset.yaml': [
        'name: team',
        'level: team',
        'extends: [../base]',
        'overrides:',
        '  mcp:',
        '    tracker:',
        '      command: team-tracker',
      ].join('\n'),
      'base/tunestra.preset.yaml': BASE_MANIFEST,
      'base/mcp/tracker.yaml': 'command: base-tracker\n',
    });
    const projectDir = join(root, 'project');
    const chain = await loadChain(projectDir);

    const resolution = applyInheritance(chain);

    const [tracker] = resolution.mcp;
    const overrides = tracker?.overrides.map((origin) => origin.name);
    expect(tracker?.artifact.config.command).toBe('project-tracker');
    expect(tracker?.patchedBy).toEqual([]);
    expect(overrides).toEqual(['base']);
  });
});
