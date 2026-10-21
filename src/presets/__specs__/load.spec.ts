import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadPreset, loadProject } from '../load.ts';

const BASIC = resolve('src/__specs__/fixtures/basic/input');
const MINIMAL_MANIFEST = 'name: x\nlevel: team\n';

/** Creates a temporary directory with the given files. */
async function tree(files: Record<string, string>): Promise<string> {
  const tempPrefix = join(tmpdir(), 'tunestra-presets-');
  const root = await mkdtemp(tempPrefix);

  for (const [path, content] of Object.entries(files)) {
    const file = join(root, path);
    const dir = dirname(file);

    await mkdir(dir, { recursive: true });
    await writeFile(file, content);
  }

  return root;
}

describe('loadPreset', () => {
  it('reads the manifest and every kind of artifact', async () => {
    const dir = join(BASIC, 'presets/team');

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
    const dir = join(BASIC, 'presets/base');

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
    const dir = await tree({
      'rules/a.md': 'A',
    });

    const result = loadPreset(dir);

    await expect(result).rejects.toThrow('tunestra.preset.yaml is missing');
  });

  it('rejects unknown fields and wrong levels', async () => {
    const dir = await tree({
      'tunestra.preset.yaml': 'name: x\nlevel: project\nextend: [../base]\n',
    });

    const result = loadPreset(dir);

    await expect(result).rejects.toThrow('level');
    await expect(result).rejects.toThrow('extend');
  });

  it('requires a description for skills', async () => {
    const dir = await tree({
      'tunestra.preset.yaml': MINIMAL_MANIFEST,
      'skills/a/SKILL.md': '---\nname: a\n---\nText',
    });

    const result = loadPreset(dir);

    await expect(result).rejects.toThrow('description');
  });

  it('rejects skill names that are not safe directory names', async () => {
    const dir = await tree({
      'tunestra.preset.yaml': MINIMAL_MANIFEST,
      'skills/a/SKILL.md': '---\nname: ../../etc\ndescription: Bad\n---\n',
    });

    const result = loadPreset(dir);

    await expect(result).rejects.toThrow('lowercase letters');
  });

  it('rejects two skills with the same name', async () => {
    const dir = await tree({
      'tunestra.preset.yaml': MINIMAL_MANIFEST,
      'skills/a/SKILL.md': '---\nname: same\ndescription: A\n---\n',
      'skills/b/SKILL.md': '---\nname: same\ndescription: B\n---\n',
    });

    const result = loadPreset(dir);

    await expect(result).rejects.toThrow('the same name "same"');
  });

  it('requires either command or url for MCP servers', async () => {
    const dir = await tree({
      'tunestra.preset.yaml': MINIMAL_MANIFEST,
      'mcp/a.yaml': 'description: Nothing to run\n',
    });

    const result = loadPreset(dir);

    await expect(result).rejects.toThrow('either "command"');
  });
});

describe('loadProject', () => {
  it('reads tunestra.yaml and artifacts from .tunestra/', async () => {
    const dir = join(BASIC, 'project');
    const artifactsDir = join(dir, '.tunestra');

    const project = await loadProject(dir);

    const ruleKeys = project.rules.map((rule) => rule.key);
    const skillKeys = project.skills.map((skill) => skill.key);
    expect(project).toMatchObject({
      name: 'project',
      level: 'project',
      extends: ['../presets/team'],
      agents: ['claude'],
      dir,
      artifactsDir,
    });
    expect(ruleKeys).toEqual(['instructions@project', 'architecture']);
    expect(skillKeys).toEqual(['domain-model']);
  });

  it('uses defaults for an empty config', async () => {
    const root = await tree({
      'my-service/tunestra.yaml': '',
    });
    const dir = join(root, 'my-service');

    const project = await loadProject(dir);

    expect(project).toMatchObject({
      name: 'my-service',
      extends: [],
      agents: ['claude'],
      rules: [],
      skills: [],
      commands: [],
      mcp: [],
    });
  });

  it('suggests init when tunestra.yaml is missing', async () => {
    const dir = await tree({});

    const result = loadProject(dir);

    await expect(result).rejects.toThrow('Run `tunestra init` first');
  });
});
