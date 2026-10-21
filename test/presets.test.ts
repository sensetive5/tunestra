import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from '../src/presets/frontmatter.ts';
import { loadPreset, loadProject } from '../src/presets/load.ts';

const BASIC = resolve('test/fixtures/basic/input');

/** Creates a temporary directory with the given files. */
async function tree(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'tunestra-presets-'));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
  }
  return root;
}

describe('parseFrontmatter', () => {
  it('splits frontmatter and body', () => {
    expect(parseFrontmatter('---\ndescription: Hi\n---\n# Title\n', 'a.md')).toEqual({
      data: { description: 'Hi' },
      body: '# Title\n',
    });
  });

  it('returns the whole text when there is no frontmatter', () => {
    expect(parseFrontmatter('# Title\n', 'a.md')).toEqual({ data: {}, body: '# Title\n' });
  });

  it('accepts empty frontmatter', () => {
    expect(parseFrontmatter('---\n---\nText', 'a.md')).toEqual({ data: {}, body: 'Text' });
  });

  it('rejects frontmatter that is not key-value pairs', () => {
    expect(() => parseFrontmatter('---\n- a\n- b\n---\n', 'a.md')).toThrow('key-value pairs');
  });

  it('names the file when YAML is broken', () => {
    expect(() => parseFrontmatter('---\nkey: [\n---\n', 'a.md')).toThrow('a.md');
  });
});

describe('loadPreset', () => {
  it('reads the manifest and every kind of artifact', async () => {
    const team = await loadPreset(join(BASIC, 'presets/team'));

    expect(team).toMatchObject({
      name: 'team',
      level: 'team',
      description: 'Frontend team conventions',
      extends: ['../base'],
      exclude: { skills: ['code-review'] },
      overrides: { mcp: { tracker: { env: { QUEUE: 'TEAM' } } } },
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
    const base = await loadPreset(join(BASIC, 'presets/base'));

    expect(base.extends).toEqual([]);
    expect(base.rules.map((rule) => rule.key)).toEqual([
      'instructions@base',
      'code-style',
      'security',
    ]);
    expect(base.mcp).toEqual([
      {
        key: 'tracker',
        source: 'mcp/tracker.yaml',
        description: 'Issue tracker',
        config: {
          command: 'npx',
          args: ['-y', '<tracker_mcp_package>'],
          env: { TRACKER_URL: 'https://tracker.example.com', QUEUE: 'COMMON' },
        },
      },
    ]);
  });

  it('fails when the manifest is missing', async () => {
    const dir = await tree({ 'rules/a.md': 'A' });
    await expect(loadPreset(dir)).rejects.toThrow('tunestra.preset.yaml is missing');
  });

  it('rejects unknown fields and wrong levels', async () => {
    const dir = await tree({
      'tunestra.preset.yaml': 'name: x\nlevel: project\nextend: [../base]\n',
    });
    const error = loadPreset(dir);
    await expect(error).rejects.toThrow('level');
    await expect(error).rejects.toThrow('extend');
  });

  it('requires a description for skills', async () => {
    const dir = await tree({
      'tunestra.preset.yaml': 'name: x\nlevel: team\n',
      'skills/a/SKILL.md': '---\nname: a\n---\nText',
    });
    await expect(loadPreset(dir)).rejects.toThrow('description');
  });

  it('rejects skill names that are not safe directory names', async () => {
    const dir = await tree({
      'tunestra.preset.yaml': 'name: x\nlevel: team\n',
      'skills/a/SKILL.md': '---\nname: ../../etc\ndescription: Bad\n---\n',
    });
    await expect(loadPreset(dir)).rejects.toThrow('lowercase letters');
  });

  it('rejects two skills with the same name', async () => {
    const dir = await tree({
      'tunestra.preset.yaml': 'name: x\nlevel: team\n',
      'skills/a/SKILL.md': '---\nname: same\ndescription: A\n---\n',
      'skills/b/SKILL.md': '---\nname: same\ndescription: B\n---\n',
    });
    await expect(loadPreset(dir)).rejects.toThrow('the same name "same"');
  });

  it('requires either command or url for MCP servers', async () => {
    const dir = await tree({
      'tunestra.preset.yaml': 'name: x\nlevel: team\n',
      'mcp/a.yaml': 'description: Nothing to run\n',
    });
    await expect(loadPreset(dir)).rejects.toThrow('either "command"');
  });
});

describe('loadProject', () => {
  it('reads tunestra.yaml and artifacts from .tunestra/', async () => {
    const project = await loadProject(join(BASIC, 'project'));

    expect(project).toMatchObject({
      name: 'project',
      level: 'project',
      extends: ['../presets/team'],
      agents: ['claude'],
      dir: join(BASIC, 'project'),
      artifactsDir: join(BASIC, 'project/.tunestra'),
    });
    expect(project.rules.map((rule) => rule.key)).toEqual(['instructions@project', 'architecture']);
    expect(project.skills.map((skill) => skill.key)).toEqual(['domain-model']);
  });

  it('uses defaults for an empty config', async () => {
    const dir = await tree({ 'my-service/tunestra.yaml': '' });
    const project = await loadProject(join(dir, 'my-service'));

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
    await expect(loadProject(dir)).rejects.toThrow('Run `tunestra init` first');
  });
});
