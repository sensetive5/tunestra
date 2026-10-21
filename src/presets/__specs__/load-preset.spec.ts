import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BASIC_INPUT } from '../../shared/tests/fixtures.ts';
import { createTree } from '../../shared/tests/temp.ts';
import { loadPreset } from '../load-preset.ts';
import { MINIMAL_MANIFEST } from './helpers.ts';

describe('loadPreset', () => {
  it('reads the manifest and every kind of artifact', async () => {
    const dir = join(BASIC_INPUT, 'presets/team');

    const team = await loadPreset(dir);

    expect(team).toMatchObject({
      name: 'team',
      level: 'team',
      description: 'Frontend team conventions',
      extends: ['../base'],
      exclude: {
        skills: ['code-review'],
      },
      overrides: {
        mcp: {
          tracker: {
            env: {
              QUEUE: 'TEAM',
            },
          },
        },
      },
    });
    expect(team.rules).toEqual([
      {
        key: 'code-style',
        source: 'rules/code-style.md',
        description: 'Frontend code style',
        body: '# Code style\n\n- Indent with 2 spaces.\n- Name React components in PascalCase.\n',
      },
      {
        key: 'react',
        source: 'rules/react.md',
        description: 'React conventions',
        body: '# React\n\n- Use function components and hooks.\n',
      },
    ]);
    expect(team.skills).toEqual([
      {
        key: 'storybook',
        source: 'skills/storybook',
        description: 'Write Storybook stories for UI components',
        files: ['SKILL.md'],
      },
    ]);
    expect(team.commands).toEqual([
      {
        key: 'release-notes',
        source: 'commands/release-notes.md',
        description: 'Draft release notes from merged changes',
        content: expect.stringContaining('---\ndescription:'),
      },
    ]);
  });

  it('reads level instructions and MCP servers', async () => {
    const dir = join(BASIC_INPUT, 'presets/base');

    const base = await loadPreset(dir);

    const ruleKeys = base.rules.map((rule) => rule.key);
    expect(base.extends).toEqual([]);
    expect(ruleKeys).toEqual(['instructions@base', 'code-style', 'security']);
    expect(base.mcp).toEqual([
      {
        key: 'tracker',
        source: 'mcp/tracker.yaml',
        description: 'Issue tracker',
        config: {
          command: 'npx',
          args: ['-y', '<tracker_mcp_package>'],
          env: {
            TRACKER_URL: 'https://tracker.example.com',
            QUEUE: 'COMMON',
          },
        },
      },
    ]);
  });

  it('fails when the manifest is missing', async () => {
    const dir = await createTree({
      'rules/a.md': 'A',
    });

    const result = loadPreset(dir);

    await expect(result).rejects.toThrow('tunestra.preset.yaml is missing');
  });

  it('rejects unknown fields and wrong levels', async () => {
    const dir = await createTree({
      'tunestra.preset.yaml': 'name: x\nlevel: project\nextend: [../base]\n',
    });

    const result = loadPreset(dir);

    await expect(result).rejects.toThrow('level');
    await expect(result).rejects.toThrow('extend');
  });

  it('requires a description for skills', async () => {
    const dir = await createTree({
      'tunestra.preset.yaml': MINIMAL_MANIFEST,
      'skills/a/SKILL.md': '---\nname: a\n---\nText',
    });

    const result = loadPreset(dir);

    await expect(result).rejects.toThrow('description');
  });

  it('rejects skill names that are not safe directory names', async () => {
    const dir = await createTree({
      'tunestra.preset.yaml': MINIMAL_MANIFEST,
      'skills/a/SKILL.md': '---\nname: ../../etc\ndescription: Bad\n---\n',
    });

    const result = loadPreset(dir);

    await expect(result).rejects.toThrow('lowercase letters');
  });

  it('rejects two skills with the same name', async () => {
    const dir = await createTree({
      'tunestra.preset.yaml': MINIMAL_MANIFEST,
      'skills/a/SKILL.md': '---\nname: same\ndescription: A\n---\n',
      'skills/b/SKILL.md': '---\nname: same\ndescription: B\n---\n',
    });

    const result = loadPreset(dir);

    await expect(result).rejects.toThrow('the same name "same"');
  });

  it('reports every problem at once, in the order of the files', async () => {
    const dir = await createTree({
      'tunestra.preset.yaml': MINIMAL_MANIFEST,
      'rules/b.md': '---\n- list\n---\n',
      'rules/a.md': '---\ndescription: [\n---\n',
      'skills/s/SKILL.md': '---\nname: s\n---\n',
      'mcp/m.yaml': 'description: Nothing to run\n',
    });

    const result = loadPreset(dir);

    await expect(result).rejects.toThrow('Found 4 problems');
    await expect(result).rejects.toMatchObject({
      problems: [
        expect.stringContaining('rules/a.md'),
        expect.stringContaining('rules/b.md'),
        expect.stringContaining('SKILL.md'),
        expect.stringContaining('mcp/m.yaml'),
      ],
    });
  });

  it('requires either command or url for MCP servers', async () => {
    const dir = await createTree({
      'tunestra.preset.yaml': MINIMAL_MANIFEST,
      'mcp/a.yaml': 'description: Nothing to run\n',
    });

    const result = loadPreset(dir);

    await expect(result).rejects.toThrow('either "command"');
  });
});
